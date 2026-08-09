const express = require('express');
const router = express.Router();
const {
  createSettlement,
  approveSettlement,
  rejectSettlement,
  deleteSettlementProof,
  cancelSettlement,
  getSettlements
} = require('../controllers/settlementController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/', createSettlement);
router.get('/', getSettlements);
router.post('/:id/approve', approveSettlement);
router.post('/:id/reject', rejectSettlement);
router.delete('/:id/proof', deleteSettlementProof);
router.post('/:id/cancel', cancelSettlement);

module.exports = router;
