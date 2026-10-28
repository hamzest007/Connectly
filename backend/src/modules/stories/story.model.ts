import {Schema, model} from 'mongoose';

const storySchema = new Schema({
  authorId: {type: Schema.Types.ObjectId, ref: 'User', required: true, index: true},
  publisherType: {type: String, enum: ['personal', 'page'], default: 'personal', index: true},
  body: {type: String, trim: true, maxlength: 1000, default: ''},
  audience: {type: String, enum: ['public', 'friends', 'close-friends', 'private'], default: 'public'},
  media: [{url: String, type: {type: String, enum: ['image', 'video']}, thumbnailUrl: String}],
  stickers: [{type: {type: String, enum: ['text', 'gif', 'poll', 'question']}, value: String, options: [String]}],
  mentions: [{type: String, trim: true}],
  hashtags: [{type: String, trim: true}],
  music: {title: String, artist: String, url: String},
  linkUrl: {type: String, trim: true, maxlength: 500},
  sharedPostId: {type: String, default: null},
  contentWarning: {type: String, trim: true, maxlength: 160, default: ''},
  archived: {type: Boolean, default: false, index: true},
  highlightId: {type: Schema.Types.ObjectId, ref: 'StoryHighlight', default: null},
  viewCount: {type: Number, default: 0},
  expiresAt: {type: Date, required: true, index: true},
}, {timestamps: true});

export const Story = model('Story', storySchema);
const storyViewSchema = new Schema({storyId:{type:Schema.Types.ObjectId,ref:'Story',required:true,index:true},userId:{type:Schema.Types.ObjectId,ref:'User',required:true},viewedAt:{type:Date,default:Date.now}},{timestamps:true});
storyViewSchema.index({storyId:1,userId:1},{unique:true});
export const StoryView = model('StoryView', storyViewSchema);
const storyReactionSchema = new Schema({storyId:{type:Schema.Types.ObjectId,ref:'Story',required:true},userId:{type:Schema.Types.ObjectId,ref:'User',required:true},type:{type:String,enum:['like','love','laugh','wow'],required:true}},{timestamps:true});
storyReactionSchema.index({storyId:1,userId:1},{unique:true});
export const StoryReaction = model('StoryReaction', storyReactionSchema);
const storyReplySchema = new Schema({storyId:{type:Schema.Types.ObjectId,ref:'Story',required:true},userId:{type:Schema.Types.ObjectId,ref:'User',required:true},body:{type:String,trim:true,maxlength:1000,required:true}},{timestamps:true});
export const StoryReply = model('StoryReply', storyReplySchema);
const highlightSchema = new Schema({ownerId:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},title:{type:String,trim:true,maxlength:60,required:true},coverUrl:{type:String,default:''},storyIds:[{type:Schema.Types.ObjectId,ref:'Story'}]},{timestamps:true});
export const StoryHighlight = model('StoryHighlight', highlightSchema);
const storyMuteSchema = new Schema({userId:{type:Schema.Types.ObjectId,ref:'User',required:true},mutedUserId:{type:Schema.Types.ObjectId,ref:'User',required:true}},{timestamps:true});
storyMuteSchema.index({userId:1,mutedUserId:1},{unique:true});
export const StoryMute = model('StoryMute', storyMuteSchema);
const storyHiddenSchema = new Schema({userId:{type:Schema.Types.ObjectId,ref:'User',required:true},storyId:{type:Schema.Types.ObjectId,ref:'Story',required:true}},{timestamps:true});
storyHiddenSchema.index({userId:1,storyId:1},{unique:true});
export const StoryHidden = model('StoryHidden', storyHiddenSchema);
