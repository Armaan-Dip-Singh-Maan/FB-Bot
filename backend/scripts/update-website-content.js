const crypto = require('crypto');
const { WebsiteScraper } = require('../utils/websiteScraper');
const { VectorDB } = require('../utils/vectorDB');
const { generateEmbedding } = require('../utils/openaiClient');

/**
 * Update Website Content Script
 * This script handles updating website content in the knowledge base
 * It can be run manually or scheduled via cron
 */
class WebsiteContentUpdater {
    constructor() {
        this.vectorDB = new VectorDB();
        this.scraper = new WebsiteScraper();
    }

    /**
     * Update website content in the knowledge base
     * @param {boolean} forceUpdate - Force update even if content hasn't changed
     * @returns {Object} Update results
     */
    async updateWebsiteContent(forceUpdate = false) {
        console.log('🔄 Starting website content update...');
        
        try {
            // Get existing website content
            const existingDocs = this.vectorDB.getDocumentsBySource('website');
            console.log(`📊 Found ${existingDocs.length} existing website documents`);

            // Scrape latest website content
            console.log('🌐 Scraping latest website content...');
            const pages = await this.scraper.scrapeWebsite();
            
            if (pages.length === 0) {
                console.log('⚠️  No website content scraped');
                return { success: false, message: 'No content scraped' };
            }

            console.log(`📄 Scraped ${pages.length} pages from website`);

            // Convert pages to chunks
            const newChunks = this.scraper.pagesToChunks(pages);
            console.log(`📝 Generated ${newChunks.length} text chunks`);

            if (newChunks.length === 0) {
                console.log('⚠️  No text chunks generated');
                return { success: false, message: 'No chunks generated' };
            }

            // Check for changes if not forcing update
            if (!forceUpdate) {
                const hasChanges = await this.detectChanges(existingDocs, newChunks);
                if (!hasChanges) {
                    console.log('✅ No changes detected in website content');
                    return { 
                        success: true, 
                        message: 'No changes detected',
                        pagesProcessed: pages.length,
                        chunksAdded: 0,
                        chunksUpdated: 0,
                        chunksRemoved: 0
                    };
                }
            }

            // Generate embeddings for new chunks
            console.log('🔄 Generating embeddings for new content...');
            const embeddings = [];
            
            for (let i = 0; i < newChunks.length; i++) {
                const chunk = newChunks[i];
                console.log(`    Processing chunk ${i + 1}/${newChunks.length}...`);
                
                const embedding = await generateEmbedding(chunk.text);
                embeddings.push({
                    text: chunk.text,
                    embedding: embedding,
                    metadata: chunk.metadata
                });
            }

            // Remove old website content and add new content
            console.log('🔄 Updating knowledge base...');
            const updateResult = await this.vectorDB.updateDocuments(
                (doc) => doc.metadata.source === 'website',
                embeddings
            );

            console.log('✅ Website content update complete!');
            console.log(`📊 Update results:`);
            console.log(`  - Pages processed: ${pages.length}`);
            console.log(`  - Chunks added: ${updateResult.added}`);
            console.log(`  - Chunks removed: ${updateResult.removed}`);

            // Log scraping statistics
            const stats = this.scraper.getStats();
            console.log(`📊 Website scraping stats:`);
            console.log(`  - Pages scraped: ${stats.pagesScraped}`);
            console.log(`  - URLs visited: ${stats.urlsVisited}`);
            console.log(`  - Total content length: ${stats.totalContentLength} characters`);

            return {
                success: true,
                message: 'Website content updated successfully',
                pagesProcessed: pages.length,
                chunksAdded: updateResult.added,
                chunksUpdated: 0,
                chunksRemoved: updateResult.removed,
                stats: stats
            };

        } catch (error) {
            console.error('❌ Error updating website content:', error);
            return { 
                success: false, 
                message: `Error: ${error.message}` 
            };
        }
    }

    /**
     * Detect changes between existing and new content
     * @param {Array} existingDocs - Existing documents
     * @param {Array} newChunks - New chunks
     * @returns {boolean} True if changes detected
     */
    async detectChanges(existingDocs, newChunks) {
        console.log('🔍 Detecting changes in website content...');

        // Create content hashes for comparison
        const existingHashes = new Set();
        const newHashes = new Set();

        // Hash existing content
        existingDocs.forEach(doc => {
            const hash = this.createContentHash(doc.text, doc.metadata.url);
            existingHashes.add(hash);
        });

        // Hash new content
        newChunks.forEach(chunk => {
            const hash = this.createContentHash(chunk.text, chunk.metadata.url);
            newHashes.add(hash);
        });

        // Check for differences
        const hasNewContent = [...newHashes].some(hash => !existingHashes.has(hash));
        const hasRemovedContent = [...existingHashes].some(hash => !newHashes.has(hash));

        const hasChanges = hasNewContent || hasRemovedContent;
        
        if (hasChanges) {
            console.log(`📊 Changes detected:`);
            console.log(`  - New content: ${hasNewContent ? 'Yes' : 'No'}`);
            console.log(`  - Removed content: ${hasRemovedContent ? 'Yes' : 'No'}`);
        }

        return hasChanges;
    }

    /**
     * Create a hash for content comparison
     * @param {string} text - Text content
     * @param {string} url - URL
     * @returns {string} Content hash
     */
    createContentHash(text, url) {
        const content = `${url}:${text}`;
        return crypto.createHash('md5').update(content).digest('hex');
    }

    /**
     * Get update statistics
     * @returns {Object} Update statistics
     */
    getUpdateStats() {
        const stats = this.vectorDB.getContentSourcesStats();
        return {
            totalDocuments: this.vectorDB.getAllDocuments().length,
            websiteDocuments: stats.website ? stats.website.count : 0,
            pdfDocuments: stats.pdf ? stats.pdf.count : 0,
            sources: stats
        };
    }
}

/**
 * Main execution function
 * Can be called directly or imported as a module
 */
async function main() {
    const updater = new WebsiteContentUpdater();
    
    try {
        const result = await updater.updateWebsiteContent();
        
        if (result.success) {
            console.log('🎉 Website content update completed successfully!');
            process.exit(0);
        } else {
            console.error('❌ Website content update failed:', result.message);
            process.exit(1);
        }
        
    } catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { WebsiteContentUpdater };
