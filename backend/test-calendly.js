// Test script for Calendly integration
const { generateResponse } = require('./utils/openaiClient');

async function testCalendlyIntegration() {
    console.log('🧪 Testing Calendly Integration...\n');
    
    // Test messages that should trigger Calendly suggestion
    const testMessages = [
        "I'm interested in investing in a franchise",
        "I have $50,000 to invest, what franchise opportunities do you have?",
        "I want to become a franchisee, can you help me?",
        "I'm seriously considering franchise opportunities",
        "What's the next step to get started with a franchise?",
        "I want to discuss my franchise goals with someone"
    ];
    
    // Test messages that should NOT trigger Calendly suggestion
    const nonTriggerMessages = [
        "Hello, how are you?",
        "What is a franchise?",
        "Tell me about your company",
        "How does the platform work?",
        "What are your services?"
    ];
    
    console.log('📝 Testing messages that SHOULD trigger Calendly suggestion:\n');
    
    for (const message of testMessages) {
        try {
            const response = await generateResponse(message, 'Test context');
            console.log(`✅ Message: "${message}"`);
            console.log(`   Suggest Calendly: ${response.suggestCalendly ? 'YES' : 'NO'}`);
            console.log(`   Response: ${response.response.substring(0, 100)}...\n`);
        } catch (error) {
            console.error(`❌ Error testing message "${message}":`, error.message);
        }
    }
    
    console.log('📝 Testing messages that should NOT trigger Calendly suggestion:\n');
    
    for (const message of nonTriggerMessages) {
        try {
            const response = await generateResponse(message, 'Test context');
            console.log(`✅ Message: "${message}"`);
            console.log(`   Suggest Calendly: ${response.suggestCalendly ? 'YES' : 'NO'}`);
            console.log(`   Response: ${response.response.substring(0, 100)}...\n`);
        } catch (error) {
            console.error(`❌ Error testing message "${message}":`, error.message);
        }
    }
    
    console.log('🎯 Calendly Integration Test Complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. Update your Calendly username in backend/config/calendly.js');
    console.log('2. Start the backend server: npm start');
    console.log('3. Open the bot in your browser');
    console.log('4. Test the integration with real conversations');
}

// Run the test
testCalendlyIntegration().catch(console.error);
