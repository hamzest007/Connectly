import {Router} from 'express';
import {z} from 'zod';
import {asyncHandler} from '../../common/asyncHandler';
import {HttpError, ok} from '../../common/http';
import {AuthRequest, requireAdmin, requireAuth} from '../../middleware/auth';
import {User} from '../auth/auth.model';
import {Post, Comment, PostView, Reaction} from '../posts/post.model';
import {Report} from '../reports/report.model';
import {AuditLog} from './audit.model';
import {VerificationRequest} from './verification.model';
import {PlatformConfig} from './config.model';
import {Story} from '../stories/story.model';
import {Listing} from '../marketplace/marketplace.model';
import {Group, GroupMember} from '../groups/group.model';

const router=Router();
router.use(requireAuth, requireAdmin);

const audit = (req:AuthRequest, action:string, targetType:'user'|'post'|'reel'|'page'|'comment'|'report'|'story'|'listing'|'config'|'verification'|'group', targetId:string, metadata:Record<string,unknown>={}) => AuditLog.create({actorId:req.userId,action,targetType:targetType==='reel'?'post':targetType==='page'?'user':targetType,targetId,metadata});

router.get('/overview', asyncHandler(async(_req,res)=>{
  const [users,publishedPosts,openReports,suspended,dailyActiveUsers,engagement] = await Promise.all([User.countDocuments(),Post.countDocuments({status:'published'}),Report.countDocuments({status:{$in:['open','reviewing']}}),User.countDocuments({status:'suspended'}),PostView.distinct('userId',{viewedAt:{$gte:new Date(Date.now()-86400000)}}).then(ids=>ids.length),Post.aggregate([{$match:{status:'published'}},{$group:{_id:null,likes:{$sum:'$reactionCount'},comments:{$sum:'$commentCount'},shares:{$sum:'$shareCount'},views:{$sum:'$viewCount'}}}]).then(rows=>rows[0]??{likes:0,comments:0,shares:0,views:0})]);
  return ok(res,{users,publishedPosts,openReports,suspended,dailyActiveUsers,engagement});
}));

router.get('/analytics', asyncHandler(async(_req,res)=>{
  const since=new Date(Date.now()-86400000);
  const [dailyActiveUsers,newUsers,content,topCreators]=await Promise.all([
    PostView.distinct('userId',{viewedAt:{$gte:since}}).then(ids=>ids.length),
    User.countDocuments({createdAt:{$gte:since}}),
    Post.aggregate([{$group:{_id:null,views:{$sum:'$viewCount'},likes:{$sum:'$reactionCount'},comments:{$sum:'$commentCount'},shares:{$sum:'$shareCount'}}}]).then(r=>r[0]??{}),
    Post.aggregate([{$group:{_id:'$authorId',posts:{$sum:1},reach:{$sum:'$reachCount'},engagement:{$sum:{$add:['$reactionCount','$commentCount','$shareCount']}}}},{$sort:{engagement:-1}},{$limit:5},{$lookup:{from:'users',localField:'_id',foreignField:'_id',as:'user'}},{$unwind:'$user'},{$project:{name:'$user.name',username:'$user.username',posts:1,reach:1,engagement:1}}])
  ]);
  return ok(res,{dailyActiveUsers,newUsers,content,topCreators});
}));

router.get('/users', asyncHandler(async(req,res)=>{
  const limit=Math.min(Math.max(Number(req.query.limit??25),1),100); const q=String(req.query.q??'').trim(); const filter:any=q?{$or:[{name:{$regex:q,$options:'i'}},{username:{$regex:q,$options:'i'}},{email:{$regex:q,$options:'i'}}]}:{};
  const users=await User.find(filter).select('name username email role status accountType pageEnabled pageName pageUsername privateAccount isVerified createdAt suspendedUntil suspensionReason').sort({createdAt:-1}).limit(limit);
  return ok(res,{items:users});
}));

