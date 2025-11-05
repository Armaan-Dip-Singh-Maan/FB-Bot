// ============================================
// CONFIGURATION - RAG BACKEND SETUP
// ============================================
const RAG_BACKEND_URL = 'http://localhost:3001';
const API_URL = `${RAG_BACKEND_URL}/api/chat`;

// WhatsApp Configuration
const WHATSAPP_NUMBER = '13683999991';
const WHATSAPP_MESSAGE = 'Hello! I\'d like to learn more about Franquicia Boost.';

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

// Questionnaire state
let questionnaireState = {
    active: false,
    currentStep: null,
    answers: {},
    franchiseMatch: null,
    askedAboutMeeting: false,
    meetingAccepted: false,
    meetingDeclined: false,
    completed: false
};

// Filter state
let filterState = {
    industry: null,
    priceRange: null,
    location: null
};

// Conversation context summary (to help maintain context)
let conversationContext = {
    franchiseType: null,
    location: null,
    budget: null,
    interests: []
};

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
const calendlyOverlay = document.getElementById('calendly-overlay');
const closeCalendlyBtn = document.getElementById('close-calendly');
const disclaimerBanner = document.getElementById('disclaimer-banner');
const closeDisclaimerBtn = document.getElementById('close-disclaimer');
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
closeCalendlyBtn.addEventListener('click', closeCalendlyWidget);
if (closeDisclaimerBtn) {
    closeDisclaimerBtn.addEventListener('click', closeDisclaimer);
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
                body: JSON.stringify({ sessionId })
            });
        } catch (error) {
            console.error('Error tracking visitor:', error);
        }
    }
}

function openChat() {
    chatbotContainer.classList.remove('hidden');
    chatbotToggle.classList.add('hidden');
    
    // Always show disclaimer banner
    disclaimerAccepted = false;
    if (disclaimerBanner) {
        disclaimerBanner.classList.remove('hidden');
    }
    
    initializeSession();
    userInput.focus();
}

function closeDisclaimer() {
    disclaimerAccepted = true;
    if (disclaimerBanner) {
        disclaimerBanner.classList.add('hidden');
    }
}

