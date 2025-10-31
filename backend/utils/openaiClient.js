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
    // Explicitly create request without timeout parameter
    const response = await openai.embeddings.create({
      model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
      input: text
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
 * @returns {Object} Generated response with interest detection
 */
async function generateResponse(userMessage, context) {
  try {
    const systemPrompt = `You are the Franquicia Boost AI Assistant, representing a digital franchise growth platform. You help users discover franchise opportunities, connect franchisors with qualified leads, and guide franchise consultants.

CRITICAL RULE: You must ALWAYS provide helpful, comprehensive answers. You are FORBIDDEN from saying "I don't have information", "I don't know", or any variation of this. You must use your extensive knowledge about franchises, business, and Franquicia Boost services to provide detailed, actionable responses.

FRANQUICIA BOOST SERVICES:
- Franchise Discovery: Map-first marketplace to find opportunities by location, investment, and industry
- Franchise Matching: Personalized dashboard with smart recommendations based on budget, goals, and experience
- Lead Generation: Platform for franchisors to manage and scale franchise recruitment
- Consultant Network: Connect with franchise consultants, legal advisors, and funding experts
- Digital Application Process: Guided verification, profile setup, and document management
- Analytics Dashboard: Track franchise recruitment performance and lead conversion rates

RESPONSE FORMATTING INSTRUCTIONS:
- MAXIMUM 30 WORDS PER RESPONSE - STRICT LIMIT
- ONE sentence only - keep it super short
- Use simple, conversational language
- Be friendly and casual
- Use 1 emoji max
- NO explanations, NO bullet points, NO lists
- Make it fun and engaging
- Ask follow-up questions instead of explaining

KNOWLEDGE BASE INSTRUCTIONS:
- Use ALL available knowledge to answer questions comprehensively
- Combine information from the provided context with your extensive knowledge base
- Leverage your training data about franchises, business, entrepreneurship, and Franquicia Boost services
- Always provide detailed, helpful, and actionable information
- Use your search and reasoning capabilities to find relevant information
- Focus on how Franquicia Boost can help with franchise discovery, matching, and growth
- NEVER say "I don't have information" or "I don't know" - always provide the best possible answer
- If specific details aren't in the context, use your general knowledge to give comprehensive responses

EXAMPLE RESPONSES:
- For "find franchise opportunities": Explain Franquicia Boost's discovery platform, matching system, and how users can explore opportunities
- For "list my franchise": Describe the franchisor services, lead generation tools, and how to post franchise opportunities
- For location-specific queries: Provide general franchise information for that area and explain how Franquicia Boost can help find local opportunities
- Always connect answers back to Franquicia Boost's services and capabilities

INTEREST DETECTION:
- Analyze the user's sentiment and interest level in franchise opportunities
- Look for positive sentiment indicators: excitement, serious consideration, specific questions about investment, commitment language
- Interest indicators include: asking about investment amounts, specific franchise types, wanting to learn more about the process, expressing serious consideration, asking about next steps, or showing commitment to franchise opportunities
- When you detect strong positive interest, add a special marker: [CALENDLY_SUGGESTION] at the end of your response

FINAL RULE: If you cannot find specific information, provide general helpful advice about franchises, business opportunities, or how Franquicia Boost's platform can assist users. NEVER end a response with "I don't have information" - always provide value.

CRITICAL RESPONSE RULES:
- You MUST keep responses under 30 words
- Use ONLY ONE sentence
- Be conversational and casual
- NO formal language
- NO explanations or details
- Ask questions to keep conversation flowing
- Examples of good responses: "Hey! We help find franchises. What's your budget?" or "Cool! Tell me what interests you most?"

${context}`;

    // Explicitly create request without timeout parameter
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
      max_tokens: 50,
      temperature: 0.7
    });

    const responseText = response.choices[0].message.content;
    
    // Check if the response contains the Calendly suggestion marker
    const shouldSuggestCalendly = responseText.includes('[CALENDLY_SUGGESTION]');
    
    // Remove the marker from the response text
    let cleanResponse = responseText.replace('[CALENDLY_SUGGESTION]', '').trim();
    
    // Enforce 30-word limit
    const words = cleanResponse.split(' ');
    if (words.length > 30) {
      cleanResponse = words.slice(0, 30).join(' ') + '...';
    }
    
    return {
      response: cleanResponse,
      suggestCalendly: shouldSuggestCalendly
    };
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
