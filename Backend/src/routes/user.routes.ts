import express from 'express';
import {
  authUser,
  registerUser,
  getUserProfile,
} from '../controllers/user.controller';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', registerUser);
router.post('/login', authUser);
router.route('/profile').get(protect, getUserProfile);

export default router;
