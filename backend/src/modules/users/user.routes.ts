import {Router} from 'express';
import {z} from 'zod';
import {asyncHandler} from '../../common/asyncHandler';
import {ok, HttpError} from '../../common/http';
import {AuthRequest, requireAuth} from '../../middleware/auth';
import {User} from '../auth/auth.model';
import {Follow} from '../friends/follow.model';
import {Post} from '../posts/post.model';
import {CloseFriend} from './close-friend.model';
import {MonetizationProfile} from './monetization.model';
import {Friendship} from '../friends/friend.model';

const router = Router();
router.use(requireAuth);
const publicFields = 'name username email bio avatarUrl coverUrl website location privateAccount isVerified accountType createdAt';

router.get('/me', asyncHandler(async (req:AuthRequest, res) => ok(res, await User.findById(req.userId).select(publicFields))));
router.get('/me/creator-dashboard', asyncHandler(async (req:AuthRequest, res) => {
  const [summary] = await Post.aggregate([
    {$match: {authorId: req.userId, status: 'published', archived: {$ne: true}}},
    {$group: {_id: null, posts: {$sum: 1}, likes: {$sum: '$reactionCount'}, comments: {$sum: '$commentCount'}, shares: {$sum: '$shareCount'}, views: {$sum: '$viewCount'}, reach: {$sum: '$reachCount'}}},
  ]);
  return ok(res, summary ?? {posts: 0, likes: 0, comments: 0, shares: 0, views: 0, reach: 0});
}));
router.get('/me/close-friends', asyncHandler(async (req:AuthRequest, res) => ok(res, await CloseFriend.find({userId:req.userId}).populate('friendId','name username avatarUrl'))));
router.put('/me/close-friends/:friendId', asyncHandler(async (req:AuthRequest, res) => {
  if (String(req.userId) === req.params.friendId) throw new HttpError(400, 'You cannot add yourself.');
  const friend = await User.findById(req.params.friendId).select('_id');
  if (!friend) throw new HttpError(404, 'User not found.');
  return ok(res, await CloseFriend.findOneAndUpdate({userId:req.userId,friendId:friend._id},{$setOnInsert:{userId:req.userId,friendId:friend._id}},{upsert:true,new:true}).populate('friendId','name username avatarUrl'));
}));
router.delete('/me/close-friends/:friendId', asyncHandler(async (req:AuthRequest, res) => ok(res, {removed:(await CloseFriend.deleteOne({userId:req.userId,friendId:req.params.friendId})).deletedCount>0})));
router.get('/me/monetization', asyncHandler(async (req:AuthRequest, res) => ok(res, await MonetizationProfile.findOneAndUpdate({userId:req.userId},{},{upsert:true,new:true,setDefaultsOnInsert:true}))));
router.patch('/me/monetization', asyncHandler(async (req:AuthRequest, res) => {
  const data=z.object({enabled:z.boolean().optional(),tipsEnabled:z.boolean().optional(),subscriptionsEnabled:z.boolean().optional(),payoutEmail:z.string().email().or(z.literal('')).optional()}).parse(req.body);
  return ok(res, await MonetizationProfile.findOneAndUpdate({userId:req.userId},data,{upsert:true,new:true,setDefaultsOnInsert:true}));
}));
router.patch('/me', asyncHandler(async (req:AuthRequest, res) => {
  const data = z.object({name:z.string().trim().min(2).max(80).optional(),bio:z.string().trim().max(280).optional(),avatarUrl:z.string().url().optional(),coverUrl:z.string().url().optional(),website:z.string().trim().max(180).optional(),location:z.string().trim().max(120).optional(),privateAccount:z.boolean().optional()}).parse(req.body);
  return ok(res, await User.findByIdAndUpdate(req.userId, data, {new:true,runValidators:true}).select(publicFields));
}));
router.get('/search', asyncHandler(async (req,res) => { const q=String(req.query.q??'').trim(); if(!q)return ok(res,[]); return ok(res,await User.find({$or:[{name:{$regex:q,'$options':'i'}},{username:{$regex:q,'$options':'i'}}]}).select('name username avatarUrl isVerified privateAccount accountType').limit(20)); }));
router.get('/:username/followers', asyncHandler(async (req:AuthRequest,res) => { const user=await User.findOne({username:req.params.username}).select('_id'); if(!user)return ok(res,[]); return ok(res,await Follow.find({followingId:user._id}).sort({createdAt:-1}).limit(100).populate('followerId','name username avatarUrl isVerified')); }));
router.get('/:username/following', asyncHandler(async (req:AuthRequest,res) => { const user=await User.findOne({username:req.params.username}).select('_id'); if(!user)return ok(res,[]); return ok(res,await Follow.find({followerId:user._id}).sort({createdAt:-1}).limit(100).populate('followingId','name username avatarUrl isVerified')); }));
router.get('/:username/posts', asyncHandler(async (req:AuthRequest,res) => { const user=await User.findOne({username:req.params.username}).select('_id privateAccount'); if(!user)return ok(res,[]); const isSelf=String(user._id)===req.userId; const follows=await Follow.exists({followerId:req.userId,followingId:user._id}); if(user.privateAccount&&!isSelf&&!follows)return ok(res,[]); return ok(res,await Post.find({authorId:user._id,audience:{$in:isSelf?['public','friends','private']:['public']}}).sort({createdAt:-1}).limit(50).populate('authorId','name username avatarUrl isVerified')); }));
router.get('/:username', asyncHandler(async (req:AuthRequest,res) => {
  const user=await User.findOne({username:req.params.username}).select(publicFields); if(!user)return ok(res,null);
  const [followersCount,followingCount,postCount,isFollowing,friendship]=await Promise.all([Follow.countDocuments({followingId:user._id}),Follow.countDocuments({followerId:user._id}),Post.countDocuments({authorId:user._id}),Follow.exists({followerId:req.userId,followingId:user._id}),Friendship.findOne({$or:[{requesterId:req.userId,recipientId:user._id},{requesterId:user._id,recipientId:req.userId}]}).select('status requesterId')]);
  const profile=user.toObject(); const {email,...publicProfile}=profile; return ok(res,{...(String(user._id)===req.userId?profile:publicProfile),followersCount,followingCount,postCount,isFollowing:Boolean(isFollowing),friendStatus:friendship?.status??'none',friendRequesterId:friendship?.requesterId?String(friendship.requesterId):null});
}));
export default router;
