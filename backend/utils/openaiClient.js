const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generate embedding for text using OpenAI
 * @param {string} text - Text to embed
 * @returns {Array} Embedding vector
 */
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate embedding: ' + error.message);
  }
}

/**
 * Generate response using OpenAI with context
 * @param {string} userMessage - User's message
 * @param {string} context - Relevant context from knowledge base
 * @returns {string} Generated response
 */
async function generateResponse(userMessage, context) {
  try {
    const systemPrompt = `You are a helpful AI assistant with access to a knowledge base. 
    Use the provided context to answer questions accurately and comprehensively.
    
    Context from knowledge base:
    ${context}
    
    Instructions:
    - Answer based on the provided context when possible
    - If the context doesn't contain relevant information, say so clearly
    - Be helpful, accurate, and concise
    - Cite specific information from the context when relevant
    - If you're unsure about something, express that uncertainty`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error generating response:', error);
    throw new Error('Failed to generate response: ' + error.message);
  }
}

/**
 * Test OpenAI API connection
 * @returns {boolean} True if connection is successful
 */
async function testConnection() {
  try {
    await openai.models.list();
    return true;
  } catch (error) {
    console.error('OpenAI API connection test failed:', error);
    return false;
  }
}

module.exports = {
  generateEmbedding,
  generateResponse,
  testConnection
};
