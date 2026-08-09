const express = require('express');
const router = express.Router();
const {
  createGroup,
  joinGroup,
  getGroupInfo,
  setPayday,
  sendPaymentReminder,
  leaveGroup,
  deleteGroup
} = require('../controllers/groupController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/', createGroup);
router.post('/join', joinGroup);
router.get('/info', getGroupInfo);
router.put('/payday', setPayday);
router.post('/remind-member', sendPaymentReminder);
router.post('/leave', leaveGroup);
router.delete('/', deleteGroup);

module.exports = router;
