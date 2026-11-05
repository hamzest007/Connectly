import {Router} from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import {z} from 'zod';
import {HttpError, ok} from '../../common/http';
import {asyncHandler} from '../../common/asyncHandler';
import {env} from '../../config/env';
import {RefreshToken, User} from './auth.model';
import {loginSchema, registerSchema} from './auth.schema';
import {AuthRequest, requireAuth} from '../../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();
const authLimiter = rateLimit({windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, message: {success: false, error: {message: 'Too many authentication attempts. Please try again later.'}}});
const validate = (schema: {parse: (value: unknown) => unknown}) => (req: any, _res: any, next: any) => {
  try { req.body = schema.parse(req.body); next(); } catch (error) { next(error); }
};

const accessToken = (id: string) => jwt.sign({}, env.accessSecret, {subject: id, issuer: env.jwtIssuer, audience: env.jwtAudience, expiresIn: '15m'});
const publicUser = (user: any) => ({id: user._id, email: user.email, username: user.username, name: user.name, bio: user.bio, avatarUrl: user.avatarUrl, phone: user.phone, emailVerified: user.emailVerified, twoFactorEnabled: user.twoFactorEnabled, role: user.role, status: user.status, accountStatus: user.accountStatus});
const issueRefresh = async (userId: string) => {
  const raw = crypto.randomBytes(48).toString('hex');
  await RefreshToken.create({userId, tokenHash: crypto.createHash('sha256').update(raw).digest('hex'), expiresAt: new Date(Date.now() + 30 * 86400000)});
  return raw;
};

router.post('/register', authLimiter, validate(registerSchema), asyncHandler(async (req, res) => {
  const {email, password, username, phoneNumber, acceptedTerms} = req.body;
  const name = String(req.body.fullName ?? req.body.name ?? '').trim();
  const normalizedEmail = email.toLowerCase();
  const normalizedUsername = username.toLowerCase();
  const exists = await User.findOne({$or: [{normalizedEmail}, {normalizedUsername}, {email: normalizedEmail}, {username: normalizedUsername}]}).select('_id email username');
  if (exists) {
    if (exists.email === normalizedEmail || (exists as any).normalizedEmail === normalizedEmail) throw new HttpError(409, 'Email is already in use.');
    throw new HttpError(409, 'Username is already taken.');
  }
  const user = await User.create({email: normalizedEmail, normalizedEmail, username: normalizedUsername, normalizedUsername, name, fullName: name, avatarUrl: '', phone: phoneNumber ?? '', phoneNumber: phoneNumber ?? '', passwordHash: await bcrypt.hash(password, 12), acceptedTermsAt: acceptedTerms ? new Date() : null, acceptedTermsVersion: '2026-01', accountStatus: 'active'});
  const refreshToken = await issueRefresh(String(user._id));
  return ok(res, {user: publicUser(user), accessToken: accessToken(String(user._id)), refreshToken}, 201);
}));
router.get('/check-username/:username', authLimiter, asyncHandler(async (req, res) => {
  const username = String(req.params.username ?? '').trim().toLowerCase();
  if (!/^[a-z0-9_]{3,30}$/.test(username)) return ok(res, {available: false, reason: 'Use 3–30 letters, numbers, or underscores.'});
  const exists = await User.exists({$or: [{normalizedUsername: username}, {username}]});
  return ok(res, {available: !exists});
}));
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(async (req, res) => {
  const identifier = req.body.identifier.toLowerCase();
  const user = await User.findOne({$or: [{email: identifier}, {username: identifier}, {phone: identifier}]}).select('+passwordHash');
  if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) throw new HttpError(401, 'Invalid email or password.');
  if (user.status === 'suspended' && (!user.suspendedUntil || user.suspendedUntil > new Date())) throw new HttpError(403, 'Your account is suspended.');
  const refreshToken = await issueRefresh(String(user._id));
  return ok(res, {user: publicUser(user), accessToken: accessToken(String(user._id)), refreshToken});
}));
router.post('/refresh', authLimiter, asyncHandler(async (req, res) => {
  const raw = String(req.body?.refreshToken ?? '');
  const record = await RefreshToken.findOne({tokenHash: crypto.createHash('sha256').update(raw).digest('hex'), expiresAt: {$gt: new Date()}});
  if (!record) throw new HttpError(401, 'Invalid refresh token.');
  await record.deleteOne();
  return ok(res, {accessToken: accessToken(String(record.userId)), refreshToken: await issueRefresh(String(record.userId))});
}));
router.post('/logout', asyncHandler(async (req, res) => {
  const raw = String(req.body?.refreshToken ?? '');
  await RefreshToken.deleteOne({tokenHash: crypto.createHash('sha256').update(raw).digest('hex')});
  return ok(res, {message: 'Session revoked'});
}));

