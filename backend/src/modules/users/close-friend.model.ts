import {Schema, model} from 'mongoose';
const schema = new Schema({userId:{type:Schema.Types.ObjectId,ref:'User',required:true},friendId:{type:Schema.Types.ObjectId,ref:'User',required:true}},{timestamps:true});
schema.index({userId:1,friendId:1},{unique:true});
export const CloseFriend = model('CloseFriend', schema);
