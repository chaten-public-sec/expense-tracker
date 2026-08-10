const Expense = require('../models/Expense');
const GroupMember = require('../models/GroupMember');
const Activity = require('../models/Activity');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');
const { emitToGroup, emitToUsers } = require('../socket/socketManager');
const { sendPushToGroup, sendPushToUsers } = require('../services/pushService');
const { indexExpenseAsync, deleteExpenseIndexAsync } = require('../rag/expenseIndexer');
const { createNotificationRecord } = require('./notificationController');

// Helper to compute split details array
const computeSplits = async (groupId, amount, splitType, splitBetween, paidBy) => {
  let targetUserIds = [];

  if (splitType === 'everyone' || !splitBetween || splitBetween.length === 0) {
    const members = await GroupMember.find({ groupId });
    targetUserIds = members.map(m => m.userId.toString());
  } else {
    targetUserIds = splitBetween.map(id => id.toString());
  }

  if (targetUserIds.length === 0) {
    throw new Error('At least one member must be selected for expense split');
  }

  const individualShare = Math.round((amount / targetUserIds.length) * 100) / 100;

  const splitDetails = targetUserIds.map(uId => ({
    user: uId,
    share: individualShare
  }));

  return { splitBetween: targetUserIds, splitDetails };
};

// @desc Create a new expense
// @route POST /api/expenses
const createExpense = async (req, res) => {
  try {
    const { title, amount, paidBy, splitType, splitBetween, paymentMode, notes, screenshotUrl, screenshotPublicId, date } = req.body;

    if (req.user.isSuperAdmin || req.user.email === 'admin@gmail.com') {
      return res.status(403).json({ message: 'Super Admin accounts cannot create personal expenses in user groups.' });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Expense title is required' });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: 'Valid expense amount is required' });
    }

    // Validate expense date if provided (cannot be in the future, allowing timezone tolerance)
    let expenseDate = new Date();
    if (date !== undefined && date !== null && date !== '') {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ message: 'Invalid expense date provided' });
      }
      // Allow current day with 24-hour buffer for timezones
      const nowWithBuffer = new Date(Date.now() + 24 * 60 * 60 * 1000);
      if (parsedDate > nowWithBuffer) {
        return res.status(400).json({ message: 'Expense date cannot be in the future' });
      }
      expenseDate = parsedDate;
    }

    // Find active group
    const membership = await GroupMember.findOne({ userId: req.user._id });
    if (!membership) {
      return res.status(400).json({ message: 'You are not part of any group.' });
    }

    const groupId = membership.groupId;
    const payerId = paidBy || req.user._id.toString();

    const { splitBetween: finalSplitBetween, splitDetails } = await computeSplits(
      groupId,
      numAmount,
      splitType || 'everyone',
      splitBetween,
      payerId
    );

    const expense = await Expense.create({
      groupId,
      title: title.trim(),
      amount: numAmount,
      paidBy: payerId,
      splitType: splitType || 'everyone',
      splitBetween: finalSplitBetween,
      splitDetails,
      paymentMode: paymentMode || 'cash',
      screenshotUrl: screenshotUrl || null,
      screenshotPublicId: screenshotPublicId || null,
      notes: notes || '',
      date: expenseDate
    });

    const populatedExpense = await Expense.findById(expense._id)
      .populate('paidBy', 'fullName email phone upiId qrCodeUrl')
      .populate('splitDetails.user', 'fullName email phone upiId qrCodeUrl');

    // Create activity log
    await Activity.create({
      groupId,
      user: req.user._id,
      action: `added "${expense.title}" ₹${expense.amount}`
    });

    // --- Socket.IO + Push Notification ---
    const perPersonShare = Math.round((numAmount / finalSplitBetween.length) * 100) / 100;
    const splitTypeLabel = splitType === 'everyone' ? 'equal group share' : 'custom split share';

    const notificationData = {
      type: 'expense:created',
      expense: populatedExpense,
      message: `${req.user.fullName} added "${expense.title}" (Total: ₹${numAmount.toFixed(2)}). Your ${splitTypeLabel} is ₹${perPersonShare.toFixed(2)}.`,
      actorName: req.user.fullName,
      timestamp: new Date().toISOString(),
    };

    const pushPayload = {
      title: `New Expense: ${expense.title}`,
      body: `${req.user.fullName} added ₹${numAmount.toFixed(2)}. Your share is ₹${perPersonShare.toFixed(2)}.`,
      data: { type: 'expense:created', expenseId: expense._id.toString() },
    };

    // Persist application notifications to MongoDB for all recipients
    for (const recipientId of finalSplitBetween) {
      if (recipientId.toString() !== req.user._id.toString()) {
        await createNotificationRecord({
          recipientUserId: recipientId,
          senderUserId: req.user._id,
          type: 'expense_added',
          title: `New Expense: ${expense.title}`,
          message: `${req.user.fullName} added "${expense.title}" (Total: ₹${numAmount.toFixed(2)}). Your share is ₹${perPersonShare.toFixed(2)}.`,
          entityId: expense._id,
          entityType: 'expense',
        });
      }
    }

    if (splitType === 'everyone' || !splitBetween || splitBetween.length === 0) {
      emitToGroup(groupId, 'notification', notificationData, req.user._id.toString());
      sendPushToGroup(groupId, pushPayload, req.user._id.toString());
    } else {
      emitToUsers(finalSplitBetween, 'notification', notificationData, req.user._id.toString());
      sendPushToUsers(finalSplitBetween, pushPayload, req.user._id.toString());
    }

    // Trigger non-blocking Pinecone indexing
    indexExpenseAsync(expense._id);

    return res.status(201).json(populatedExpense);
  } catch (error) {
    console.error('Create Expense Error:', error);
    return res.status(500).json({ message: error.message || 'Server error creating expense' });
  }
};

