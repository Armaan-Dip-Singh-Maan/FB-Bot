const { VectorDB } = require('./utils/vectorDB');
const { generateEmbedding } = require('./utils/openaiClient');

async function testSearch() {
    console.log('🧪 Testing vector search...');
    
    const vectorDB = new VectorDB();
    
    // Test query
    const query = "Add-On Program Fee";
    console.log(`Query: "${query}"`);
    
    try {
        // Generate embedding for query
        const queryEmbedding = await generateEmbedding(query);
        console.log('✅ Query embedding generated');
        
        // Search for relevant documents
        const relevantDocs = await vectorDB.search(queryEmbedding, 5);
        console.log(`Found ${relevantDocs.length} documents`);
        
        // Show results
        relevantDocs.forEach((doc, index) => {
            console.log(`\n--- Result ${index + 1} ---`);
            console.log(`Similarity: ${doc.similarity.toFixed(4)}`);
            console.log(`Source: ${doc.metadata.fileName}, Page ${doc.metadata.page}`);
            console.log(`Text preview: ${doc.text.substring(0, 200)}...`);
        });
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testSearch();

