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
let qualificationScore = 0;
let qualificationStatus = 'browsing';
let sessionId = null;
let userEmail = null;
let disclaimerAccepted = false;

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
const disclaimerBanner = document.getElementById('disclaimer-banner');
const closeDisclaimerBtn = document.getElementById('close-disclaimer');
const feedbackBtn = document.getElementById('feedback-btn');
const emailModal = document.getElementById('email-modal');
const closeEmailModalBtn = document.getElementById('close-email-modal');
const skipEmailBtn = document.getElementById('skip-email');
const submitEmailBtn = document.getElementById('submit-email');
const userEmailInput = document.getElementById('user-email-input');
const thankyouModal = document.getElementById('thankyou-modal');
const closeThankyouBtn = document.getElementById('close-thankyou');


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
if (closeDisclaimerBtn) {
    closeDisclaimerBtn.addEventListener('click', closeDisclaimer);
}
if (feedbackBtn) {
    feedbackBtn.addEventListener('click', showEmailModal);
}
if (closeEmailModalBtn) {
    closeEmailModalBtn.addEventListener('click', closeEmailModal);
}
if (skipEmailBtn) {
    skipEmailBtn.addEventListener('click', skipEmail);
}
if (submitEmailBtn) {
    submitEmailBtn.addEventListener('click', submitEmail);
}
if (closeThankyouBtn) {
    closeThankyouBtn.addEventListener('click', () => {
        if (thankyouModal) {
            thankyouModal.classList.add('hidden');
        }
        closeChat();
    });
}
// Allow Enter key to submit email
if (userEmailInput) {
    userEmailInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            submitEmail();
        }
    });
}

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

// Generate unique session ID
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Initialize session
async function initializeSession() {
    if (!sessionId) {
        sessionId = generateSessionId();
        try {
            await fetch(`${RAG_BACKEND_URL}/api/metrics/track-visitor`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, email: userEmail })
            });
        } catch (error) {
            console.error('Error tracking visitor:', error);
        }
    }
}

function openChat() {
    chatbotContainer.classList.remove('hidden');
    chatbotToggle.classList.add('hidden');
    
    // Always show disclaimer banner (removed sessionStorage check - shows every time)
    disclaimerAccepted = false;
    if (disclaimerBanner) {
        disclaimerBanner.classList.remove('hidden');
    }
    
    // Initialize session tracking
    initializeSession();
    
    userInput.focus();
}

function closeDisclaimer() {
    disclaimerAccepted = true;
    // No persistence - disclaimer will show again on next page refresh
    if (disclaimerBanner) {
        disclaimerBanner.classList.add('hidden');
    }
}

function closeChat() {
    // Track drop-off before closing
    if (sessionId) {
        fetch(`${RAG_BACKEND_URL}/api/metrics/track-dropoff`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, messageCount })
        }).catch(err => console.error('Error tracking drop-off:', err));
    }
    
    chatbotContainer.classList.add('hidden');
    chatbotToggle.classList.remove('hidden');
}

function showEmailModal() {
    if (emailModal) {
        emailModal.classList.remove('hidden');
    }
}

function closeEmailModal() {
    if (emailModal) {
        emailModal.classList.add('hidden');
    }
}

