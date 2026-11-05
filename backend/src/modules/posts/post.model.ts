import {Schema, model} from 'mongoose';

const postSchema = new Schema({
  authorId: {type: Schema.Types.ObjectId, ref: 'User', required: true, index: true},
  publisherType: {type: String, enum: ['personal', 'page'], default: 'personal', index: true},
  groupId: {type: Schema.Types.ObjectId, ref: 'Group', default: null, index: true},
  body: {type: String, required: false, default: '', trim: true, maxlength: 5000},
  audience: {type: String, enum: ['public', 'friends', 'close-friends', 'private'], default: 'public'},
  location: {type: String, trim: true, maxlength: 120, default: ''},
  hashtags: [{type: String, lowercase: true, trim: true}],
  mentions: [{type: String, trim: true}],
  media: [{url: String, type: {type: String, enum: ['image', 'video']}, thumbnailUrl: String}],
  isReel: {type: Boolean, default: false, index: true},
  status: {type: String, enum: ['draft', 'scheduled', 'pending', 'rejected', 'published'], default: 'published', index: true},
  scheduledFor: {type: Date, default: null, index: true},
  accessibilityText: {type: String, trim: true, maxlength: 500, default: ''},
  pinned: {type: Boolean, default: false, index: true},
  pinnedAt: {type: Date, default: null},
  archived: {type: Boolean, default: false, index: true},
  repostOf: {type: Schema.Types.ObjectId, ref: 'Post', default: null},
  quoteBody: {type: String, trim: true, maxlength: 5000, default: ''},
  contentWarning: {type: String, trim: true, maxlength: 160, default: ''},
  commentsDisabled: {type: Boolean, default: false},
  poll: {question: String, options: [{label: String, votes: {type: Number, default: 0}}], endsAt: Date},
  interactive: {type: new Schema({type: {type: String, enum: ['quiz', 'question', 'countdown']}, prompt: String, options: [String], answer: String, endsAt: Date}, {_id: false}), default: undefined},
  collaborators: [{type: Schema.Types.ObjectId, ref: 'User'}],
  templateId: {type: String, default: ''},
  brandedCoverUrl: {type: String, default: ''},
  audio: {title: String, artist: String, url: String},
  coverUrl: {type: String, default: ''},
  durationSeconds: {type: Number, default: 0},
  viewCount: {type: Number, default: 0},
  watchTimeSeconds: {type: Number, default: 0},
  reachCount: {type: Number, default: 0},
  reactionCount: {type: Number, default: 0}, commentCount: {type: Number, default: 0}, shareCount: {type: Number, default: 0},
}, {timestamps: true});
postSchema.index({createdAt: -1});
const reactionSchema = new Schema({postId: {type: Schema.Types.ObjectId, ref: 'Post', required: true}, userId: {type: Schema.Types.ObjectId, ref: 'User', required: true}, type: {type: String, required: true}}, {timestamps: true});
reactionSchema.index({postId: 1, userId: 1}, {unique: true});
const commentSchema = new Schema({postId: {type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true}, authorId: {type: Schema.Types.ObjectId, ref: 'User', required: true}, body: {type: String, required: true, maxlength: 1000}, parentId: {type: Schema.Types.ObjectId, default: null}, likeCount: {type: Number, default: 0}, pinned: {type: Boolean, default: false}}, {timestamps: true});
const commentReactionSchema = new Schema({commentId: {type: Schema.Types.ObjectId, ref: 'Comment', required: true}, userId: {type: Schema.Types.ObjectId, ref: 'User', required: true}}, {timestamps: true}); commentReactionSchema.index({commentId:1,userId:1},{unique:true});
export const Post = model('Post', postSchema);
export const Reaction = model('Reaction', reactionSchema);
export const Comment = model('Comment', commentSchema);
export const CommentReaction = model('CommentReaction', commentReactionSchema);
const postViewSchema = new Schema({postId:{type:Schema.Types.ObjectId,ref:'Post',required:true,index:true},userId:{type:Schema.Types.ObjectId,ref:'User',required:true},viewedAt:{type:Date,default:Date.now}},{timestamps:true});
postViewSchema.index({postId:1,userId:1},{unique:true});
export const PostView = model('PostView', postViewSchema);
const pollVoteSchema = new Schema({postId:{type:Schema.Types.ObjectId,ref:'Post',required:true},userId:{type:Schema.Types.ObjectId,ref:'User',required:true},optionId:{type:Schema.Types.ObjectId,required:true}},{timestamps:true});
pollVoteSchema.index({postId:1,userId:1},{unique:true});
export const PollVote = model('PollVote', pollVoteSchema);
const recommendationFeedbackSchema = new Schema({userId:{type:Schema.Types.ObjectId,ref:'User',required:true},postId:{type:Schema.Types.ObjectId,ref:'Post',required:true},type:{type:String,enum:['not-interested','hide-creator','reset-recommendations'],required:true}},{timestamps:true});
recommendationFeedbackSchema.index({userId:1,postId:1,type:1},{unique:true});
export const RecommendationFeedback = model('RecommendationFeedback', recommendationFeedbackSchema);

const hiddenPostSchema = new Schema({userId:{type:Schema.Types.ObjectId,ref:'User',required:true},postId:{type:Schema.Types.ObjectId,ref:'Post',required:true}},{timestamps:true});
hiddenPostSchema.index({userId:1,postId:1},{unique:true});
const snoozedUserSchema = new Schema({userId:{type:Schema.Types.ObjectId,ref:'User',required:true},snoozedUserId:{type:Schema.Types.ObjectId,ref:'User',required:true},until:{type:Date,required:true}},{timestamps:true});
snoozedUserSchema.index({userId:1,snoozedUserId:1},{unique:true});
export const HiddenPost = model('HiddenPost', hiddenPostSchema);
export const SnoozedUser = model('SnoozedUser', snoozedUserSchema);
