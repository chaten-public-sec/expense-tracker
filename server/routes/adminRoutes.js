const express = require('express');
const router = express.Router();
const {
  getAdminStats,
  getAllGroups,
  deleteGroup,
  getAllUsers,
  deleteUser,
  getAllExpenses,
  deleteExpense,
} = require('../controllers/adminController');
const { protect, superAdminOnly } = require('../middleware/auth');

// All admin routes require authenticated user + Super Admin privilege
router.use(protect, superAdminOnly);

router.get('/stats', getAdminStats);
router.get('/groups', getAllGroups);
router.delete('/groups/:id', deleteGroup);
router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUser);
router.get('/expenses', getAllExpenses);
router.delete('/expenses/:id', deleteExpense);

module.exports = router;
