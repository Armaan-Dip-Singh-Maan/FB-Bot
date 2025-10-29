# Website Content Scraping Setup Guide

This guide will help you set up automatic website content scraping for your Franquicia Boost bot.

## Overview

The website scraping system automatically fetches content from your live website, processes it into text chunks, generates embeddings, and stores it in the knowledge base alongside PDF content. The system includes:

- **Automatic scraping** of your entire website
- **Scheduled updates** to keep content current
- **Change detection** to avoid unnecessary API calls
- **Content filtering** to extract only relevant information
- **Manual update triggers** via API endpoints

## Prerequisites

1. A live website URL to scrape
2. Node.js dependencies installed (`npm install` in backend directory)
3. OpenAI API key configured in `.env` file

## Quick Setup

### 1. Configure Your Website URL

Edit `backend/config/website.js` and update the `baseUrl`:

```javascript
module.exports = {
    baseUrl: 'https://your-actual-website.com', // Replace with your website URL
    // ... rest of configuration
};
```

### 2. Install Dependencies

Run this command in the backend directory:

```bash
npm install
```

This will install the required scraping dependencies:
- `cheerio` - HTML parsing
- `axios` - HTTP requests
- `node-cron` - Scheduled tasks
- `sitemap` - Optional sitemap parsing

### 3. Start the Server

```bash
npm start
```

The system will automatically:
- Scrape your website content on first startup
- Schedule daily updates at 2 AM UTC
- Process and store content in the knowledge base

## Configuration Options

### Website URL and Basic Settings

```javascript
// backend/config/website.js
module.exports = {
    baseUrl: 'https://your-website.com',
    updateFrequency: 'daily', // 'daily', 'weekly', 'monthly'
    cronSchedule: '0 2 * * *', // Daily at 2 AM UTC
};
```

### Content Extraction Settings

```javascript
contentSelectors: {
    // CSS selectors to find main content
    mainContent: [
        'main',
        'article',
        '.content',
        '.main-content',
        '#content'
    ],
    
    // Elements to exclude (navigation, ads, etc.)
    exclude: [
        'nav',
        'header',
        'footer',
        '.navigation',
        '.ads',
        '.sidebar'
    ],
    
    // Text elements to include
    textElements: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'li', 'td', 'th', 'blockquote'
    ]
}
```

### Crawling Settings

```javascript
crawling: {
    maxDepth: 2,        // How deep to crawl (0 = homepage only)
    maxPages: 50,       // Maximum pages to scrape
    requestDelay: 1000, // Delay between requests (ms)
    timeout: 10000      // Request timeout (ms)
}
```

### Pages to Include/Exclude

```javascript
pages: {
    // Specific pages to always include
    include: [
        '/about',
        '/services',
        '/contact'
    ],
    
    // Pages/patterns to exclude
    exclude: [
        '/admin',
        '/login',
        '/cart',
        '*.pdf',
        '*.jpg'
    ]
}
```

## API Endpoints

### Manual Website Update

Trigger a manual website content update:

```bash
curl -X POST http://localhost:3001/api/update-website \
  -H "Content-Type: application/json" \
  -d '{"forceUpdate": false}'
```

**Response:**
```json
{
  "success": true,
  "message": "Website content updated successfully",
  "pagesProcessed": 15,
  "chunksAdded": 45,
  "chunksRemoved": 2,
  "stats": {
    "pagesScraped": 15,
    "urlsVisited": 15,
    "totalContentLength": 25000
  }
}
```

### Content Sources Statistics

Get statistics about your knowledge base content:

```bash
curl http://localhost:3001/api/content-sources
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalDocuments": 120,
    "websiteDocuments": 45,
    "pdfDocuments": 75,
    "sources": {
      "website": {
        "count": 45,
        "urls": ["https://example.com/page1", "https://example.com/page2"],
        "files": []
      },
      "pdf": {
        "count": 75,
        "urls": [],
        "files": ["document1.pdf", "document2.pdf"]
      }
    }
  }
}
```

## Manual Script Execution

You can also run the update script manually:

```bash
# From the backend directory
node scripts/update-website-content.js
```

## Troubleshooting

### Common Issues

1. **"Please configure your website URL"**
   - Update `baseUrl` in `backend/config/website.js`
   - Make sure it's a valid URL starting with `http://` or `https://`

2. **"No website content scraped"**
   - Check if your website is accessible
   - Verify the website doesn't block automated requests
   - Check the content selectors in the configuration

3. **"Rate limit exceeded"**
   - Increase `requestDelay` in crawling settings
   - Reduce `maxPages` or `maxDepth`

4. **Content not being extracted properly**
   - Adjust `contentSelectors.mainContent` to match your website structure
   - Add more specific selectors for your content areas
   - Check `contentSelectors.exclude` to ensure important content isn't being filtered out

### Debugging

Enable detailed logging by checking the console output when the server starts. The system will log:

- Pages being scraped
- Content extraction progress
- Embedding generation progress
- Update statistics

### Testing Content Extraction

Test your configuration by running a manual update and checking the logs:

```bash
curl -X POST http://localhost:3001/api/update-website \
  -H "Content-Type: application/json" \
  -d '{"forceUpdate": true}'
```

## Advanced Configuration

### Custom Cron Schedule

You can customize the update schedule using cron expressions:

```javascript
// Examples:
cronSchedule: '0 2 * * *',    // Daily at 2 AM
cronSchedule: '0 0 * * 0',   // Weekly on Sunday at midnight
cronSchedule: '0 0 1 * *',   // Monthly on the 1st at midnight
cronSchedule: '0 */6 * * *', // Every 6 hours
```

### Content Processing

Fine-tune how content is processed:

```javascript
processing: {
    minChunkLength: 100,      // Minimum chunk size
    maxChunkLength: 1000,     // Maximum chunk size
    chunkOverlap: 200,        // Overlap between chunks
    removeBoilerplate: true,  // Remove common website text
    boilerplatePatterns: [    // Custom patterns to remove
        'cookie policy',
        'privacy policy',
        'follow us on'
    ]
}
```

## Monitoring and Maintenance

### Regular Monitoring

- Check the server logs for update status
- Monitor the `/api/content-sources` endpoint for content statistics
- Verify that scheduled updates are running successfully

### Content Quality

- Test the bot with questions about your website content
- Adjust content selectors if important information is missing
- Update excluded patterns if irrelevant content is being included

### Performance Optimization

- Adjust `maxPages` and `maxDepth` based on your website size
- Increase `requestDelay` if you're hitting rate limits
- Monitor OpenAI API usage for embedding generation

## Security Considerations

- The scraper respects robots.txt and common web scraping etiquette
- Uses appropriate delays between requests
- Includes a proper User-Agent header
- Only scrapes content from your own website

## Support

If you encounter issues:

1. Check the server console logs for error messages
2. Verify your website configuration
3. Test with a simple manual update
4. Check the content sources statistics endpoint

The system is designed to be robust and handle common website structures automatically, but may need fine-tuning for specific website layouts or requirements.
