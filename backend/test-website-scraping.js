// Test script for website scraping integration
const { WebsiteScraper } = require('./utils/websiteScraper');
const { WebsiteContentUpdater } = require('./scripts/update-website-content');

async function testWebsiteScraping() {
    console.log('🧪 Testing Website Scraping Integration...\n');
    
    try {
        // Test 1: Website Scraper Configuration
        console.log('📋 Test 1: Checking website configuration...');
        const scraper = new WebsiteScraper();
        console.log(`✅ Website scraper initialized`);
        console.log(`   Base URL: ${scraper.config.baseUrl}`);
        console.log(`   Max depth: ${scraper.config.crawling.maxDepth}`);
        console.log(`   Max pages: ${scraper.config.crawling.maxPages}\n`);

        // Test 2: Content Updater
        console.log('📋 Test 2: Testing content updater...');
        const updater = new WebsiteContentUpdater();
        console.log('✅ Content updater initialized\n');

        // Test 3: Configuration Validation
        console.log('📋 Test 3: Validating configuration...');
        if (scraper.config.baseUrl === 'https://your-website.com') {
            console.log('⚠️  WARNING: Default website URL detected');
            console.log('   Please update backend/config/website.js with your actual website URL');
        } else {
            console.log(`✅ Website URL configured: ${scraper.config.baseUrl}`);
        }

        console.log('\n🎯 Website Scraping Integration Test Complete!');
        console.log('\n📋 Next Steps:');
        console.log('1. Update your website URL in backend/config/website.js');
        console.log('2. Install dependencies: npm install (in backend directory)');
        console.log('3. Start the server: npm start');
        console.log('4. The system will automatically scrape your website on startup');
        console.log('5. Check /api/content-sources for statistics');
        console.log('6. Use /api/update-website for manual updates');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Make sure all dependencies are installed: npm install');
        console.log('2. Check that backend/config/website.js exists');
        console.log('3. Verify the configuration file syntax');
    }
}

// Run the test
testWebsiteScraping().catch(console.error);
