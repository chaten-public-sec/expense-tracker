const GroupMember = require('../models/GroupMember');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');

/**
 * Dynamically computes pairwise balances and breakdown metrics for a group.
 * Returns detailed balance structure for all group members including
 * everyone (group-wide) vs specific (individual) split shares and pairwise member breakdown.
 */
const calculateGroupBalances = async (groupId, currentUserId = null) => {
  // 1. Fetch group members
  const members = await GroupMember.find({ groupId }).populate('userId', 'fullName email phone upiId qrCodeUrl');
  const memberMap = {};
  members.forEach(m => {
    if (m.userId) {
      memberMap[m.userId._id.toString()] = {
        _id: m.userId._id.toString(),
        fullName: m.userId.fullName,
        email: m.userId.email,
        phone: m.userId.phone,
        upiId: m.userId.upiId || '',
        qrCodeUrl: m.userId.qrCodeUrl || null,
        role: m.role,
        joinedAt: m.joinedAt
      };
    }
  });

  const memberIds = Object.keys(memberMap);

  // Initialize debt graph and metric tracking maps
  const debtGraph = {};
  const totalPaidMap = {};
  const everyoneShareMap = {};
  const specificShareMap = {};
  const totalOwesMap = {};
  const totalReceivesMap = {};
  const pairwiseOwesMap = {};
  const pairwiseReceivesMap = {};

  memberIds.forEach(id => {
    debtGraph[id] = {};
    totalPaidMap[id] = 0;
    everyoneShareMap[id] = 0;
    specificShareMap[id] = 0;
    totalOwesMap[id] = 0;
    totalReceivesMap[id] = 0;
    pairwiseOwesMap[id] = [];
    pairwiseReceivesMap[id] = [];
    memberIds.forEach(targetId => {
      debtGraph[id][targetId] = 0;
    });
  });

  // 2. Process all group expenses
  const expenses = await Expense.find({ groupId });

  expenses.forEach(exp => {
    const payerId = exp.paidBy.toString();

    // Accumulate total paid by payer
    if (totalPaidMap[payerId] !== undefined) {
      totalPaidMap[payerId] += exp.amount;
    }

    if (exp.splitDetails && exp.splitDetails.length > 0) {
      exp.splitDetails.forEach(detail => {
        const beneficiaryId = detail.user.toString();
        const share = detail.share;

        // Categorize share by splitType (everyone vs specific)
        if (exp.splitType === 'everyone') {
          if (everyoneShareMap[beneficiaryId] !== undefined) {
            everyoneShareMap[beneficiaryId] += share;
          }
        } else {
          if (specificShareMap[beneficiaryId] !== undefined) {
            specificShareMap[beneficiaryId] += share;
          }
        }

        // Payer doesn't owe themselves in the pairwise debt graph
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

  // 4. Simplify pairwise balances (Net debt graph)
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

  // Calculate net totals and populate pairwise breakdown per member
  memberIds.forEach(u1 => {
    memberIds.forEach(u2 => {
      if (u1 !== u2) {
        const owed = netDebtGraph[u1][u2] || 0;
        if (owed > 0) {
          const roundedOwed = Math.round(owed * 100) / 100;
          totalOwesMap[u1] += roundedOwed;
          totalReceivesMap[u2] += roundedOwed;

          pairwiseOwesMap[u1].push({
            user: memberMap[u2],
            amount: roundedOwed
          });

          pairwiseReceivesMap[u2].push({
            user: memberMap[u1],
            amount: roundedOwed
          });
        }
      }
    });
  });

  // Round all maps to 2 decimal places cleanly
  memberIds.forEach(id => {
    totalPaidMap[id] = Math.round(totalPaidMap[id] * 100) / 100;
    everyoneShareMap[id] = Math.round(everyoneShareMap[id] * 100) / 100;
    specificShareMap[id] = Math.round(specificShareMap[id] * 100) / 100;
    totalOwesMap[id] = Math.round(totalOwesMap[id] * 100) / 100;
    totalReceivesMap[id] = Math.round(totalReceivesMap[id] * 100) / 100;
  });

  // Construct personal summary for active user
  let currentUserSummary = {
    youNeedToPayTotal: 0,
    youNeedToPayList: [],
    youWillReceiveTotal: 0,
    youWillReceiveList: []
  };

  if (currentUserId && memberMap[currentUserId]) {
    currentUserSummary.youNeedToPayList = pairwiseOwesMap[currentUserId] || [];
    currentUserSummary.youWillReceiveList = pairwiseReceivesMap[currentUserId] || [];
    currentUserSummary.youNeedToPayTotal = totalOwesMap[currentUserId] || 0;
    currentUserSummary.youWillReceiveTotal = totalReceivesMap[currentUserId] || 0;
  }

  return {
    memberMap,
    netDebtGraph,
    totalPaidMap,
    everyoneShareMap,
    specificShareMap,
    totalOwesMap,
    totalReceivesMap,
    pairwiseOwesMap,
    pairwiseReceivesMap,
    currentUserSummary
  };
};

module.exports = { calculateGroupBalances };
