// ============================================
// CONFIGURATION - RAG BACKEND SETUP
// ============================================
const RAG_BACKEND_URL = 'http://localhost:3001';
const API_URL = `${RAG_BACKEND_URL}/api/chat`;

// WhatsApp Configuration
// Replace with your WhatsApp number (format: country code + number, no + or spaces)
// Example: '1234567890' for US number (123) 456-7890
// WhatsApp number: Remove all non-numeric characters for wa.me URL
// Format: country code + number (e.g., '13683999991' for +1(368)399-9991)
const WHATSAPP_NUMBER = '13683999991'; // Extracted from +1(368)399-9991
const WHATSAPP_MESSAGE = 'Hello! I\'d like to learn more about Franquicia Boost.'; // Default message

// Calendly Configuration
const CALENDLY_URL = 'https://calendly.com/franquiciaboost';

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
const whatsappWidget = document.getElementById('whatsapp-widget');
const whatsappWidgetSide = document.getElementById('whatsapp-widget-side');
const calendlyOverlay = document.getElementById('calendly-overlay');
const closeCalendlyBtn = document.getElementById('close-calendly');


// ============================================
// EVENT LISTENERS
// ============================================
chatbotToggle.addEventListener('click', openChat);
closeBtn.addEventListener('click', closeChat);
sendBtn.addEventListener('click', handleSendMessage);
whatsappWidget.addEventListener('click', handleWhatsAppClick);
if (whatsappWidgetSide) {
    whatsappWidgetSide.addEventListener('click', handleWhatsAppClick);
}
closeCalendlyBtn.addEventListener('click', closeCalendlyWidget);

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSendMessage();
    }
});

// Close Calendly on overlay click
if (calendlyOverlay) {
    calendlyOverlay.addEventListener('click', (e) => {
        if (e.target === calendlyOverlay) {
            closeCalendlyWidget();
        }
    });
}


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
    
    // Clear input and disable button immediately (don't wait for backend check)
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
        
        // Check for meeting booking keywords - open Calendly modal
        if (checkForMeetingKeywords(message) || response.suggestCalendly) {
            // Show Calendly modal instead of inline widget
            openCalendlyWidget();
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
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
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
        } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
                throw new Error('Request timeout - Please try again');
            }
            throw fetchError;
        }
        
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
// WHATSAPP INTEGRATION
// ============================================

function handleWhatsAppClick(e) {
    e.preventDefault();
    
    // Check if WhatsApp number is configured
    if (WHATSAPP_NUMBER === 'YOUR_WHATSAPP_NUMBER') {
        alert('Please configure your WhatsApp number in script.js');
        console.error('WhatsApp number not configured. Please update WHATSAPP_NUMBER in script.js');
        return;
    }
    
    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
    
    // Open WhatsApp in new tab
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
}

// ============================================
// CALENDLY INTEGRATION
// ============================================

function openCalendlyWidget() {
    // Show the overlay
    if (calendlyOverlay) {
        calendlyOverlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        
        // Load Calendly widget if not already loaded
        loadCalendlyWidget();
    }
}

function closeCalendlyWidget() {
    if (calendlyOverlay) {
        calendlyOverlay.classList.add('hidden');
        document.body.style.overflow = ''; // Restore scrolling
    }
}

function loadCalendlyWidget() {
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
    const widgetElement = document.getElementById('calendly-widget');
    if (widgetElement && window.Calendly) {
        // Clear any existing widget
        widgetElement.innerHTML = '';
        
        // Initialize Calendly popup widget
        window.Calendly.initInlineWidget({
            url: CALENDLY_URL,
            parentElement: widgetElement,
            prefill: {},
            utm: {}
        });
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