// @desc Get all expenses for active group
// @route GET /api/expenses
const getExpenses = async (req, res) => {
  try {
    const membership = await GroupMember.findOne({ userId: req.user._id });
    if (!membership) {
      return res.status(400).json({ message: 'You are not part of any group.' });
    }

    const expenses = await Expense.find({ groupId: membership.groupId })
      .sort({ date: -1 })
      .populate('paidBy', 'fullName email phone upiId qrCodeUrl')
      .populate('splitDetails.user', 'fullName email phone upiId qrCodeUrl');

    return res.json(expenses);
  } catch (error) {
    console.error('Get Expenses Error:', error);
    return res.status(500).json({ message: 'Server error fetching expenses' });
  }
};

// @desc Get single expense details
// @route GET /api/expenses/:id
const getExpenseById = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('paidBy', 'fullName email phone upiId qrCodeUrl')
      .populate('splitDetails.user', 'fullName email phone upiId qrCodeUrl');

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    return res.json(expense);
  } catch (error) {
    console.error('Get Expense By Id Error:', error);
    return res.status(500).json({ message: 'Server error fetching expense details' });
  }
};

// @desc Update expense
// @route PUT /api/expenses/:id
const updateExpense = async (req, res) => {
  try {
    const { title, amount, paidBy, splitType, splitBetween, paymentMode, notes, screenshotUrl, screenshotPublicId, date } = req.body;
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Authorization check: Only payer or group admin can update expense
    const membership = await GroupMember.findOne({ userId: req.user._id });
    if (!membership) {
      return res.status(400).json({ message: 'You are not part of any group.' });
    }

    const isPayer = expense.paidBy.toString() === req.user._id.toString();
    const isSuperAdmin = req.user.isSuperAdmin || req.user.email === 'admin@gmail.com';

    if (!isPayer && !isSuperAdmin) {
      return res.status(403).json({
        message: 'Forbidden: Only the person who created this expense can edit it.'
      });
    }

    const numAmount = amount ? parseFloat(amount) : expense.amount;
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: 'Valid expense amount is required' });
    }

    // Validate expense date if updated
    if (date !== undefined && date !== null && date !== '') {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ message: 'Invalid expense date provided' });
      }
      const nowWithBuffer = new Date(Date.now() + 24 * 60 * 60 * 1000);
      if (parsedDate > nowWithBuffer) {
        return res.status(400).json({ message: 'Expense date cannot be in the future' });
      }
      expense.date = parsedDate;
    }

    const payerId = paidBy || expense.paidBy.toString();

    const { splitBetween: finalSplitBetween, splitDetails } = await computeSplits(
      expense.groupId,
      numAmount,
      splitType || expense.splitType,
      splitBetween || expense.splitBetween,
      payerId
    );

    // Clean up old Cloudinary screenshot if replaced
    if (screenshotPublicId !== undefined && expense.screenshotPublicId && expense.screenshotPublicId !== screenshotPublicId) {
      await deleteFromCloudinary(expense.screenshotPublicId);
    }

    expense.title = title !== undefined ? title.trim() : expense.title;
    expense.amount = numAmount;
    expense.paidBy = payerId;
    expense.splitType = splitType || expense.splitType;
    expense.splitBetween = finalSplitBetween;
    expense.splitDetails = splitDetails;
    expense.paymentMode = paymentMode || expense.paymentMode;
    if (screenshotUrl !== undefined) expense.screenshotUrl = screenshotUrl;
    if (screenshotPublicId !== undefined) expense.screenshotPublicId = screenshotPublicId;
    if (notes !== undefined) expense.notes = notes;

    await expense.save();

    const updatedExpense = await Expense.findById(expense._id)
      .populate('paidBy', 'fullName email phone upiId qrCodeUrl')
      .populate('splitDetails.user', 'fullName email phone upiId qrCodeUrl');

    await Activity.create({
      groupId: expense.groupId,
      user: req.user._id,
      action: `updated expense "${expense.title}"`
    });

    // --- Socket.IO + Push Notification ---
    const notificationData = {
      type: 'expense:updated',
      expense: updatedExpense,
      message: `${req.user.fullName} updated "${expense.title}" — ₹${numAmount.toFixed(2)}`,
      actorName: req.user.fullName,
      timestamp: new Date().toISOString(),
    };

    emitToGroup(expense.groupId, 'notification', notificationData, req.user._id.toString());
    sendPushToGroup(expense.groupId, {
      title: `Expense Updated: ${expense.title}`,
      body: `${req.user.fullName} changed the amount to ₹${numAmount.toFixed(2)}`,
      data: { type: 'expense:updated', expenseId: expense._id.toString() },
    }, req.user._id.toString());

    // Trigger non-blocking Pinecone update
    indexExpenseAsync(expense._id);

    return res.json(updatedExpense);
  } catch (error) {
    console.error('Update Expense Error:', error);
    return res.status(500).json({ message: error.message || 'Server error updating expense' });
  }
};

