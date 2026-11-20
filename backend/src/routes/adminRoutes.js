import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import { listUsers, setUserStatus, createAdmin } from '../controllers/userController.js';
import { getRules, updateRules } from '../controllers/alertRuleController.js';

const router = Router();

// Everything below this line requires a logged-in ADMIN.

router.use(protect, adminOnly);

router.get('/users', listUsers)
router.get('/alert-rules', getRules);;
router.post('/users', createAdmin);
router.patch('/users/:id/status', setUserStatus);
router.patch('/alert-rules', updateRules);

export default router;