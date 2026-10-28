import {Router} from 'express';
import crypto from 'node:crypto';
import {asyncHandler} from '../../common/asyncHandler';
import {HttpError, ok} from '../../common/http';
import {env} from '../../config/env';
import {requireAuth} from '../../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/signature', asyncHandler(async (_req, res) => {
  if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) throw new HttpError(503, 'Media storage is not configured.');
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = 'connectly/posts';
  const signature = crypto.createHash('sha1').update(`folder=${folder}&timestamp=${timestamp}${env.cloudinaryApiSecret}`).digest('hex');
  return ok(res, {cloudName: env.cloudinaryCloudName, apiKey: env.cloudinaryApiKey, timestamp, folder, signature});
}));

export default router;
