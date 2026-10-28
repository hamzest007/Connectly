import {Schema, model} from 'mongoose';

const auditSchema = new Schema({
  actorId:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},
  action:{type:String,required:true,index:true},
  targetType:{type:String,enum:['user','post','comment','report','story','listing','config','verification','group'],required:true},
  targetId:{type:Schema.Types.ObjectId,required:true},
  metadata:{type:Schema.Types.Mixed,default:{}},
  integrityHash:{type:String,required:true,index:true},
  previousHash:{type:String,default:''}
  ,ip:{type:String,default:''}
  ,userAgent:{type:String,default:''}
},{timestamps:true});

auditSchema.index({createdAt:-1});
export const AuditLog = model('AuditLog', auditSchema);
