// ============================================
// CONFIGURATION - RAG BACKEND SETUP
// ============================================
const RAG_BACKEND_URL = 'http://localhost:3001';
const API_URL = `${RAG_BACKEND_URL}/api/chat`;

// ============================================
// STATE MANAGEMENT
// ============================================
let conversationHistory = [];
let isProcessing = false;

// ============================================
// DOM ELEMENTS
// ============================================
const chatbotToggle = document.getElementById('chatbot-toggle');
const chatbotContainer = document.getElementById('chatbot-container');
const closeBtn = document.getElementById('close-chat');
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const typingIndicator = document.getElementById('typing-indicator');


// ============================================
// EVENT LISTENERS
// ============================================
chatbotToggle.addEventListener('click', openChat);
closeBtn.addEventListener('click', closeChat);
sendBtn.addEventListener('click', handleSendMessage);

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSendMessage();
    }
});


// ============================================
// MAIN FUNCTIONS
// ============================================

function openChat() {
    chatbotContainer.classList.remove('hidden');
    chatbotToggle.classList.add('hidden');
    userInput.focus();
}

function closeChat() {
    chatbotContainer.classList.add('hidden');
    chatbotToggle.classList.remove('hidden');
}

async function handleSendMessage() {
    const message = userInput.value.trim();
    
    // Validation
    if (!message || isProcessing) return;
    
    // Check if backend is running
    if (!await checkBackendStatus()) {
        addMessageToUI('⚠️ RAG backend is not running. Please start the backend server first.', 'bot');
        return;
    }
    
    // Clear input and disable button
    userInput.value = '';
    isProcessing = true;
    sendBtn.disabled = true;
    
    // Add user message to UI
    addMessageToUI(message, 'user');
    
    // Add to conversation history
    conversationHistory.push({
        role: 'user',
        content: message
    });
    
    // Show typing indicator
    typingIndicator.classList.remove('hidden');
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    try {
        // Call RAG Backend API
        const response = await callRAGBackend(message);
        
        // Hide typing indicator
        typingIndicator.classList.add('hidden');
        
        // Add bot response to UI
        addMessageToUI(response.response, 'bot');
        
        // Show sources if available
        if (response.sources && response.sources.length > 0) {
            const sourcesText = `\n\n📚 Sources:\n${response.sources.map((source, index) => 
                `${index + 1}. ${source.fileName} (Page ${source.page})`
            ).join('\n')}`;
            addMessageToUI(sourcesText, 'bot');
        }
        
        // Add to conversation history
        conversationHistory.push({
            role: 'assistant',
            content: response.response
        });
        
    } catch (error) {
        typingIndicator.classList.add('hidden');
        
        // Better error messages
        let errorMessage = 'Sorry, something went wrong. ';
        
        if (error.message.includes('401')) {
            errorMessage = '🔑 Invalid API key. Please check your OpenAI API key.';
        } else if (error.message.includes('429')) {
            errorMessage = '⏱️ Rate limit exceeded. Please wait a moment and try again.';
        } else if (error.message.includes('network')) {
            errorMessage = '🌐 Network error. Please check your internet connection.';
        } else {
            errorMessage += 'Please try again.';
        }
        
        addMessageToUI(errorMessage, 'bot');
        console.error('Chatbot Error:', error);
    } finally {
        isProcessing = false;
        sendBtn.disabled = false;
        userInput.focus();
    }
}

async function callRAGBackend(message) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message
            })
        });
        
        // Check if response is ok
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Backend Error ${response.status}: ${errorData.error || response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data || !data.response) {
            console.error('Invalid backend response:', data);
            throw new Error('Invalid response from RAG backend');
        }
        
        return data;
        
    } catch (error) {
        console.error('RAG Backend Error:', error);
        throw error;
    }
}

async function checkBackendStatus() {
    try {
        const response = await fetch(`${RAG_BACKEND_URL}/api/status`);
        return response.ok;
    } catch (error) {
        return false;
    }
}


function addMessageToUI(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'avatar';
    if (sender === 'bot') {
        avatarDiv.textContent = '🤖';
    }
    
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'bubble';
    
    const textP = document.createElement('p');
    textP.textContent = text;
    
    bubbleDiv.appendChild(textP);
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(bubbleDiv);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ============================================
// INITIALIZE
// ============================================
console.log('Chatbot initialized. Ready to chat!');

// Check backend status on load
window.addEventListener('load', async () => {
    const isBackendRunning = await checkBackendStatus();
    if (!isBackendRunning) {
        console.warn('⚠️ RAG Backend is not running. Please start the backend server.');
        addMessageToUI('⚠️ RAG Backend is not running. Please start the backend server first.', 'bot');
    } else {
        console.log('✅ RAG Backend is running and ready!');
    }
});
