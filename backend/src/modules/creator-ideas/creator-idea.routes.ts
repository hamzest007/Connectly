import {Router} from 'express';
import {z} from 'zod';
import {asyncHandler} from '../../common/asyncHandler';
import {HttpError, ok} from '../../common/http';
import {AuthRequest, requireAuth} from '../../middleware/auth';
import {CreatorIdea} from './creator-idea.model';

const router = Router();
router.use(requireAuth);
const templates = [
  {kind: 'post', title: 'Behind the scenes', prompt: 'Show one honest moment behind your recent work and what you learned from it.', hashtags: ['#BehindTheScenes', '#CreatorJourney']},
  {kind: 'post', title: 'Community question', prompt: 'Ask your audience a specific question that helps you understand what they want next.', hashtags: ['#Community', '#Question']},
  {kind: 'reel', title: 'Three quick tips', prompt: 'Share three practical tips in under 30 seconds with a clear hook in the first frame.', hashtags: ['#QuickTips', '#Reels']},
  {kind: 'reel', title: 'Before and after', prompt: 'Create a visual transformation and explain the small choices that made the difference.', hashtags: ['#BeforeAndAfter', '#Process']},
  {kind: 'story', title: 'This or that', prompt: 'Use a poll to let followers choose between two ideas for your next post.', hashtags: ['#Poll', '#AskYourAudience']},
];
const ideaInput = z.object({kind: z.enum(['post', 'reel', 'story']), title: z.string().trim().min(2).max(140), prompt: z.string().trim().min(2).max(1000), hashtags: z.array(z.string().trim().max(60)).max(20).default([]), collection: z.string().trim().max(80).default(''), plannedFor: z.coerce.date().nullable().optional()});

router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const saved = await CreatorIdea.find({userId: req.userId, saved: true}).sort({plannedFor: 1, createdAt: -1}).lean();
  const tab = String(req.query.tab ?? 'for-you');
  const items = tab === 'saved' || tab === 'planner' ? saved.filter(item => tab === 'saved' || item.plannedFor) : templates;
  return ok(res, {items, source: 'templates', aiEnabled: false});
}));
router.post('/', asyncHandler(async (req: AuthRequest, res) => {
  const data = ideaInput.parse(req.body);
  const item = await CreatorIdea.findOneAndUpdate({userId: req.userId, title: data.title}, {$set: {...data, userId: req.userId, saved: true}}, {upsert: true, new: true, setDefaultsOnInsert: true});
  return ok(res, item, 201);
}));
router.patch('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const data = z.object({saved: z.boolean().optional(), collection: z.string().trim().max(80).optional(), plannedFor: z.coerce.date().nullable().optional()}).parse(req.body);
  const item = await CreatorIdea.findOneAndUpdate({_id: req.params.id, userId: req.userId}, data, {new: true});
  if (!item) throw new HttpError(404, 'Idea not found.');
  return ok(res, item);
}));
router.delete('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const result = await CreatorIdea.deleteOne({_id: req.params.id, userId: req.userId});
  return ok(res, {deleted: result.deletedCount === 1});
}));
export default router;
