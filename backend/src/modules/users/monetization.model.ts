import {Schema, model} from 'mongoose';
const schema = new Schema({userId:{type:Schema.Types.ObjectId,ref:'User',required:true,unique:true},enabled:{type:Boolean,default:false},tipsEnabled:{type:Boolean,default:false},subscriptionsEnabled:{type:Boolean,default:false},virtualGiftsEnabled:{type:Boolean,default:false},payoutEmail:{type:String,default:'',trim:true}},{timestamps:true});
export const MonetizationProfile = model('MonetizationProfile', schema);
