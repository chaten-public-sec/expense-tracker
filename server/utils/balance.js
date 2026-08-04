const GroupMember = require('../models/GroupMember');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');

/**
 * Dynamically computes pairwise balances for a group.
 * Returns detailed balance structure for all group members.
 */
const calculateGroupBalances = async (groupId, currentUserId = null) => {
  // 1. Fetch group members
  const members = await GroupMember.find({ groupId }).populate('userId', 'fullName email phone');
  const memberMap = {};
  members.forEach(m => {
    if (m.userId) {
      memberMap[m.userId._id.toString()] = {
        _id: m.userId._id.toString(),
        fullName: m.userId.fullName,
        email: m.userId.email,
        phone: m.userId.phone,
        role: m.role,
        joinedAt: m.joinedAt
      };
    }
  });

  const memberIds = Object.keys(memberMap);

  // Initialize debt graph: debt[A][B] = amount A owes to B
  const debtGraph = {};
  const totalPaidMap = {};
  const totalOwesMap = {};
  const totalReceivesMap = {};

  memberIds.forEach(id => {
    debtGraph[id] = {};
    totalPaidMap[id] = 0;
    totalOwesMap[id] = 0;
    totalReceivesMap[id] = 0;
    memberIds.forEach(targetId => {
      debtGraph[id][targetId] = 0;
    });
  });

  // 2. Process all expenses
  const expenses = await Expense.find({ groupId });

  expenses.forEach(exp => {
    const payerId = exp.paidBy.toString();

    if (totalPaidMap[payerId] !== undefined) {
      totalPaidMap[payerId] += exp.amount;
    }

    if (exp.splitDetails && exp.splitDetails.length > 0) {
      exp.splitDetails.forEach(detail => {
        const beneficiaryId = detail.user.toString();
        const share = detail.share;

        // Payer doesn't owe themselves
        if (beneficiaryId !== payerId && debtGraph[beneficiaryId] && debtGraph[beneficiaryId][payerId] !== undefined) {
          debtGraph[beneficiaryId][payerId] += share;
        }
      });
    }
  });

  // 3. Process completed settlements
  const completedSettlements = await Settlement.find({ groupId, status: 'completed' });

  completedSettlements.forEach(settlement => {
    const payerId = settlement.payer.toString();
    const receiverId = settlement.receiver.toString();
    const amount = settlement.amount;

    if (debtGraph[payerId] && debtGraph[payerId][receiverId] !== undefined) {
      debtGraph[payerId][receiverId] -= amount;
    }
  });

  // 4. Simplify pairwise balances
  const netDebtGraph = {};
  memberIds.forEach(id => {
    netDebtGraph[id] = {};
  });

  for (let i = 0; i < memberIds.length; i++) {
    for (let j = i + 1; j < memberIds.length; j++) {
      const u1 = memberIds[i];
      const u2 = memberIds[j];

      const rawU1OwesU2 = debtGraph[u1][u2] || 0;
      const rawU2OwesU1 = debtGraph[u2][u1] || 0;

      const netDifference = rawU1OwesU2 - rawU2OwesU1;

      if (netDifference > 0) {
        netDebtGraph[u1][u2] = Math.round(netDifference * 100) / 100;
        netDebtGraph[u2][u1] = 0;
      } else if (netDifference < 0) {
        netDebtGraph[u2][u1] = Math.round(Math.abs(netDifference) * 100) / 100;
        netDebtGraph[u1][u2] = 0;
      } else {
        netDebtGraph[u1][u2] = 0;
        netDebtGraph[u2][u1] = 0;
      }
    }
  }

  // Calculate totals per member
  memberIds.forEach(u1 => {
    memberIds.forEach(u2 => {
      if (u1 !== u2) {
        const owed = netDebtGraph[u1][u2] || 0;
        if (owed > 0) {
          totalOwesMap[u1] += owed;
          totalReceivesMap[u2] += owed;
        }
      }
    });
  });

  // Construct personal summary
  let currentUserSummary = {
    youNeedToPayTotal: 0,
    youNeedToPayList: [],
    youWillReceiveTotal: 0,
    youWillReceiveList: []
  };

  if (currentUserId && memberMap[currentUserId]) {
    memberIds.forEach(otherId => {
      if (otherId !== currentUserId) {
        const owedByMe = netDebtGraph[currentUserId][otherId] || 0;
        const owedToMe = netDebtGraph[otherId][currentUserId] || 0;

        if (owedByMe > 0) {
          currentUserSummary.youNeedToPayTotal += owedByMe;
          currentUserSummary.youNeedToPayList.push({
            user: memberMap[otherId],
            amount: Math.round(owedByMe * 100) / 100
          });
        }

        if (owedToMe > 0) {
          currentUserSummary.youWillReceiveTotal += owedToMe;
          currentUserSummary.youWillReceiveList.push({
            user: memberMap[otherId],
            amount: Math.round(owedToMe * 100) / 100
          });
        }
      }
    });

    currentUserSummary.youNeedToPayTotal = Math.round(currentUserSummary.youNeedToPayTotal * 100) / 100;
    currentUserSummary.youWillReceiveTotal = Math.round(currentUserSummary.youWillReceiveTotal * 100) / 100;
  }

  return {
    memberMap,
    netDebtGraph,
    totalPaidMap,
    totalOwesMap,
    totalReceivesMap,
    currentUserSummary
  };
};

module.exports = { calculateGroupBalances };
