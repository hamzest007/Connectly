import {Notification, NotificationPreference} from './notification.model';
import {User} from '../auth/auth.model';

export async function notify(recipientId: unknown, actorId: unknown, type: string, message: string, entityType = '', entityId = '', recipientProfile?: 'personal'|'page') {
  if (String(recipientId) === String(actorId)) return;
  const category = type === 'reaction' || type === 'comment' || type === 'share' ? 'engagement' : type === 'message' ? 'messages' : type === 'login' || type === 'report' ? 'account' : 'social';
  const profile = recipientProfile ?? ((await User.findById(recipientId).select('accountType'))?.accountType === 'page' ? 'page' : 'personal');
  const preference = await NotificationPreference.findOne({userId:recipientId}).lean();
  if (preference && preference[category as 'engagement'|'social'|'messages'|'account'] === false) return;
  if (preference?.mutedUntil && preference.mutedUntil > new Date()) return;
  await Notification.create({recipientId, recipientProfile:profile, actorId, type, category, message, entityType, entityId, groupKey:`${profile}:${category}:${type}`});
}
