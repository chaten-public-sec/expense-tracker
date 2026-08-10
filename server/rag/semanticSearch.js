const { getPineconeIndex, getUserNamespace, isPineconeConfigured } = require('./pineconeClient');
const { generateEmbedding } = require('./embeddingService');
const Expense = require('../models/Expense');

/**
 * Performs multi-tenant semantic expense search using Pinecone and canonical MongoDB verification.
 * @param {string} query - Natural language search query
 * @param {string} userId - Authenticated user ID (strictly derived on server)
 * @param {string} groupId - Active group ID
 * @param {number} topK - Max results to retrieve (default: 5)
 * @returns {Promise<Array>} List of verified canonical expense records
 */
const searchExpensesSemantically = async (query, userId, groupId, topK = 5) => {
  if (!query || !userId) return [];

  // 1. If Pinecone is configured, attempt vector similarity search
  if (isPineconeConfigured()) {
    const startTime = Date.now();
    try {
      const index = getPineconeIndex();
      if (index) {
        console.log(`🌲 [pinecone.search.start] Query: "${query}", userId: ${userId}, groupId: ${groupId}`);
        const queryVector = await generateEmbedding(query);

        if (queryVector && queryVector.length > 0) {
          const namespace = getUserNamespace(userId);
          const filter = groupId ? { groupId: { $eq: groupId.toString() } } : undefined;

          const results = await index.namespace(namespace).query({
            vector: queryVector,
            topK,
            includeMetadata: true,
            filter,
          });

          const latency = Date.now() - startTime;
          const matchCount = results?.matches?.length || 0;

          if (matchCount > 0) {
            console.log(`🌲 [pinecone.search.success] Latency: ${latency}ms, Matches: ${matchCount}, Namespace: ${namespace}`);
            const expenseIds = results.matches
              .map(m => m.metadata?.expenseId)
              .filter(Boolean);

            if (expenseIds.length > 0) {
              // Canonical hydration & verification against MongoDB
              const canonicalExpenses = await Expense.find({
                _id: { $in: expenseIds },
                ...(groupId ? { groupId } : {}),
              })
                .populate('paidBy', 'fullName email phone')
                .populate('splitDetails.user', 'fullName email phone');

              // Preserve vector score order
              const expenseMap = new Map(canonicalExpenses.map(e => [e._id.toString(), e]));
              const orderedResults = expenseIds
                .map(id => expenseMap.get(id))
                .filter(Boolean);

              if (orderedResults.length > 0) {
                return orderedResults;
              }
            }
          } else {
            console.log(`🌲 [pinecone.search.empty] Latency: ${latency}ms, No vector matches found for query: "${query}"`);
          }
        }
      }
    } catch (err) {
      console.warn('🌲 [pinecone.search.error] Vector search error, falling back to MongoDB search:', err.message);
    }
  }

  // 2. Deterministic Fallback: Keyword search in MongoDB
  try {
    const terms = query.split(/\s+/).filter(t => t.length > 2);
    const regexPattern = terms.length > 0 ? terms.map(t => `(?=.*${t})`).join('') : query;
    const regex = new RegExp(regexPattern, 'i');

    const fallbackExpenses = await Expense.find({
      groupId,
      $or: [
        { title: { $regex: regex } },
        { notes: { $regex: regex } },
      ],
    })
      .sort({ date: -1 })
      .limit(topK)
      .populate('paidBy', 'fullName email phone')
      .populate('splitDetails.user', 'fullName email phone');

    return fallbackExpenses;
  } catch (mongoErr) {
    console.error('[Semantic Search Fallback Error]:', mongoErr.message);
    return [];
  }
};

module.exports = {
  searchExpensesSemantically,
};
