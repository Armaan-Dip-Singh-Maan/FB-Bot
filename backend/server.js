const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const cron = require('node-cron');
require('dotenv').config();

const { processPDF } = require('./utils/pdfProcessor');
const { VectorDB } = require('./utils/vectorDB');
const { generateEmbedding, generateResponse } = require('./utils/openaiClient');
const { initializeKnowledgeBase } = require('./utils/initializeKnowledgeBase');
const { LeadQualification } = require('./utils/leadQualification');
const { SecurityValidator } = require('./utils/security');
const { MetricsTracker } = require('./utils/metricsTracker');
const calendlyConfig = require('./config/calendly');
const websiteConfig = require('./config/website');
const { WebsiteContentUpdater } = require('./scripts/update-website-content');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));


// Initialize Vector Database (loads asynchronously)
const vectorDB = new VectorDB();

// Initialize Metrics Tracker (loads asynchronously)
const metricsTracker = new MetricsTracker();

// Track if server is ready
let serverReady = false;

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});


// Chat endpoint with RAG
app.post('/api/chat', async (req, res) => {
  // Set timeout for the entire request (25 seconds)
  req.setTimeout(25000);
  
  const startTime = Date.now();
  
  try {
    const { message, sessionData = {} } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Security validation
    const securityValidator = new SecurityValidator();
    const securityCheck = securityValidator.validateForLLM(message);
    
    if (!securityCheck.isValid) {
      console.warn(`⚠️ Security threat detected: ${securityCheck.threats.join(', ')}`);
      
      // Return a safe response without processing
      return res.json({
        response: securityCheck.sanitized || 'I\'m here to help with franchise opportunities. What are you looking for?',
        suggestCalendly: false,
        qualificationScore: sessionData.qualificationScore || 0,
        qualificationStatus: 'browsing',
        pointsAdded: 0,
        isQualified: false,
        securityWarning: true
      });
    }

    // Use sanitized message
    const sanitizedMessage = securityCheck.sanitized;

    // Initialize lead qualification system
    const leadQualifier = new LeadQualification();
    
    // Analyze message for qualification points (use sanitized message)
    const qualification = leadQualifier.analyzeMessage(sanitizedMessage, {
      messageCount: sessionData.messageCount || 1,
      currentScore: sessionData.qualificationScore || 0
    });
    
    const totalScore = qualification.totalScore;

    // Generate embedding for user query (with timeout, use sanitized message)
    const queryEmbedding = await Promise.race([
      generateEmbedding(sanitizedMessage),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Embedding generation timeout')), 10000)
      )
    ]);

    // Search for relevant documents (reduced to 5 for faster processing)
    const relevantDocs = await vectorDB.search(queryEmbedding, 5);

    // Prepare context from relevant documents - simplified for speed
    const filteredDocs = relevantDocs.filter(doc => doc.similarity > 0.05);
    
    let context;
    if (filteredDocs.length > 0) {
      // Limit to top 2 most relevant for maximum speed
      context = filteredDocs
        .slice(0, 2)
        .map(doc => doc.text)
        .join('\n\n');
    } else if (relevantDocs.length > 0) {
      // If no relevant chunks found, use top 2 most similar
      context = relevantDocs
        .slice(0, 2)
        .map(doc => doc.text)
        .join('\n\n');
    } else {
      context = '';
    }

    // Sanitize context before passing to LLM
    context = securityValidator.sanitizeContext(context);

    // Generate response using OpenAI with context (with timeout, use sanitized message)
    const response = await Promise.race([
      generateResponse(sanitizedMessage, context),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Response generation timeout')), 15000)
      )
    ]);

    // Check if lead just reached qualification threshold
    const previousScore = sessionData.qualificationScore || 0;
    const justQualified = previousScore < leadQualifier.qualificationThreshold && 
                         qualification.totalScore >= leadQualifier.qualificationThreshold;

    // Check if lead is qualified for meeting suggestion
    const alreadySuggested = sessionData.calendlySuggested || false;
    const shouldSuggestMeeting = qualification.totalScore >= leadQualifier.qualificationThreshold && !alreadySuggested;
    
    // Override AI suggestion - only suggest if qualified OR user explicitly asked
    const suggestCalendly = shouldSuggestMeeting || justQualified ||
      (response.suggestCalendly && qualification.isQualified);

    const elapsedTime = Date.now() - startTime;
    const qualificationStatus = leadQualifier.getQualificationStatus(totalScore);
    
    console.log(`✅ Chat response in ${elapsedTime}ms`);
    console.log(`📊 Lead Score: ${totalScore}/${leadQualifier.qualificationThreshold} (${qualificationStatus})`);
    if (qualification.reasons.length > 0) {
      console.log(`   Reasons: ${qualification.reasons.join(', ')}`);
    }
    if (justQualified) {
      console.log(`🎉 Lead just qualified! Meeting suggestion: ${suggestCalendly}`);
    }

    res.json({ 
      response: response.response,
      suggestCalendly: suggestCalendly,
      qualificationScore: totalScore,
      qualificationStatus: qualificationStatus,
      pointsAdded: qualification.points,
      isQualified: qualification.isQualified
    });

  } catch (error) {
    const elapsedTime = Date.now() - startTime;
    console.error(`❌ Chat error after ${elapsedTime}ms:`, error.message);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: error.message.includes('timeout') 
          ? 'Request took too long. Please try a shorter question.' 
          : 'Failed to generate response: ' + error.message 
      });
    }
  }
});

