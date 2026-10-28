import {Router} from 'express';
import {z} from 'zod';
import {asyncHandler} from '../../common/asyncHandler';
import {ok} from '../../common/http';
import {AuthRequest, requireAuth} from '../../middleware/auth';
import {User} from '../auth/auth.model';
import {Block, Mute} from '../blocks/block.model';
import {Follow} from '../friends/follow.model';
import {Post} from '../posts/post.model';
import {RecentSearch} from './search.model';

const router=Router(); router.use(requireAuth);
const resultType=z.enum(['all','users','posts','reels','hashtags','topics']).default('all');
router.get('/',asyncHandler(async(req:AuthRequest,res)=>{const q=String(req.query.q??'').trim();const type=resultType.parse(String(req.query.type??'all'));const limit=Math.min(Math.max(Number(req.query.limit??20),1),50);const before=req.query.before?new Date(String(req.query.before)):new Date();const blocked=await Block.find({$or:[{blockerId:req.userId},{blockedId:req.userId}]}).lean();const blockedIds=blocked.map(item=>String(item.blockerId)===req.userId?item.blockedId:item.blockerId);const response:any={users:[],posts:[],hashtags:[],topics:[],nextCursor:null};if(q&&['all','users'].includes(type)){response.users=await User.find({_id:{$nin:[req.userId,...blockedIds]},$or:[{name:{$regex:q,$options:'i'}},{username:{$regex:q,$options:'i'}}]}).select('name username avatarUrl bio isVerified').limit(limit);}if(q&&['all','posts','reels','hashtags','topics'].includes(type)){const postQuery:any={authorId:{$nin:blockedIds},audience:'public',archived:false,createdAt:{$lt:before},status:{$in:['published','scheduled']}};if(type==='reels')postQuery.isReel=true;if(type==='hashtags'||q.startsWith('#'))postQuery.hashtags={$regex:q.replace(/^#/,'').toLowerCase()};else postQuery.$or=[{body:{$regex:q,$options:'i'}},{location:{$regex:q,$options:'i'}},{hashtags:{$regex:q.replace(/^#/,'').toLowerCase(),$options:'i'}}];const posts=await Post.find(postQuery).sort({createdAt:-1}).limit(limit).populate('authorId','name username avatarUrl');response.posts=posts;response.nextCursor=posts.length===limit?posts[posts.length-1].createdAt:null;}if(q)await RecentSearch.findOneAndUpdate({userId:req.userId,query:q.toLowerCase()},{kind:type},{upsert:true});return ok(res,response);}));
router.get('/recent',asyncHandler(async(req:AuthRequest,res)=>ok(res,await RecentSearch.find({userId:req.userId}).sort({updatedAt:-1}).limit(20))));
router.delete('/recent',asyncHandler(async(req:AuthRequest,res)=>{await RecentSearch.deleteMany({userId:req.userId});return ok(res,{cleared:true});}));
router.get('/trending',asyncHandler(async(_req:AuthRequest,res)=>{const tags=await Post.aggregate([{$match:{audience:'public',archived:false,hashtags:{$exists:true,$ne:[]}}},{$unwind:'$hashtags'},{$group:{_id:'$hashtags',posts:{$sum:1},engagement:{$sum:{$add:['$reactionCount','$commentCount','$shareCount']}}}},{$sort:{engagement:-1,posts:-1}},{$limit:20}]);return ok(res,tags.map(tag=>({tag:tag._id,posts:tag.posts,engagement:tag.engagement})));}));
router.get('/recommendations',asyncHandler(async(req:AuthRequest,res)=>{const blocked=await Block.find({$or:[{blockerId:req.userId},{blockedId:req.userId}]}).lean();const blockedIds=blocked.flatMap(item=>[String(item.blockerId),String(item.blockedId)]);const following=await Follow.find({followerId:req.userId}).distinct('followingId');return ok(res,await User.find({_id:{$nin:[req.userId,...blockedIds,...following]}}).select('name username avatarUrl bio isVerified').sort({createdAt:-1}).limit(20));}));
export default router;
