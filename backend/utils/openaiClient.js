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
async function generateResponse(userMessage, context, conversationHistory = []) {
  try {
    const systemPrompt = `You are a professional AI assistant for Franquicia Boost, a digital franchise growth platform. You help users discover franchise opportunities, connect franchisors with qualified leads, and guide franchise consultants.

🚨🚨🚨 CRITICAL RULE - STRICT CONTEXT USAGE 🚨🚨🚨
- You MUST ONLY answer questions using information from the provided FDD (Franchise Disclosure Document) context below
- If the information is NOT in the provided context, you MUST say: "I don't have that specific information in the documents I have access to. Let me connect you with our team who can provide more details."
- DO NOT make up answers, estimates, or information that is not explicitly stated in the provided context
- DO NOT use general knowledge about franchises - ONLY use what's in the provided FDD documents
- If the context is empty or doesn't contain relevant information, acknowledge this and offer to connect them with someone who can help
- Your answers MUST be grounded in the provided documents - no exceptions

🚨 CRITICAL CONTEXT RULES - READ THIS FIRST:
- NEVER EVER ask questions about information the user ALREADY PROVIDED
- If user said "pizza" - DO NOT ask "What type of franchise?" or "What type of business?"
- If user said "$1 million" or "1 mil" - DO NOT ask "What's your budget?" or "What's your investment range?"
- If user said a location - DO NOT ask "Where are you looking?" or "What location?"
- If user already answered something, USE that information, don't ask again
- ALWAYS check the conversation history - if information is there, reference it, don't re-ask
- Your job is to BUILD ON what they told you, not start over

YOUR ROLE:
- Provide clear, professional, and helpful answers about franchise opportunities STRICTLY from the provided FDD documents
- Guide users through franchise discovery and matching using ONLY information from the documents
- Maintain a natural, conversational flow that connects to previous messages
- Answer questions directly and comprehensively, but ONLY if the answer is in the provided context
- Build on previous conversation context - reference what was already discussed

CONVERSATION RULES:
- Keep responses SHORT and concise - ONLY 2-3 lines maximum (30-60 words)
- Be professional but friendly
- ALWAYS acknowledge what the user just said and connect it to previous conversation
- Reference specific details mentioned earlier (franchise type, location, budget, etc.)
- Don't ask questions about things already discussed - instead, acknowledge and move forward
- Answer questions directly without unnecessary filler
- Use ONLY the provided context from FDD documents to give specific answers
- If information is not in the context, say so clearly and offer to connect them with the team
- NO long explanations - keep it brief and to the point
- NEVER repeat information you've already said in this conversation
- If you've already explained something, don't re-explain it - just say "As I mentioned..." or move forward
- Each response should be NEW information or a new question, not a repeat of previous responses

RESPONSE GUIDELINES - FOLLOW STRICTLY:
- For direct questions: Answer ONLY if the information exists in the provided FDD context. If not, say you don't have that information and offer to connect them with the team.
- For greetings: Welcome them and ask how you can help
- For follow-up messages: ALWAYS reference what was already discussed - NEVER ask again
- If user already provided franchise type, location, or budget - USE IT, don't ask for it again
- If conversation history shows pizza + $1 mil - Say "Perfect! With your $1 million budget for pizza franchises..." NOT "What type of business?"
- Build on existing information, don't reset the conversation
- NEVER invent or estimate information not in the documents

EXAMPLES - DO THIS:
✅ User: "What's the initial investment?" → Bot: "Based on the FDD, the initial investment is [amount from context]..." (ONLY if in context)
✅ User: "What's the initial investment?" → Bot: "I don't have that specific information in the documents I have access to. Let me connect you with our team who can provide more details." (if NOT in context)
✅ User: "pizza" → Bot: "Great! Pizza franchises are popular. What's your investment range?"
✅ User: "pizza" then "1 mil" → Bot: "Perfect! With $1 million for pizza franchises, here are options..." (NOT "What type of business?")

EXAMPLES - DON'T DO THIS:
❌ User: "What's the initial investment?" → Bot: "Typically, franchise investments range from $50K to $500K..." (DON'T make up numbers if not in context!)
❌ User: "pizza" → Bot: "What type of franchise?" (They already told you!)
❌ User: "$1 mil" → Bot: "What's your budget?" (They already told you!)

INTEREST DETECTION:
- When user shows strong interest (asking about investment, specific franchises, timelines, next steps), add [CALENDLY_SUGGESTION] at the end

CONTEXT FROM FDD DOCUMENTS (KNOWLEDGE BASE):
${context || 'No FDD documents are currently loaded. Please inform the user that documents need to be uploaded first.'}

🚨 FINAL REMINDER - STRICT CONTEXT USAGE:
- ONLY answer from the provided FDD context above
- If information is missing, say so and offer to connect them with the team
- Check conversation history BEFORE asking any question
- If user already mentioned pizza, budget, or location - USE IT, don't ask again
- Your responses should BUILD ON existing information
- NEVER invent, estimate, or use general knowledge - ONLY use what's in the documents
- NEVER repeat the same information you already said in previous messages
- If you've already explained something, don't explain it again - just reference it briefly
- Keep each response fresh and new - don't copy from previous bot messages

Remember: ALWAYS maintain context. Reference what the user already told you. Build on previous messages. NEVER ask questions about information already provided. NEVER repeat information you already shared. MOST IMPORTANTLY: ONLY use information from the provided FDD documents - if it's not there, say so!`;

    // Build messages array with conversation history
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      }
    ];
    
    // Add conversation history (last 12 messages to maintain better context)
    // Include both user and assistant messages to maintain full conversation flow
    const recentHistory = conversationHistory.slice(-12);
    
    // Add a summary message before history to reinforce context and prevent repeated questions
    if (recentHistory.length > 0) {
      const userInfo = [];
      const forbiddenQuestions = [];
      const previousBotMessages = [];
      
      recentHistory.forEach(msg => {
        const content = msg.content.toLowerCase();
        
        // Track previous bot responses to avoid repetition
        if (msg.role === 'assistant') {
          previousBotMessages.push(msg.content);
        }
        
        if (msg.role === 'user') {
          // Check for franchise type
          if (content.includes('pizza') || content.includes('restaurant') || content.includes('food') || 
              content.includes('retail') || content.includes('coffee') || content.includes('cafe') ||
              content.includes('fitness') || content.includes('gym') || content.includes('education')) {
            userInfo.push('franchise type');
            forbiddenQuestions.push('"What type of franchise?"');
            forbiddenQuestions.push('"What type of business?"');
            forbiddenQuestions.push('"What industry?"');
          }
          
          // Check for budget
          if (content.match(/\d+\s*(?:mil|million|m|k|thousand)/i) || 
              content.includes('budget') || content.includes('investment') ||
              content.includes('have') && content.match(/\d+/)) {
            userInfo.push('budget/investment');
            forbiddenQuestions.push('"What\'s your budget?"');
            forbiddenQuestions.push('"What\'s your investment range?"');
            forbiddenQuestions.push('"How much are you looking to invest?"');
          }
          
          // Check for location
          if (content.match(/(?:calgary|toronto|vancouver|montreal|edmonton|winnipeg|ottawa|location|nw|ne|sw|se|north|south|east|west)/i) ||
              content.includes('near') || content.includes('in ') || content.includes('at ')) {
            userInfo.push('location');
            forbiddenQuestions.push('"Where are you looking?"');
            forbiddenQuestions.push('"What location?"');
            forbiddenQuestions.push('"What area?"');
          }
        }
      });
      
      if (userInfo.length > 0) {
        const uniqueInfo = [...new Set(userInfo)];
        const uniqueForbidden = [...new Set(forbiddenQuestions)];
        
        let repetitionWarning = '';
        if (previousBotMessages.length > 0) {
          repetitionWarning = `\n\n⚠️ ANTI-REPETITION RULE:\n- DO NOT repeat information from your previous messages shown below\n- Each response must be NEW and DIFFERENT from what you've already said\n- If you've already explained something, just reference it briefly (e.g., "As mentioned...") or skip it entirely\n- Previous bot messages: ${previousBotMessages.slice(-3).join(' | ')}\n`;
        }
        
        messages.push({
          role: 'system',
          content: `🚨🚨🚨 CRITICAL REMINDER 🚨🚨🚨\n\nThe user has ALREADY provided this information in the conversation: ${uniqueInfo.join(', ')}.\n\n❌ FORBIDDEN - DO NOT ASK THESE QUESTIONS:\n${uniqueForbidden.join('\n')}\n\n✅ INSTEAD: Reference what they told you and provide helpful information based on it.${repetitionWarning}`
        });
      } else if (previousBotMessages.length > 0) {
        // Even if no user info, warn about repetition
        messages.push({
          role: 'system',
          content: `⚠️ ANTI-REPETITION RULE:\n- DO NOT repeat information from your previous messages\n- Each response must be NEW and DIFFERENT\n- Previous bot messages: ${previousBotMessages.slice(-3).join(' | ')}\n- If you've already explained something, just reference it briefly or skip it`
        });
      }
    }
    
    recentHistory.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    });
    
    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage
    });
    
    // Explicitly create request without timeout parameter
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages,
      max_tokens: 60,  // Reduced for 2-3 line responses
      temperature: 0.6
    });

    const responseText = response.choices[0].message.content;
    
    // Check if the response contains the Calendly suggestion marker
    const shouldSuggestCalendly = responseText.includes('[CALENDLY_SUGGESTION]');
    
    // Remove the marker from the response text
    let cleanResponse = responseText.replace('[CALENDLY_SUGGESTION]', '').trim();
    
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
