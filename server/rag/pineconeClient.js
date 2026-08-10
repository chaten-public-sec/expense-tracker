const { Pinecone } = require('@pinecone-database/pinecone');

let pineconeClient = null;
let pineconeIndex = null;

/**
 * Checks if Pinecone credentials are set.
 */
const isPineconeConfigured = () => {
  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX_NAME;
  return Boolean(apiKey && apiKey.trim() && indexName && indexName.trim());
};

/**
 * Returns the Pinecone Index instance.
 */
const getPineconeIndex = () => {
  if (!isPineconeConfigured()) {
    return null;
  }

  if (!pineconeClient) {
    try {
      pineconeClient = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY.trim(),
      });
      const indexName = process.env.PINECONE_INDEX_NAME.trim();
      const host = process.env.PINECONE_INDEX_HOST?.trim();

      if (host) {
        pineconeIndex = pineconeClient.index(indexName, host);
      } else {
        pineconeIndex = pineconeClient.index(indexName);
      }
      console.log(`🌲 [Pinecone] Connected to index: "${indexName}"`);
    } catch (err) {
      console.error('[Pinecone Init Error]:', err.message);
      return null;
    }
  }

  return pineconeIndex;
};

/**
 * Derives the multi-tenant isolated namespace for a given user.
 */
const getUserNamespace = (userId) => {
  if (!userId) throw new Error('User ID is required for Pinecone namespace isolation');
  return `user_${userId.toString()}`;
};

module.exports = {
  isPineconeConfigured,
  getPineconeIndex,
  getUserNamespace,
};
