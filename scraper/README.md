# Argos Product Page Scraper

A Node.js-based tool for scraping Argos product pages and saving the content locally.

## Features

- Visits Argos product detail pages and captures the rendered HTML
- Executes JavaScript to ensure full React-based content is rendered
- Downloads the complete page content for local viewing and modification

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

All scraped content is saved in the `output` directory.
