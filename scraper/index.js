const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

/**
 * Basic Argos product page scraper
 * This initial version just visits the page and saves the HTML
 */
async function scrapeArgosProduct(url) {
  console.log(`Starting to scrape: ${url}`);
  
  // Create output directory
  const outputDir = path.join(__dirname, 'output');
  await fs.mkdir(outputDir, { recursive: true });
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: 'new' // Use the new headless mode
  });
  const page = await browser.newPage();
  
  try {
    // Visit the page and wait for content to load
    await page.goto(url, {
      waitUntil: 'networkidle0', // Wait until network is idle
      timeout: 30000 // 30 seconds timeout
    });
    
    console.log('Page loaded successfully');
    
    // Get the page HTML content
    const htmlContent = await page.content();
    
    // Save the HTML to a file
    const outputPath = path.join(outputDir, 'product.html');
    await fs.writeFile(outputPath, htmlContent);
    
    console.log(`HTML content saved to: ${outputPath}`);
  } catch (error) {
    console.error('Error during scraping:', error);
  } finally {
    // Close the browser
    await browser.close();
    console.log('Browser closed');
  }
}

// URL for the Argos product to scrape
const productUrl = 'https://www.argos.co.uk/product/5812657';

// Run the scraper
scrapeArgosProduct(productUrl)
  .then(() => console.log('Scraping process completed'))
  .catch(err => console.error('Scraping process failed:', err));
