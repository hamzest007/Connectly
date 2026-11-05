import {NextFunction, Request, Response} from 'express';
import jwt from 'jsonwebtoken';
import {env} from '../config/env';
import {HttpError} from '../common/http';
import {User} from '../modules/auth/auth.model';

export type AuthRequest = Request & {userId?: string};
export type AdminPermission = 'view_dashboard'|'manage_users'|'moderate_content'|'manage_reports'|'manage_verification'|'manage_config'|'view_audit'|'manage_finance';
const permissions: Record<string, AdminPermission[]> = {
  'super-admin': ['view_dashboard','manage_users','moderate_content','manage_reports','manage_verification','manage_config','view_audit','manage_finance'],
  admin: ['view_dashboard','manage_users','moderate_content','manage_reports','manage_verification','manage_config','view_audit'],
  moderator: ['view_dashboard','moderate_content','manage_reports','view_audit'],
  'support-agent': ['view_dashboard','manage_users','manage_reports'],
  analyst: ['view_dashboard','view_audit'],
  'finance-manager': ['view_dashboard','manage_finance'],
  'developer-ops': ['view_dashboard','manage_config','view_audit'],
};

export function requireAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) return next(new HttpError(401, 'Authentication required.'));
  try {
    const payload = jwt.verify(header.slice(7), env.accessSecret, {issuer: env.jwtIssuer, audience: env.jwtAudience}) as {sub: string};
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
    if (!user || !permissions[user.role]?.length) return next(new HttpError(403, 'Admin access required.'));
    (req as AuthRequest & {adminRole?: string}).adminRole = user.role;
    next();
  }).catch(next);
}

export function requirePermission(permission: AdminPermission) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    const role = (req as AuthRequest & {adminRole?: string}).adminRole;
    if (!role || !permissions[role]?.includes(permission)) return next(new HttpError(403, 'You do not have permission for this action.'));
    next();
  };
}
