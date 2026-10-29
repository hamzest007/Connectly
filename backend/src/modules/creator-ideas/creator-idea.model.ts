import {Schema, model} from 'mongoose';

const creatorIdeaSchema = new Schema({
  userId: {type: Schema.Types.ObjectId, ref: 'User', required: true, index: true},
  kind: {type: String, enum: ['post', 'reel', 'story'], required: true},
  title: {type: String, required: true, trim: true, maxlength: 140},
  prompt: {type: String, required: true, trim: true, maxlength: 1000},
  hashtags: {type: [String], default: []},
  collection: {type: String, trim: true, maxlength: 80, default: ''},
  saved: {type: Boolean, default: true, index: true},
  plannedFor: {type: Date, default: null},
}, {timestamps: true});
creatorIdeaSchema.index({userId: 1, title: 1}, {unique: true});
export const CreatorIdea = model('CreatorIdea', creatorIdeaSchema);
