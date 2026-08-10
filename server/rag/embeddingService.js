const { getGeminiClient, getEmbeddingModelName } = require('../ai/geminiClient');

/**
 * Generates semantic embedding vector using Gemini Embedding 2.
 * @param {string} text - Text to embed
 * @returns {Promise<number[]|null>} Float vector or null if unavailable
 */
const generateEmbedding = async (text) => {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return null;
  }

  const aiClient = getGeminiClient();
  if (!aiClient) {
    return null;
  }

  try {
    const model = getEmbeddingModelName();
    const cleanText = text.trim().slice(0, 8000); // Guard against oversized prompts

    const response = await aiClient.models.embedContent({
      model,
      contents: cleanText,
    });

    if (response && response.embedding && response.embedding.values) {
      return response.embedding.values;
    }

    return null;
  } catch (error) {
    console.warn(`[Embedding Service Warning] Failed to generate embedding with ${getEmbeddingModelName()}:`, error.message);
    return null;
  }
};

module.exports = {
  generateEmbedding,
};
