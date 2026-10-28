import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import { listUsers, setUserStatus, createAdmin } from '../controllers/userController.js';

const router = Router();

// Everything below this line requires a logged-in ADMIN.

router.use(protect, adminOnly);

router.get('/users', listUsers);
router.post('/users', createAdmin);
router.patch('/users/:id/status', setUserStatus);

export default router;