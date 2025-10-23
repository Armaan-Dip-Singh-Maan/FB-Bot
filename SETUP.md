# Quick Setup Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Install Node.js
Download and install Node.js from [nodejs.org](https://nodejs.org/) (version 16 or higher)

### Step 2: Get OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Go to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-`)

### Step 3: Setup Backend
```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Create environment file
copy env.example .env
```

### Step 4: Configure API Key
Edit the `.env` file and add your OpenAI API key:
```
OPENAI_API_KEY=sk-your-actual-api-key-here
```

### Step 5: Start the Server
```bash
npm start
```

### Step 6: Open the Chatbot
Open `index.html` in your web browser

## 🎯 Test Your Setup

1. **Upload a PDF**: Click the upload section and add a PDF document
2. **Ask Questions**: Try asking "What is this document about?"
3. **Check Sources**: The bot will show which documents it used for answers

## ✅ You're Ready!

Your RAG-powered chatbot is now running with PDF knowledge base capabilities!
