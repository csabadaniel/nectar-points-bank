const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const crypto = require('crypto');
const { URL } = require('url');

/**
 * Enhanced Argos product page scraper
 * This version includes anti-detection measures to prevent being blocked
 */
async function scrapeArgosProduct(url) {
  console.log(`Starting to scrape: ${url}`);
  
  // Create output directory
  const outputDir = path.join(__dirname, 'output');
  await fs.mkdir(outputDir, { recursive: true });
  
  // Create subdirectories for different resource types
  const resourceDirs = {
    images: path.join(outputDir, 'images'),
    css: path.join(outputDir, 'css'),
    js: path.join(outputDir, 'js'),
    fonts: path.join(outputDir, 'fonts'),
    other: path.join(outputDir, 'other')
  };
  
  // Create all resource subdirectories
  for (const dir of Object.values(resourceDirs)) {
    await fs.mkdir(dir, { recursive: true });
  }
  
  // Keep track of all resources to download
  const resourcesQueue = [];
  
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
  
  // Capture and track resources
  page.on('response', async response => {
    const url = response.url();
    const request = response.request();
    const resourceType = request.resourceType();
    
    // Skip non-successful responses
    if (!response.ok()) {
      return;
    }
    
    // Skip unwanted resource types
    if (['xhr', 'fetch', 'websocket', 'eventsource', 'manifest', 'other'].includes(resourceType)) {
      return;
    }
    
    try {
      // Determine resource directory based on type
      let resourceDir;
      switch (resourceType) {
        case 'stylesheet':
          resourceDir = resourceDirs.css;
          break;
        case 'script':
          resourceDir = resourceDirs.js;
          break;
        case 'image':
          resourceDir = resourceDirs.images;
          break;
        case 'font':
          resourceDir = resourceDirs.fonts;
          break;
        default:
          resourceDir = resourceDirs.other;
      }
      
      // Generate a safe filename
      let filename = generateFilename(url, resourceType);
      const savePath = path.join(resourceDir, filename);
      
      // Add to download queue
      resourcesQueue.push({
        url,
        savePath,
        resourceType,
        contentType: response.headers()['content-type']
      });
    } catch (error) {
      console.error(`Error processing resource ${url}: ${error.message}`);
    }
  });
  
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
    
    // Download all captured resources
    console.log(`Downloading ${resourcesQueue.length} resources...`);
    await downloadResources(resourcesQueue);
  } catch (error) {
    console.error('Error during scraping:', error);
  } finally {
    // Close the browser
    await browser.close();
    console.log('Browser closed');
  }
}

/**
 * Generates a safe filename from a URL and resource type
 */
function generateFilename(url, resourceType) {
  try {
    // Parse URL to extract pathname
    const parsedUrl = new URL(url);
    
    // Get the base filename from URL path
    let basename = path.basename(parsedUrl.pathname);
    
    // If no filename or it has no extension, use resource type as extension
    if (!basename || basename === '/' || !path.extname(basename)) {
      // Get a hash of the URL for uniqueness
      const hash = crypto.createHash('md5').update(url).digest('hex').substring(0, 8);
      
      // Create filename with appropriate extension based on resource type
      switch (resourceType) {
        case 'stylesheet':
          return `style-${hash}.css`;
        case 'script':
          return `script-${hash}.js`;
        case 'image':
          return `image-${hash}.png`;
        case 'font':
          return `font-${hash}.woff`;
        default:
          return `resource-${hash}.bin`;
      }
    }
    
    // Clean the filename - replace invalid characters with hyphens
    basename = basename.replace(/[^a-z0-9.-]/gi, '-');
    
    // Add hash to prevent filename collisions
    const hash = crypto.createHash('md5').update(url).digest('hex').substring(0, 8);
    const ext = path.extname(basename);
    const name = path.basename(basename, ext);
    
    return `${name}-${hash}${ext}`;
  } catch (error) {
    // Fallback for invalid URLs
    const hash = crypto.createHash('md5').update(url).digest('hex').substring(0, 8);
    return `resource-${hash}.bin`;
  }
}

/**
 * Downloads a collection of resources in batches
 */
async function downloadResources(resources) {
  // Create batches to avoid overwhelming the server
  const batchSize = 5;
  const totalResources = resources.length;
  let downloadedCount = 0;
  let failedCount = 0;
  
  // Process in batches
  for (let i = 0; i < totalResources; i += batchSize) {
    const batch = resources.slice(i, i + batchSize);
    
    // Download batch in parallel
    const promises = batch.map(resource => 
      downloadSingleResource(resource.url, resource.savePath)
        .then(() => {
          downloadedCount++;
          if (downloadedCount % 10 === 0 || downloadedCount === totalResources) {
            console.log(`Downloaded ${downloadedCount}/${totalResources} resources...`);
          }
        })
        .catch(error => {
          failedCount++;
          console.error(`Failed to download ${resource.url}: ${error.message}`);
        })
    );
    
    // Wait for this batch to complete
    await Promise.all(promises);
    
    // Add small delay between batches
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log(`Resource download complete. Downloaded ${downloadedCount} resources, failed: ${failedCount}.`);
}

/**
 * Downloads a single resource to the specified path
 */
function downloadSingleResource(url, filePath) {
  return new Promise((resolve, reject) => {
    // Select http or https module based on URL protocol
    const requester = url.startsWith('https') ? https : http;
    
    // Request the resource
    const request = requester.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Referer': 'https://www.argos.co.uk/'
      }
    }, response => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          // For relative URLs, resolve against original URL
          const fullRedirectUrl = redirectUrl.startsWith('http') 
            ? redirectUrl 
            : new URL(redirectUrl, url).href;
          
          return resolve(downloadSingleResource(fullRedirectUrl, filePath));
        }
        reject(new Error(`Redirect without location header`));
        return;
      }
      
      // Handle errors
      if (response.statusCode !== 200) {
        reject(new Error(`Status code: ${response.statusCode}`));
        return;
      }
      
      // Save to file
      const fileStream = fsSync.createWriteStream(filePath);
      response.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
      
      fileStream.on('error', err => {
        // Clean up on error
        try {
          fsSync.unlinkSync(filePath);
        } catch (e) {
          // Ignore if file doesn't exist
        }
        reject(err);
      });
    });
    
    request.on('error', reject);
    
    // Set timeout
    request.setTimeout(30000, () => {
      request.abort();
      reject(new Error('Request timed out'));
    });
  });
}

// URL for the Argos product to scrape
const productUrl = 'https://www.argos.co.uk/product/5812657';

// Run the scraper
scrapeArgosProduct(productUrl)
  .then(() => console.log('Scraping process completed'))
  .catch(err => console.error('Scraping process failed:', err));
