const express = require('express');
const router = express.Router();
const {
  getAdminStats,
  // Users
  getAllUsers,
  getUserDetails,
  updateUser,
  changeUserPassword,
  deleteUser,
  // Groups
  getAllGroups,
  getGroupDetails,
  updateGroup,
  removeGroupMember,
  deleteGroup,
  // Expenses
  getAllExpenses,
  getExpenseDetails,
  updateExpense,
  deleteExpense,
  // Settlements
  getAllSettlements,
  adminSettlementAction,
  // Activities
  getAllActivities,
} = require('../controllers/adminController');
const { protect, superAdminOnly } = require('../middleware/auth');

// All admin routes strictly require authentication + Super Admin status
router.use(protect, superAdminOnly);

// 1. Dashboard Overview
router.get('/stats', getAdminStats);

// 2. User Management
router.get('/users', getAllUsers);
router.get('/users/:id', getUserDetails);
router.put('/users/:id', updateUser);
router.post('/users/:id/password', changeUserPassword);
router.delete('/users/:id', deleteUser);

// 3. Group Management
router.get('/groups', getAllGroups);
router.get('/groups/:id', getGroupDetails);
router.put('/groups/:id', updateGroup);
router.delete('/groups/:id/members/:userId', removeGroupMember);
router.delete('/groups/:id', deleteGroup);

// 4. Expense Management
router.get('/expenses', getAllExpenses);
router.get('/expenses/:id', getExpenseDetails);
router.put('/expenses/:id', updateExpense);
router.delete('/expenses/:id', deleteExpense);

// 5. Settlement Management
router.get('/settlements', getAllSettlements);
router.post('/settlements/:id/action', adminSettlementAction);

// 6. Audit Logs
router.get('/activities', getAllActivities);

module.exports = router;
