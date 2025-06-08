const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

/**
 * Enhanced Argos product page scraper
 * This version includes anti-detection measures to prevent being blocked
 */
async function scrapeArgosProduct(url) {
  console.log(`Starting to scrape: ${url}`);
  
  // Create output directory
  const outputDir = path.join(__dirname, 'output');
  await fs.mkdir(outputDir, { recursive: true });
  
  // Launch browser with more realistic settings
  const browser = await puppeteer.launch({
    headless: false, // Use visible browser to reduce detection
    args: [
      '--disable-blink-features=AutomationControlled',
      '--window-size=1920,1080',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });
  
  const page = await browser.newPage();
  
  // Set realistic viewport
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Set a realistic user agent
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
  
  // Set extra headers to appear more like a real browser
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Referer': 'https://www.argos.co.uk/'
  });
  
  // Randomize browser fingerprint
  await page.evaluateOnNewDocument(() => {
    // Overwrite the navigator properties
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false
    });
    
    // Overwrite plugins array
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5]
    });
  });
  
  try {
    console.log('Navigating to the product page...');
    
    // Visit the page with a more generous timeout
    await page.goto(url, {
      waitUntil: 'networkidle2', // Less strict waiting strategy
      timeout: 60000 // 60 seconds timeout
    });
    
    // Introduce random delay to mimic human behavior
    await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 3000) + 2000));
    
    // Perform some random scrolling to mimic human behavior
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight / 2);
    });
    
    await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 2000) + 1000));
    
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