function closeChat() {
    // Always show email modal before closing if user hasn't provided email
    if (!userEmail) {
        // Ensure session is initialized
        if (!sessionId) {
            initializeSession();
        }
        // Show email modal first
        showEmailModal();
        return;
    }
    
    // Track drop-off if session exists
    if (sessionId && messageCount > 0) {
        fetch(`${RAG_BACKEND_URL}/api/metrics/track-dropoff`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
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
    if (sessionId) {
        fetch(`${RAG_BACKEND_URL}/api/metrics/update-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, email: 'unknown' })
        }).catch(err => console.error('Error updating email:', err));
    }
    closeEmailModal();
    // Actually close the chat now
    chatbotContainer.classList.add('hidden');
    chatbotToggle.classList.remove('hidden');
}

async function submitEmail() {
    const email = userEmailInput.value.trim();
    if (email && isValidEmail(email)) {
        userEmail = email;
        
        if (submitEmailBtn) {
            submitEmailBtn.disabled = true;
            submitEmailBtn.innerHTML = '<span class="btn-text">Submitting...</span>';
        }
        
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
        
        if (emailModal) {
            emailModal.classList.add('hidden');
        }
        
        if (thankyouModal) {
            thankyouModal.classList.remove('hidden');
        }
        
        setTimeout(() => {
            if (thankyouModal) {
                thankyouModal.classList.add('hidden');
            }
            closeChat();
        }, 3000);
    } else {
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

// Update conversation context from user messages
function updateConversationContext(message) {
    const lowerMessage = message.toLowerCase();
    
    // Extract franchise type
    const franchiseTypes = ['pizza', 'restaurant', 'food', 'retail', 'coffee', 'cafe', 'fitness', 'gym', 'education', 'home services', 'cleaning'];
    for (const type of franchiseTypes) {
        if (lowerMessage.includes(type)) {
            conversationContext.franchiseType = type;
            break;
        }
    }
    
    // Extract location (simple patterns - including NW, NE, SW, SE prefixes)
    const locationPatterns = [
        /(?:in|at|near|around|looking\s+for|some\s+place)\s+([a-z\s]*(?:nw|ne|sw|se|north\s+west|north\s+east|south\s+west|south\s+east|north|south|east|west)?\s*(?:calgary|toronto|vancouver|montreal|edmonton|winnipeg|ottawa|halifax|victoria|saskatoon|regina|kelowna|hamilton|london|kitchener|windsor|sherbrooke|st\.?\s*catharines|oshawa|barrie|abbotsford|sudbury|kingston|saguenay|trois-rivières|guelph|cambridge|brantford|saint-john|thunder-bay|chilliwack|red-deer|kamloops|saint-john|nanaimo|sarnia|belleville|fredericton|charlottetown|grande-prairie|caledon|saint-jérôme|airdrie|lethbridge|markham|richmond-hill|vaughan|burlington|milton|pickering|ajax|whitby|oakville|mississauga|brampton|etobicoke|scarborough|north-york|downtown))/i,
        /([a-z\s]*(?:nw|ne|sw|se)\s*(?:calgary|toronto|vancouver|montreal|edmonton|winnipeg|ottawa))/i,
        /([a-z\s]+(?:calgary|toronto|vancouver|montreal|edmonton|winnipeg|ottawa))/i
    ];
    
    for (const pattern of locationPatterns) {
        const match = message.match(pattern);
        if (match && match[1]) {
            conversationContext.location = match[1].trim();
            break;
        }
    }
    
    // Extract budget/investment (improved patterns)
    const budgetPatterns = [
        /\$?\s*(\d+)\s*(?:mil|million|m)/i,
        /\$?\s*(\d+)\s*(?:k|thousand|k)/i,
        /(?:have|got|budget|investment|cost|price)\s*(?:of|is|around|about)?\s*\$?\s*(\d+)/i,
        /(\d+)\s*(?:mil|million|m)\s*(?:budget|investment|dollars)?/i,
        /(\d+)\s*(?:k|thousand)\s*(?:budget|investment|dollars)?/i
    ];
    
    for (const pattern of budgetPatterns) {
        const match = message.match(pattern);
        if (match && match[1]) {
            const amount = parseInt(match[1]);
            if (amount >= 1000) {
                // Format the budget nicely
                if (message.toLowerCase().includes('mil') || message.toLowerCase().includes('million') || message.toLowerCase().includes(' m')) {
                    conversationContext.budget = `$${amount} million`;
                } else if (amount >= 1000) {
                    conversationContext.budget = `$${amount}K`;
                } else {
                    conversationContext.budget = `$${amount}`;
                }
                break;
            }
        }
    }
}

// ============================================
// QUESTIONNAIRE SYSTEM
// ============================================

function askAboutFounderMeeting() {
    questionnaireState.askedAboutMeeting = true;
    addMessageWithQuickReplies(
        "Great! I see you're interested in franchise opportunities. Would you like to schedule a meeting with our founder to discuss your options? This is a great way to get personalized guidance! 🤝",
        ['Yes, I\'d like to meet', 'No, continue chatting']
    );
}

function handleFounderMeetingResponse(response) {
    if (response === 'Yes, I\'d like to meet') {
        questionnaireState.meetingAccepted = true;
        addMessageToUI(response, 'user');
        setTimeout(() => {
            startQuestionnaire();
        }, 800);
    } else {
        // User said no, continue normal chat
        questionnaireState.meetingDeclined = true;
        addMessageToUI(response, 'user');
        setTimeout(() => {
            addMessageToUI("No problem! I'm here to help answer any questions you have. What would you like to know about franchise opportunities? 😊", 'bot');
        }, 500);
    }
}

const QUALIFYING_QUESTIONS = [
    {
        id: 'exploration_time',
        question: "First, have you been exploring franchise opportunities for a while, or is this fairly new?",
        type: 'quick_reply',
        options: ['Just started', 'Few weeks/months', 'Actively researching 6+ months']
    },
    {
        id: 'timeline',
        question: "Perfect timing! What's your desired timeline for opening a franchise?",
        type: 'quick_reply',
        options: ['Within 3 months', '3-6 months', '6-12 months', 'Still exploring']
    },
    {
        id: 'capital',
        question: "Great, that aligns well with typical franchise onboarding. Do you have access to the liquid capital needed ($150K+) to invest in this opportunity?",
        type: 'quick_reply',
        options: ['Yes, ready now', 'Yes, but need to arrange', 'Not quite there yet']
    },
    {
        id: 'decision_maker',
        question: "Fantastic! And are you the primary decision-maker for this investment, or will others be involved?",
        type: 'quick_reply',
        options: ['Just me', 'Me + partner/spouse', 'Family decision', 'Business partners']
    },
    {
        id: 'attraction',
        question: "Wonderful! One last question: What attracted you most to Pizza Franchise X?",
        type: 'text_input'
    }
];

function startQuestionnaire() {
    questionnaireState.active = true;
    questionnaireState.currentStep = 0;
    questionnaireState.answers = {};
    
    addMessageWithQuickReplies(
        "Excellent! Before we schedule your call with the franchisor, I'd like to ask a few quick questions to make sure we maximize your time together. This will only take a minute! 😊",
        []
    );
    
    setTimeout(() => {
        askNextQuestion();
    }, 1500);
}

function askNextQuestion() {
    if (questionnaireState.currentStep >= QUALIFYING_QUESTIONS.length) {
        completeQuestionnaire();
        return;
    }
    
    const question = QUALIFYING_QUESTIONS[questionnaireState.currentStep];
    
    if (question.type === 'quick_reply') {
        addMessageWithQuickReplies(question.question, question.options);
    } else {
        addMessageToUI(question.question, 'bot');
    }
}

function handleQuestionnaireAnswer(answer) {
    const question = QUALIFYING_QUESTIONS[questionnaireState.currentStep];
    questionnaireState.answers[question.id] = answer;
    
    // Add user's answer to chat
    addMessageToUI(answer, 'user');
    
    // Move to next question
    questionnaireState.currentStep++;
    
    setTimeout(() => {
        askNextQuestion();
    }, 800);
}

function completeQuestionnaire() {
    questionnaireState.active = false;
    
    // Save questionnaire answers to backend
    if (sessionId && questionnaireState.answers) {
        fetch(`${RAG_BACKEND_URL}/api/metrics/save-questionnaire`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                sessionId, 
                answers: questionnaireState.answers 
            })
        }).catch(err => console.error('Error saving questionnaire:', err));
    }
    
    // Show meeting message with franchise match
    const franchiseMatch = filterState.franchiseMatch || 'Pizza Franchise X';
    const meetingMessage = `Perfect! Based on what you've shared, I think you'd be a great fit for ${franchiseMatch}. Let me connect you with their development team for a discovery call! 📞\n\nI can help you book a 30-minute consultation with Sana, their Franchise Development Manager. She'll walk you through:\n\n✓ Detailed financial projections\n\n✓ Available territories in your area\n\n✓ The complete onboarding process\n\n✓ Answer all your questions`;
    
    setTimeout(() => {
        addMessageWithQuickReplies(meetingMessage, ['Schedule Discovery Call']);
        // Mark that questionnaire is complete so clicking the button opens Calendly
        questionnaireState.completed = true;
    }, 500);
}

async function handleScheduleCall() {
    // User clicked "Schedule Discovery Call"
    // Check if questionnaire is completed
    if (questionnaireState.completed || questionnaireState.currentStep >= QUALIFYING_QUESTIONS.length) {
        // Questionnaire is complete, fetch available dates/times
        await showAvailableTimeSlots();
    } else if (!questionnaireState.active) {
        // Start questionnaire if not already started
        startQuestionnaire();
    }
}

async function showAvailableTimeSlots() {
    try {
        // Show typing indicator
        typingIndicator.classList.remove('hidden');
        
        // Fetch available time slots from backend
        const response = await fetch(`${RAG_BACKEND_URL}/api/calendly/availability`);
        const data = await response.json();
        
        typingIndicator.classList.add('hidden');
        
        if (data.success && data.slots && data.slots.length > 0) {
            // Format slots with better display
            const timeOptions = data.slots.map(slot => `📅 ${slot.date} at ${slot.time}`);
            
            addMessageWithQuickReplies(
                "Perfect! Here are some available times for your call with our founder. Which works best for you? 📅",
                timeOptions,
                false,
                data.slots // Pass full slot data for booking
            );
            
            // Store slots for booking
            window.currentTimeSlots = data.slots;
        } else {
            // Fallback if no slots available
            addMessageToUI("Let me check available times for you. Please visit our Calendly page to book: " + CALENDLY_URL, 'bot');
        }
    } catch (error) {
        typingIndicator.classList.add('hidden');
        console.error('Error fetching time slots:', error);
        addMessageToUI("I'm having trouble fetching available times. Please visit: " + CALENDLY_URL, 'bot');
    }
}

async function handleTimeSlotSelection(selectedText, slots) {
    // Remove emoji prefix if present for matching
    const cleanText = selectedText.replace(/^📅\s*/, '');
    
    // Find the selected slot (try both with and without emoji)
    let selectedSlot = slots.find(slot => `${slot.date} at ${slot.time}` === cleanText || `${slot.date} at ${slot.time}` === selectedText);
    
    if (!selectedSlot) {
        addMessageToUI("Sorry, I couldn't find that time slot. Please try again.", 'bot');
        return;
    }
    
    // Book the selected time slot
    try {
        const response = await fetch(`${RAG_BACKEND_URL}/api/calendly/book`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: sessionId,
                slot: selectedSlot,
                email: userEmail,
                name: userEmail ? userEmail.split('@')[0] : 'Guest'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Show user's selection
            addMessageToUI(cleanText, 'user');
            
            // Show confirmation with better formatting
            setTimeout(() => {
                const confirmationMessage = `✅ ${data.message}\n\n📧 You'll receive a confirmation email shortly with all the details.\n\nLooking forward to our call! 🎉`;
                addMessageToUI(confirmationMessage, 'bot');
                calendlySuggested = true;
                
                // Track meeting booking
                if (sessionId) {
                    fetch(`${RAG_BACKEND_URL}/api/metrics/track-meeting`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sessionId })
                    }).catch(err => console.error('Error tracking meeting:', err));
                }
            }, 500);
        } else {
            addMessageToUI("Sorry, there was an error booking that time. Please try again or visit: " + CALENDLY_URL, 'bot');
        }
    } catch (error) {
        console.error('Error booking time slot:', error);
        addMessageToUI("Sorry, there was an error. Please visit: " + CALENDLY_URL, 'bot');
    }
}

// ============================================
// FILTERING SYSTEM
// ============================================

function showFilterOptions() {
    const filterMessage = "Would you like to:";
    const options = [
        'Refine these results',
        'See franchises in different price ranges',
        'Explore other industries',
        'Learn more about a specific franchise'
    ];
    
    addMessageWithQuickReplies(filterMessage, options);
}

function handleFilterOption(option) {
    if (option === 'Refine these results') {
        showProgressiveFiltering();
    } else if (option === 'See franchises in different price ranges') {
        showPriceRangeFilter();
    } else if (option === 'Explore other industries') {
        showIndustryFilter();
    } else if (option === 'Learn more about a specific franchise') {
        addMessageToUI("Which franchise would you like to learn more about? Just type the name!", 'bot');
    }
}

function showProgressiveFiltering() {
    addMessageToUI("Great! Let's explore by industry. Which industry interests you most?", 'bot');
    
    const industries = ['Food & Beverage', 'Retail', 'Home Services', 'Fitness & Health', 'Education', 'Other'];
    setTimeout(() => {
        addMessageWithQuickReplies("", industries, true);
    }, 500);
}

function handleIndustrySelection(industry) {
    filterState.industry = industry;
    addMessageToUI(industry, 'user');
    
    setTimeout(() => {
        addMessageToUI("Excellent choice! What's your investment range?", 'bot');
        const priceRanges = ['Under $50K', '$50K-$150K', '$150K-$300K', '$300K+', 'Not sure yet'];
        setTimeout(() => {
            addMessageWithQuickReplies("", priceRanges, true);
        }, 500);
    }, 800);
}

function handlePriceRangeSelection(priceRange) {
    filterState.priceRange = priceRange;
    addMessageToUI(priceRange, 'user');
    
    setTimeout(() => {
        addMessageToUI("Perfect. Where are you looking to open?", 'bot');
        // This will be handled as a text input
    }, 800);
}

function handleLocationInput(location) {
    filterState.location = location;
    
    // Simulate finding matches (in real app, this would query the backend)
    setTimeout(() => {
        const matches = getFilteredFranchises();
        if (matches.length > 0) {
            filterState.franchiseMatch = matches[0].name;
            addMessageToUI(`Based on your preferences (${filterState.industry}, ${filterState.priceRange}, ${location}), I found some great matches! Would you like to schedule a discovery call?`, 'bot');
            setTimeout(() => {
                addMessageWithQuickReplies("", ['Schedule Discovery Call'], true);
            }, 500);
        } else {
            addMessageToUI("I couldn't find exact matches for your criteria. Would you like to refine your search?", 'bot');
            setTimeout(() => {
                showFilterOptions();
            }, 500);
        }
    }, 1000);
}

function getFilteredFranchises() {
    // This would normally query the backend
    // For now, return a mock match
    return [{ name: 'Pizza Franchise X', industry: filterState.industry, priceRange: filterState.priceRange }];
}

function showIndustryFilter() {
    const industries = ['Food & Beverage', 'Retail', 'Home Services', 'Fitness & Health', 'Education', 'Other'];
    addMessageToUI("Which industry interests you?", 'bot');
    setTimeout(() => {
        addMessageWithQuickReplies("", industries, true);
    }, 500);
}

function showPriceRangeFilter() {
    const priceRanges = ['Under $50K', '$50K-$150K', '$150K-$300K', '$300K+', 'Not sure yet'];
    addMessageToUI("What's your investment range?", 'bot');
    setTimeout(() => {
        addMessageWithQuickReplies("", priceRanges, true);
    }, 500);
}

// ============================================
// MESSAGE HANDLING
// ============================================

async function handleSendMessage() {
    const message = userInput.value.trim();
    
    if (!message || isProcessing) return;
    
    // Check if we're in questionnaire mode and expecting text input
    if (questionnaireState.active && questionnaireState.currentStep < QUALIFYING_QUESTIONS.length) {
        const question = QUALIFYING_QUESTIONS[questionnaireState.currentStep];
        if (question.type === 'text_input') {
            handleQuestionnaireAnswer(message);
            userInput.value = '';
            return;
        }
    }
    
    // Check if we're expecting location input
    if (filterState.priceRange && !filterState.location) {
        handleLocationInput(message);
        userInput.value = '';
        return;
    }
    
    // Clear input and disable button
    userInput.value = '';
    isProcessing = true;
    sendBtn.disabled = true;
    
    // Add user message to UI
    addMessageToUI(message, 'user');
    
    messageCount++;
    
    conversationHistory.push({
        role: 'user',
        content: message
    });
    
    typingIndicator.classList.remove('hidden');
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    try {
        // Update conversation context from current message
        updateConversationContext(message);
        
        const sessionData = {
            messageCount: messageCount,
            qualificationScore: qualificationScore,
            calendlySuggested: calendlySuggested,
            filters: filterState,
            questionnaireAnswers: questionnaireState.answers,
            conversationHistory: conversationHistory,
            conversationContext: conversationContext
        };
        
        if (messageCount === 1 && sessionId) {
            fetch(`${RAG_BACKEND_URL}/api/metrics/track-engagement`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId })
            }).catch(err => console.error('Error tracking engagement:', err));
        }
        
        const response = await callRAGBackend(message, sessionData);
        
        typingIndicator.classList.add('hidden');
        
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
        
        if (response.qualificationScore !== undefined) {
            const previousScore = qualificationScore;
            qualificationScore = response.qualificationScore;
            qualificationStatus = response.qualificationStatus || 'browsing';
            
            if (qualificationScore >= 50 && previousScore < 50 && sessionId) {
                fetch(`${RAG_BACKEND_URL}/api/metrics/track-qualification`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId, score: qualificationScore })
                }).catch(err => console.error('Error tracking qualification:', err));
            }
            
            if (response.pointsAdded > 0) {
                console.log(`📊 Qualification: ${qualificationScore} points (${qualificationStatus})`);
            }
        }
        
        // Update filter state from backend response
        if (response.filters) {
            filterState = { ...filterState, ...response.filters };
            
            // Update conversation context from filters
            if (response.filters.industry) {
                conversationContext.franchiseType = response.filters.industry.toLowerCase();
            }
            if (response.filters.location) {
                conversationContext.location = response.filters.location;
            }
            if (response.filters.priceRange) {
                conversationContext.budget = response.filters.priceRange;
            }
        }
        
        // Add bot response to UI
        if (response.quickReplies) {
            addMessageWithQuickReplies(response.response, response.quickReplies);
        } else {
            addMessageToUI(response.response, 'bot');
        }
        
        // Add bot response to conversation history for context (avoid duplicates)
        const lastBotMessage = conversationHistory.filter(msg => msg.role === 'assistant').pop();
        if (!lastBotMessage || lastBotMessage.content !== response.response) {
            conversationHistory.push({
                role: 'assistant',
                content: response.response
            });
        }
        
        const previousScore = qualificationScore - (response.pointsAdded || 0);
        const justQualified = previousScore < 50 && qualificationScore >= 50;
        
        const userAskedForMeeting = checkForMeetingKeywords(message);
        
        // If user just qualified, ask if they want to meet with founder first
        if (justQualified && !calendlySuggested && !questionnaireState.active && !questionnaireState.askedAboutMeeting) {
            setTimeout(() => {
                askAboutFounderMeeting();
            }, 500);
        } else if (userAskedForMeeting) {
            // User explicitly asked for meeting
            if (!questionnaireState.active && !questionnaireState.askedAboutMeeting) {
                askAboutFounderMeeting();
            } else if (questionnaireState.meetingAccepted) {
                if (!questionnaireState.active) {
                    startQuestionnaire();
                }
            }
        }
        
        // Check if response suggests filtering
        if (response.suggestFilters) {
            setTimeout(() => {
                showFilterOptions();
            }, 1000);
        }
        
    } catch (error) {
        typingIndicator.classList.add('hidden');
        
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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
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


function addMessageToUI(text, sender, options = {}) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'avatar';
    if (sender === 'bot') {
        const logoImg = document.createElement('img');
        logoImg.src = 'assets/images/Logo.png';
        logoImg.alt = 'Franquicia Boost';
        logoImg.className = 'avatar-img';
        logoImg.onerror = function() {
            this.style.display = 'none';
            const fallback = document.createElement('span');
            fallback.className = 'avatar-fallback';
            fallback.textContent = '🤖';
            fallback.style.display = 'block';
            avatarDiv.appendChild(fallback);
        };
        avatarDiv.appendChild(logoImg);
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

function addMessageWithQuickReplies(text, quickReplies, numbered = false, slotData = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message';
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'avatar';
    const logoImg = document.createElement('img');
    logoImg.src = 'assets/images/Logo.png';
    logoImg.alt = 'Franquicia Boost';
    logoImg.className = 'avatar-img';
    logoImg.onerror = function() {
        this.style.display = 'none';
        const fallback = document.createElement('span');
        fallback.className = 'avatar-fallback';
        fallback.textContent = '🤖';
        fallback.style.display = 'block';
        avatarDiv.appendChild(fallback);
    };
    avatarDiv.appendChild(logoImg);
    
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'bubble';
    
    if (text) {
        const textP = document.createElement('div');
        textP.innerHTML = text.replace(/\n/g, '<br>');
        bubbleDiv.appendChild(textP);
    }
    
    // Store slot data if provided (for time slot selection)
    if (slotData) {
        messageDiv.setAttribute('data-slots', JSON.stringify(slotData));
    }
    
    if (quickReplies && quickReplies.length > 0) {
        const quickRepliesDiv = document.createElement('div');
        quickRepliesDiv.className = 'quick-replies';
        
        // Check if these are time slots (if slotData is provided)
        const isTimeSlot = slotData !== null && slotData.length > 0;
        
        quickReplies.forEach((reply, index) => {
            const button = document.createElement('button');
            button.className = 'quick-reply-btn';
            if (isTimeSlot) {
                button.classList.add('time-slot-btn');
            }
            // Special styling for Schedule Discovery Call button
            if (reply === 'Schedule Discovery Call') {
                button.classList.add('schedule-call-btn');
                button.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
                button.style.color = 'white';
                button.style.borderColor = '#1d4ed8';
                button.style.fontWeight = '600';
                button.style.padding = '14px 20px';
                button.style.fontSize = '15px';
                button.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.3)';
            }
            button.textContent = numbered ? `${index + 1}: ${reply}` : reply;
            button.onclick = () => handleQuickReply(reply);
            quickRepliesDiv.appendChild(button);
        });
        
        bubbleDiv.appendChild(quickRepliesDiv);
    }
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(bubbleDiv);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function handleQuickReply(reply) {
    // Check if asked about founder meeting
    if (questionnaireState.askedAboutMeeting && !questionnaireState.meetingAccepted && !questionnaireState.meetingDeclined) {
        handleFounderMeetingResponse(reply);
        return;
    }
    
    // Check if we're in questionnaire mode
    if (questionnaireState.active && questionnaireState.currentStep < QUALIFYING_QUESTIONS.length) {
        handleQuestionnaireAnswer(reply);
        return;
    }
    
    // Check if it's a scheduling action
    if (reply === 'Schedule Discovery Call') {
        handleScheduleCall();
        return;
    }
    
    // Check if it's a time slot selection
    const lastBotMessage = document.querySelector('.bot-message:last-of-type');
    if (lastBotMessage && lastBotMessage.hasAttribute('data-slots')) {
        try {
            const slots = JSON.parse(lastBotMessage.getAttribute('data-slots'));
            if (slots && Array.isArray(slots) && slots.length > 0) {
                handleTimeSlotSelection(reply, slots);
                return;
            }
        } catch (e) {
            console.error('Error parsing slot data:', e);
        }
    }
    
    // Check if it's a filter option
    if (['Refine these results', 'See franchises in different price ranges', 'Explore other industries', 'Learn more about a specific franchise'].includes(reply)) {
        handleFilterOption(reply);
        return;
    }
    
    // Check if it's an industry selection
    const industries = ['Food & Beverage', 'Retail', 'Home Services', 'Fitness & Health', 'Education', 'Other'];
    if (industries.includes(reply)) {
        handleIndustrySelection(reply);
        return;
    }
    
    // Check if it's a price range selection
    const priceRanges = ['Under $50K', '$50K-$150K', '$150K-$300K', '$300K+', 'Not sure yet'];
    if (priceRanges.includes(reply)) {
        handlePriceRangeSelection(reply);
        return;
    }
    
    // Default: send as regular message
    userInput.value = reply;
    handleSendMessage();
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
    
    if (WHATSAPP_NUMBER === 'YOUR_WHATSAPP_NUMBER') {
        alert('Please configure your WhatsApp number in script.js');
        console.error('WhatsApp number not configured. Please update WHATSAPP_NUMBER in script.js');
        return;
    }
    
    const encodedMessage = encodeURIComponent(WHATSAPP_MESSAGE);
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
}

// ============================================
// CALENDLY INTEGRATION
// ============================================

function openCalendlyWidget() {
    if (calendlyOverlay) {
        calendlyOverlay.classList.remove('hidden');
        
        // Load Calendly widget if not already loaded
        if (!window.Calendly) {
            const script = document.createElement('script');
            script.src = 'https://assets.calendly.com/assets/external/widget.js';
            script.async = true;
            document.body.appendChild(script);
        }
        
        // Initialize Calendly inline widget
        setTimeout(() => {
            if (window.Calendly) {
                const calendlyDiv = document.getElementById('calendly-inline-widget');
                if (calendlyDiv && !calendlyDiv.hasAttribute('data-calendly-initialized')) {
                    window.Calendly.initInlineWidget({
                        url: CALENDLY_URL,
                        parentElement: calendlyDiv,
                        prefill: {
                            name: userEmail ? userEmail.split('@')[0] : '',
                            email: userEmail || ''
                        }
                    });
                    calendlyDiv.setAttribute('data-calendly-initialized', 'true');
                }
            }
        }, 500);
    }
}

function closeCalendlyWidget() {
    if (calendlyOverlay) {
        calendlyOverlay.classList.add('hidden');
    }
}
