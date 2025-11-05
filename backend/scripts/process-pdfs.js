#!/usr/bin/env node

/**
 * Standalone script to process PDFs in the pdfs directory
 * Usage: npm run process-pdfs
 */

// Load environment variables FIRST before requiring any modules that use them
require('dotenv').config();

const fs = require('fs-extra');
const path = require('path');
const { processPDF } = require('../utils/pdfProcessor');
const { VectorDB } = require('../utils/vectorDB');
const { generateEmbedding } = require('../utils/openaiClient');

/**
 * Process embeddings in parallel batches with concurrency control
 * @param {Array} chunks - Array of chunks to process
 * @param {number} concurrency - Number of parallel requests (default: 5)
 * @returns {Array} Array of embeddings
 */
async function generateEmbeddingsBatch(chunks, concurrency = 5) {
    const embeddings = [];
    const fileName = chunks[0]?.metadata?.fileName || 'unknown';
    
    for (let i = 0; i < chunks.length; i += concurrency) {
        const batch = chunks.slice(i, i + concurrency);
        const batchPromises = batch.map(async (chunk, idx) => {
            try {
                const embedding = await generateEmbedding(chunk.text);
                return {
                    text: chunk.text,
                    embedding: embedding,
                    metadata: chunk.metadata
                };
            } catch (error) {
                console.error(`    ⚠️  Error embedding chunk ${i + idx + 1}:`, error.message);
                return null;
            }
        });
        
        const batchResults = await Promise.all(batchPromises);
        const validResults = batchResults.filter(r => r !== null);
        embeddings.push(...validResults);
        
        // Progress update
        const processed = Math.min(i + concurrency, chunks.length);
        const percentage = ((processed / chunks.length) * 100).toFixed(1);
        process.stdout.write(`\r    📊 Progress: ${processed}/${chunks.length} chunks (${percentage}%)`);
    }
    
    process.stdout.write('\n');
    return embeddings;
}

/**
 * Process a single PDF file
 */
async function processSinglePDF(pdfFile, pdfsDir, vectorDB) {
    const pdfPath = path.join(pdfsDir, pdfFile);
    const startTime = Date.now();
    
    try {
        // Process PDF
        const chunks = await processPDF(pdfPath);
        
        if (chunks.length === 0) {
            console.log(`  ⚠️  No text extracted from ${pdfFile}`);
            return { success: false, chunks: 0, time: Date.now() - startTime };
        }

        console.log(`  ✅ Extracted ${chunks.length} text chunks`);

        // Prepare chunks with metadata
        const chunksWithMetadata = chunks.map((chunk, index) => ({
            text: chunk.text,
            metadata: {
                fileName: pdfFile,
                page: chunk.page,
                chunkIndex: chunk.chunkIndex
            }
        }));

        // Generate embeddings in parallel batches (5 concurrent requests)
        console.log(`  🔄 Generating embeddings (parallel processing)...`);
        const embeddings = await generateEmbeddingsBatch(chunksWithMetadata, 5);

        if (embeddings.length === 0) {
            console.log(`  ⚠️  No embeddings generated for ${pdfFile}`);
            return { success: false, chunks: 0, time: Date.now() - startTime };
        }

        // Store in vector database
        await vectorDB.addDocuments(embeddings);
        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
        
        console.log(`  ✅ Added ${embeddings.length} chunks to vector database (${elapsedTime}s)`);
        
        return { success: true, chunks: embeddings.length, time: Date.now() - startTime };

    } catch (error) {
        console.error(`  ❌ Error processing ${pdfFile}:`, error.message);
        return { success: false, chunks: 0, time: Date.now() - startTime, error: error.message };
    }
}

async function processAllPDFs() {
    console.log('🔄 Starting PDF processing...');
    const overallStartTime = Date.now();
    
    // Check if OpenAI API key is set
    if (!process.env.OPENAI_API_KEY) {
        console.error('❌ OPENAI_API_KEY not found in environment variables');
        console.log('Please set your OpenAI API key in the .env file');
        process.exit(1);
    }

    const pdfsDir = path.join(__dirname, '../../pdfs');
    const vectorDB = new VectorDB();
    
    // Wait for vectorDB to be ready
    await vectorDB.ensureLoaded();

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
        pdfFiles.forEach((file, idx) => console.log(`  ${idx + 1}. ${file}`));
        console.log('');

        // Check which PDFs are already processed (by filename in metadata)
        const existingDocs = vectorDB.documents || [];
        const processedFiles = new Set(
            existingDocs
                .map(doc => doc.metadata?.fileName)
                .filter(Boolean)
        );
        
        const unprocessedFiles = pdfFiles.filter(file => !processedFiles.has(file));
        
        if (unprocessedFiles.length === 0) {
            console.log('✅ All PDFs have already been processed!');
            const docCount = await vectorDB.getDocumentCount();
            console.log(`📚 Total documents in database: ${docCount}`);
            return;
        }
        
        if (unprocessedFiles.length < pdfFiles.length) {
            console.log(`\n📋 Already processed: ${pdfFiles.length - unprocessedFiles.length} PDF(s)`);
            console.log(`🔄 Need to process: ${unprocessedFiles.length} PDF(s)`);
            console.log(`   New files: ${unprocessedFiles.join(', ')}`);
        }
        
        // Process PDFs in parallel (process 2 at a time to avoid API rate limits)
        const CONCURRENT_PDFS = 2;
        let totalChunks = 0;
        let successful = 0;
        let failed = 0;
        
        for (let i = 0; i < unprocessedFiles.length; i += CONCURRENT_PDFS) {
            const batch = unprocessedFiles.slice(i, i + CONCURRENT_PDFS);
            const batchNumber = Math.floor(i / CONCURRENT_PDFS) + 1;
            const totalBatches = Math.ceil(unprocessedFiles.length / CONCURRENT_PDFS);
            
            console.log(`\n📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} PDF(s))...`);
            
            const batchPromises = batch.map(pdfFile => {
                console.log(`\n🔄 Processing: ${pdfFile}`);
                return processSinglePDF(pdfFile, pdfsDir, vectorDB);
            });
            
            const results = await Promise.all(batchPromises);
            
            results.forEach((result, idx) => {
                if (result.success) {
                    totalChunks += result.chunks;
                    successful++;
                } else {
                    failed++;
                    console.log(`  ❌ Failed to process: ${batch[idx]}`);
                }
            });
        }

        const overallTime = ((Date.now() - overallStartTime) / 1000).toFixed(1);
        
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🎉 Processing complete!`);
        console.log(`📊 Statistics:`);
        console.log(`   ✅ Successful: ${successful}/${pdfFiles.length}`);
        console.log(`   ❌ Failed: ${failed}/${pdfFiles.length}`);
        console.log(`   📄 Total chunks processed: ${totalChunks}`);
        console.log(`   ⏱️  Total time: ${overallTime}s`);
        console.log(`   💾 Vector database updated`);
        
        // Final save to disk
        await vectorDB.saveToDisk();
        
        // Show database status
        const docCount = await vectorDB.getDocumentCount();
        console.log(`   📚 Total documents in database: ${docCount}`);
        console.log(`${'='.repeat(60)}`);

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
