#!/usr/bin/env node

/**
 * Standalone script to process PDFs in the pdfs directory
 * Usage: npm run process-pdfs
 */

const fs = require('fs-extra');
const path = require('path');
const { processPDF } = require('../utils/pdfProcessor');
const { VectorDB } = require('../utils/vectorDB');
const { generateEmbedding } = require('../utils/openaiClient');

require('dotenv').config();

async function processAllPDFs() {
    console.log('🔄 Starting PDF processing...');
    
    // Check if OpenAI API key is set
    if (!process.env.OPENAI_API_KEY) {
        console.error('❌ OPENAI_API_KEY not found in environment variables');
        console.log('Please set your OpenAI API key in the .env file');
        process.exit(1);
    }

    const pdfsDir = path.join(__dirname, '../../pdfs');
    const vectorDB = new VectorDB();

    try {
        // Ensure pdfs directory exists
        await fs.ensureDir(pdfsDir);
        
        // Get all PDF files
        const files = await fs.readdir(pdfsDir);
        const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
        
        if (pdfFiles.length === 0) {
            console.log('📁 No PDF files found in pdfs directory');
            console.log('Please add PDF files to the pdfs/ folder and run again');
            return;
        }

        console.log(`📄 Found ${pdfFiles.length} PDF file(s):`);
        pdfFiles.forEach(file => console.log(`  - ${file}`));

        let totalChunks = 0;

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
                
                console.log(`  ✅ Added ${chunks.length} chunks to vector database`);

            } catch (error) {
                console.error(`  ❌ Error processing ${pdfFile}:`, error.message);
            }
        }

        console.log(`\n🎉 Processing complete!`);
        console.log(`📊 Total chunks processed: ${totalChunks}`);
        console.log(`💾 Vector database updated`);
        
        // Show database status
        const docCount = await vectorDB.getDocumentCount();
        console.log(`📚 Total documents in database: ${docCount}`);

    } catch (error) {
        console.error('❌ Error during processing:', error);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    processAllPDFs()
        .then(() => {
            console.log('\n✅ PDF processing completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ PDF processing failed:', error);
            process.exit(1);
        });
}

module.exports = { processAllPDFs };
