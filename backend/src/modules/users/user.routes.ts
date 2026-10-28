import {Router} from 'express';
import {z} from 'zod';
import {asyncHandler} from '../../common/asyncHandler';
import {ok, HttpError} from '../../common/http';
import {AuthRequest, requireAuth} from '../../middleware/auth';
import {User, RecommendationPreferences} from '../auth/auth.model';
import {Follow} from '../friends/follow.model';
import {Post, RecommendationFeedback} from '../posts/post.model';
import {CloseFriend} from './close-friend.model';
import {MonetizationProfile} from './monetization.model';
import {Friendship} from '../friends/friend.model';
import {CollaborationRequest} from './collaboration-request.model';

const router = Router();
router.use(requireAuth);
const publicFields = 'name username email bio avatarUrl coverUrl website location country education maritalStatus privateAccount isVerified accountType pageEnabled pageName pageUsername pageCategory pageWebsite pageEmail pagePhone pageLocation pageCountry theme accentColor profileLayout featuredSections createdAt';

router.get('/me', asyncHandler(async (req:AuthRequest, res) => ok(res, await User.findById(req.userId).select(publicFields))));
router.get('/me/recommendation-preferences', asyncHandler(async (req:AuthRequest, res) => ok(res, await RecommendationPreferences.findOneAndUpdate({userId:req.userId},{},{upsert:true,new:true,setDefaultsOnInsert:true}).select('-userId'))));
router.patch('/me/recommendation-preferences', asyncHandler(async (req:AuthRequest, res) => {
  const data=z.object({chronological:z.boolean().optional(),showReasons:z.boolean().optional(),mutedKeywords:z.array(z.string().trim().min(1).max(40)).max(100).optional()}).parse(req.body);
  if (data.mutedKeywords) data.mutedKeywords=[...new Set(data.mutedKeywords.map(value=>value.toLowerCase()).filter(Boolean))];
  return ok(res, await RecommendationPreferences.findOneAndUpdate({userId:req.userId},data,{upsert:true,new:true,setDefaultsOnInsert:true}).select('-userId'));
}));
router.post('/me/recommendation-preferences/reset', asyncHandler(async (req:AuthRequest, res) => { await Promise.all([RecommendationPreferences.findOneAndUpdate({userId:req.userId},{chronological:false,showReasons:true,mutedKeywords:[]},{upsert:true}), RecommendationFeedback.deleteMany({userId:req.userId})]); return ok(res,{reset:true}); }));
router.get('/me/creator-dashboard', asyncHandler(async (req:AuthRequest, res) => {
  const [summary] = await Post.aggregate([
    {$match: {authorId: req.userId, status: 'published', archived: {$ne: true}}},
    {$group: {_id: null, posts: {$sum: 1}, likes: {$sum: '$reactionCount'}, comments: {$sum: '$commentCount'}, shares: {$sum: '$shareCount'}, views: {$sum: '$viewCount'}, reach: {$sum: '$reachCount'}}},
  ]);
  return ok(res, summary ?? {posts: 0, likes: 0, comments: 0, shares: 0, views: 0, reach: 0});
}));
router.get('/me/creator-studio', asyncHandler(async (req:AuthRequest, res) => {
  const [summary] = await Post.aggregate([{$match:{authorId:req.userId,archived:{$ne:true}}},{$group:{_id:null,posts:{$sum:1},views:{$sum:'$viewCount'},reach:{$sum:'$reachCount'},likes:{$sum:'$reactionCount'},comments:{$sum:'$commentCount'},shares:{$sum:'$shareCount'},watchTimeSeconds:{$sum:'$watchTimeSeconds'}}}]);
  const [followers, topPosts, scheduled, drafts, collaborationRequests, monetization] = await Promise.all([
    Follow.countDocuments({followingId:req.userId}),
    Post.find({authorId:req.userId,status:'published',archived:{$ne:true}}).select('body reactionCount commentCount shareCount viewCount watchTimeSeconds createdAt media').sort({reactionCount:-1,commentCount:-1,shareCount:-1}).limit(5),
    Post.find({authorId:req.userId,status:'scheduled'}).select('body scheduledFor media').sort({scheduledFor:1}).limit(50),
    Post.find({authorId:req.userId,status:'draft'}).select('body updatedAt media').sort({updatedAt:-1}).limit(50),
    CollaborationRequest.find({creatorId:req.userId}).sort({createdAt:-1}).limit(50),
    MonetizationProfile.findOneAndUpdate({userId:req.userId},{},{upsert:true,new:true,setDefaultsOnInsert:true}),
  ]);
  return ok(res,{summary:summary??{posts:0,views:0,reach:0,likes:0,comments:0,shares:0,watchTimeSeconds:0},followers,topPosts,scheduled,drafts,mediaLibrary:topPosts.flatMap(post=>post.media??[]),collaborationRequests,monetization});
}));
router.patch('/me/collaboration-requests/:id', asyncHandler(async (req:AuthRequest,res) => {
  const status=z.enum(['accepted','declined']).parse(req.body?.status);
  const request=await CollaborationRequest.findOneAndUpdate({_id:req.params.id,creatorId:req.userId},{status},{new:true});
  if(!request) throw new HttpError(404,'Collaboration request not found.');
  return ok(res,request);
}));
router.get('/me/page-dashboard', asyncHandler(async (req:AuthRequest, res) => {
  const user=await User.findById(req.userId).select('pageEnabled accountType pageName pageUsername');
  if(!user) throw new HttpError(404,'User not found.');
  if(!user.pageEnabled) throw new HttpError(400,'Create a Page before opening the Page dashboard.');
  const [summary,followers,monetization,followerGrowth,topPosts,followerList]=await Promise.all([
    Post.aggregate([{$match:{authorId:user._id,publisherType:'page',status:'published',archived:{$ne:true}}},{$group:{_id:null,posts:{$sum:1},likes:{$sum:'$reactionCount'},comments:{$sum:'$commentCount'},shares:{$sum:'$shareCount'},views:{$sum:'$viewCount'},reach:{$sum:'$reachCount'}}}]).then(rows=>rows[0]??{posts:0,likes:0,comments:0,shares:0,views:0,reach:0}),
    Follow.countDocuments({followingId:user._id}),
    MonetizationProfile.findOneAndUpdate({userId:req.userId},{},{upsert:true,new:true,setDefaultsOnInsert:true}),
    Follow.aggregate([{$match:{followingId:user._id,createdAt:{$gte:new Date(Date.now()-7*86400000)}}},{$group:{_id:{$dateToString:{format:'%Y-%m-%d',date:'$createdAt'}},count:{$sum:1}}},{$sort:{_id:1}}]),
    Post.find({authorId:user._id,publisherType:'page',status:'published',archived:{$ne:true}}).select('body reactionCount commentCount shareCount viewCount createdAt').sort({createdAt:-1}).limit(5),
    Follow.find({followingId:user._id}).sort({createdAt:-1}).limit(100).populate('followerId','name username avatarUrl accountType'),
  ]);
  return ok(res,{page:{name:user.pageName,username:user.pageUsername,active:user.accountType==='page'},followers,engagement:summary,monetization,followerGrowth,topPosts,followerList});
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
  const data=z.object({enabled:z.boolean().optional(),tipsEnabled:z.boolean().optional(),subscriptionsEnabled:z.boolean().optional(),virtualGiftsEnabled:z.boolean().optional(),payoutEmail:z.string().email().or(z.literal('')).optional()}).parse(req.body);
  return ok(res, await MonetizationProfile.findOneAndUpdate({userId:req.userId},data,{upsert:true,new:true,setDefaultsOnInsert:true}));
}));
router.post('/me/page', asyncHandler(async (req:AuthRequest, res) => {
  const data = z.object({name:z.string().trim().min(2).max(80),username:z.string().trim().min(3).max(30).regex(/^[a-z0-9._]+$/i),bio:z.string().trim().max(280).default(''),category:z.string().trim().max(80).default(''),website:z.string().trim().max(180).default(''),email:z.string().email().or(z.literal('')).default(''),phone:z.string().trim().max(40).default(''),location:z.string().trim().max(120).default(''),country:z.string().trim().max(80).default('')}).parse(req.body);
  const user = await User.findById(req.userId);
  if (!user) throw new HttpError(404, 'User not found.');
  if (user.pageEnabled) throw new HttpError(409, 'You already have a Page.');
  if (await User.exists({username:data.username.toLowerCase(),_id:{$ne:user._id}})) throw new HttpError(409, 'That Page username is already taken.');
  user.personalName=user.name; user.personalUsername=user.username; user.personalBio=user.bio; user.personalAvatarUrl=user.avatarUrl; user.personalCoverUrl=user.coverUrl;
  user.pageEnabled=true; user.pageName=data.name; user.pageUsername=data.username.toLowerCase(); user.pageBio=data.bio; user.pageCategory=data.category; user.pageWebsite=data.website; user.pageEmail=data.email; user.pagePhone=data.phone; user.pageLocation=data.location; user.pageCountry=data.country;
  await user.save(); return ok(res, await User.findById(user._id).select(publicFields));
}));
router.patch('/me/page-mode', asyncHandler(async (req:AuthRequest, res) => {
  const mode=z.enum(['personal','page']).parse(req.body.mode); const user=await User.findById(req.userId);
  if(!user) throw new HttpError(404,'User not found.');
  if(mode==='page'&&!user.pageEnabled) throw new HttpError(400,'Create a Page before switching to Page mode.');
  if(mode==='page'&&user.accountType!=='page'){user.personalName=user.name;user.personalUsername=user.username;user.personalBio=user.bio;user.personalAvatarUrl=user.avatarUrl;user.personalCoverUrl=user.coverUrl;user.name=user.pageName;user.username=user.pageUsername;user.bio=user.pageBio;user.avatarUrl=user.pageAvatarUrl;user.coverUrl=user.pageCoverUrl;user.accountType='page';}
  if(mode==='personal'&&user.accountType==='page'){user.pageName=user.name;user.pageUsername=user.username;user.pageBio=user.bio;user.pageAvatarUrl=user.avatarUrl;user.pageCoverUrl=user.coverUrl;user.name=user.personalName;user.username=user.personalUsername;user.bio=user.personalBio;user.avatarUrl=user.personalAvatarUrl;user.coverUrl=user.personalCoverUrl;user.accountType='user';}
  await user.save(); return ok(res, await User.findById(user._id).select(publicFields));
}));
router.patch('/me', asyncHandler(async (req:AuthRequest, res) => {
  const data = z.object({name:z.string().trim().min(2).max(80).optional(),bio:z.string().trim().max(280).optional(),avatarUrl:z.string().url().optional(),coverUrl:z.string().url().optional(),website:z.string().trim().max(180).optional(),location:z.string().trim().max(120).optional(),country:z.string().trim().max(80).optional(),education:z.string().trim().max(160).optional(),maritalStatus:z.string().trim().max(40).optional(),privateAccount:z.boolean().optional(),theme:z.enum(['light','dark','system']).optional(),accentColor:z.string().regex(/^#[0-9a-f]{6}$/i).optional(),profileLayout:z.enum(['standard','compact','featured']).optional(),featuredSections:z.array(z.string().max(40)).max(12).optional()}).parse(req.body);
  const user=await User.findById(req.userId); if(!user) throw new HttpError(404,'User not found.'); Object.assign(user,data);
  if(user.accountType==='page'){if(data.name!==undefined)user.pageName=data.name;if(data.bio!==undefined)user.pageBio=data.bio;if(data.avatarUrl!==undefined)user.pageAvatarUrl=data.avatarUrl;if(data.coverUrl!==undefined)user.pageCoverUrl=data.coverUrl;} else {if(data.name!==undefined)user.personalName=data.name;if(data.bio!==undefined)user.personalBio=data.bio;if(data.avatarUrl!==undefined)user.personalAvatarUrl=data.avatarUrl;if(data.coverUrl!==undefined)user.personalCoverUrl=data.coverUrl;}
  await user.save(); return ok(res, await User.findById(user._id).select(publicFields));
}));
router.get('/search', asyncHandler(async (req:AuthRequest,res) => { const q=String(req.query.q??'').trim(); if(!q)return ok(res,[]); return ok(res,await User.find({_id:{$ne:req.userId},$or:[{name:{$regex:q,'$options':'i'}},{username:{$regex:q,'$options':'i'}}]}).select('name username avatarUrl isVerified privateAccount accountType').limit(20)); }));
router.get('/:username/followers', asyncHandler(async (req:AuthRequest,res) => { const user=await User.findOne({username:req.params.username}).select('_id'); if(!user)return ok(res,[]); return ok(res,await Follow.find({followingId:user._id}).sort({createdAt:-1}).limit(100).populate('followerId','name username avatarUrl isVerified')); }));
router.get('/:username/following', asyncHandler(async (req:AuthRequest,res) => { const user=await User.findOne({username:req.params.username}).select('_id'); if(!user)return ok(res,[]); return ok(res,await Follow.find({followerId:user._id}).sort({createdAt:-1}).limit(100).populate('followingId','name username avatarUrl isVerified')); }));
router.get('/:username/friends', asyncHandler(async (req:AuthRequest,res) => { const user=await User.findOne({username:req.params.username}).select('_id privateAccount'); if(!user)return ok(res,[]); if(user.privateAccount&&String(user._id)!==req.userId)return ok(res,[]); const items=await Friendship.find({status:'accepted',$or:[{requesterId:user._id},{recipientId:user._id}]}).sort({updatedAt:-1}).limit(100).populate('requesterId','name username avatarUrl accountType').populate('recipientId','name username avatarUrl accountType'); return ok(res,items.map(item=>String(item.requesterId._id)===String(user._id)?item.recipientId:item.requesterId)); }));
router.get('/:username/posts', asyncHandler(async (req:AuthRequest,res) => { const user=await User.findOne({username:req.params.username}).select('_id privateAccount accountType'); if(!user)return ok(res,[]); const isSelf=String(user._id)===req.userId; if(user.privateAccount&&!isSelf)return ok(res,[]); const publisherFilter=user.accountType==='page'?{publisherType:'page'}:{$or:[{publisherType:'personal'},{publisherType:{$exists:false}}]}; return ok(res,await Post.find({authorId:user._id,...publisherFilter,status:'published',archived:{$ne:true},audience:{$in:isSelf?['public','friends','private']:['public']}}).sort({createdAt:-1}).limit(50).populate('authorId','name username avatarUrl isVerified')); }));
router.get('/:username', asyncHandler(async (req:AuthRequest,res) => {
  const user=await User.findOne({username:req.params.username}).select(publicFields); if(!user)return ok(res,null); const isSelf=String(user._id)===req.userId; const publisherFilter=user.accountType==='page'?{publisherType:'page'}:{$or:[{publisherType:'personal'},{publisherType:{$exists:false}}]}; const postFilter={authorId:user._id,...publisherFilter,status:'published',archived:{$ne:true},audience:{$in:isSelf?['public','friends','private']:['public']}};
  const [followersCount,followingCount,postCount,isFollowing,friendship]=await Promise.all([Follow.countDocuments({followingId:user._id}),Follow.countDocuments({followerId:user._id}),Post.countDocuments(postFilter),Follow.exists({followerId:req.userId,followingId:user._id}),Friendship.findOne({$or:[{requesterId:req.userId,recipientId:user._id},{requesterId:user._id,recipientId:req.userId}]}).select('status requesterId')]);
  const profile=user.toObject(); const {email,...publicProfile}=profile; return ok(res,{...(isSelf?profile:publicProfile),isSelf,followersCount,followingCount,postCount:user.privateAccount&&!isSelf?0:postCount,isFollowing:Boolean(isFollowing),friendStatus:friendship?.status??'none',friendRequesterId:friendship?.requesterId?String(friendship.requesterId):null});
}));
export default router;
