import {Router} from 'express';
import {z} from 'zod';
import {asyncHandler} from '../../common/asyncHandler';
import {ok, HttpError} from '../../common/http';
import {requireAuth, AuthRequest} from '../../middleware/auth';
import {Comment, CommentReaction, HiddenPost, Post, PostView, Reaction, RecommendationFeedback, SnoozedUser} from './post.model';
import {SavedPost} from './saved-post.model';
import {Follow} from '../friends/follow.model';
import {Friendship} from '../friends/friend.model';
import {Block} from '../blocks/block.model';
import {notify} from '../notifications/notification.service';
import {GroupMember} from '../groups/group.model';

const router = Router();
const mediaInput = z.object({url: z.string().url(), type: z.enum(['image', 'video']), thumbnailUrl: z.string().url().optional()});
const postInput = z.object({body: z.string().trim().max(5000).default(''), audience: z.enum(['public', 'friends', 'close-friends', 'private']).default('public'), location: z.string().trim().max(120).default(''), media: z.array(mediaInput).max(10).default([]), hashtags: z.array(z.string().regex(/^#[a-z0-9_]+$/i)).max(30).default([]), mentions: z.array(z.string()).max(50).default([]), isReel: z.boolean().default(false), status: z.enum(['draft', 'scheduled', 'published']).default('published'), scheduledFor: z.coerce.date().nullable().optional(), accessibilityText: z.string().trim().max(500).default(''), contentWarning: z.string().trim().max(160).default(''), commentsDisabled: z.boolean().default(false), repostOf: z.string().optional(), quoteBody: z.string().trim().max(5000).default(''), poll: z.object({question:z.string().trim().min(1).max(240),options:z.array(z.object({label:z.string().trim().min(1).max(80)})).min(2).max(6),endsAt:z.coerce.date().optional()}).optional()}).refine(value => value.status === 'draft' || value.body.length > 0 || value.media.length > 0 || Boolean(value.repostOf) || Boolean(value.poll), 'A post needs text, media, or a poll.').refine(value => !value.isReel || (value.audience === 'public' && value.media.length === 1 && value.media[0].type === 'video'), 'A reel must be one public video.');
const reactionInput = z.object({type: z.enum(['Like', 'Love', 'Haha', 'Wow', 'Sad', 'Angry'])});
router.use(requireAuth);

router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit ?? 12), 1), 50);
  const feed = z.enum(['for-you','following','friends','latest','trending','reels']).catch('for-you').parse(String(req.query.feed ?? 'for-you'));
  const hidden = await HiddenPost.find({userId:req.userId}).distinct('postId');
  const blocked = await Block.find({blockerId:req.userId}).distinct('blockedId');
  const snoozed = await SnoozedUser.find({userId:req.userId,until:{$gt:new Date()}}).distinct('snoozedUserId');
  const authorIds = [req.userId];
  if (feed === 'following' || feed === 'for-you') authorIds.push(...(await Follow.find({followerId:req.userId}).distinct('followingId')).map(String));
  if (feed === 'friends') {
    const friendships = await Friendship.find({$or:[{requesterId:req.userId,status:'accepted'},{recipientId:req.userId,status:'accepted'}]});
    friendships.forEach(item => authorIds.push(String(item.requesterId) === req.userId ? String(item.recipientId) : String(item.requesterId)));
  }
  const query: any = {_id: {$nin: hidden}, archived: {$ne: true}, $and: [{$or: [{status: 'published'}, {status: {$exists: false}}, {status: 'scheduled', scheduledFor: {$lte: new Date()}}]}, {$or: [{scheduledFor: {$exists: false}}, {scheduledFor: null}, {scheduledFor: {$lte: new Date()}}]}]};
  if (feed === 'reels') query.isReel = true;
  const visibleAuthors = authorIds.filter(id => !snoozed.map(String).includes(String(id)) && !blocked.map(String).includes(String(id)));
  const groupIds = await GroupMember.find({userId:req.userId,status:'active'}).distinct('groupId');
  if (feed === 'reels') {
    query.audience = 'public';
  } else if (feed === 'friends') {
    query.$or = [{audience:'public',authorId:{$in:visibleAuthors}}, {audience:'friends',authorId:{$in:visibleAuthors}}, {groupId:{$in:groupIds},audience:'public'}, {authorId:req.userId}];
  } else if (feed === 'following') {
    query.$or = [{audience:'public',authorId:{$in:visibleAuthors.filter(id => id !== req.userId)}}, {audience:'friends',authorId:{$in:visibleAuthors.filter(id => id !== req.userId)}}, {groupId:{$in:groupIds},audience:'public'}];
  } else {
    query.$or = [{audience:'public',authorId:{$nin:[...blocked, ...snoozed]}}, {groupId:{$ne:null},audience:'public',authorId:{$nin:[...blocked, ...snoozed]}}, {groupId:{$in:groupIds},audience:'public'}, {audience:'friends',authorId:{$in:visibleAuthors}}, {authorId:req.userId}];
  }
  if (snoozed.length) query.authorId = {$nin:snoozed};
  if (req.query.before) query.createdAt = {$lt: new Date(String(req.query.before))};
  const sort = feed === 'trending' ? {reactionCount:-1, commentCount:-1, shareCount:-1, createdAt:-1} : {createdAt:-1};
  const posts = await Post.find(query).sort(sort as any).limit(limit).populate('authorId', 'name username avatarUrl').populate('groupId', 'name description memberCount visibility').populate({path:'repostOf',select:'body createdAt media authorId',populate:{path:'authorId',select:'name username avatarUrl'}});
  const reactions = await Reaction.find({userId:req.userId,postId:{$in:posts.map(post=>post._id)}}).select('postId type');
  const savedPosts = await SavedPost.find({userId:req.userId,postId:{$in:posts.map(post=>post._id)}}).select('postId');
  const reactionByPost = new Map(reactions.map(reaction=>[String(reaction.postId),reaction.type]));
  const savedPostIds = new Set(savedPosts.map(post=>String(post.postId)));
  const items = posts.map(post=>({...post.toObject(), viewerReaction:reactionByPost.get(String(post._id)) ?? null, viewerSaved:savedPostIds.has(String(post._id))}));
  return ok(res, {items, feed, nextCursor: posts.length === limit ? posts[posts.length - 1].createdAt : null});
}));
router.get('/saved', asyncHandler(async (req: AuthRequest, res) => {
  const saved = await SavedPost.find({userId:req.userId}).sort({createdAt:-1}).populate({path:'postId',populate:[{path:'authorId',select:'name username avatarUrl'},{path:'repostOf',select:'body createdAt media authorId',populate:{path:'authorId',select:'name username avatarUrl'}}]}).limit(50);
  return ok(res, saved);
}));
router.get('/drafts', asyncHandler(async (req: AuthRequest, res) => {
  return ok(res, await Post.find({authorId: req.userId, status: 'draft'}).sort({updatedAt: -1}).limit(50));
}));
router.get('/suggestions', asyncHandler(async (req: AuthRequest, res) => {
  const following = await Follow.find({followerId: req.userId}).distinct('followingId');
  const excluded = [...following, req.userId];
  const posts = await Post.find({authorId: {$nin: excluded}, audience: 'public', $or: [{status: 'published'}, {status: {$exists: false}}]}).sort({reactionCount: -1, createdAt: -1}).limit(12).populate('authorId', 'name username avatarUrl');
  return ok(res, posts);
}));
router.get('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const post = await Post.findOne({_id: req.params.id, archived: {$ne: true}}).populate('authorId', 'name username avatarUrl').populate({path:'repostOf',select:'body createdAt media authorId',populate:{path:'authorId',select:'name username avatarUrl'}});
  if (!post) throw new HttpError(404, 'Post not found.');
  return ok(res, post);
}));
router.delete('/drafts/:id', asyncHandler(async (req: AuthRequest, res) => {
  const result = await Post.deleteOne({_id: req.params.id, authorId: req.userId, status: 'draft'});
  if (!result.deletedCount) throw new HttpError(404, 'Draft not found.');
  return ok(res, {deleted: true});
}));
router.get('/activity', asyncHandler(async (req: AuthRequest, res) => ok(res, await PostView.find({userId:req.userId}).sort({viewedAt:-1}).limit(100).populate({path:'postId',populate:{path:'authorId',select:'name username avatarUrl'}}))));
router.post('/', asyncHandler(async (req: AuthRequest, res) => {
  const data = postInput.parse(req.body);
  if (data.scheduledFor && data.scheduledFor <= new Date()) throw new HttpError(400, 'Scheduled time must be in the future.');
  const status = data.status === 'draft' ? 'draft' : data.scheduledFor ? 'scheduled' : 'published';
  return ok(res, await Post.create({...data, status, hashtags: data.hashtags.map(tag => tag.toLowerCase()), authorId: req.userId}), 201);
}));
router.patch('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const data = postInput.parse(req.body);
  if (data.scheduledFor && data.scheduledFor <= new Date()) throw new HttpError(400, 'Scheduled time must be in the future.');
  const status = data.status === 'draft' ? 'draft' : data.scheduledFor ? 'scheduled' : 'published';
  const post = await Post.findOneAndUpdate({_id: req.params.id, authorId: req.userId}, {...data, status, hashtags: data.hashtags.map(tag => tag.toLowerCase())}, {new: true, runValidators: true});
  if (!post) throw new HttpError(404, 'Post not found or not owned by you.');
  return ok(res, post);
}));
router.delete('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const post = await Post.findOne({_id: req.params.id, authorId: req.userId});
  if (!post) throw new HttpError(404, 'Post not found or not owned by you.');
  await Promise.all([post.deleteOne(), Reaction.deleteMany({postId: post._id}), Comment.deleteMany({postId: post._id})]);
  return ok(res, {deleted: true});
}));
router.post('/:id/view', asyncHandler(async (req: AuthRequest, res) => { const seconds=Math.min(Math.max(Number(req.body?.watchTimeSeconds??0),0),86400); await PostView.findOneAndUpdate({postId:req.params.id,userId:req.userId},{viewedAt:new Date()},{upsert:true}); const post=await Post.findByIdAndUpdate(req.params.id,{$inc:{viewCount:1,watchTimeSeconds:seconds,reachCount:1}},{new:true}); return ok(res,{viewed:true,viewCount:post?.viewCount??0}); }));
router.get('/:id/analytics', asyncHandler(async (req: AuthRequest, res) => { const post=await Post.findOne({_id:req.params.id,authorId:req.userId}); if(!post)throw new HttpError(404,'Post not found or not owned by you.'); return ok(res,{views:post.viewCount,watchTimeSeconds:post.watchTimeSeconds,reach:post.reachCount,likes:post.reactionCount,comments:post.commentCount,shares:post.shareCount}); }));
router.post('/:id/recommendation-feedback', asyncHandler(async (req: AuthRequest, res) => { const type=z.enum(['not-interested','hide-creator','reset-recommendations']).parse(req.body?.type); if(type==='reset-recommendations'){await RecommendationFeedback.deleteMany({userId:req.userId});return ok(res,{updated:true});} await RecommendationFeedback.updateOne({userId:req.userId,postId:req.params.id,type},{$setOnInsert:{userId:req.userId,postId:req.params.id,type}},{upsert:true}); return ok(res,{updated:true}); }));
router.post('/:id/repost', asyncHandler(async (req: AuthRequest, res) => { const source=await Post.findById(req.params.id); if(!source)throw new HttpError(404,'Post not found.'); const quote=z.object({body:z.string().trim().max(5000).default('')}).parse(req.body); return ok(res,await Post.create({authorId:req.userId,body:quote.body,audience:'public',repostOf:source._id,quoteBody:quote.body,status:'published'}),201); }));
router.post('/:id/archive', asyncHandler(async (req: AuthRequest, res) => { const post=await Post.findOneAndUpdate({_id:req.params.id,authorId:req.userId},{archived:true},{new:true}); if(!post)throw new HttpError(404,'Post not found or not owned by you.'); return ok(res,{archived:true}); }));
router.delete('/:id/archive', asyncHandler(async (req: AuthRequest, res) => { const post=await Post.findOneAndUpdate({_id:req.params.id,authorId:req.userId},{archived:false},{new:true}); if(!post)throw new HttpError(404,'Post not found or not owned by you.'); return ok(res,{archived:false}); }));
router.post('/:id/pin', asyncHandler(async (req: AuthRequest, res) => {
  const post = await Post.findOneAndUpdate({_id: req.params.id, authorId: req.userId}, {pinned: true, pinnedAt: new Date()}, {new: true});
  if (!post) throw new HttpError(404, 'Post not found or not owned by you.');
  return ok(res, {pinned: true, post});
}));
router.delete('/:id/pin', asyncHandler(async (req: AuthRequest, res) => {
  const post = await Post.findOneAndUpdate({_id: req.params.id, authorId: req.userId}, {pinned: false, pinnedAt: null}, {new: true});
  if (!post) throw new HttpError(404, 'Post not found or not owned by you.');
  return ok(res, {pinned: false, post});
}));
router.put('/:id/reaction', asyncHandler(async (req: AuthRequest, res) => {
  const {type} = reactionInput.parse(req.body);
  const post = await Post.findById(req.params.id); if (!post) throw new HttpError(404, 'Post not found.');
  await Reaction.findOneAndUpdate({postId: post._id, userId: req.userId}, {type}, {upsert: true});
  post.reactionCount = await Reaction.countDocuments({postId: post._id}); await post.save();
  await notify(post.authorId, req.userId, 'reaction', `reacted ${type.toLowerCase()} to your post`, 'post', String(post._id));
  return ok(res, {reaction: type, count: post.reactionCount});
}));
router.delete('/:id/reaction', asyncHandler(async (req: AuthRequest, res) => {
  const post = await Post.findById(req.params.id); if (!post) throw new HttpError(404, 'Post not found.');
  await Reaction.deleteOne({postId: post._id, userId: req.userId}); post.reactionCount = await Reaction.countDocuments({postId: post._id}); await post.save();
  return ok(res, {count: post.reactionCount});
}));
router.post('/:id/hide', asyncHandler(async (req: AuthRequest, res) => {
  const post = await Post.findById(req.params.id); if (!post) throw new HttpError(404, 'Post not found.');
  await HiddenPost.updateOne({userId:req.userId,postId:post._id},{$setOnInsert:{userId:req.userId,postId:post._id}},{upsert:true});
  return ok(res,{hidden:true});
}));
router.post('/:id/snooze', asyncHandler(async (req: AuthRequest, res) => {
  const post = await Post.findById(req.params.id); if (!post) throw new HttpError(404, 'Post not found.');
  const days = Math.min(Math.max(Number(req.body.days ?? 30), 1), 365);
  const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  await SnoozedUser.updateOne({userId:req.userId,snoozedUserId:post.authorId},{$set:{until}},{upsert:true});
  return ok(res,{snoozedUntil:until});
}));
router.post('/:id/save', asyncHandler(async (req: AuthRequest, res) => {
  const post = await Post.findById(req.params.id); if (!post) throw new HttpError(404, 'Post not found.');
  await SavedPost.updateOne({userId:req.userId,postId:post._id}, {$setOnInsert:{userId:req.userId,postId:post._id}}, {upsert:true});
  return ok(res,{saved:true});
}));
router.delete('/:id/save', asyncHandler(async (req: AuthRequest, res) => { await SavedPost.deleteOne({userId:req.userId,postId:req.params.id}); return ok(res,{saved:false}); }));
router.post('/:id/share', asyncHandler(async (req: AuthRequest, res) => { const post=await Post.findById(req.params.id); if(!post) throw new HttpError(404,'Post not found.'); post.shareCount+=1; await post.save(); await notify(post.authorId,req.userId,'share','shared your post','post',String(post._id)); return ok(res,{shareCount:post.shareCount}); }));
router.post('/:id/comments', asyncHandler(async (req: AuthRequest, res) => {
  const body = z.object({body: z.string().trim().min(1).max(1000), parentId: z.string().optional()}).parse(req.body);
  const post = await Post.findById(req.params.id); if (!post) throw new HttpError(404, 'Post not found.'); if (post.commentsDisabled) throw new HttpError(403, 'Comments are disabled for this post.');
  const comment = await Comment.create({postId: post._id, authorId: req.userId, ...body}); post.commentCount += 1; await post.save(); await notify(post.authorId, req.userId, 'comment', 'commented on your post', 'post', String(post._id));
  return ok(res, comment, 201);
}));
router.get('/:id/comments', asyncHandler(async (req, res) => ok(res, await Comment.find({postId: req.params.id}).sort({createdAt: -1}).limit(50).populate('authorId', 'name username avatarUrl'))));
router.post('/:id/comments/:commentId/like', asyncHandler(async (req:AuthRequest,res)=>{const comment=await Comment.findOne({_id:req.params.commentId,postId:req.params.id});if(!comment)throw new HttpError(404,'Comment not found.');await CommentReaction.updateOne({commentId:comment._id,userId:req.userId},{$setOnInsert:{commentId:comment._id,userId:req.userId}},{upsert:true});comment.likeCount=await CommentReaction.countDocuments({commentId:comment._id});await comment.save();return ok(res,{liked:true,count:comment.likeCount});}));
router.delete('/:id/comments/:commentId/like', asyncHandler(async (req:AuthRequest,res)=>{const comment=await Comment.findOne({_id:req.params.commentId,postId:req.params.id});if(!comment)throw new HttpError(404,'Comment not found.');await CommentReaction.deleteOne({commentId:comment._id,userId:req.userId});comment.likeCount=await CommentReaction.countDocuments({commentId:comment._id});await comment.save();return ok(res,{liked:false,count:comment.likeCount});}));
router.post('/:id/comments/:commentId/pin', asyncHandler(async (req:AuthRequest,res)=>{const post=await Post.findOne({_id:req.params.id,authorId:req.userId});if(!post)throw new HttpError(403,'Only the post creator can pin comments.');await Comment.updateMany({postId:post._id},{pinned:false});const comment=await Comment.findOneAndUpdate({_id:req.params.commentId,postId:post._id},{pinned:true},{new:true});if(!comment)throw new HttpError(404,'Comment not found.');return ok(res,{pinned:true,comment});}));
router.post('/:id/poll/:optionId/vote', asyncHandler(async (req:AuthRequest,res)=>{const post=await Post.findById(req.params.id);if(!post?.poll)throw new HttpError(404,'Poll not found.');if(post.poll.endsAt&&post.poll.endsAt<new Date())throw new HttpError(400,'This poll has ended.');const option=post.poll.options.id(String(req.params.optionId));if(!option)throw new HttpError(404,'Poll option not found.');option.votes=(option.votes??0)+1;await post.save();return ok(res,{poll:post.poll});}));
router.get('/:id/share-link', asyncHandler(async (req,res)=>{const post=await Post.findById(req.params.id).select('_id');if(!post)throw new HttpError(404,'Post not found.');return ok(res,{url:`connectly://post/${post._id}`});}));
export default router;
