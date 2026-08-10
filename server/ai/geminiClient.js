const { GoogleGenAI } = require('@google/genai');

let aiClient = null;

/**
 * Initializes and returns the official Google Gen AI SDK client.
 */
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    console.warn('[Gemini AI] GEMINI_API_KEY is not configured in server environment.');
    return null;
  }

  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: apiKey.trim() });
    console.log('🤖 [Gemini AI] Google Gen AI Client initialized successfully.');
  }

  return aiClient;
};

const getModelName = () => process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const getEmbeddingModelName = () => process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-2';

module.exports = {
  getGeminiClient,
  getModelName,
  getEmbeddingModelName,
};