// Get knowledge base status
app.get('/api/status', async (req, res) => {
  try {
    const docCount = await vectorDB.getDocumentCount();
    res.json({ 
      documentCount: docCount,
      status: 'ready'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Get Calendly configuration
app.get('/api/calendly-config', (req, res) => {
  try {
    res.json(calendlyConfig);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get Calendly configuration' });
  }
});

// Update website content manually
app.post('/api/update-website', async (req, res) => {
  try {
    const { forceUpdate = false } = req.body;
    const updater = new WebsiteContentUpdater();
    
    console.log('🔄 Manual website content update requested');
    const result = await updater.updateWebsiteContent(forceUpdate);
    
    res.json(result);
  } catch (error) {
    console.error('Error updating website content:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update website content: ' + error.message 
    });
  }
});

// Get content sources statistics
app.get('/api/content-sources', async (req, res) => {
  try {
    const updater = new WebsiteContentUpdater();
    const stats = updater.getUpdateStats();
    
    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    console.error('Error getting content sources stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get content sources stats: ' + error.message 
    });
  }
});

// Clear knowledge base
app.delete('/api/clear', async (req, res) => {
  try {
    await vectorDB.clear();
    res.json({ message: 'Knowledge base cleared successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear knowledge base' });
  }
});

// ============================================
// METRICS TRACKING ENDPOINTS
// ============================================

// Track visitor
app.post('/api/metrics/track-visitor', async (req, res) => {
  try {
    const { sessionId, email } = req.body;
    await metricsTracker.trackVisitor(sessionId, email);
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking visitor:', error);
    res.status(500).json({ error: 'Failed to track visitor' });
  }
});

// Track engagement
app.post('/api/metrics/track-engagement', async (req, res) => {
  try {
    const { sessionId } = req.body;
    await metricsTracker.trackEngagement(sessionId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking engagement:', error);
    res.status(500).json({ error: 'Failed to track engagement' });
  }
});

// Track message
app.post('/api/metrics/track-message', async (req, res) => {
  try {
    const { sessionId, message, response } = req.body;
    await metricsTracker.trackMessage(sessionId, message, response);
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking message:', error);
    res.status(500).json({ error: 'Failed to track message' });
  }
});

// Track qualification
app.post('/api/metrics/track-qualification', async (req, res) => {
  try {
    const { sessionId, score } = req.body;
    await metricsTracker.trackQualification(sessionId, score);
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking qualification:', error);
    res.status(500).json({ error: 'Failed to track qualification' });
  }
});

// Track meeting booking
app.post('/api/metrics/track-meeting', async (req, res) => {
  try {
    const { sessionId } = req.body;
    await metricsTracker.trackMeetingBooking(sessionId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking meeting:', error);
    res.status(500).json({ error: 'Failed to track meeting' });
  }
});

// Track drop-off
app.post('/api/metrics/track-dropoff', async (req, res) => {
  try {
    const { sessionId, messageCount } = req.body;
    await metricsTracker.trackDropOff(sessionId, messageCount);
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking drop-off:', error);
    res.status(500).json({ error: 'Failed to track drop-off' });
  }
});

// Update user email
app.post('/api/metrics/update-email', async (req, res) => {
  try {
    const { sessionId, email } = req.body;
    await metricsTracker.updateUserEmail(sessionId, email);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating email:', error);
    res.status(500).json({ error: 'Failed to update email' });
  }
});

// ============================================
// ADMIN DASHBOARD
// ============================================

// Admin login
app.post('/api/admin/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (username === 'admin' && password === 'FB12345@') {
      // Simple session token (in production, use proper JWT)
      const token = Buffer.from(`admin:${Date.now()}`).toString('base64');
      res.json({ success: true, token });
    } else {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// Verify admin token
function verifyAdmin(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    // Simple validation (in production, use proper JWT verification)
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    if (decoded.startsWith('admin:')) {
      next();
    } else {
      res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Get metrics (admin only)
app.get('/api/admin/metrics', verifyAdmin, async (req, res) => {
  try {
    const metrics = await metricsTracker.getMetrics();
    res.json({ success: true, metrics });
  } catch (error) {
    console.error('Error getting metrics:', error);
    res.status(500).json({ success: false, error: 'Failed to get metrics' });
  }
});

// Get sessions (admin only)
app.get('/api/admin/sessions', verifyAdmin, async (req, res) => {
  try {
    const sessions = await metricsTracker.getSessions();
    res.json({ success: true, sessions });
  } catch (error) {
    console.error('Error getting sessions:', error);
    res.status(500).json({ success: false, error: 'Failed to get sessions' });
  }
});

// Admin dashboard page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  res.status(500).json({ error: error.message });
});

// Schedule automatic website content updates
function scheduleWebsiteUpdates() {
  const cronSchedule = websiteConfig.cronSchedule || '0 2 * * *'; // Default: daily at 2 AM
  
  console.log(`⏰ Scheduling website content updates: ${cronSchedule}`);
  
  cron.schedule(cronSchedule, async () => {
    console.log('🔄 Starting scheduled website content update...');
    try {
      const updater = new WebsiteContentUpdater();
      const result = await updater.updateWebsiteContent();
      
      if (result.success) {
        console.log('✅ Scheduled website content update completed successfully');
      } else {
        console.error('❌ Scheduled website content update failed:', result.message);
      }
    } catch (error) {
      console.error('❌ Error in scheduled website content update:', error);
    }
  }, {
    scheduled: true,
    timezone: "UTC"
  });
}

// Start server immediately, initialize knowledge base in background
app.listen(PORT, () => {
    serverReady = true;
    console.log(`🚀 RAG Backend server running on port ${PORT}`);
    console.log(`📁 PDF directory: ${path.join(__dirname, '../pdfs')}`);
    console.log(`🌐 Website scraping: ${websiteConfig.baseUrl}`);
    console.log(`⏰ Update schedule: ${websiteConfig.cronSchedule}`);
    console.log(`🔑 Make sure to set your OPENAI_API_KEY in .env file`);
    console.log(`💬 Chatbot ready! Open http://localhost:${PORT} to start chatting`);
    console.log(`\n⏳ Initializing knowledge base in background...`);
    
    // Initialize knowledge base in background (non-blocking)
    initializeKnowledgeBase()
        .then(() => {
            console.log(`✅ Knowledge base initialization complete!`);
            // Schedule website content updates after KB is ready
            scheduleWebsiteUpdates();
        })
        .catch((error) => {
            console.error('⚠️ Knowledge base initialization error (server still running):', error.message);
            // Server continues running even if KB init fails
        });
});
