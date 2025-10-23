const fs = require('fs-extra');
const pdf = require('pdf-parse');

/**
 * Process PDF file and extract text chunks
 * @param {string} pdfPath - Path to the PDF file
 * @returns {Array} Array of text chunks with metadata
 */
async function processPDF(pdfPath) {
  try {
    // Read PDF file
    const dataBuffer = fs.readFileSync(pdfPath);
    
    // Parse PDF
    const data = await pdf(dataBuffer);
    
    if (!data.text || data.text.trim().length === 0) {
      throw new Error('No text content found in PDF');
    }

    // Split text into chunks
    const chunks = splitTextIntoChunks(data.text);
    
    // Add metadata to each chunk
    return chunks.map((chunk, index) => ({
      text: chunk,
      page: Math.floor(index / 3) + 1, // Approximate page number
      chunkIndex: index
    }));

  } catch (error) {
    console.error('Error processing PDF:', error);
    throw error;
  }
}

/**
 * Split text into overlapping chunks for better context
 * @param {string} text - The text to split
 * @param {number} chunkSize - Size of each chunk (default: 1000)
 * @param {number} overlap - Overlap between chunks (default: 200)
 * @returns {Array} Array of text chunks
 */
function splitTextIntoChunks(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  let start = 0;
  
  while (start < text.length) {
    let end = start + chunkSize;
    
    // Try to break at sentence boundary
    if (end < text.length) {
      const lastSentence = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const breakPoint = Math.max(lastSentence, lastNewline);
      
      if (breakPoint > start + chunkSize * 0.5) {
        end = breakPoint + 1;
      }
    }
    
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    
    // Move start position with overlap
    start = end - overlap;
    if (start < 0) start = 0;
  }
  
  return chunks;
}

/**
 * Clean and preprocess text
 * @param {string} text - Raw text
 * @returns {string} Cleaned text
 */
function cleanText(text) {
  return text
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
    .trim();
}

module.exports = {
  processPDF,
  splitTextIntoChunks,
  cleanText
};
