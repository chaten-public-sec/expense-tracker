const Expense = require('../models/Expense');
const GroupMember = require('../models/GroupMember');
const Settlement = require('../models/Settlement');
const User = require('../models/User');
const { calculateGroupBalances } = require('../utils/balance');
const { parseHinglishDateRange } = require('./dateResolver');
const { searchExpensesSemantically } = require('../rag/semanticSearch');

/**
 * 1. Tool Function Declarations for Gemini Function Calling
 */
const aiToolDeclarations = [
  {
    name: 'get_current_balances',
    description: 'Retrieves the authenticated user’s current financial status including total amount they need to pay, total amount they will receive, net balance position, and breakdown of specific flatmates.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'get_balance_with_person',
    description: 'Retrieves the exact direct dues between the authenticated user and a specific flatmate/person (e.g. Rahul, Priya). Shows how much you owe them and how much they owe you.',
    parameters: {
      type: 'OBJECT',
      properties: {
        personName: {
          type: 'STRING',
          description: 'Name or part of name of the flatmate (e.g. "Rahul", "Priya")',
        },
      },
      required: ['personName'],
    },
  },
  {
    name: 'get_user_expense_summary',
    description: 'Calculates the user’s total money spent as payer, individual group share, and top expense breakdown for a given date range or natural time period (e.g., "August", "this month", "last 30 days", "today").',
    parameters: {
      type: 'OBJECT',
      properties: {
        timePeriod: {
          type: 'STRING',
          description: 'Natural language time period like "this month", "August", "last month", "last 30 days", "today", "yesterday"',
        },
        fromDate: {
          type: 'STRING',
          description: 'Optional ISO date string or YYYY-MM-DD start date',
        },
        toDate: {
          type: 'STRING',
          description: 'Optional ISO date string or YYYY-MM-DD end date',
        },
      },
    },
  },
  {
    name: 'get_expenses_by_date_range',
    description: 'Lists all group expenses within a specified date interval with amounts, payer, and category/title.',
    parameters: {
      type: 'OBJECT',
      properties: {
        fromDate: { type: 'STRING', description: 'Start date (YYYY-MM-DD or natural expression like "3 August")' },
        toDate: { type: 'STRING', description: 'End date (YYYY-MM-DD)' },
        limit: { type: 'INTEGER', description: 'Max number of expenses to retrieve (default: 10)' },
      },
    },
  },
  {
    name: 'get_expenses_by_person',
    description: 'Retrieves all expenses paid by a specific person or where a specific person was involved.',
    parameters: {
      type: 'OBJECT',
      properties: {
        personName: { type: 'STRING', description: 'Name of the person' },
      },
      required: ['personName'],
    },
  },
  {
    name: 'get_settlement_history',
    description: 'Retrieves settlement records (both completed payments and pending approvals) for the authenticated user.',
    parameters: {
      type: 'OBJECT',
      properties: {
        personName: { type: 'STRING', description: 'Optional name of specific flatmate to filter settlements with' },
        status: { type: 'STRING', description: 'Optional status filter: "completed", "paid_pending_approval", "all"' },
      },
    },
  },
  {
    name: 'get_group_financial_summary',
    description: 'Retrieves group-wide financial metrics: total group spending, highest payer, member count, and active members.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'semantic_expense_search',
    description: 'Performs semantic AI search for specific activities, items, food, bills, or contextual memories (e.g. "dinner after movie", "groceries", "WiFi bill", "pizza party", "biggest expense").',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Natural language search query' },
      },
      required: ['query'],
    },
  },
];

/**
 * 2. Deterministic Tool Execution Handlers
 */

// Helper to resolve person ID from partial name
const findMemberByName = async (groupId, personName) => {
  if (!personName) return null;
  const clean = personName.toLowerCase().trim();
  const members = await GroupMember.find({ groupId }).populate('userId', 'fullName email phone upiId');
  return members.find(m => m.userId?.fullName?.toLowerCase().includes(clean))?.userId || null;
};

