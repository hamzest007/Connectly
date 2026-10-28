import {Schema, model} from 'mongoose';

const recentSearchSchema = new Schema({userId:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},query:{type:String,trim:true,lowercase:true,required:true},kind:{type:String,enum:['all','users','posts','reels','hashtags','topics'],default:'all'}},{timestamps:true});
recentSearchSchema.index({userId:1,query:1},{unique:true});
export const RecentSearch = model('RecentSearch', recentSearchSchema);
