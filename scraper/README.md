# Argos Product Page Scraper

A Node.js-based tool for scraping Argos product pages and saving the content locally.

## Features

- Visits Argos product detail pages and captures the rendered HTML
- Executes JavaScript to ensure full React-based content is rendered
- Downloads the complete page content for local viewing and modification
- Downloads all resources (images, CSS, JavaScript, fonts)
- Anti-detection measures to avoid being blocked by the site
- Organizes downloaded resources by type in separate folders

## Installation

```bash
npm install
```

## Usage

```bash
node index.js
```

By default, it will scrape the product page at https://www.argos.co.uk/product/5812657.

## Output

All scraped content is saved in the `output` directory with the following structure:

```
output/
├── product.html       # The main HTML file with the product page content
├── images/            # All image files from the page
├── css/               # CSS stylesheets
├── js/                # JavaScript files
├── fonts/             # Font files
└── other/             # Other resources
```

## Notes

- This scraper downloads resources with unique filenames (using hash suffixes) to avoid collisions
- The current implementation doesn't rewrite links in the HTML, so the local copy may not display perfectly
- You may need to manually adjust paths if you want a fully functional offline copy
