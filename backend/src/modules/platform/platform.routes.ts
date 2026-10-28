import {Router} from 'express';
import {asyncHandler} from '../../common/asyncHandler';
import {ok} from '../../common/http';
import {requireAuth, AuthRequest} from '../../middleware/auth';
import {PlatformConfig} from '../admin/config.model';

const router = Router();
router.use(requireAuth);

router.get('/config', asyncHandler(async (_req: AuthRequest, res) => {
  const config = await PlatformConfig.findOne({key: 'platform'}).lean();
  return ok(res, {
    announcement: config?.announcement ?? '',
    flags: config?.flags ?? {},
    supportedContentTypes: config?.supportedContentTypes ?? ['text', 'photo', 'video', 'reel', 'story'],
  });
}));

export default router;
