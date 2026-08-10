const express = require('express');
const router = express.Router();
const {
  createGroup,
  joinGroup,
  getInvitePreview,
  joinGroupByToken,
  regenerateInviteToken,
  getGroupShareInfo,
  getGroupInfo,
  setPayday,
  sendPaymentReminder,
  leaveGroup,
  deleteGroup
} = require('../controllers/groupController');
const { protect } = require('../middleware/auth');

// Public preview route (can be previewed before logging in)
router.get('/preview-invite/:token', getInvitePreview);

// Protected routes
router.use(protect);

router.post('/', createGroup);
router.post('/join', joinGroup);
router.post('/join-by-token', joinGroupByToken);
router.post('/regenerate-invite-token', regenerateInviteToken);
router.get('/share-info', getGroupShareInfo);
router.get('/info', getGroupInfo);
router.put('/payday', setPayday);
router.post('/remind-member', sendPaymentReminder);
router.post('/leave', leaveGroup);
router.delete('/', deleteGroup);

module.exports = router;
