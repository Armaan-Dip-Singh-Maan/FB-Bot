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
const calendlyConfig = require('./config/calendly');
const websiteConfig = require('./config/website');
const { WebsiteContentUpdater } = require('./scripts/update-website-content');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));


// Initialize Vector Database
const vectorDB = new VectorDB();

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});


// Chat endpoint with RAG
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Generate embedding for user query
    const queryEmbedding = await generateEmbedding(message);

    // Search for relevant documents (increased from 5 to 10 for more context)
    const relevantDocs = await vectorDB.search(queryEmbedding, 10);

    // Prepare context from relevant documents with better formatting
    // Lower similarity threshold to 0.05 to get more results
    const filteredDocs = relevantDocs.filter(doc => doc.similarity > 0.05);
    
    let context;
    if (filteredDocs.length > 0) {
      context = filteredDocs
        .map(doc => `[Source: ${doc.metadata.fileName}, Page ${doc.metadata.page}]\n${doc.text}`)
        .join('\n\n---\n\n');
    } else {
      // If no relevant chunks found, use the most similar ones anyway
      context = relevantDocs
        .slice(0, 8) // Take top 8 even if similarity is low
        .map(doc => `[Source: ${doc.metadata.fileName}, Page ${doc.metadata.page}]\n${doc.text}`)
        .join('\n\n---\n\n');
    }

    console.log(`Found ${filteredDocs.length} relevant chunks for query: "${message}"`);
    console.log(`Context length: ${context.length} characters`);
    console.log(`Top similarity scores: ${relevantDocs.slice(0, 3).map(d => d.similarity.toFixed(3)).join(', ')}`);
    console.log(`Context preview: ${context.substring(0, 200)}...`);

    // Generate response using OpenAI with context
    const response = await generateResponse(message, context);

    res.json({ 
      response: response.response,
      suggestCalendly: response.suggestCalendly
    });

  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({ error: 'Failed to generate response: ' + error.message });
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

// Initialize knowledge base on startup
initializeKnowledgeBase().then(() => {
    // Schedule website content updates
    scheduleWebsiteUpdates();
    
    app.listen(PORT, () => {
        console.log(`🚀 RAG Backend server running on port ${PORT}`);
        console.log(`📁 PDF directory: ${path.join(__dirname, '../pdfs')}`);
        console.log(`🌐 Website scraping: ${websiteConfig.baseUrl}`);
        console.log(`⏰ Update schedule: ${websiteConfig.cronSchedule}`);
        console.log(`🔑 Make sure to set your OPENAI_API_KEY in .env file`);
        console.log(`💬 Chatbot ready! Open http://localhost:${PORT} to start chatting`);
    });
}).catch((error) => {
    console.error('❌ Failed to initialize knowledge base:', error);
    process.exit(1);
});
