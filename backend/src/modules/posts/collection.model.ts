import {Schema, model} from 'mongoose';
const schema = new Schema({userId:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},name:{type:String,required:true,trim:true,maxlength:80},postIds:[{type:Schema.Types.ObjectId,ref:'Post'}]},{timestamps:true});
schema.index({userId:1,name:1},{unique:true});
export const Collection=model('Collection',schema);
