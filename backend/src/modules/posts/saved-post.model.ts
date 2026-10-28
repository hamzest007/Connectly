import {Schema, model} from 'mongoose';
const savedPostSchema = new Schema({userId:{type:Schema.Types.ObjectId,ref:'User',required:true},postId:{type:Schema.Types.ObjectId,ref:'Post',required:true}},{timestamps:true});
savedPostSchema.index({userId:1,postId:1},{unique:true});
export const SavedPost=model('SavedPost',savedPostSchema);