router.get('/content', asyncHandler(async(req,res)=>{
  const type=z.enum(['all','posts','reels','stories','listings']).catch('all').parse(String(req.query.type??'all'));
  const limit=Math.min(Math.max(Number(req.query.limit??50),1),100); const items:any[]=[];
  if(type==='all'||type==='posts'||type==='reels'){const filter:any={status:'published',isReel:type==='reels'?true:type==='posts'?false:{$in:[true,false]}}; const posts=await Post.find(filter).sort({createdAt:-1}).limit(limit).populate('authorId','name username'); items.push(...posts.map(item=>({...item.toObject(),contentType:item.isReel?'reel':'post'})));}
  if(type==='all'||type==='stories'){const stories=await Story.find({expiresAt:{$gt:new Date()},archived:false}).sort({createdAt:-1}).limit(limit).populate('authorId','name username'); items.push(...stories.map(item=>({...item.toObject(),contentType:'story'})));}
  if(type==='all'||type==='listings'){const listings=await Listing.find({status:{$ne:'archived'}}).sort({createdAt:-1}).limit(limit).populate('sellerId','name username'); items.push(...listings.map(item=>({...item.toObject(),contentType:'listing'})));}
  return ok(res,items.sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()).slice(0,limit));
}));

router.delete('/content/:type/:id', asyncHandler(async(req:AuthRequest,res)=>{const type=z.enum(['post','story','listing']).parse(String(req.params.type)); const id=String(req.params.id); let deleted=false;
  if(type==='post') deleted=(await Post.findByIdAndDelete(id))!==null;
  if(type==='story') deleted=(await Story.findByIdAndUpdate(id,{archived:true}))!==null;
  if(type==='listing') deleted=(await Listing.findByIdAndUpdate(id,{status:'archived'}))!==null;
  if(!deleted)throw new HttpError(404,'Content not found.'); await audit(req,'remove_content',type,id); return ok(res,{deleted:true});
}));

router.get('/groups', asyncHandler(async(req,res)=>{
  const q=String(req.query.q??'').trim(); const limit=Math.min(Math.max(Number(req.query.limit??50),1),100);
  const filter:any=q?{$or:[{name:{$regex:q,$options:'i'}},{description:{$regex:q,$options:'i'}}]}:{};
  const groups=await Group.find(filter).sort({createdAt:-1}).limit(limit).populate('createdBy','name username');
  const items=await Promise.all(groups.map(async group=>({...(group.toObject()),posts:await Post.countDocuments({groupId:group._id,status:'published'}),activeMembers:await GroupMember.countDocuments({groupId:group._id,status:'active'})})));
  return ok(res,items);
}));
router.patch('/groups/:id', asyncHandler(async(req:AuthRequest,res)=>{
  const data=z.object({visibility:z.enum(['public','private','invite-only']).optional(),description:z.string().trim().max(1000).optional()}).parse(req.body);
  const group=await Group.findByIdAndUpdate(req.params.id,data,{new:true,runValidators:true}).populate('createdBy','name username');
  if(!group)throw new HttpError(404,'Group not found.'); await audit(req,'update_group','group',String(group._id),data); return ok(res,group);
}));

router.patch('/users/:id/status', asyncHandler(async(req:AuthRequest,res)=>{
  const data=z.object({status:z.enum(['active','suspended']),reason:z.string().trim().max(500).default(''),days:z.number().int().min(1).max(365).optional()}).parse(req.body);
  if(req.params.id===req.userId) throw new HttpError(400,'You cannot suspend your own admin account.');
  const suspendedUntil=data.status==='suspended' ? new Date(Date.now()+(data.days??30)*86400000) : null;
  const id=String(req.params.id); const user=await User.findByIdAndUpdate(id,{status:data.status,suspensionReason:data.reason,suspendedUntil},{new:true}).select('name username email role status suspendedUntil suspensionReason');
  if(!user) throw new HttpError(404,'User not found.'); await audit(req,data.status==='suspended'?'suspend_user':'restore_user','user',id,{reason:data.reason,days:data.days}); return ok(res,user);
}));

router.patch('/users/:id/role', asyncHandler(async(req:AuthRequest,res)=>{
  const data=z.object({role:z.enum(['user','moderator','admin'])}).parse(req.body); const id=String(req.params.id); const user=await User.findByIdAndUpdate(id,{role:data.role},{new:true}).select('name username email role status'); if(!user)throw new HttpError(404,'User not found.'); await audit(req,'change_role','user',id,{role:data.role}); return ok(res,user);
}));

