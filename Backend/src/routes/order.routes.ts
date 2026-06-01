import express from 'express';
import {
  addOrderItems,
  getOrderById,
  getMyOrders,
} from '../controllers/order.controller';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.route('/').post(protect, addOrderItems);
router.route('/myorders').get(protect, getMyOrders);
router.route('/:id').get(protect, getOrderById);

export default router;