// @desc Delete expense
// @route DELETE /api/expenses/:id
const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Authorization check: Only payer or group admin can delete expense
    const membership = await GroupMember.findOne({ userId: req.user._id });
    if (!membership) {
      return res.status(400).json({ message: 'You are not part of any group.' });
    }

    const isPayer = expense.paidBy.toString() === req.user._id.toString();
    const isSuperAdmin = req.user.isSuperAdmin || req.user.email === 'admin@gmail.com';

    if (!isPayer && !isSuperAdmin) {
      return res.status(403).json({
        message: 'Forbidden: Only the person who created this expense can delete it.'
      });
    }

    const title = expense.title;
    const groupId = expense.groupId;
    const expenseAmount = expense.amount;
    const allParticipantIds = [
      expense.paidBy.toString(),
      ...(expense.splitBetween ? expense.splitBetween.map(id => id.toString()) : []),
    ];

    // Feature 1: Delete bill screenshot proof from Cloudinary if it exists
    if (expense.screenshotPublicId) {
      await deleteFromCloudinary(expense.screenshotPublicId);
    }

    await Expense.deleteOne({ _id: expense._id });

    await Activity.create({
      groupId,
      user: req.user._id,
      action: `deleted expense "${title}"`
    });

    // --- Socket.IO + Push Notification ---
    emitToGroup(groupId, 'notification', {
      type: 'expense:deleted',
      expenseId: expense._id.toString(),
      message: `${req.user.fullName} deleted "${title}" (₹${expenseAmount.toFixed(2)})`,
      actorName: req.user.fullName,
      timestamp: new Date().toISOString(),
    }, req.user._id.toString());

    sendPushToGroup(groupId, {
      title: 'Expense Deleted',
      body: `${req.user.fullName} removed "${title}" (₹${expenseAmount.toFixed(2)})`,
      data: { type: 'expense:deleted' },
    }, req.user._id.toString());

    // Trigger non-blocking Pinecone deletion
    deleteExpenseIndexAsync(expense._id, allParticipantIds);

    return res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete Expense Error:', error);
    return res.status(500).json({ message: 'Server error deleting expense' });
  }
};

// @desc Upload screenshot to Cloudinary
// @route POST /api/expenses/upload
const uploadScreenshot = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }

    const uploadResult = await uploadToCloudinary(req.file.buffer, 'expense_tracker/screenshots');
    return res.json({ imageUrl: uploadResult.secure_url, publicId: uploadResult.public_id });
  } catch (error) {
    console.error('Upload Screenshot Error:', error);
    return res.status(500).json({ message: 'Failed to upload screenshot image' });
  }
};

module.exports = {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  uploadScreenshot
};