router.patch('/users/:id/profile-settings', asyncHandler(async(req:AuthRequest,res)=>{
  const data=z.object({accountType:z.enum(['user','page']).optional(),privateAccount:z.boolean().optional()}).refine(value=>Object.keys(value).length>0,{message:'Provide at least one profile setting.'}).parse(req.body);
  const user=await User.findByIdAndUpdate(req.params.id,data,{new:true,runValidators:true}).select('name username email role status accountType privateAccount');
  if(!user)throw new HttpError(404,'User not found.');
  await audit(req,'update_profile_settings','user',String(user._id),data);
  return ok(res,user);
}));

router.get('/reports', asyncHandler(async(req,res)=>{const status=z.enum(['all','open','reviewing','resolved','dismissed']).catch('all').parse(String(req.query.status??'all')); const filter=status==='all'?{}:{status}; const reports=await Report.find(filter).sort({priority:-1,createdAt:1}).limit(100).populate('reporterId','name username email').populate('assignedTo','name username'); return ok(res,reports);}));

router.patch('/reports/:id', asyncHandler(async(req:AuthRequest,res)=>{const data=z.object({status:z.enum(['reviewing','resolved','dismissed']).optional(),priority:z.enum(['low','normal','high','urgent']).optional(),assignedTo:z.string().nullable().optional(),decisionNote:z.string().max(1000).optional(),removeTarget:z.boolean().default(false)}).parse(req.body); const id=String(req.params.id); const update:any={}; for(const key of ['status','priority','decisionNote','assignedTo'] as const) if(data[key]!==undefined) update[key]=data[key]; const report=await Report.findByIdAndUpdate(id,update,{new:true}).populate('assignedTo','name username'); if(!report)throw new HttpError(404,'Report not found.'); if(data.removeTarget && (report.targetType==='post'||report.targetType==='reel')) await Post.findByIdAndDelete(report.targetId); if(data.removeTarget && report.targetType==='comment') await Comment.findByIdAndDelete(report.targetId); if(data.removeTarget && (report.targetType==='user'||report.targetType==='page')) await User.findByIdAndUpdate(report.targetId,{status:'suspended',suspensionReason:'Removed after moderation review',suspendedUntil:new Date(Date.now()+30*86400000)}); await audit(req,'review_report','report',id,{...data}); return ok(res,report);}));

router.get('/verification', asyncHandler(async(req,res)=>ok(res,await VerificationRequest.find({status:String(req.query.status??'pending')}).sort({createdAt:1}).limit(100).populate('userId','name username email avatarUrl isVerified'))));
router.patch('/verification/:id', asyncHandler(async(req:AuthRequest,res)=>{const data=z.object({status:z.enum(['approved','rejected'])}).parse(req.body); const id=String(req.params.id); const item=await VerificationRequest.findByIdAndUpdate(id,{status:data.status,reviewedBy:req.userId,reviewedAt:new Date()},{new:true}).populate('userId','name username email isVerified'); if(!item)throw new HttpError(404,'Verification request not found.'); await User.findByIdAndUpdate(item.userId,{isVerified:data.status==='approved'}); await audit(req,'review_verification','verification',id,{status:data.status}); return ok(res,item);}));
router.get('/config', asyncHandler(async(_req,res)=>ok(res,await PlatformConfig.findOneAndUpdate({key:'platform'},{$setOnInsert:{key:'platform'}},{new:true,upsert:true}))));
router.patch('/config', asyncHandler(async(req:AuthRequest,res)=>{const data=z.object({flags:z.record(z.string(),z.boolean()).optional(),limits:z.record(z.string(),z.number()).optional(),announcement:z.string().max(500).optional(),supportedContentTypes:z.array(z.string()).max(20).optional()}).parse(req.body); const config=await PlatformConfig.findOneAndUpdate({key:'platform'},{$set:data},{new:true,upsert:true}); await audit(req,'update_platform_config','config',String(config._id),data); return ok(res,config);}));

router.delete('/posts/:id', asyncHandler(async(req:AuthRequest,res)=>{const id=String(req.params.id); const post=await Post.findByIdAndDelete(id); if(!post)throw new HttpError(404,'Post not found.'); await Comment.deleteMany({postId:id}); await audit(req,'remove_post','post',id); return ok(res,{deleted:true});}));
router.get('/audit-logs', asyncHandler(async(_req,res)=>ok(res,await AuditLog.find().sort({createdAt:-1}).limit(100).populate('actorId','name username role'))));

export default router;
