const assert = require('assert');
const { parseHinglishDateRange } = require('../ai/dateResolver');
const { aiToolDeclarations, getFriendlyToolLabel } = require('../ai/aiTools');
const {
  getOrCreateSession,
  getSession,
  addMessageToSession,
  abortSessionGeneration,
  deleteSession,
} = require('../ai/chatSessionStore');
const { getUserNamespace } = require('../rag/pineconeClient');

console.log('🧪 Starting SplitWise AI Assistant Unit Tests...\n');

// 1. Test Date Resolver
console.log('1. Testing Natural Language Date Resolver (Hinglish/English)...');
const today = parseHinglishDateRange('aaj ka kharcha');
assert(today.fromDate !== null, 'Today fromDate should not be null');
assert.strictEqual(today.label, 'Today');

const yesterday = parseHinglishDateRange('kal kitna spend hua');
assert(yesterday.fromDate !== null, 'Yesterday fromDate should not be null');
assert.strictEqual(yesterday.label, 'Yesterday');

const thisMonth = parseHinglishDateRange('is mahine ka total');
assert(thisMonth.fromDate !== null, 'This month fromDate should not be null');

const august = parseHinglishDateRange('august me kitna kharcha');
assert(august.fromDate !== null, 'August fromDate should not be null');
assert.strictEqual(august.label, 'august');

const sinceAug3 = parseHinglishDateRange('3 august se rahul ko kitna diya');
assert(sinceAug3.fromDate !== null, 'Since 3 Aug fromDate should not be null');
console.log('✅ Date Resolver Tests Passed.\n');

// 2. Test Pinecone Namespace Multi-Tenancy Isolation
console.log('2. Testing Multi-Tenant Namespace Isolation...');
const user1Ns = getUserNamespace('65d2f1a9e8b1c2d3e4f5a6b7');
const user2Ns = getUserNamespace('65d2f1a9e8b1c2d3e4f5a6b8');
assert.strictEqual(user1Ns, 'user_65d2f1a9e8b1c2d3e4f5a6b7');
assert.strictEqual(user2Ns, 'user_65d2f1a9e8b1c2d3e4f5a6b8');
assert.notStrictEqual(user1Ns, user2Ns, 'Namespaces must be strictly unique per user');
console.log('✅ Pinecone Namespace Isolation Tests Passed.\n');

// 3. Test Ephemeral Chat Session Store
console.log('3. Testing Ephemeral In-Memory Chat Session Store...');
const testUserId = 'user_test_123';
const session = getOrCreateSession('test_sess_1', testUserId, 'group_123', 'Chaten');
assert.strictEqual(session.sessionId, 'test_sess_1');
assert.strictEqual(session.userId, testUserId);

// Test Session ownership security (Attacker user trying to hijack session)
const attackerSession = getOrCreateSession('test_sess_1', 'attacker_user_456', 'group_123', 'Attacker');
assert.strictEqual(attackerSession, null, 'Attacker must not be able to hijack another user session');

// Test Message addition
addMessageToSession('test_sess_1', 'user', 'mera kharcha kitna hua?');
addMessageToSession('test_sess_1', 'model', 'Aapka total kharcha ₹8,420 hai.');

const retrievedSession = getSession('test_sess_1', testUserId);
assert.strictEqual(retrievedSession.messages.length, 2);
assert.strictEqual(retrievedSession.messages[0].parts[0].text, 'mera kharcha kitna hua?');

// Test Session Reset / Deletion
deleteSession('test_sess_1', testUserId);
const deletedSession = getSession('test_sess_1', testUserId);
assert.strictEqual(deletedSession, null, 'Session must be cleanly deleted from memory');
console.log('✅ Ephemeral Session Store Tests Passed.\n');

// 4. Test AI Tool Declarations & Friendly Labels
console.log('4. Testing AI Tool Declarations & Friendly Labels...');
const expectedTools = [
  'get_current_balances',
  'get_balance_with_person',
  'get_user_expense_summary',
  'get_expenses_by_date_range',
  'get_expenses_by_person',
  'get_settlement_history',
  'get_group_financial_summary',
  'semantic_expense_search',
];

const registeredToolNames = aiToolDeclarations.map(t => t.name);
expectedTools.forEach(toolName => {
  assert(registeredToolNames.includes(toolName), `Tool ${toolName} must be registered in AI tools`);
  const label = getFriendlyToolLabel(toolName);
  assert(typeof label === 'string' && label.length > 0, `Tool ${toolName} must have a friendly label`);
});

console.log('✅ AI Tool Declarations Tests Passed.\n');
console.log('🎉 ALL SPLITWISE AI ASSISTANT UNIT TESTS PASSED!');
