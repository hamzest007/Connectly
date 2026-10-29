import {Schema, model} from 'mongoose';

const eventSchema = new Schema({
  hostId: {type: Schema.Types.ObjectId, ref: 'User', required: true, index: true},
  title: {type: String, required: true, trim: true, maxlength: 140},
  description: {type: String, default: '', maxlength: 5000},
  coverUrl: {type: String, default: '', maxlength: 2000},
  startsAt: {type: Date, required: true, index: true},
  endsAt: {type: Date, required: true},
  venue: {type: String, default: '', maxlength: 240},
  onlineUrl: {type: String, default: '', maxlength: 2000},
  category: {type: String, enum: ['music', 'technology', 'education', 'sports', 'fitness', 'business', 'community', 'other'], default: 'community', index: true},
  visibility: {type: String, enum: ['public', 'private', 'invite-only'], default: 'public', index: true},
  status: {type: String, enum: ['scheduled', 'cancelled'], default: 'scheduled', index: true},
}, {timestamps: true});
eventSchema.index({title: 'text', description: 'text'});

const rsvpSchema = new Schema({
  eventId: {type: Schema.Types.ObjectId, ref: 'Event', required: true},
  userId: {type: Schema.Types.ObjectId, ref: 'User', required: true},
  status: {type: String, enum: ['going', 'interested', 'not-going'], required: true},
}, {timestamps: true});
rsvpSchema.index({eventId: 1, userId: 1}, {unique: true});
rsvpSchema.index({eventId: 1, status: 1});

const invitationSchema = new Schema({
  eventId: {type: Schema.Types.ObjectId, ref: 'Event', required: true},
  inviterId: {type: Schema.Types.ObjectId, ref: 'User', required: true},
  inviteeId: {type: Schema.Types.ObjectId, ref: 'User', required: true},
  status: {type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending'},
}, {timestamps: true});
invitationSchema.index({eventId: 1, inviteeId: 1}, {unique: true});

export const Event = model('Event', eventSchema);
export const EventRsvp = model('EventRsvp', rsvpSchema);
export const EventInvitation = model('EventInvitation', invitationSchema);
