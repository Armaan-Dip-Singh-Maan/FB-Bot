const fs = require('fs-extra');
const path = require('path');

/**
 * Simple in-memory vector database for storing embeddings
 * In production, you might want to use a proper vector database like Pinecone or Weaviate
 */
class VectorDB {
  constructor() {
    this.documents = [];
    this.dataPath = path.join(__dirname, '../data');
    this.vectorsPath = path.join(this.dataPath, 'vectors.json');
    this.initializeDataDirectory();
  }

  /**
   * Initialize data directory
   */
  async initializeDataDirectory() {
    try {
      await fs.ensureDir(this.dataPath);
      await this.loadFromDisk();
    } catch (error) {
      console.error('Error initializing data directory:', error);
    }
  }

  /**
   * Add documents to the vector database
   * @param {Array} documents - Array of documents with embeddings
   */
  async addDocuments(documents) {
    this.documents.push(...documents);
    await this.saveToDisk();
    console.log(`Added ${documents.length} documents to vector database`);
  }

  /**
   * Search for similar documents using cosine similarity
   * @param {Array} queryEmbedding - Query embedding vector
   * @param {number} topK - Number of top results to return
   * @returns {Array} Array of similar documents
   */
  async search(queryEmbedding, topK = 5) {
    if (this.documents.length === 0) {
      return [];
    }

    // Calculate cosine similarity for each document
    const similarities = this.documents.map(doc => ({
      ...doc,
      similarity: this.cosineSimilarity(queryEmbedding, doc.embedding)
    }));

    // Sort by similarity and return top K
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param {Array} vecA - First vector
   * @param {Array} vecB - Second vector
   * @returns {number} Cosine similarity score
   */
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Get total number of documents in the database
   * @returns {number} Document count
   */
  async getDocumentCount() {
    return this.documents.length;
  }

  /**
   * Clear all documents from the database
   */
  async clear() {
    this.documents = [];
    await this.saveToDisk();
    console.log('Vector database cleared');
  }

  /**
   * Save documents to disk
   */
  async saveToDisk() {
    try {
      await fs.writeJson(this.vectorsPath, this.documents, { spaces: 2 });
    } catch (error) {
      console.error('Error saving to disk:', error);
    }
  }

  /**
   * Load documents from disk
   */
  async loadFromDisk() {
    try {
      if (await fs.pathExists(this.vectorsPath)) {
        this.documents = await fs.readJson(this.vectorsPath);
        console.log(`Loaded ${this.documents.length} documents from disk`);
      }
    } catch (error) {
      console.error('Error loading from disk:', error);
      this.documents = [];
    }
  }

  /**
   * Get all documents (for debugging)
   * @returns {Array} All documents
   */
  getAllDocuments() {
    return this.documents;
  }
}

module.exports = { VectorDB };
