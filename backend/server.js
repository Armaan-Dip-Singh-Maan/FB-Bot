const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
require('dotenv').config();

const { processPDF } = require('./utils/pdfProcessor');
const { VectorDB } = require('./utils/vectorDB');
const { generateEmbedding, generateResponse } = require('./utils/openaiClient');
const { initializeKnowledgeBase } = require('./utils/initializeKnowledgeBase');

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

    // Search for relevant documents
    const relevantDocs = await vectorDB.search(queryEmbedding, 5);

    // Prepare context from relevant documents
    const context = relevantDocs.map(doc => doc.text).join('\n\n');

    // Generate response using OpenAI with context
    const response = await generateResponse(message, context);

    res.json({ 
      response: response,
      sources: relevantDocs.map(doc => ({
        fileName: doc.metadata.fileName,
        page: doc.metadata.page,
        text: doc.text.substring(0, 200) + '...'
      }))
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

// Initialize knowledge base on startup
initializeKnowledgeBase().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 RAG Backend server running on port ${PORT}`);
        console.log(`📁 PDF directory: ${path.join(__dirname, '../pdfs')}`);
        console.log(`🔑 Make sure to set your OPENAI_API_KEY in .env file`);
        console.log(`💬 Chatbot ready! Open http://localhost:${PORT} to start chatting`);
    });
}).catch((error) => {
    console.error('❌ Failed to initialize knowledge base:', error);
    process.exit(1);
});
