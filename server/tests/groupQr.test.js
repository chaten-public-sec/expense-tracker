const assert = require('assert');
const crypto = require('crypto');

console.log('🧪 Starting Group QR Join & Share Unit Tests...\n');

// 1. Test Secure Opaque Token Generation
console.log('1. Testing Secure Opaque Invite Token Generation...');
const generateInviteToken = () => crypto.randomBytes(16).toString('hex');

const token1 = generateInviteToken();
const token2 = generateInviteToken();

assert.strictEqual(token1.length, 32, 'Invite token must be exactly 32 hex characters');
assert.strictEqual(typeof token1, 'string');
assert.notStrictEqual(token1, token2, 'Generated tokens must be cryptographically unique');
assert(/^[0-9a-f]{32}$/.test(token1), 'Token must contain only hexadecimal characters');

console.log('Sample Token 1:', token1);
console.log('Sample Token 2:', token2);
console.log('✅ Opaque Token Generation Tests Passed.\n');

// 2. Test Deep Link URL Construction
console.log('2. Testing HTTPS Deep Link Construction...');
const buildGroupInviteUrl = (origin, tokenOrCode) => {
  const cleanOrigin = origin.replace(/\/+$/, '');
  const cleanToken = encodeURIComponent(tokenOrCode.trim());
  return `${cleanOrigin}/join/${cleanToken}`;
};

const inviteUrl = buildGroupInviteUrl('https://splitwise.example.com', token1);
assert.strictEqual(inviteUrl, `https://splitwise.example.com/join/${token1}`);

const inviteUrlWithCode = buildGroupInviteUrl('https://splitwise.example.com', 'AB12CD');
assert.strictEqual(inviteUrlWithCode, 'https://splitwise.example.com/join/AB12CD');

console.log('Generated Invite URL:', inviteUrl);
console.log('✅ Deep Link URL Tests Passed.\n');

// 3. Test Scanned QR Payload Parser
console.log('3. Testing Scanned QR Payload Extraction...');
const parseScannedData = (decodedText) => {
  try {
    if (decodedText.includes('/join/')) {
      const parts = decodedText.split('/join/');
      if (parts[1]) {
        return parts[1].split('?')[0].split('#')[0].trim();
      }
    }
    return decodedText.trim();
  } catch {
    return decodedText.trim();
  }
};

assert.strictEqual(
  parseScannedData('https://splitwise.example.com/join/5a7f9e8d1c2b3a4e5f6a7b8c9d0e1f2a'),
  '5a7f9e8d1c2b3a4e5f6a7b8c9d0e1f2a'
);
assert.strictEqual(
  parseScannedData('https://splitwise.example.com/join/STU220?src=qr'),
  'STU220'
);
assert.strictEqual(
  parseScannedData('STU220'),
  'STU220'
);
assert.strictEqual(
  parseScannedData('5a7f9e8d1c2b3a4e5f6a7b8c9d0e1f2a'),
  '5a7f9e8d1c2b3a4e5f6a7b8c9d0e1f2a'
);

console.log('✅ Scanned QR Payload Parser Tests Passed.\n');

// 4. Test Super Admin Authorization Guard
console.log('4. Testing Super Admin Group Join Isolation...');
const canUserJoinGroup = (user) => {
  if (user.isSuperAdmin || user.email === 'admin@gmail.com') {
    return { allowed: false, reason: 'Super Admin accounts are global administrators and cannot join user groups.' };
  }
  return { allowed: true };
};

const adminUser = { isSuperAdmin: true, email: 'admin@gmail.com' };
const regularUser = { isSuperAdmin: false, email: 'flatmate@gmail.com' };

assert.strictEqual(canUserJoinGroup(adminUser).allowed, false);
assert.strictEqual(canUserJoinGroup(regularUser).allowed, true);

console.log('✅ Super Admin Isolation Guard Tests Passed.\n');

console.log('🎉 ALL GROUP QR JOIN & SHARE UNIT TESTS PASSED!');
