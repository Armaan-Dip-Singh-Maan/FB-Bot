const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');
const { splitTextIntoChunks } = require('./pdfProcessor');
const websiteConfig = require('../config/website');

/**
 * Website Scraper Module
 * Handles scraping website content and converting it to text chunks
 */
class WebsiteScraper { 
    constructor() {
        this.config = websiteConfig;
        this.visitedUrls = new Set();
        this.scrapedPages = [];
    }

    /**
     * Scrape entire website starting from base URL
     * @param {string} baseUrl - Base URL to start scraping from
     * @returns {Array} Array of scraped page data
     */
    async scrapeWebsite(baseUrl = null) {
        const startUrl = baseUrl || this.config.baseUrl;
        
        if (!startUrl || startUrl === 'https://your-website.com') {
            throw new Error('Please configure your website URL in backend/config/website.js');
        }

        console.log(`🌐 Starting website scraping from: ${startUrl}`);
        
        this.visitedUrls.clear();
        this.scrapedPages = [];
        
        try {
            // Start crawling from the base URL
            await this.crawlWebsite(startUrl, 0);
            
            console.log(`✅ Website scraping complete! Scraped ${this.scrapedPages.length} pages`);
            return this.scrapedPages;
            
        } catch (error) {
            console.error('❌ Error scraping website:', error.message);
            throw error;
        }
    }

    /**
     * Crawl website recursively
     * @param {string} url - URL to crawl
     * @param {number} depth - Current depth level
     */
    async crawlWebsite(url, depth) {
        // Check depth limit
        if (depth > this.config.crawling.maxDepth) {
            return;
        }

        // Check if we've already visited this URL
        if (this.visitedUrls.has(url)) {
            return;
        }

        // Check if we've reached the page limit
        if (this.scrapedPages.length >= this.config.crawling.maxPages) {
            console.log(`⚠️  Reached maximum page limit (${this.config.crawling.maxPages})`);
            return;
        }

        try {
            console.log(`📄 Scraping: ${url} (depth: ${depth})`);
            
            // Scrape the page
            const pageData = await this.scrapePage(url);
            
            if (pageData && pageData.content && pageData.content.trim().length > 0) {
                this.scrapedPages.push(pageData);
                this.visitedUrls.add(url);
                console.log(`  ✅ Extracted ${pageData.content.length} characters`);
            }

            // Add delay between requests
            if (this.config.crawling.requestDelay > 0) {
                await this.delay(this.config.crawling.requestDelay);
            }

            // If we haven't reached max depth, discover and crawl linked pages
            if (depth < this.config.crawling.maxDepth && pageData) {
                const links = this.extractLinks(pageData.html, url);
                
                for (const link of links) {
                    if (this.scrapedPages.length >= this.config.crawling.maxPages) {
                        break;
                    }
                    await this.crawlWebsite(link, depth + 1);
                }
            }

        } catch (error) {
            console.error(`  ❌ Error scraping ${url}:`, error.message);
        }
    }

    /**
     * Scrape individual page and extract text content
     * @param {string} url - URL to scrape
     * @returns {Object} Page data with content and metadata
     */
    async scrapePage(url) {
        try {
            const response = await axios.get(url, {
                timeout: this.config.crawling.timeout,
                headers: {
                    'User-Agent': this.config.crawling.userAgent
                }
            });

            const html = response.data;
            const $ = cheerio.load(html);

            // Extract page metadata
            const title = $('title').text().trim() || 'Untitled';
            const description = $('meta[name="description"]').attr('content') || '';

            // Extract main content
            const content = this.extractMainContent($);

            return {
                url: url,
                title: title,
                description: description,
                content: content,
                html: html,
                lastUpdated: new Date().toISOString()
            };

        } catch (error) {
            console.error(`Error scraping page ${url}:`, error.message);
            throw error;
        }
    }

    /**
     * Extract main content from HTML using configured selectors
     * @param {Object} $ - Cheerio instance
     * @returns {string} Extracted text content
     */
    extractMainContent($) {
        let content = '';

        // Try to find main content area
        for (const selector of this.config.contentSelectors.mainContent) {
            const element = $(selector);
            if (element.length > 0) {
                content = this.extractTextFromElement(element, $);
                if (content.trim().length > 0) {
                    break;
                }
            }
        }

        // If no main content found, extract from body
        if (!content.trim()) {
            content = this.extractTextFromElement($('body'), $);
        }

        // Clean the content
        return this.cleanWebContent(content);
    }

