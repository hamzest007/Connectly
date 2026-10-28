import {Schema, model} from 'mongoose';

const schema = new Schema({
  creatorId: {type: Schema.Types.ObjectId, ref: 'User', required: true, index: true},
  brandName: {type: String, required: true, trim: true, maxlength: 120},
  brief: {type: String, default: '', maxlength: 1000},
  status: {type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending', index: true},
}, {timestamps: true});

export const CollaborationRequest = model('CollaborationRequest', schema);
