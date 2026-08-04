const express = require('express');
const router = express.Router();
const {
  createGroup,
  joinGroup,
  getGroupInfo,
  leaveGroup,
  deleteGroup
} = require('../controllers/groupController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/', createGroup);
router.post('/join', joinGroup);
router.get('/info', getGroupInfo);
router.post('/leave', leaveGroup);
router.delete('/', deleteGroup);

module.exports = router;
