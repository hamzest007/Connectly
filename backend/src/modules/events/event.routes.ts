import {Router} from 'express';
import {Types} from 'mongoose';
import {z} from 'zod';
import {asyncHandler} from '../../common/asyncHandler';
import {HttpError, ok} from '../../common/http';
import {AuthRequest, requireAuth} from '../../middleware/auth';
import {Event, EventInvitation, EventRsvp} from './event.model';

const router = Router();
router.use(requireAuth);

const eventInput = z.object({
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().max(5000).default(''),
  coverUrl: z.string().url().or(z.literal('')).default(''),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  venue: z.string().trim().max(240).default(''),
  onlineUrl: z.string().url().or(z.literal('')).default(''),
  category: z.enum(['music', 'technology', 'education', 'sports', 'fitness', 'business', 'community', 'other']).default('community'),
  visibility: z.enum(['public', 'private', 'invite-only']).default('public'),
}).superRefine((value, context) => {
  if (value.endsAt <= value.startsAt) context.addIssue({code: z.ZodIssueCode.custom, path: ['endsAt'], message: 'End time must be after start time.'});
  if (!value.venue && !value.onlineUrl) context.addIssue({code: z.ZodIssueCode.custom, path: ['venue'], message: 'Add a venue or online link.'});
});

const canView = async (eventId: string, userId: string) => {
  const event = await Event.findById(eventId).populate('hostId', 'name username avatarUrl isVerified');
  if (!event) throw new HttpError(404, 'Event not found.');
  if (event.visibility !== 'public' && String(event.hostId?._id ?? event.hostId) !== userId) {
    const rsvp = await EventRsvp.findOne({eventId, userId, status: {$in: ['going', 'interested']}});
    const invitation = await EventInvitation.findOne({eventId, inviteeId: userId, status: {$in: ['pending', 'accepted']}});
    if (!rsvp && !invitation) throw new HttpError(403, 'You do not have access to this event.');
  }
  return event;
};

router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(30, Math.max(1, Number(req.query.limit ?? 15)));
  const tab = String(req.query.tab ?? 'discover');
  const query = String(req.query.q ?? '').trim();
  const category = String(req.query.category ?? '').trim();
  const filter: Record<string, unknown> = {status: 'scheduled', endsAt: {$gte: new Date()}};
  if (tab === 'mine') filter.hostId = req.userId;
  else if (tab !== 'calendar') filter.visibility = 'public';
  if (category) filter.category = category;
  if (query) filter.$text = {$search: query};
  const [items, total] = await Promise.all([
    Event.find(filter).sort({startsAt: 1}).skip((page - 1) * limit).limit(limit).populate('hostId', 'name username avatarUrl isVerified').lean(),
    Event.countDocuments(filter),
  ]);
  const rsvps = items.length ? await EventRsvp.find({eventId: {$in: items.map(item => item._id)}, userId: req.userId}).select('eventId status').lean() : [];
  const counts = items.length ? await EventRsvp.aggregate([{$match: {eventId: {$in: items.map(item => item._id)}, status: 'going'}}, {$group: {_id: '$eventId', count: {$sum: 1}}}]) : [];
  return ok(res, {items: items.map(item => ({...item, myRsvp: rsvps.find(rsvp => String(rsvp.eventId) === String(item._id))?.status ?? null, attendeeCounts: {going: counts.find(count => String(count._id) === String(item._id))?.count ?? 0}})), page, limit, total, hasMore: page * limit < total});
}));

router.post('/', asyncHandler(async (req: AuthRequest, res) => {
  const data = eventInput.parse(req.body);
  return ok(res, await Event.create({...data, hostId: req.userId}), 201);
}));

router.get('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const event = await canView(String(req.params.id), req.userId!);
  const [rsvp, counts, attendees] = await Promise.all([
    EventRsvp.findOne({eventId: event._id, userId: req.userId}).lean(),
    EventRsvp.aggregate([{$match: {eventId: event._id}}, {$group: {_id: '$status', count: {$sum: 1}}}]),
    EventRsvp.find({eventId: event._id, status: {$in: ['going', 'interested']}}).limit(50).populate('userId', 'name username avatarUrl').lean(),
  ]);
  return ok(res, {...event.toObject(), myRsvp: rsvp?.status ?? null, attendeeCounts: Object.fromEntries(counts.map(item => [item._id, item.count])), attendees});
}));

router.patch('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const event = await Event.findOne({_id: String(req.params.id), hostId: req.userId});
  if (!event) throw new HttpError(404, 'Event not found or you are not the host.');
  const data = eventInput.partial().parse(req.body);
  const nextStart = data.startsAt ?? event.startsAt;
  const nextEnd = data.endsAt ?? event.endsAt;
  if (nextEnd <= nextStart) throw new HttpError(400, 'End time must be after start time.');
  Object.assign(event, data);
  await event.save();
  return ok(res, event);
}));

router.post('/:id/cancel', asyncHandler(async (req: AuthRequest, res) => {
  const event = await Event.findOneAndUpdate({_id: String(req.params.id), hostId: req.userId}, {status: 'cancelled'}, {new: true});
  if (!event) throw new HttpError(404, 'Event not found or you are not the host.');
  return ok(res, event);
}));

router.put('/:id/rsvp', asyncHandler(async (req: AuthRequest, res) => {
  await canView(String(req.params.id), req.userId!);
  const status = z.enum(['going', 'interested', 'not-going']).parse(req.body?.status);
  const rsvp = await EventRsvp.findOneAndUpdate({eventId: String(req.params.id), userId: req.userId}, {status}, {upsert: true, new: true, setDefaultsOnInsert: true});
  return ok(res, rsvp);
}));

router.post('/:id/invitations', asyncHandler(async (req: AuthRequest, res) => {
  const event = await Event.findOne({_id: String(req.params.id), hostId: req.userId});
  if (!event) throw new HttpError(403, 'Only the event host can send invitations.');
  const inviteeIds = z.array(z.string().refine(value => Types.ObjectId.isValid(value), 'Invalid user id')).min(1).max(100).parse(req.body?.inviteeIds).map(value => new Types.ObjectId(value));
  const result = await EventInvitation.bulkWrite(inviteeIds.map(inviteeId => ({updateOne: {filter: {eventId: event._id, inviteeId}, update: {$setOnInsert: {eventId: event._id, inviterId: new Types.ObjectId(req.userId!), inviteeId}}, upsert: true}})));
  return ok(res, {invited: result.upsertedCount});
}));

router.patch('/:id/invitation', asyncHandler(async (req: AuthRequest, res) => {
  const status = z.enum(['accepted', 'declined']).parse(req.body?.status);
  const invitation = await EventInvitation.findOneAndUpdate({eventId: String(req.params.id), inviteeId: req.userId, status: 'pending'}, {status}, {new: true});
  if (!invitation) throw new HttpError(404, 'Invitation not found or already answered.');
  if (status === 'accepted') await EventRsvp.findOneAndUpdate({eventId: invitation.eventId, userId: req.userId}, {status: 'interested'}, {upsert: true, new: true, setDefaultsOnInsert: true});
  return ok(res, invitation);
}));

export default router;
