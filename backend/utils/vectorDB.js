const fs = require('fs-extra');
const fsSync = require('fs');
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
    this.loading = false;
    this.loaded = false;
    // Initialize asynchronously without blocking
    this.initializeDataDirectory().catch(err => {
      console.error('Error initializing vector DB:', err);
    });
  }

  /**
   * Initialize data directory
   */
  async initializeDataDirectory() {
    try {
      await fs.ensureDir(this.dataPath);
      await this.loadFromDisk();
      this.loaded = true;
    } catch (error) {
      console.error('Error initializing data directory:', error);
      this.loaded = true; // Mark as loaded even on error to prevent blocking
    }
  }

  /**
   * Ensure data is loaded before operations
   */
  async ensureLoaded() {
    if (this.loaded) return;
    
    if (this.loading) {
      // Wait for ongoing load
      while (this.loading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }
    
    this.loading = true;
    try {
      await this.loadFromDisk();
      this.loaded = true;
    } finally {
      this.loading = false;
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
    await this.ensureLoaded();
    
    if (this.documents.length === 0) {
      return [];
    }

    // Optimized: Use partial sort - only keep top K during calculation
    // This avoids sorting all documents when we only need top K
    const topResults = [];
    
    for (const doc of this.documents) {
      const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);
      
      // Insert in sorted order (only keep top K)
      const result = { ...doc, similarity };
      
      if (topResults.length < topK) {
        // Insert and keep sorted
        topResults.push(result);
        topResults.sort((a, b) => b.similarity - a.similarity);
      } else if (similarity > topResults[topResults.length - 1].similarity) {
        // Replace the lowest if this is better
        topResults[topResults.length - 1] = result;
        topResults.sort((a, b) => b.similarity - a.similarity);
      }
    }

    return topResults;
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
    await this.ensureLoaded();
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
   * Load documents from disk (synchronous for faster loading)
   */
  async loadFromDisk() {
    try {
      if (fsSync.existsSync(this.vectorsPath)) {
        // Use readFileSync for faster loading on startup
        const data = fsSync.readFileSync(this.vectorsPath, 'utf8');
        this.documents = JSON.parse(data);
        console.log(`✅ Loaded ${this.documents.length} documents from disk`);
      } else {
        console.log(`📁 No existing vectors file found, will initialize fresh`);
      }
    } catch (error) {
      console.error('Error loading from disk:', error);
      this.documents = [];
    }
  }

  /**
   * Remove documents by source
   * @param {string} source - Source to filter by (e.g., 'website', 'pdf')
   */
  async removeDocumentsBySource(source) {
    const initialCount = this.documents.length;
    this.documents = this.documents.filter(doc => doc.metadata.source !== source);
    const removedCount = initialCount - this.documents.length;
    
    if (removedCount > 0) {
      await this.saveToDisk();
      console.log(`Removed ${removedCount} documents from source: ${source}`);
    }
    
    return removedCount;
  }

  /**
   * Update documents based on filter criteria
   * @param {Function} filter - Function to filter documents to update
   * @param {Array} newDocs - New documents to add
   */
  async updateDocuments(filter, newDocs) {
    // Remove old documents matching the filter
    const initialCount = this.documents.length;
    this.documents = this.documents.filter(doc => !filter(doc));
    const removedCount = initialCount - this.documents.length;
    
    // Add new documents
    this.documents.push(...newDocs);
    
    await this.saveToDisk();
    console.log(`Updated documents: removed ${removedCount}, added ${newDocs.length}`);
    
    return { removed: removedCount, added: newDocs.length };
  }

  /**
   * Get documents by source
   * @param {string} source - Source to filter by
   * @returns {Array} Documents from the specified source
   */
  getDocumentsBySource(source) {
    return this.documents.filter(doc => doc.metadata.source === source);
  }

  /**
   * Get content sources statistics
   * @returns {Object} Statistics about content sources
   */
  getContentSourcesStats() {
    const stats = {};
    
    this.documents.forEach(doc => {
      const source = doc.metadata.source || 'unknown';
      if (!stats[source]) {
        stats[source] = {
          count: 0,
          urls: new Set(),
          files: new Set()
        };
      }
      
      stats[source].count++;
      
      if (doc.metadata.url) {
        stats[source].urls.add(doc.metadata.url);
      }
      
      if (doc.metadata.fileName) {
        stats[source].files.add(doc.metadata.fileName);
      }
    });
    
    // Convert Sets to Arrays for JSON serialization
    Object.keys(stats).forEach(source => {
      stats[source].urls = Array.from(stats[source].urls);
      stats[source].files = Array.from(stats[source].files);
    });
    
    return stats;
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
