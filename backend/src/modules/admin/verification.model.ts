import {Schema,model} from 'mongoose';
const schema=new Schema({userId:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},reason:{type:String,required:true,maxlength:1000},status:{type:String,enum:['pending','approved','rejected'],default:'pending',index:true},reviewedBy:{type:Schema.Types.ObjectId,ref:'User',default:null},reviewedAt:{type:Date,default:null}},{timestamps:true});
schema.index({userId:1,status:1}); export const VerificationRequest=model('VerificationRequest',schema);
