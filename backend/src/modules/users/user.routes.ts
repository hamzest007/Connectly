import {Router} from 'express';
import {z} from 'zod';
import {asyncHandler} from '../../common/asyncHandler';
import {ok} from '../../common/http';
import {AuthRequest, requireAuth} from '../../middleware/auth';
import {User} from '../auth/auth.model';
import {Follow} from '../friends/follow.model';
import {Post} from '../posts/post.model';

const router = Router();
router.use(requireAuth);
const publicFields = 'name username email bio avatarUrl coverUrl website location privateAccount isVerified createdAt';

router.get('/me', asyncHandler(async (req:AuthRequest, res) => ok(res, await User.findById(req.userId).select(publicFields))));
router.patch('/me', asyncHandler(async (req:AuthRequest, res) => {
  const data = z.object({name:z.string().trim().min(2).max(80).optional(),bio:z.string().trim().max(280).optional(),avatarUrl:z.string().url().optional(),coverUrl:z.string().url().optional(),website:z.string().trim().max(180).optional(),location:z.string().trim().max(120).optional(),privateAccount:z.boolean().optional()}).parse(req.body);
  return ok(res, await User.findByIdAndUpdate(req.userId, data, {new:true,runValidators:true}).select(publicFields));
}));
router.get('/search', asyncHandler(async (req,res) => { const q=String(req.query.q??'').trim(); if(!q)return ok(res,[]); return ok(res,await User.find({$or:[{name:{$regex:q,'$options':'i'}},{username:{$regex:q,'$options':'i'}}]}).select('name username avatarUrl isVerified privateAccount').limit(20)); }));
router.get('/:username/followers', asyncHandler(async (req:AuthRequest,res) => { const user=await User.findOne({username:req.params.username}).select('_id'); if(!user)return ok(res,[]); return ok(res,await Follow.find({followingId:user._id}).sort({createdAt:-1}).limit(100).populate('followerId','name username avatarUrl isVerified')); }));
router.get('/:username/following', asyncHandler(async (req:AuthRequest,res) => { const user=await User.findOne({username:req.params.username}).select('_id'); if(!user)return ok(res,[]); return ok(res,await Follow.find({followerId:user._id}).sort({createdAt:-1}).limit(100).populate('followingId','name username avatarUrl isVerified')); }));
router.get('/:username/posts', asyncHandler(async (req:AuthRequest,res) => { const user=await User.findOne({username:req.params.username}).select('_id privateAccount'); if(!user)return ok(res,[]); const isSelf=String(user._id)===req.userId; const follows=await Follow.exists({followerId:req.userId,followingId:user._id}); if(user.privateAccount&&!isSelf&&!follows)return ok(res,[]); return ok(res,await Post.find({authorId:user._id,audience:{$in:isSelf?['public','friends','private']:['public']}}).sort({createdAt:-1}).limit(50).populate('authorId','name username avatarUrl isVerified')); }));
router.get('/:username', asyncHandler(async (req:AuthRequest,res) => {
  const user=await User.findOne({username:req.params.username}).select(publicFields); if(!user)return ok(res,null);
  const [followersCount,followingCount,postCount,isFollowing]=await Promise.all([Follow.countDocuments({followingId:user._id}),Follow.countDocuments({followerId:user._id}),Post.countDocuments({authorId:user._id}),Follow.exists({followerId:req.userId,followingId:user._id})]);
  const profile=user.toObject(); const {email,...publicProfile}=profile; return ok(res,{...(String(user._id)===req.userId?profile:publicProfile),followersCount,followingCount,postCount,isFollowing:Boolean(isFollowing)});
}));
export default router;
