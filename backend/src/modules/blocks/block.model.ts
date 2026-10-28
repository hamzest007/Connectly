import {Schema, model} from 'mongoose';

const blockSchema = new Schema({blockerId:{type:Schema.Types.ObjectId,ref:'User',required:true},blockedId:{type:Schema.Types.ObjectId,ref:'User',required:true}},{timestamps:true});
blockSchema.index({blockerId:1,blockedId:1},{unique:true});
export const Block = model('Block', blockSchema);

const relationSchema = new Schema({ownerId:{type:Schema.Types.ObjectId,ref:'User',required:true},targetId:{type:Schema.Types.ObjectId,ref:'User',required:true}},{timestamps:true});
relationSchema.index({ownerId:1,targetId:1},{unique:true});
export const Mute = model('Mute', relationSchema);
export const Restrict = model('Restrict', relationSchema);
