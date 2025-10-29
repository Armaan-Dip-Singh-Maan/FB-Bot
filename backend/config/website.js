// Website Configuration
// Configure which website to scrape and how to extract content
module.exports = {
    // Website URL to scrape (replace with your actual website)
    baseUrl: 'https://www.franquiciaboost.com/',
    
    // Update frequency for automatic scraping
    // Options: 'daily', 'weekly', 'monthly', or cron expression
    updateFrequency: 'daily',
    
    // Cron schedule for updates (if updateFrequency is not used)
    // Default: '0 2 * * *' (daily at 2 AM)
    cronSchedule: '0 2 * * *',
    
    // Content extraction settings
    contentSelectors: {
        // CSS selectors to extract main content
        mainContent: [
            'main',
            'article',
            '.content',
            '.main-content',
            '#content',
            '.post-content',
            '.page-content'
        ],
        
        // CSS selectors to exclude (headers, footers, navigation, etc.)
        exclude: [
            'nav',
            'header',
            'footer',
            '.navigation',
            '.navbar',
            '.sidebar',
            '.ads',
            '.advertisement',
            '.social-share',
            '.comments',
            '.related-posts'
        ],
        
        // Text elements to include
        textElements: [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'p', 'li', 'td', 'th', 'blockquote',
            'div', 'span'
        ]
    },
    
    // Crawling settings
    crawling: {
        // Maximum depth to crawl (0 = only homepage, 1 = homepage + 1 level, etc.)
        maxDepth: 2,
        
        // Maximum number of pages to scrape
        maxPages: 50,
        
        // Delay between requests (in milliseconds)
        requestDelay: 1000,
        
        // User agent for requests
        userAgent: 'FranquiciaBoost-Bot/1.0 (Website Content Scraper)',
        
        // Timeout for requests (in milliseconds)
        timeout: 10000
    },
    
    // Pages to include/exclude
    pages: {
        // Specific pages to include (will be scraped regardless of crawling rules)
        include: [
            // '/about',
            // '/services',
            // '/contact'
        ],
        
        // Pages/patterns to exclude
        exclude: [
            '/admin',
            '/login',
            '/register',
            '/cart',
            '/checkout',
            '/account',
            '/api',
            '/wp-admin',
            '/wp-content',
            '*.pdf',
            '*.jpg',
            '*.png',
            '*.gif',
            '*.css',
            '*.js'
        ]
    },
    
    // Content processing settings
    processing: {
        // Minimum text length for a chunk to be included
        minChunkLength: 100,
        
        // Maximum text length for a chunk
        maxChunkLength: 1000,
        
        // Overlap between chunks
        chunkOverlap: 200,
        
        // Remove common website boilerplate text
        removeBoilerplate: true,
        
        // Boilerplate patterns to remove
        boilerplatePatterns: [
            'cookie policy',
            'privacy policy',
            'terms of service',
            'all rights reserved',
            'copyright',
            'follow us on',
            'subscribe to our newsletter',
            'read more',
            'learn more',
            'click here'
        ]
    }
};
