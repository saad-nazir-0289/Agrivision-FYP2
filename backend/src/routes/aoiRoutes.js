import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import { listAois, createAoi, setAoiUsers, deleteAoi } from '../controllers/aoiController.js';

const router = Router();

router.get('/', protect, listAois); // farmers get only their own AOIs, for their dropdown
router.post('/', protect, adminOnly, createAoi);
router.patch('/:id/users', protect, adminOnly, setAoiUsers);
router.delete('/:id', protect, adminOnly, deleteAoi);

export default router;