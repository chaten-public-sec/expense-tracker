export interface User {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  createdAt?: string;
}

export interface Group {
  _id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  createdAt: string;
  userRole?: 'creator' | 'member';
}

export interface GroupMember {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'creator' | 'member';
  joinedAt: string;
  totalPaid: number;
  totalOwes: number;
  totalReceives: number;
}

export interface SplitDetail {
  user: User;
  share: number;
}

export interface Expense {
  _id: string;
  groupId: string;
  title: string;
  amount: number;
  paidBy: User;
  splitType: 'everyone' | 'specific';
  splitBetween?: string[];
  splitDetails: SplitDetail[];
  paymentMode: 'cash' | 'upi';
  screenshotUrl?: string | null;
  notes?: string;
  date: string;
  createdAt?: string;
}

export interface Settlement {
  _id: string;
  groupId: string;
  payer: User;
  receiver: User;
  amount: number;
  status: 'verification_pending' | 'completed' | 'cancelled' | 'expired';
  expiresAt: string;
  failedAttempts?: number;
  verifiedAt?: string;
  createdAt: string;
}

export interface Activity {
  _id: string;
  groupId: string;
  user: User;
  action: string;
  createdAt: string;
}

export interface OwedPerson {
  user: {
    _id: string;
    fullName: string;
    email: string;
    phone: string;
  };
  amount: number;
}

export interface DashboardData {
  hasGroup: boolean;
  user: User;
  group?: Group;
  balances?: {
    youNeedToPayTotal: number;
    youNeedToPayList: OwedPerson[];
    youWillReceiveTotal: number;
    youWillReceiveList: OwedPerson[];
  };
  pendingVerifications?: {
    asReceiver: Settlement[];
    asPayer: Settlement[];
  };
  recentExpenses?: Expense[];
  recentActivity?: Activity[];
}

export interface AppNotification {
  id: string;
  type: string;
  message: string;
  actorName: string;
  expense?: Expense | null;
  settlement?: Settlement | null;
  expenseId?: string | null;
  timestamp: string;
  read: boolean;
}
