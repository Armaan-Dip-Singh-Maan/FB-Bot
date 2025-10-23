# RAG-Powered Chatbot with PDF Knowledge Base

A sophisticated chatbot that uses Retrieval-Augmented Generation (RAG) to answer questions based on PDF documents. The system extracts text from PDFs, creates vector embeddings, and uses semantic search to provide accurate, context-aware responses.

## 🚀 Features

- **PDF Knowledge Base**: Upload PDF documents to build your chatbot's knowledge base
- **Semantic Search**: Uses OpenAI embeddings for intelligent document retrieval
- **RAG Integration**: Combines document context with AI responses for accurate answers
- **Source Attribution**: Shows which documents and pages were used for each response
- **Real-time Processing**: Upload and process PDFs instantly
- **Modern UI**: Clean, responsive chat interface

## 📁 Project Structure

```
FranquiciaBoost Bot/
├── index.html          # Main chat interface
├── script.js           # Frontend JavaScript
├── style.css           # Styling
├── pdfs/              # PDF storage directory
├── backend/           # Node.js backend
│   ├── server.js      # Express server
│   ├── package.json   # Dependencies
│   ├── utils/         # Utility modules
│   │   ├── pdfProcessor.js    # PDF text extraction
│   │   ├── vectorDB.js        # Vector database
│   │   └── openaiClient.js    # OpenAI integration
│   └── data/          # Vector database storage
└── README.md          # This file
```

## 🛠️ Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- OpenAI API key
- Modern web browser

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

1. Copy the environment template:
   ```bash
   cp env.example .env
   ```

2. Edit `.env` file and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=3001
   NODE_ENV=development
   VECTOR_DB_PATH=./data/vectors
   EMBEDDING_MODEL=text-embedding-3-small
   ```

### 3. Start the Backend Server

```bash
# Development mode (with auto-restart)
npm run dev

# Or production mode
npm start
```

The backend will start on `http://localhost:3001`

### 4. Open the Chatbot

Open `index.html` in your web browser or serve it through the backend at `http://localhost:3001`

## 📖 How to Use

### 1. Upload PDF Documents

1. Click the "📄 Upload PDF Knowledge Base" section in the chat interface
2. Click the "+" button to expand the upload area
3. Select a PDF file from your computer
4. Click "Upload PDF" to process the document
5. Wait for the processing to complete (you'll see a success message)

### 2. Chat with Your Documents

1. Type questions about the content of your uploaded PDFs
2. The chatbot will search through your documents and provide relevant answers
3. Each response includes source attribution showing which documents were used

### 3. Example Questions

- "What is the main topic of the document?"
- "Summarize the key points from chapter 3"
- "What are the benefits mentioned in the document?"
- "Can you explain the methodology described?"

## 🔧 API Endpoints

### Backend API

- `POST /api/upload-pdf` - Upload and process PDF documents
- `POST /api/chat` - Send chat messages with RAG
- `GET /api/status` - Check backend status
- `DELETE /api/clear` - Clear knowledge base

### Request/Response Examples

**Upload PDF:**
```bash
curl -X POST -F "pdf=@document.pdf" http://localhost:3001/api/upload-pdf
```

**Send Chat Message:**
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"message":"What is this document about?"}' \
  http://localhost:3001/api/chat
```

## 🧠 How RAG Works

1. **Document Processing**: PDFs are parsed and split into text chunks
2. **Embedding Generation**: Each chunk is converted to a vector embedding using OpenAI
3. **Vector Storage**: Embeddings are stored in a local vector database
4. **Query Processing**: User questions are converted to embeddings
5. **Similarity Search**: Most relevant document chunks are retrieved
6. **Response Generation**: OpenAI generates responses using retrieved context

## 🎯 Advanced Configuration

### Customizing Chunk Size

Edit `backend/utils/pdfProcessor.js`:
```javascript
// Change chunk size and overlap
function splitTextIntoChunks(text, chunkSize = 1000, overlap = 200) {
    // Your custom logic here
}
```

### Using Different Embedding Models

Update `.env` file:
```
EMBEDDING_MODEL=text-embedding-3-large  # or text-embedding-ada-002
```

### Production Deployment

For production deployment:

1. Set `NODE_ENV=production` in `.env`
2. Use a proper vector database (Pinecone, Weaviate, etc.)
3. Implement authentication and rate limiting
4. Use HTTPS and secure API keys

## 🐛 Troubleshooting

### Common Issues

**Backend not starting:**
- Check if port 3001 is available
- Verify Node.js installation
- Check `.env` file configuration

**PDF upload fails:**
- Ensure PDF is not password-protected
- Check file size (large files may timeout)
- Verify backend is running

**No responses from chatbot:**
- Check OpenAI API key is valid
- Verify documents were processed successfully
- Check browser console for errors

### Debug Mode

Enable debug logging by setting:
```
NODE_ENV=development
```

## 📝 License

MIT License - feel free to modify and distribute.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the console logs
3. Ensure all dependencies are installed
4. Verify API keys are correct
