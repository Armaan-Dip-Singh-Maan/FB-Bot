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
let messageCount = 0;
let calendlySuggested = false;

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
    
    // Increment message count
    messageCount++;
    
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
        
        // Check for meeting booking keywords
        if (checkForMeetingKeywords(message) && !calendlySuggested) {
            addCalendlySuggestion();
            calendlySuggested = true;
        }
        // Check if we should suggest Calendly (after 12+ messages and not already suggested)
        else if (response.suggestCalendly && messageCount >= 12 && !calendlySuggested) {
            addCalendlySuggestion();
            calendlySuggested = true;
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
    
    const textP = document.createElement('div');
    textP.innerHTML = text.replace(/\n/g, '<br>');
    
    bubbleDiv.appendChild(textP);
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(bubbleDiv);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function askQuestion(question) {
    userInput.value = question;
    handleSendMessage();
}

// ============================================
// KEYWORD DETECTION
// ============================================

function checkForMeetingKeywords(message) {
    const meetingKeywords = [
        'book a meeting',
        'schedule a meeting',
        'book a call',
        'schedule a call',
        'book a consultation',
        'schedule a consultation',
        'book an appointment',
        'schedule an appointment',
        'meet with',
        'call with',
        'talk to',
        'speak with',
        'consultation',
        'appointment',
        'meeting',
        'call',
        'demo',
        'presentation',
        'discuss',
        'chat with founder',
        'talk to founder',
        'meet founder',
        'call founder',
        'book',
        'schedule',
        'set up',
        'arrange'
    ];
    
    const lowerMessage = message.toLowerCase();
    return meetingKeywords.some(keyword => lowerMessage.includes(keyword));
}

// ============================================
// CALENDLY INTEGRATION
// ============================================

function addCalendlySuggestion() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message calendly-suggestion';
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'avatar';
    avatarDiv.textContent = '🤖';
    
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'bubble calendly-bubble';
    
    bubbleDiv.innerHTML = `
        <div class="calendly-suggestion-content">
            <h4>📅 Perfect! Let's schedule that call</h4>
            <p>Pick a time that works for you below 👇</p>
            <div id="calendly-inline-widget" class="calendly-inline-widget" 
                 data-url="https://calendly.com/armaandipsinghmaan" 
                 data-min-width="300" 
                 data-height="400">
            </div>
        </div>
    `;
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(bubbleDiv);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Load Calendly widget directly
    loadCalendlyInlineWidget();
}

function openCalendlyWidget() {
    // Create Calendly widget overlay
    const overlay = document.createElement('div');
    overlay.id = 'calendly-overlay';
    overlay.className = 'calendly-overlay';
    
    overlay.innerHTML = `
        <div class="calendly-modal">
            <div class="calendly-header">
                <h3>Schedule a Call with Our Founder</h3>
                <button id="close-calendly" class="close-calendly">✕</button>
            </div>
            <div class="calendly-content">
                <div id="calendly-widget" class="calendly-widget">
                    <!-- Calendly widget will be loaded here -->
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Load Calendly widget
    loadCalendlyWidget();
    
    // Add close event listener
    const closeBtn = document.getElementById('close-calendly');
    closeBtn.addEventListener('click', closeCalendlyWidget);
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeCalendlyWidget();
        }
    });
}

function loadCalendlyInlineWidget() {
    // Load Calendly script if not already loaded
    if (!window.Calendly) {
        const script = document.createElement('script');
        script.src = 'https://assets.calendly.com/assets/external/widget.js';
        script.async = true;
        document.head.appendChild(script);
        
        script.onload = () => {
            initCalendlyWidget();
        };
    } else {
        initCalendlyWidget();
    }
}

function initCalendlyWidget() {
    const widgetElement = document.getElementById('calendly-inline-widget');
    if (widgetElement && window.Calendly) {
        window.Calendly.initInlineWidget({
            url: 'https://calendly.com/armaandipsinghmaan',
            parentElement: widgetElement,
            prefill: {},
            utm: {}
        });
    }
}

function closeCalendlyWidget() {
    const overlay = document.getElementById('calendly-overlay');
    if (overlay) {
        overlay.remove();
    }
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
