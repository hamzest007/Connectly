import {Router} from 'express';
import {asyncHandler} from '../../common/asyncHandler';
import {ok, HttpError} from '../../common/http';
import {AuthRequest, requireAuth} from '../../middleware/auth';
import {Block, Mute, Restrict} from './block.model';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(async (req: AuthRequest, res) => ok(res, await Block.find({blockerId:req.userId}).populate('blockedId','name username avatarUrl'))));
router.post('/:userId', asyncHandler(async (req: AuthRequest, res) => { if (req.userId === req.params.userId) throw new HttpError(400, 'You cannot block yourself.'); return ok(res, await Block.updateOne({blockerId:req.userId,blockedId:req.params.userId}, {$setOnInsert:{blockerId:req.userId,blockedId:req.params.userId}}, {upsert:true}), 201); }));
router.delete('/:userId', asyncHandler(async (req: AuthRequest, res) => ok(res, {deleted:(await Block.deleteOne({blockerId:req.userId,blockedId:req.params.userId})).deletedCount === 1})));

router.post('/mute/:userId', asyncHandler(async (req: AuthRequest, res) => ok(res, await Mute.updateOne({ownerId:req.userId,targetId:req.params.userId}, {$setOnInsert:{ownerId:req.userId,targetId:req.params.userId}}, {upsert:true}), 201)));
router.delete('/mute/:userId', asyncHandler(async (req: AuthRequest, res) => ok(res, {deleted:(await Mute.deleteOne({ownerId:req.userId,targetId:req.params.userId})).deletedCount === 1})));
router.post('/restrict/:userId', asyncHandler(async (req: AuthRequest, res) => ok(res, await Restrict.updateOne({ownerId:req.userId,targetId:req.params.userId}, {$setOnInsert:{ownerId:req.userId,targetId:req.params.userId}}, {upsert:true}), 201)));
router.delete('/restrict/:userId', asyncHandler(async (req: AuthRequest, res) => ok(res, {deleted:(await Restrict.deleteOne({ownerId:req.userId,targetId:req.params.userId})).deletedCount === 1})));

export default router;
