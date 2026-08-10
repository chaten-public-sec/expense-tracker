const express = require('express');
const router = express.Router();
const {
  createSettlement,
  approveSettlement,
  rejectSettlement,
  reuploadProof,
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
router.post('/:id/reupload-proof', reuploadProof);
router.delete('/:id/proof', deleteSettlementProof);
router.post('/:id/cancel', cancelSettlement);

module.exports = router;
