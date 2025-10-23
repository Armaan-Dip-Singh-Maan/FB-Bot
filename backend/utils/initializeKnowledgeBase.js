const fs = require('fs-extra');
const path = require('path');
const { processPDF } = require('./pdfProcessor');
const { VectorDB } = require('./vectorDB');
const { generateEmbedding } = require('./openaiClient');

/**
 * Initialize knowledge base with a specific PDF file
 * This runs automatically when the server starts
 */
async function initializeKnowledgeBase() {
    console.log('🧠 Initializing knowledge base...');
    
    const vectorDB = new VectorDB();
    const pdfsDir = path.join(__dirname, '../../pdfs');
    
    try {
        // Check if pdfs directory exists and has files
        if (!await fs.pathExists(pdfsDir)) {
            console.log('📁 PDFs directory not found. Creating...');
            await fs.ensureDir(pdfsDir);
            console.log('⚠️  Please add your PDF file to the pdfs/ directory and restart the server');
            return;
        }

        const files = await fs.readdir(pdfsDir);
        const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
        
        if (pdfFiles.length === 0) {
            console.log('📄 No PDF files found in pdfs/ directory');
            console.log('⚠️  Please add your PDF file to the pdfs/ directory and restart the server');
            return;
        }

        // Check if knowledge base is already initialized
        const docCount = await vectorDB.getDocumentCount();
        if (docCount > 0) {
            console.log(`✅ Knowledge base already initialized with ${docCount} documents`);
            return;
        }

        console.log(`📚 Found ${pdfFiles.length} PDF file(s):`);
        pdfFiles.forEach(file => console.log(`  - ${file}`));

        let totalChunks = 0;

        // Process each PDF file
        for (const pdfFile of pdfFiles) {
            console.log(`\n🔄 Processing: ${pdfFile}`);
            
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
                            fileName: pdfFile,
                            page: chunk.page,
                            chunkIndex: chunk.chunkIndex
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

        console.log(`\n🎉 Knowledge base initialization complete!`);
        console.log(`📊 Total chunks processed: ${totalChunks}`);
        console.log(`💾 Vector database ready for queries`);

    } catch (error) {
        console.error('❌ Error initializing knowledge base:', error);
    }
}

module.exports = { initializeKnowledgeBase };
