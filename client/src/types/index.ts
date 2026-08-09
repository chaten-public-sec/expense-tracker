export interface User {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  upiId?: string;
  qrCodeUrl?: string | null;
  qrCodePublicId?: string | null;
  isSuperAdmin?: boolean;
  createdAt?: string;
}

export interface Group {
  _id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  payday?: number | null;
  createdAt: string;
  userRole?: 'creator' | 'member';
}

export interface GroupMember {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  upiId?: string;
  qrCodeUrl?: string | null;
  role: 'creator' | 'member';
  joinedAt: string;
  totalPaid: number;
  everyoneShare?: number;
  specificShare?: number;
  totalOwes: number;
  totalReceives: number;
  netBalance?: number;
  owesList?: OwedPerson[];
  receivesList?: OwedPerson[];
}

export interface BillingCycle {
  payday: number | null;
  startDate: string | null;
  endDate: string | null;
  nextPayday: string | null;
  daysRemaining: number | null;
  isPaydayToday: boolean;
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
  screenshotPublicId?: string | null;
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
  status: 'completed' | 'paid_pending_approval' | 'will_pay_soon' | 'rejected' | 'cancelled';
  proofUrl?: string | null;
  proofPublicId?: string | null;
  note?: string;
  paidAt?: string;
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
    upiId?: string;
    qrCodeUrl?: string | null;
  };
  amount: number;
}

export interface DashboardData {
  hasGroup: boolean;
  user: User;
  group?: Group;
  billingCycle?: BillingCycle;
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
