const assert = require('assert');

console.log('🧪 Starting Settlement & Payment Flow Unit Tests...\n');

// 1. Test Generic UPI URI Construction
console.log('1. Testing Generic UPI URI Construction (NPCI Standard)...');

const buildGenericUpiUri = ({ upiId, name, amount, note }) => {
  if (!upiId || !upiId.trim()) {
    throw new Error('Valid payee UPI ID is required.');
  }

  const cleanUpi = upiId.trim();
  const cleanName = (name && name.trim()) || 'Flatmate';
  const cleanNote = (note && note.trim()) || `SplitWise - Payment to ${cleanName}`;

  const queryParts = [
    `pa=${encodeURIComponent(cleanUpi)}`,
    `pn=${encodeURIComponent(cleanName)}`,
    `cu=INR`,
    `tn=${encodeURIComponent(cleanNote)}`,
  ];

  if (amount !== undefined && amount > 0) {
    queryParts.push(`am=${amount.toFixed(2)}`);
  }

  return `upi://pay?${queryParts.join('&')}`;
};

const testUri1 = buildGenericUpiUri({
  upiId: 'aman@okhdfcbank',
  name: 'Aman Sharma',
  amount: 450,
  note: 'SplitWise - Dinner',
});

assert(testUri1.startsWith('upi://pay?'), 'URI must use standard generic upi://pay scheme');
assert(testUri1.includes('pa=aman%40okhdfcbank') || testUri1.includes('pa=aman@okhdfcbank'), 'URI must contain encoded UPI ID');
assert(testUri1.includes('pn=Aman%20Sharma'), 'URI must contain encoded payee name');
assert(testUri1.includes('am=450.00'), 'URI must format amount to 2 decimal places');
assert(testUri1.includes('cu=INR'), 'URI must specify currency INR');
assert(testUri1.includes('tn=SplitWise%20-%20Dinner'), 'URI must contain transaction note');

console.log('Generated URI:', testUri1);
console.log('✅ Generic UPI URI Builder Tests Passed.\n');

// 2. Test Settlement Status Logic & Validation
console.log('2. Testing Settlement Status Logic & Validations...');

const validateSettlementInput = ({ paymentMethod, proofUrl, actionType }) => {
  if (actionType === 'will_pay_soon') {
    return { valid: true, status: 'will_pay_soon' };
  }

  if (paymentMethod === 'upi') {
    if (!proofUrl || !proofUrl.trim()) {
      return { valid: false, error: 'Payment confirmation screenshot is required for online UPI payments.' };
    }
    return { valid: true, status: 'paid_pending_approval' };
  }

  if (paymentMethod === 'cash') {
    return { valid: true, status: 'paid_pending_approval' };
  }

  return { valid: true, status: 'paid_pending_approval' };
};

// UPI without proof must fail
const upiNoProof = validateSettlementInput({ paymentMethod: 'upi', proofUrl: null });
assert.strictEqual(upiNoProof.valid, false, 'Online UPI settlement without proof must be rejected');

// UPI with proof must succeed as paid_pending_approval
const upiWithProof = validateSettlementInput({ paymentMethod: 'upi', proofUrl: 'https://cloudinary.com/proof.jpg' });
assert.strictEqual(upiWithProof.valid, true);
assert.strictEqual(upiWithProof.status, 'paid_pending_approval');

// Cash without proof must succeed as paid_pending_approval
const cashPayment = validateSettlementInput({ paymentMethod: 'cash', proofUrl: null });
assert.strictEqual(cashPayment.valid, true);
assert.strictEqual(cashPayment.status, 'paid_pending_approval');

// Will pay soon
const promise = validateSettlementInput({ actionType: 'will_pay_soon' });
assert.strictEqual(promise.status, 'will_pay_soon');

console.log('✅ Settlement Status Logic Tests Passed.\n');

// 3. Test Receiver Authorization Logic
console.log('3. Testing Receiver Approval & Security Restrictions...');

const canUserApproveSettlement = (userId, settlementReceiverId) => {
  return userId.toString() === settlementReceiverId.toString();
};

const receiverId = 'user_receiver_123';
const payerId = 'user_payer_456';
const thirdPartyId = 'user_stranger_789';

assert.strictEqual(canUserApproveSettlement(receiverId, receiverId), true, 'Receiver must be authorized to approve');
assert.strictEqual(canUserApproveSettlement(payerId, receiverId), false, 'Payer must NEVER be allowed to approve own payment');
assert.strictEqual(canUserApproveSettlement(thirdPartyId, receiverId), false, 'Stranger must not be allowed to approve settlement');

console.log('✅ Receiver Authorization Tests Passed.\n');

console.log('🎉 ALL SETTLEMENT & PAYMENT FLOW UNIT TESTS PASSED!');
