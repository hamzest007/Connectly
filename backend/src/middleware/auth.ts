import {NextFunction, Request, Response} from 'express';
import jwt from 'jsonwebtoken';
import {env} from '../config/env';
import {HttpError} from '../common/http';
import {User} from '../modules/auth/auth.model';

export type AuthRequest = Request & {userId?: string};

export function requireAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) return next(new HttpError(401, 'Authentication required.'));
  try {
    const payload = jwt.verify(header.slice(7), env.accessSecret) as {sub: string};
    req.userId = payload.sub;
    void User.findById(payload.sub).select('status suspendedUntil').lean().then(user => {
      if (!user) return next(new HttpError(401, 'Account not found.'));
      if (user.status === 'suspended' && (!user.suspendedUntil || user.suspendedUntil > new Date())) return next(new HttpError(403, 'Your account is suspended.'));
      next();
    }).catch(next);
  } catch { next(new HttpError(401, 'Invalid or expired access token.')); }
}

export function requireAdmin(req: AuthRequest, _res: Response, next: NextFunction) {
  if (!req.userId) return next(new HttpError(401, 'Authentication required.'));
  void User.findById(req.userId).select('role').lean().then(user => {
    if (!user || !['admin', 'moderator'].includes(user.role)) return next(new HttpError(403, 'Admin access required.'));
    (req as AuthRequest & {adminRole?: string}).adminRole = user.role;
    next();
  }).catch(next);
}
