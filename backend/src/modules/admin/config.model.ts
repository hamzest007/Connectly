import {Schema,model} from 'mongoose';
const schema=new Schema({key:{type:String,unique:true,default:'platform'},flags:{type:Schema.Types.Mixed,default:{}},limits:{type:Schema.Types.Mixed,default:{}},announcement:{type:String,default:''},supportedContentTypes:{type:[String],default:['text','photo','video','reel','story']}},{timestamps:true});
export const PlatformConfig=model('PlatformConfig',schema);