function skipEmail() {
    // Mark as unknown user
    if (sessionId) {
        fetch(`${RAG_BACKEND_URL}/api/metrics/update-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, email: 'unknown' })
        }).catch(err => console.error('Error updating email:', err));
    }
    closeEmailModal();
    closeChat();
}

async function submitEmail() {
    const email = userEmailInput.value.trim();
    if (email && isValidEmail(email)) {
        userEmail = email;
        
        // Show loading state
        if (submitEmailBtn) {
            submitEmailBtn.disabled = true;
            submitEmailBtn.innerHTML = '<span class="btn-text">Submitting...</span>';
        }
        
        // Update email in backend
        if (sessionId) {
            try {
                await fetch(`${RAG_BACKEND_URL}/api/metrics/update-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId, email })
                });
            } catch (error) {
                console.error('Error updating email:', error);
            }
        }
        
        // Hide email modal and show thank you
        if (emailModal) {
            emailModal.classList.add('hidden');
        }
        
        // Show thank you modal
        if (thankyouModal) {
            thankyouModal.classList.remove('hidden');
        }
        
        // Close chat after a moment
        setTimeout(() => {
            if (thankyouModal) {
                thankyouModal.classList.add('hidden');
            }
            closeChat();
        }, 3000);
    } else {
        // Show error
        if (userEmailInput) {
            userEmailInput.classList.add('error');
            userEmailInput.placeholder = 'Please enter a valid email address';
            setTimeout(() => {
                userEmailInput.classList.remove('error');
                userEmailInput.placeholder = 'you@example.com';
            }, 3000);
        }
    }
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
        // Prepare session data for qualification tracking
        const sessionData = {
            messageCount: messageCount,
            qualificationScore: qualificationScore,
            calendlySuggested: calendlySuggested
        };
        
        // Track engagement on first message
        if (messageCount === 1 && sessionId) {
            fetch(`${RAG_BACKEND_URL}/api/metrics/track-engagement`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId })
            }).catch(err => console.error('Error tracking engagement:', err));
        }
        
        // Call RAG Backend API with session data
        const response = await callRAGBackend(message, sessionData);
        
        // Hide typing indicator
        typingIndicator.classList.add('hidden');
        
        // Track message
        if (sessionId) {
            fetch(`${RAG_BACKEND_URL}/api/metrics/track-message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    sessionId, 
                    message, 
                    response: response.response 
                })
            }).catch(err => console.error('Error tracking message:', err));
        }
        
        // Update qualification score
        if (response.qualificationScore !== undefined) {
            const previousScore = qualificationScore;
            qualificationScore = response.qualificationScore;
            qualificationStatus = response.qualificationStatus || 'browsing';
            
            // Track qualification
            if (qualificationScore >= 50 && previousScore < 50 && sessionId) {
                fetch(`${RAG_BACKEND_URL}/api/metrics/track-qualification`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId, score: qualificationScore })
                }).catch(err => console.error('Error tracking qualification:', err));
            }
            
            // Log qualification progress (only if points were added)
            if (response.pointsAdded > 0) {
                console.log(`📊 Qualification: ${qualificationScore} points (${qualificationStatus})`);
            }
        }
        
        // Add bot response to UI
        addMessageToUI(response.response, 'bot');
        
        // Check if lead just became qualified
        const previousScore = qualificationScore - (response.pointsAdded || 0);
        const justQualified = previousScore < 50 && qualificationScore >= 50;
        
        // Only suggest Calendly if lead is qualified AND not already suggested
        // Also check if user explicitly asks for meeting
        const userAskedForMeeting = checkForMeetingKeywords(message);
        
        if (userAskedForMeeting) {
            // User explicitly asked - always show
            openCalendlyWidget();
            calendlySuggested = true;
            
            // Track meeting booking
            if (sessionId) {
                fetch(`${RAG_BACKEND_URL}/api/metrics/track-meeting`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId })
                }).catch(err => console.error('Error tracking meeting:', err));
            }
        } else if (response.suggestCalendly || justQualified) {
            // Lead just qualified OR is qualified and AI suggests meeting
            // Add a friendly message before showing Calendly
            if (justQualified && !calendlySuggested) {
                setTimeout(() => {
                    addMessageToUI('🎉 Great! You\'re ready to take the next step. Let\'s schedule a meeting!', 'bot');
                    setTimeout(() => {
                        openCalendlyWidget();
                        calendlySuggested = true;
                    }, 500);
                }, 300);
            } else if (response.suggestCalendly && !calendlySuggested) {
                openCalendlyWidget();
                calendlySuggested = true;
                
                // Track meeting booking
                if (sessionId) {
                    fetch(`${RAG_BACKEND_URL}/api/metrics/track-meeting`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sessionId })
                    }).catch(err => console.error('Error tracking meeting:', err));
                }
            }
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

async function callRAGBackend(message, sessionData = {}) {
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
                    message: message,
                    sessionData: sessionData
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
    const contentElement = document.querySelector('.calendly-content');
    
    if (widgetElement && window.Calendly) {
        // Show loading state
        if (contentElement) {
            contentElement.classList.add('loading');
        }
        
        // Clear any existing widget
        widgetElement.innerHTML = '';
        
        // Initialize Calendly popup widget
        window.Calendly.initInlineWidget({
            url: CALENDLY_URL,
            parentElement: widgetElement,
            prefill: {},
            utm: {}
        });
        
        // Remove loading state after widget loads
        setTimeout(() => {
            if (contentElement) {
                contentElement.classList.remove('loading');
            }
        }, 1000);
    }
}

// ============================================
// INITIALIZE
// ============================================
console.log('Chatbot initialized. Ready to chat!');

// Disclaimer should show every time (removed sessionStorage persistence)
// disclaimerAccepted is always false on page load

// Check backend status on load
window.addEventListener('load', async () => {
    const isBackendRunning = await checkBackendStatus();
    if (!isBackendRunning) {
        console.warn('⚠️ RAG Backend is not running. Please start the backend server.');
    } else {
        console.log('✅ RAG Backend is running and ready!');
    }
});
