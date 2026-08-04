const express = require('express');
const router = express.Router();
const {
  createSettlement,
  verifyOTP,
  cancelSettlement,
  getSettlements
} = require('../controllers/settlementController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/', createSettlement);
router.get('/', getSettlements);
router.post('/:id/verify', verifyOTP);
router.post('/:id/cancel', cancelSettlement);

module.exports = router;
