import {Schema, model} from 'mongoose';
const friendSchema = new Schema({requesterId:{type:Schema.Types.ObjectId,ref:'User',required:true},recipientId:{type:Schema.Types.ObjectId,ref:'User',required:true},status:{type:String,enum:['pending','accepted','declined','blocked'],default:'pending'}},{timestamps:true});
friendSchema.index({requesterId:1,recipientId:1},{unique:true}); friendSchema.index({recipientId:1,status:1});
export const Friendship=model('Friendship',friendSchema);