router.post('/logout-all', requireAuth, asyncHandler(async (req: AuthRequest, res) => { await RefreshToken.deleteMany({userId: req.userId}); return ok(res, {message: 'All sessions revoked.'}); }));
router.get('/sessions', requireAuth, asyncHandler(async (req: AuthRequest, res) => ok(res, await RefreshToken.find({userId: req.userId}).select('_id createdAt expiresAt').sort({createdAt: -1}))));
router.delete('/sessions/:id', requireAuth, asyncHandler(async (req: AuthRequest, res) => ok(res, {revoked: (await RefreshToken.deleteOne({_id: req.params.id, userId: req.userId})).deletedCount > 0})));
router.post('/change-password', requireAuth, asyncHandler(async (req: AuthRequest, res) => { const data = z.object({currentPassword: z.string().min(1), newPassword: z.string().min(8).max(72)}).parse(req.body); const user = await User.findById(req.userId).select('+passwordHash'); if (!user || !(await bcrypt.compare(data.currentPassword, user.passwordHash))) throw new HttpError(400, 'Current password is incorrect.'); user.passwordHash = await bcrypt.hash(data.newPassword, 12); await user.save(); await RefreshToken.deleteMany({userId: req.userId}); return ok(res, {changed: true}); }));
router.post('/forgot-password', authLimiter, asyncHandler(async (req, res) => { const email = z.string().email().parse(req.body?.email).toLowerCase(); const user = await User.findOne({email}); if (user) { const raw = crypto.randomBytes(32).toString('hex'); user.passwordResetHash = crypto.createHash('sha256').update(raw).digest('hex'); user.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000); await user.save(); } return ok(res, {message: 'If an account exists, reset instructions have been sent.'}); }));
router.post('/verify-email', requireAuth, asyncHandler(async (req: AuthRequest, res) => { const code = z.string().length(6).parse(req.body?.code); const user = await User.findById(req.userId); if (!user || !user.verificationCodeHash || user.verificationExpiresAt! < new Date() || user.verificationCodeHash !== crypto.createHash('sha256').update(code).digest('hex')) throw new HttpError(400, 'Invalid or expired verification code.'); user.emailVerified = true; user.verificationCodeHash = ''; user.verificationExpiresAt = null; await user.save(); return ok(res, {verified: true}); }));
router.post('/deactivate', requireAuth, asyncHandler(async (req: AuthRequest, res) => { await User.findByIdAndUpdate(req.userId, {status: 'suspended', suspendedUntil: null, deactivatedAt: new Date()}); await RefreshToken.deleteMany({userId: req.userId}); return ok(res, {deactivated: true}); }));
router.delete('/account', requireAuth, asyncHandler(async (req: AuthRequest, res) => { await Promise.all([User.deleteOne({_id: req.userId}), RefreshToken.deleteMany({userId: req.userId})]); return ok(res, {deleted: true}); }));
router.get('/account/export', requireAuth, asyncHandler(async (req: AuthRequest, res) => { const user = await User.findById(req.userId).select('-passwordHash -verificationCodeHash -passwordResetHash'); return ok(res, {user, exportedAt: new Date().toISOString()}); }));

export default router;