    /**
     * Extract text from a specific element
     * @param {Object} element - Cheerio element
     * @param {Object} $ - Cheerio instance
     * @returns {string} Extracted text
     */
    extractTextFromElement(element, $) {
        // Remove excluded elements
        this.config.contentSelectors.exclude.forEach(selector => {
            element.find(selector).remove();
        });

        let text = '';

        // Extract text from specified elements
        this.config.contentSelectors.textElements.forEach(tag => {
            element.find(tag).each((i, el) => {
                const elementText = $(el).text().trim();
                if (elementText) {
                    text += elementText + '\n';
                }
            });
        });

        return text;
    }

    /**
     * Extract internal links from HTML
     * @param {string} html - HTML content
     * @param {string} baseUrl - Base URL for resolving relative links
     * @returns {Array} Array of internal URLs
     */
    extractLinks(html, baseUrl) {
        const $ = cheerio.load(html);
        const links = [];
        const baseUrlObj = new URL(baseUrl);

        $('a[href]').each((i, el) => {
            const href = $(el).attr('href');
            if (!href) return;

            try {
                const url = new URL(href, baseUrl);
                
                // Check if it's an internal link
                if (url.hostname === baseUrlObj.hostname) {
                    // Check if URL should be excluded
                    const shouldExclude = this.config.pages.exclude.some(pattern => {
                        if (pattern.startsWith('*')) {
                            return url.pathname.endsWith(pattern.substring(1));
                        }
                        return url.pathname.includes(pattern);
                    });

                    if (!shouldExclude) {
                        links.push(url.href);
                    }
                }
            } catch (error) {
                // Invalid URL, skip
            }
        });

        return [...new Set(links)]; // Remove duplicates
    }

    /**
     * Clean and preprocess extracted web content
     * @param {string} text - Raw text content
     * @returns {string} Cleaned text
     */
    cleanWebContent(text) {
        if (!text) return '';

        let cleaned = text
            // Remove extra whitespace
            .replace(/\s+/g, ' ')
            .replace(/\n+/g, '\n')
            // Remove common website boilerplate
            .replace(/\b(cookie policy|privacy policy|terms of service|all rights reserved|copyright)\b/gi, '')
            .replace(/\b(follow us on|subscribe to our newsletter|read more|learn more|click here)\b/gi, '')
            .trim();

        // Remove boilerplate patterns if enabled
        if (this.config.processing.removeBoilerplate) {
            this.config.processing.boilerplatePatterns.forEach(pattern => {
                const regex = new RegExp(pattern, 'gi');
                cleaned = cleaned.replace(regex, '');
            });
        }

        return cleaned;
    }

    /**
     * Convert scraped pages to text chunks
     * @param {Array} pages - Array of scraped page data
     * @returns {Array} Array of text chunks with metadata
     */
    pagesToChunks(pages) {
        const chunks = [];

        pages.forEach(page => {
            if (!page.content || page.content.trim().length < this.config.processing.minChunkLength) {
                return;
            }

            // Split content into chunks
            const textChunks = splitTextIntoChunks(
                page.content,
                this.config.processing.maxChunkLength,
                this.config.processing.chunkOverlap
            );

            // Create chunk objects with metadata
            textChunks.forEach((chunk, index) => {
                if (chunk.trim().length >= this.config.processing.minChunkLength) {
                    chunks.push({
                        text: chunk,
                        metadata: {
                            source: 'website',
                            url: page.url,
                            title: page.title,
                            lastUpdated: page.lastUpdated,
                            chunkIndex: index,
                            fileName: null
                        }
                    });
                }
            });
        });

        return chunks;
    }

    /**
     * Utility function to add delay
     * @param {number} ms - Milliseconds to delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get scraping statistics
     * @returns {Object} Scraping statistics
     */
    getStats() {
        return {
            pagesScraped: this.scrapedPages.length,
            urlsVisited: this.visitedUrls.size,
            totalContentLength: this.scrapedPages.reduce((sum, page) => sum + page.content.length, 0)
        };
    }
}

module.exports = { WebsiteScraper };
