const fs = require('fs-extra');
const path = require('path');
const { processPDF } = require('./pdfProcessor');
const { VectorDB } = require('./vectorDB');
const { generateEmbedding } = require('./openaiClient');
const { WebsiteScraper } = require('./websiteScraper');

/**
 * Initialize knowledge base with PDF files and website content
 * This runs automatically when the server starts
 */
async function initializeKnowledgeBase() {
    console.log('🧠 Initializing knowledge base...');
    
    const vectorDB = new VectorDB();
    const pdfsDir = path.join(__dirname, '../../pdfs');
    
    try {
        // Check if knowledge base is already initialized
        const docCount = await vectorDB.getDocumentCount();
        if (docCount > 0) {
            console.log(`✅ Knowledge base already initialized with ${docCount} documents`);
            return;
        }

        let totalChunks = 0;

        // Process PDF files
        totalChunks += await processPDFFiles(vectorDB, pdfsDir);
        
        // Process website content
        totalChunks += await processWebsiteContent(vectorDB);

        console.log(`\n🎉 Knowledge base initialization complete!`);
        console.log(`📊 Total chunks processed: ${totalChunks}`);
        console.log(`💾 Vector database ready for queries`);

    } catch (error) {
        console.error('❌ Error initializing knowledge base:', error);
    }
}

/**
 * Process PDF files and add them to the knowledge base
 * @param {VectorDB} vectorDB - Vector database instance
 * @param {string} pdfsDir - PDFs directory path
 * @returns {number} Number of chunks processed
 */
async function processPDFFiles(vectorDB, pdfsDir) {
    try {
        // Check if pdfs directory exists and has files
        if (!await fs.pathExists(pdfsDir)) {
            console.log('📁 PDFs directory not found. Creating...');
            await fs.ensureDir(pdfsDir);
            console.log('⚠️  Please add your PDF file to the pdfs/ directory and restart the server');
            return 0;
        }

        const files = await fs.readdir(pdfsDir);
        const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
        
        if (pdfFiles.length === 0) {
            console.log('📄 No PDF files found in pdfs/ directory');
            console.log('⚠️  Please add your PDF file to the pdfs/ directory and restart the server');
            return 0;
        }

        console.log(`📚 Found ${pdfFiles.length} PDF file(s):`);
        pdfFiles.forEach(file => console.log(`  - ${file}`));

        let totalChunks = 0;

        // Process each PDF file
        for (const pdfFile of pdfFiles) {
            console.log(`\n🔄 Processing PDF: ${pdfFile}`);
            
            try {
                const pdfPath = path.join(pdfsDir, pdfFile);
                
                // Process PDF
                const chunks = await processPDF(pdfPath);
                console.log(`  ✅ Extracted ${chunks.length} text chunks`);

                if (chunks.length === 0) {
                    console.log(`  ⚠️  No text extracted from ${pdfFile}`);
                    continue;
                }

                // Generate embeddings for each chunk
                console.log(`  🔄 Generating embeddings...`);
                const embeddings = [];
                
                for (let i = 0; i < chunks.length; i++) {
                    const chunk = chunks[i];
                    console.log(`    Processing chunk ${i + 1}/${chunks.length}...`);
                    
                    const embedding = await generateEmbedding(chunk.text);
                    embeddings.push({
                        text: chunk.text,
                        embedding: embedding,
                        metadata: {
                            source: 'pdf',
                            fileName: pdfFile,
                            page: chunk.page,
                            chunkIndex: chunk.chunkIndex,
                            url: null,
                            title: null,
                            lastUpdated: null
                        }
                    });
                }

                // Store in vector database
                await vectorDB.addDocuments(embeddings);
                totalChunks += chunks.length;
                
                console.log(`  ✅ Added ${chunks.length} chunks to knowledge base`);

            } catch (error) {
                console.error(`  ❌ Error processing ${pdfFile}:`, error.message);
            }
        }

        return totalChunks;

    } catch (error) {
        console.error('❌ Error processing PDF files:', error);
        return 0;
    }
}

/**
 * Process website content and add it to the knowledge base
 * @param {VectorDB} vectorDB - Vector database instance
 * @returns {number} Number of chunks processed
 */
async function processWebsiteContent(vectorDB) {
    try {
        console.log('\n🌐 Processing website content...');
        
        const scraper = new WebsiteScraper();
        
        // Scrape website content
        const pages = await scraper.scrapeWebsite();
        
        if (pages.length === 0) {
            console.log('⚠️  No website content scraped');
            return 0;
        }

        console.log(`📄 Scraped ${pages.length} pages from website`);

        // Convert pages to chunks
        const chunks = scraper.pagesToChunks(pages);
        console.log(`📝 Generated ${chunks.length} text chunks from website content`);

        if (chunks.length === 0) {
            console.log('⚠️  No text chunks generated from website content');
            return 0;
        }

        // Generate embeddings for each chunk
        console.log(`🔄 Generating embeddings for website content...`);
        const embeddings = [];
        
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            console.log(`    Processing chunk ${i + 1}/${chunks.length}...`);
            
            const embedding = await generateEmbedding(chunk.text);
            embeddings.push({
                text: chunk.text,
                embedding: embedding,
                metadata: chunk.metadata
            });
        }

        // Store in vector database
        await vectorDB.addDocuments(embeddings);
        
        console.log(`✅ Added ${chunks.length} website chunks to knowledge base`);
        
        // Log scraping statistics
        const stats = scraper.getStats();
        console.log(`📊 Website scraping stats:`);
        console.log(`  - Pages scraped: ${stats.pagesScraped}`);
        console.log(`  - URLs visited: ${stats.urlsVisited}`);
        console.log(`  - Total content length: ${stats.totalContentLength} characters`);

        return chunks.length;

    } catch (error) {
        console.error('❌ Error processing website content:', error.message);
        return 0;
    }
}

module.exports = { initializeKnowledgeBase };