const executeTool = async (toolName, args = {}, context) => {
  const { userId, groupId, userName } = context;

  if (!groupId) {
    return { error: 'You are not part of any group yet. Join or create a group to view expenses and balances.' };
  }

  switch (toolName) {
    case 'get_current_balances': {
      const balanceData = await calculateGroupBalances(groupId, userId);
      const summary = balanceData.currentUserSummary;
      const net = summary.youWillReceiveTotal - summary.youNeedToPayTotal;

      return {
        youNeedToPayTotal: summary.youNeedToPayTotal,
        peopleYouOwe: summary.youNeedToPayList.map(p => ({
          name: p.user?.fullName || 'Flatmate',
          amountOwed: p.amount,
        })),
        youWillReceiveTotal: summary.youWillReceiveTotal,
        peopleWhoOweYou: summary.youWillReceiveList.map(p => ({
          name: p.user?.fullName || 'Flatmate',
          amountReceivable: p.amount,
        })),
        netPosition: net,
        status: net > 0 ? 'Overall Receivable' : net < 0 ? 'Overall Payable' : 'All Settled',
      };
    }

    case 'get_balance_with_person': {
      const targetUser = await findMemberByName(groupId, args.personName);
      if (!targetUser) {
        return {
          error: `Could not find any member named "${args.personName}" in your active group.`,
        };
      }

      const balanceData = await calculateGroupBalances(groupId, userId);
      const targetId = targetUser._id.toString();

      const youOweTarget = balanceData.currentUserSummary.youNeedToPayList.find(p => p.user?._id === targetId)?.amount || 0;
      const targetOwesYou = balanceData.currentUserSummary.youWillReceiveList.find(p => p.user?._id === targetId)?.amount || 0;

      // Recent settlements between them
      const recentSettlements = await Settlement.find({
        groupId,
        $or: [
          { payer: userId, receiver: targetId },
          { payer: targetId, receiver: userId },
        ],
      })
        .sort({ createdAt: -1 })
        .limit(3);

      return {
        person: {
          id: targetUser._id,
          name: targetUser.fullName,
          email: targetUser.email,
        },
        amountYouOwe: youOweTarget,
        amountTheyOweYou: targetOwesYou,
        netDifference: targetOwesYou - youOweTarget,
        recentSettlementCount: recentSettlements.length,
      };
    }

    case 'get_user_expense_summary': {
      let fromDate = null;
      let toDate = null;

      if (args.timePeriod) {
        const parsed = parseHinglishDateRange(args.timePeriod);
        fromDate = parsed.fromDate;
        toDate = parsed.toDate;
      } else if (args.fromDate) {
        fromDate = new Date(args.fromDate);
        toDate = args.toDate ? new Date(args.toDate) : new Date();
      }

      const dateFilter = {};
      if (fromDate) dateFilter.$gte = fromDate;
      if (toDate) dateFilter.$lte = toDate;

      const query = { groupId };
      if (Object.keys(dateFilter).length > 0) {
        query.date = dateFilter;
      }

      const allExpenses = await Expense.find(query)
        .sort({ date: -1 })
        .populate('paidBy', 'fullName email')
        .populate('splitDetails.user', 'fullName email');

      let totalPaidByUser = 0;
      let totalUserShare = 0;
      const userExpenses = [];

      allExpenses.forEach(exp => {
        const isPayer = (exp.paidBy?._id || exp.paidBy)?.toString() === userId;
        const mySplit = exp.splitDetails?.find(d => (d.user?._id || d.user)?.toString() === userId);

        if (isPayer) {
          totalPaidByUser += exp.amount;
        }

        if (mySplit) {
          totalUserShare += mySplit.share;
        }

        if (isPayer || mySplit) {
          userExpenses.push({
            id: exp._id,
            title: exp.title,
            totalAmount: exp.amount,
            paidBy: exp.paidBy?.fullName || 'Flatmate',
            yourShare: mySplit ? mySplit.share : 0,
            date: exp.date ? new Date(exp.date).toISOString().split('T')[0] : 'Unknown',
            paymentMode: exp.paymentMode,
          });
        }
      });

      return {
        timePeriod: args.timePeriod || 'Specified Range',
        totalExpensesCount: userExpenses.length,
        totalAmountPaidByUser: Math.round(totalPaidByUser * 100) / 100,
        totalUserGroupShare: Math.round(totalUserShare * 100) / 100,
        topExpenses: userExpenses.slice(0, 5),
      };
    }

    case 'get_expenses_by_date_range': {
      let fromDate = null;
      let toDate = null;

      if (args.fromDate) {
        const parsed = parseHinglishDateRange(args.fromDate);
        fromDate = parsed.fromDate || new Date(args.fromDate);
        toDate = parsed.toDate || (args.toDate ? new Date(args.toDate) : new Date());
      }

      const query = { groupId };
      if (fromDate || toDate) {
        query.date = {};
        if (fromDate) query.date.$gte = fromDate;
        if (toDate) query.date.$lte = toDate;
      }

      const limit = args.limit || 10;
      const expenses = await Expense.find(query)
        .sort({ date: -1 })
        .limit(limit)
        .populate('paidBy', 'fullName email')
        .populate('splitDetails.user', 'fullName email');

      return {
        count: expenses.length,
        expenses: expenses.map(e => ({
          title: e.title,
          amount: e.amount,
          paidBy: e.paidBy?.fullName || 'Flatmate',
          date: e.date ? new Date(e.date).toISOString().split('T')[0] : '',
          paymentMode: e.paymentMode,
          notes: e.notes || '',
        })),
      };
    }

    case 'get_expenses_by_person': {
      const targetUser = await findMemberByName(groupId, args.personName);
      if (!targetUser) {
        return { error: `Could not find member "${args.personName}" in group.` };
      }

      const targetId = targetUser._id.toString();
      const expenses = await Expense.find({
        groupId,
        $or: [
          { paidBy: targetId },
          { 'splitDetails.user': targetId },
        ],
      })
        .sort({ date: -1 })
        .limit(10)
        .populate('paidBy', 'fullName email');

      return {
        person: targetUser.fullName,
        count: expenses.length,
        expenses: expenses.map(e => ({
          title: e.title,
          amount: e.amount,
          paidBy: e.paidBy?.fullName,
          date: e.date ? new Date(e.date).toISOString().split('T')[0] : '',
        })),
      };
    }

    case 'get_settlement_history': {
      const query = { groupId };
      if (args.status && args.status !== 'all') {
        query.status = args.status;
      }

      const settlements = await Settlement.find(query)
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('payer', 'fullName email')
        .populate('receiver', 'fullName email');

      return {
        count: settlements.length,
        settlements: settlements.map(s => ({
          payer: s.payer?.fullName,
          receiver: s.receiver?.fullName,
          amount: s.amount,
          status: s.status,
          date: s.paidAt || s.createdAt,
          note: s.note || '',
        })),
      };
    }

    case 'get_group_financial_summary': {
      const balanceData = await calculateGroupBalances(groupId);
      const expenses = await Expense.find({ groupId });
      const totalGroupSpend = expenses.reduce((sum, e) => sum + e.amount, 0);

      // Find highest payer
      let highestPayerId = null;
      let highestPaid = 0;
      Object.entries(balanceData.totalPaidMap).forEach(([uId, paid]) => {
        if (paid > highestPaid) {
          highestPaid = paid;
          highestPayerId = uId;
        }
      });

      const highestPayerName = highestPayerId ? balanceData.memberMap[highestPayerId]?.fullName : 'N/A';

      return {
        totalExpensesCount: expenses.length,
        totalGroupSpend: Math.round(totalGroupSpend * 100) / 100,
        highestContributor: {
          name: highestPayerName,
          amountPaid: highestPaid,
        },
        membersCount: Object.keys(balanceData.memberMap).length,
      };
    }

    case 'semantic_expense_search': {
      const results = await searchExpensesSemantically(args.query, userId, groupId, 5);
      return {
        query: args.query,
        matchCount: results.length,
        matches: results.map(e => ({
          title: e.title,
          amount: e.amount,
          paidBy: e.paidBy?.fullName || 'Flatmate',
          date: e.date ? new Date(e.date).toISOString().split('T')[0] : '',
          paymentMode: e.paymentMode,
          notes: e.notes || '',
        })),
      };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
};

const getFriendlyToolLabel = (toolName) => {
  switch (toolName) {
    case 'get_current_balances': return 'Calculating your live balances...';
    case 'get_balance_with_person': return 'Checking dues with flatmate...';
    case 'get_user_expense_summary': return 'Analyzing your spending history...';
    case 'get_expenses_by_date_range': return 'Searching date records...';
    case 'get_expenses_by_person': return 'Finding flatmate transactions...';
    case 'get_settlement_history': return 'Checking settlement records...';
    case 'get_group_financial_summary': return 'Summarizing group finances...';
    case 'semantic_expense_search': return 'Searching matching expenses with Pinecone AI...';
    default: return 'Retrieving financial data...';
  }
};

module.exports = {
  aiToolDeclarations,
  executeTool,
  getFriendlyToolLabel,
};
