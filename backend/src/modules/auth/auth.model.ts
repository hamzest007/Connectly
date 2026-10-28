import {Schema, model} from 'mongoose';

const userSchema = new Schema({
  email: {type: String, required: true, unique: true, lowercase: true, trim: true, index: true},
  phone: {type: String, default: '', trim: true, index: true},
  username: {type: String, required: true, unique: true, lowercase: true, trim: true, index: true},
  accountType: {type: String, enum: ['user', 'page'], default: 'user', index: true},
  name: {type: String, required: true, trim: true, maxlength: 80},
  passwordHash: {type: String, required: true, select: false},
  bio: {type: String, default: '', maxlength: 280},
  avatarUrl: {type: String, default: ''},
  coverUrl: {type: String, default: ''},
  website: {type: String, default: '', maxlength: 180},
  location: {type: String, default: '', maxlength: 120},
  country: {type: String, default: '', maxlength: 80},
  education: {type: String, default: '', maxlength: 160},
  maritalStatus: {type: String, default: '', maxlength: 40},
  privateAccount: {type: Boolean, default: false},
  isVerified: {type: Boolean, default: false},
  emailVerified: {type: Boolean, default: false},
  twoFactorEnabled: {type: Boolean, default: false},
  deactivatedAt: {type: Date, default: null},
  verificationCodeHash: {type: String, default: ''},
  verificationExpiresAt: {type: Date, default: null},
  passwordResetHash: {type: String, default: ''},
  passwordResetExpiresAt: {type: Date, default: null},
  role: {type: String, enum: ['user', 'moderator', 'admin'], default: 'user', index: true},
  status: {type: String, enum: ['active', 'suspended'], default: 'active', index: true},
  suspendedUntil: {type: Date, default: null},
  suspensionReason: {type: String, default: '', maxlength: 500},
}, {timestamps: true});

const refreshTokenSchema = new Schema({
  userId: {type: Schema.Types.ObjectId, ref: 'User', required: true, index: true},
  tokenHash: {type: String, required: true},
  expiresAt: {type: Date, required: true, index: {expires: 0}},
}, {timestamps: true});

export const User = model('User', userSchema);
export const RefreshToken = model('RefreshToken', refreshTokenSchema);
