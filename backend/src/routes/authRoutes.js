import { Router } from 'express';
import rateLimit from 'express-rate-limit';    // Protection for brute-force attack  30 request per 15 min window 
import { protect } from '../middleware/auth.js';
import * as auth from '../controllers/authController.js';

const router = Router();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  skip: () => process.env.NODE_ENV === 'test',
});

router.post('/register', limiter, auth.register);
router.post('/login', limiter, auth.login);
router.post('/forgot-password', limiter, auth.forgotPassword);
router.post('/reset-password', limiter, auth.resetPassword);
router.get('/me', protect, auth.me);

export default router;