import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { calculate, getResult, history } from '../controllers/ndviController.js';

const router = Router();

router.use(protect);  //the controller limits farmers to their own AOIs
router.post('/calculate', calculate);
router.get('/', history);
router.get('/:id', getResult);

export default router;