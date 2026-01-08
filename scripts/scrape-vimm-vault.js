#!/usr/bin/env node

/**
 * Vimm's Lair Vault Scraper
 * 
 * Scrapes https://vimm.net/vault to extract all ROMs organized by platform.
 * Outputs multiple JSON files (one per platform) with an index file linking them.
 * Supports resumable scraping - can continue from last completed platform if interrupted.
 * 
 * Usage:
 *   node scripts/scrape-vimm-vault.js [--force] [--verbose]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const { load } = require('cheerio');

// Create HTTPS agent that accepts self-signed certificates (for problematic SSL)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// Configuration
const BASE_URL = 'https://vimm.net';
const VAULT_URL = `${BASE_URL}/vault`;
const DELAY_MS = 500; // Delay between requests
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// File paths
const SCRIPTS_DIR = path.join(__dirname);
const PROGRESS_FILE = path.join(SCRIPTS_DIR, '.vimm-progress.json');
const OUTPUT_DIR = path.join(SCRIPTS_DIR, 'vimm-roms');
const INDEX_FILE = path.join(SCRIPTS_DIR, 'vimm-roms-index.json');

// Parse command line arguments
const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const VERBOSE = args.includes('--verbose');

// Progress state
let progress = {
  lastUpdated: null,
  completedPlatforms: [],
  currentPlatform: null,
  data: {}
};

// Index state
let index = {
  version: '1.0',
  lastUpdated: null,
  platforms: []
};

/**
 * Logging utilities
 */
function log(message) {
  console.log(message);
}

function logVerbose(message) {
  if (VERBOSE) {
    console.log(`[VERBOSE] ${message}`);
  }
}

function logError(message) {
  console.error(`[ERROR] ${message}`);
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Sanitize platform name for filename
 */
function sanitizeFilename(name) {
  // Replace invalid filename characters, but preserve spaces
  return name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fetch URL with retry logic using https/http modules
 */
async function fetchWithRetry(url, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      logVerbose(`Fetching: ${url} (attempt ${i + 1}/${retries})`);
      
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      };
      
      // Add agent for HTTPS to handle SSL issues
      if (isHttps) {
        options.agent = httpsAgent;
      }
      
      const html = await new Promise((resolve, reject) => {
        const req = client.request(options, (res) => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
            return;
          }
          
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            resolve(data);
          });
        });
        
        req.on('error', (error) => {
          reject(error);
        });
        
        req.setTimeout(30000, () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });
        
        req.end();
      });
      
      return html;
    } catch (error) {
      if (i === retries - 1) {
        throw error;
      }
      logVerbose(`Retry ${i + 1} failed: ${error.message}. Waiting ${RETRY_DELAY_MS}ms...`);
      await sleep(RETRY_DELAY_MS * (i + 1)); // Exponential backoff
    }
  }
}

/**
 * Load progress file
 */
function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      const data = fs.readFileSync(PROGRESS_FILE, 'utf8');
      progress = JSON.parse(data);
      log(`Loaded progress: ${progress.completedPlatforms.length} platforms completed`);
      return true;
    } catch (error) {
      logError(`Failed to load progress file: ${error.message}`);
      return false;
    }
  }
  return false;
}

/**
 * Save progress file
 */
function saveProgress() {
  try {
    progress.lastUpdated = new Date().toISOString();
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf8');
    logVerbose(`Progress saved`);
  } catch (error) {
    logError(`Failed to save progress: ${error.message}`);
  }
}

/**
 * Load index file
 */
function loadIndex() {
  if (fs.existsSync(INDEX_FILE)) {
    try {
      const data = fs.readFileSync(INDEX_FILE, 'utf8');
      index = JSON.parse(data);
      logVerbose(`Loaded index with ${index.platforms.length} platforms`);
      return true;
    } catch (error) {
      logVerbose(`Index file not found or invalid, will create new one`);
    }
  }
  return false;
}

/**
 * Save index file
 */
function saveIndex() {
  try {
    index.lastUpdated = new Date().toISOString();
    fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), 'utf8');
    logVerbose(`Index saved`);
  } catch (error) {
    logError(`Failed to save index: ${error.message}`);
  }
}

/**
 * Extract platforms from main vault page
 */
async function extractPlatforms() {
  log('Fetching main vault page...');
  const html = await fetchWithRetry(VAULT_URL);
  const $ = load(html);
  
  const platforms = [];
  const seen = new Set();
  
  // Find platform links in the sidebar navigation
  // Look for links that point to /vault/{platform}
  $('a[href^="/vault/"]').each((i, elem) => {
    const $link = $(elem);
    const href = $link.attr('href');
    const name = $link.text().trim();
    
    // Skip if it's the vault link itself, empty, or common navigation items
    if (href === '/vault' || 
        !name || 
        name === 'The Vault' ||
        name.toLowerCase() === 'vault' ||
        href === '/vault/') {
      return;
    }
    
    // Extract platform slug from URL (e.g., /vault/N64 -> N64)
    const slug = href.replace('/vault/', '').trim();
    
    // Skip if slug is empty or if it's a letter (A-Z) which is for alphabetical navigation
    if (!slug || slug.length === 1 && /^[A-Z]$/.test(slug)) {
      return;
    }
    
    // Skip if we've already seen this platform
    if (seen.has(slug)) {
      return;
    }
    
    // Validate that it looks like a platform (not a game or other page)
    // Platforms typically have short slugs (1-10 chars) or common names
    if (slug && name && slug.length <= 20) {
      seen.add(slug);
      platforms.push({
        name: name,
        slug: slug,
        url: `${BASE_URL}${href}`
      });
    }
  });
  
  // Also try to find platforms in navigation lists/ul elements
  $('nav ul a[href^="/vault/"], ul a[href^="/vault/"]').each((i, elem) => {
    const $link = $(elem);
    const href = $link.attr('href');
    const name = $link.text().trim();
    const slug = href.replace('/vault/', '').trim();
    
    if (slug && name && slug.length <= 20 && !seen.has(slug) && slug !== 'vault') {
      if (slug.length === 1 && /^[A-Z]$/.test(slug)) {
        return; // Skip letter links
      }
      seen.add(slug);
      platforms.push({
        name: name,
        slug: slug,
        url: `${BASE_URL}${href}`
      });
    }
  });
  
  // Sort platforms by name for consistency
  platforms.sort((a, b) => a.name.localeCompare(b.name));
  
  log(`Found ${platforms.length} platforms`);
  if (VERBOSE) {
    platforms.slice(0, 10).forEach(p => logVerbose(`  - ${p.name} (${p.slug})`));
    if (platforms.length > 10) {
      logVerbose(`  ... and ${platforms.length - 10} more`);
    }
  }
  
  return platforms;
}

/**
 * Extract expected ROM count from status section
 */
function extractExpectedCount($) {
  // Look for status text like "Have 1148 of 1148 media (100%)"
  const pageText = $('body').text();
  const countMatch = pageText.match(/Have\s+(\d+)\s+of\s+(\d+)\s+media/i);
  if (countMatch) {
    return parseInt(countMatch[2], 10); // Return the total expected count
  }
  return null;
}

/**
 * Extract Top 10 sections from platform page
 */
function extractTop10($, platformUrl) {
  const top10 = {
    monthly: [],
    overallRating: []
  };
  
  // Look for sections with "January's Top 10" or "Overall Rating"
  $('div, section').each((i, elem) => {
    const $elem = $(elem);
    const $heading = $elem.find('h1, h2, h3, h4, h5, h6, strong, b').first();
    const headingText = $heading.text().trim();
    
    // Check for "January's Top 10" or similar
    if (headingText.match(/January.*Top\s+10|Monthly.*Top\s+10/i)) {
      // Extract game titles from list items or divs
      $elem.find('li, div, a').each((j, item) => {
        const $item = $(item);
        const itemText = $item.text().trim();
        
        // Skip if it's the heading, empty, or navigation
        if (!itemText || 
            itemText === headingText || 
            itemText.length < 3 ||
            itemText.match(/Top\s+10|Show\s+more/i)) {
          return;
        }
        
        // Check if it's a link (game title)
        if ($item.is('a') || $item.find('a').length > 0) {
          const gameName = itemText.split('\n')[0].trim(); // Take first line
          if (gameName && gameName.length > 2 && !top10.monthly.includes(gameName)) {
            top10.monthly.push(gameName);
          }
        }
      });
    }
    
    // Check for "Overall Rating"
    if (headingText.match(/Overall.*Rating/i)) {
      // Extract games with ratings
      $elem.find('li, div, a, tr').each((j, item) => {
        const $item = $(item);
        let itemText = $item.text().trim();
        
        // Skip if it's the heading or empty
        if (!itemText || itemText === headingText || itemText.length < 3) {
          return;
        }
        
        // Look for pattern: "Game Name 8.48" or "Game Name8.48"
        const ratingMatch = itemText.match(/^(.+?)\s*(\d+\.\d+)$/m);
        if (ratingMatch) {
          const name = ratingMatch[1].trim();
          const rating = parseFloat(ratingMatch[2]);
          if (name && !isNaN(rating) && name.length > 2) {
            // Check if we already have this game
            const existing = top10.overallRating.find(r => r.name === name);
            if (!existing) {
              top10.overallRating.push({ name, rating });
            }
          }
        }
      });
    }
  });
  
  // Remove duplicates and limit to top 10
  top10.monthly = [...new Set(top10.monthly)].slice(0, 10);
  top10.overallRating = top10.overallRating
    .filter((item, index, self) =>
      index === self.findIndex(t => t.name === item.name)
    )
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 10);
  
  logVerbose(`Extracted Top 10: ${top10.monthly.length} monthly, ${top10.overallRating.length} rated`);
  return top10;
}

/**
 * Extract download link from a ROM detail page
 */
async function extractDownloadLink(romDetailUrl) {
  try {
    const html = await fetchWithRetry(romDetailUrl);
    const $ = load(html);
    
    // Look for download button/link - typically has "Download" text or href contains "download"
    let downloadUrl = null;
    
    // Method 1: Look for links/buttons with "Download" text (case insensitive)
    $('a, button, input[type="button"], input[type="submit"]').each((i, elem) => {
      const $elem = $(elem);
      const text = $elem.text().trim().toLowerCase();
      const value = $elem.attr('value') || '';
      const href = $elem.attr('href') || '';
      const onclick = $elem.attr('onclick') || '';
      
      if ((text.includes('download') || value.toLowerCase().includes('download')) && (href || onclick)) {
        // Extract URL from href
        if (href) {
          if (href.startsWith('http')) {
            downloadUrl = href;
            return false; // Break
          } else if (href.startsWith('/')) {
            downloadUrl = `${BASE_URL}${href}`;
            return false; // Break
          }
        }
        
        // Extract URL from onclick
        if (onclick) {
          // Look for URLs in onclick: window.location, href, or direct URLs
          const urlMatch = onclick.match(/(?:window\.location|href|url)\s*[=:]\s*['"]([^'"]+)['"]/i) ||
                          onclick.match(/(https?:\/\/[^\s'"]+)/i) ||
                          onclick.match(/['"](\/[^'"]+)['"]/);
          if (urlMatch) {
            const url = urlMatch[1];
            downloadUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
            return false; // Break
          }
        }
      }
    });
    
    // Method 2: Look for download links in common patterns (href contains download/file)
    if (!downloadUrl) {
      $('a[href*="download"], a[href*="file"], a[href*="/download"]').each((i, elem) => {
        const href = $(elem).attr('href');
        if (href) {
          downloadUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
          return false; // Break
        }
      });
    }
    
    // Method 3: Look for form actions with download
    if (!downloadUrl) {
      $('form[action*="download"]').each((i, elem) => {
        const action = $(elem).attr('action');
        if (action) {
          downloadUrl = action.startsWith('http') ? action : `${BASE_URL}${action}`;
          return false; // Break
        }
      });
    }
    
    // Method 4: Look for data attributes
    if (!downloadUrl) {
      $('[data-download], [data-url], [data-href]').each((i, elem) => {
        const $elem = $(elem);
        const dataUrl = $elem.attr('data-download') || $elem.attr('data-url') || $elem.attr('data-href');
        if (dataUrl) {
          downloadUrl = dataUrl.startsWith('http') ? dataUrl : `${BASE_URL}${dataUrl}`;
          return false; // Break
        }
      });
    }
    
    // Method 5: Construct download URL from ROM detail URL pattern
    // vimm.net often uses pattern like /vault/{id}/download or similar
    if (!downloadUrl) {
      const urlMatch = romDetailUrl.match(/\/vault\/(\d+)/);
      if (urlMatch) {
        const romId = urlMatch[1];
        // Try common download URL patterns
        const possibleUrls = [
          `${BASE_URL}/vault/${romId}/download`,
          `${BASE_URL}/vault/download/${romId}`,
          `${BASE_URL}/download/${romId}`,
          `${BASE_URL}/vault/${romId}?download=1`
        ];
        // We'll try these as fallback, but for now just return the most likely one
        downloadUrl = `${BASE_URL}/vault/${romId}/download`;
      }
    }
    
    return downloadUrl;
  } catch (error) {
    logVerbose(`Failed to extract download link from ${romDetailUrl}: ${error.message}`);
    return null;
  }
}

/**
 * Extract ROMs from a page
 */
function extractROMs($, platformUrl) {
  const roms = [];
  const seenUrls = new Set();
  
  // Look for the main ROM table - it has columns: Title, Region, Version, Languages, Rating
  $('table').each((i, table) => {
    const $table = $(table);
    const $rows = $table.find('tr');
    
    // Check if this is the ROM table by looking for header row
    const $headerRow = $rows.first();
    const headerText = $headerRow.text().toLowerCase();
    
    // ROM table should have "Title" in the header
    if (!headerText.includes('title') && !headerText.includes('region')) {
      return; // Not the ROM table
    }
    
    // Process data rows (skip header)
    $rows.slice(1).each((j, row) => {
      const $row = $(row);
      const $cells = $row.find('td');
      
      if ($cells.length === 0) {
        return; // Skip empty rows
      }
      
      // First cell should contain the Title link
      const $firstCell = $($cells[0]);
      const $link = $firstCell.find('a[href*="/vault/"]').first();
      
      if ($link.length === 0) {
        return; // No link found
      }
      
      const href = $link.attr('href');
      let name = $link.text().trim();
      
      // If name is empty, try getting text from the cell
      if (!name) {
        name = $firstCell.text().trim();
      }
      
      // Skip if it's a platform link or navigation
      if (!name || !href) {
        return;
      }
      
      // ROM links are typically numeric IDs like /vault/7000 or have the pattern /vault/{number}
      // Platform links are like /vault/N64, /vault/PS1, etc.
      const pathParts = href.split('/').filter(p => p);
      const lastPart = pathParts[pathParts.length - 1];
      
      // Skip if it's a platform slug (short, not numeric) or a letter
      if (pathParts.length <= 2 && !/^\d+$/.test(lastPart) && lastPart.length <= 5 && !/^\d+$/.test(lastPart)) {
        return; // Likely a platform or navigation link
      }
      
      // Skip letter links (A-Z)
      if (lastPart.length === 1 && /^[A-Z]$/.test(lastPart)) {
        return;
      }
      
      const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
      
      // Skip if we've seen this URL
      if (!seenUrls.has(fullUrl) && name.length > 1) {
        seenUrls.add(fullUrl);
        roms.push({
          name: name,
          url: fullUrl, // Keep 'url' for backward compatibility, but it's the page URL
          pageUrl: fullUrl,
          downloadUrl: null // Will be filled later
        });
      }
    });
  });
  
  logVerbose(`Extracted ${roms.length} ROMs from page`);
  return roms;
}

/**
 * Check if platform page has alphabetical navigation
 */
function hasAlphabeticalNavigation($) {
  // Look for A-Z navigation links
  const alphaLinks = $('a[href*="/vault/"][href*="/"]').filter((i, elem) => {
    const href = $(elem).attr('href');
    const text = $(elem).text().trim();
    // Check if it's a single letter link
    return text.length === 1 && /^[A-Z]$/.test(text) && href.includes('/vault/');
  });
  
  return alphaLinks.length > 0;
}

/**
 * Get alphabetical navigation links
 */
function getAlphabeticalLinks($, baseUrl) {
  const links = [];
  $('a[href*="/vault/"]').each((i, elem) => {
    const $link = $(elem);
    const href = $link.attr('href');
    const text = $link.text().trim();
    
    // Check if it's a single letter (A-Z)
    if (text.length === 1 && /^[A-Z]$/.test(text)) {
      const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
      if (fullUrl.startsWith(baseUrl)) {
        links.push({ letter: text, url: fullUrl });
      }
    }
  });
  
  return links;
}

/**
 * Get pagination links from a page
 */
function getPaginationLinks($, currentUrl) {
  const links = [];
  const seen = new Set();
  const urlObj = new URL(currentUrl);
  const basePath = urlObj.pathname;
  
  // Look for pagination links with ?p= parameter
  $('a[href*="?p="], a[href*="&p="]').each((i, elem) => {
    const $link = $(elem);
    const href = $link.attr('href');
    
    if (href) {
      let fullUrl;
      if (href.startsWith('http')) {
        fullUrl = href;
      } else if (href.startsWith('/')) {
        fullUrl = `${BASE_URL}${href}`;
      } else {
        fullUrl = `${BASE_URL}${basePath}${href.startsWith('?') ? '' : '/'}${href}`;
      }
      
      try {
        const linkUrlObj = new URL(fullUrl);
        // Check if it's the same base path and has a p parameter
        if (linkUrlObj.pathname === basePath && linkUrlObj.searchParams.has('p')) {
          if (!seen.has(fullUrl)) {
            seen.add(fullUrl);
            links.push(fullUrl);
          }
        }
      } catch (e) {
        // Invalid URL, skip
      }
    }
  });
  
  // Also look for "Next" or numbered pagination links
  $('a').each((i, elem) => {
    const $link = $(elem);
    const href = $link.attr('href');
    const text = $link.text().trim().toLowerCase();
    
    // Look for "next", ">", or page numbers
    if (href && (text === 'next' || text === '>' || /^\d+$/.test(text))) {
      let fullUrl;
      if (href.startsWith('http')) {
        fullUrl = href;
      } else if (href.startsWith('/')) {
        fullUrl = `${BASE_URL}${href}`;
      } else {
        fullUrl = `${BASE_URL}${basePath}${href.startsWith('?') ? '' : '/'}${href}`;
      }
      
      try {
        const linkUrlObj = new URL(fullUrl);
        // Check if it's the same base path
        if (linkUrlObj.pathname === basePath) {
          if (!seen.has(fullUrl)) {
            seen.add(fullUrl);
            links.push(fullUrl);
          }
        }
      } catch (e) {
        // Invalid URL, skip
      }
    }
  });
  
  // Sort links by page number if they have ?p= parameter
  links.sort((a, b) => {
    try {
      const aUrl = new URL(a);
      const bUrl = new URL(b);
      const aPage = parseInt(aUrl.searchParams.get('p') || '1', 10);
      const bPage = parseInt(bUrl.searchParams.get('p') || '1', 10);
      return aPage - bPage;
    } catch (e) {
      return 0;
    }
  });
  
  return [...new Set(links)];
}

/**
 * Scrape a single platform
 */
async function scrapePlatform(platform) {
  log(`\nScraping platform: ${platform.name} (${platform.slug})`);
  
  try {
    // Fetch main platform page
    const html = await fetchWithRetry(platform.url);
    const $ = load(html);
    
    // Extract expected count from status
    const expectedCount = extractExpectedCount($);
    
    // Extract Top 10 sections
    const top10 = extractTop10($, platform.url);
    
    // Check for alphabetical navigation
    let allROMs = [];
    const hasAlphaNav = hasAlphabeticalNavigation($);
    
    // Always check main page for ROMs first (some platforms list ROMs on main page)
    const mainPageROMs = extractROMs($, platform.url);
    if (mainPageROMs.length > 0) {
      logVerbose(`Found ${mainPageROMs.length} ROMs on main platform page`);
      // Extract download links for main page ROMs
      logVerbose(`  Extracting download links for ${mainPageROMs.length} ROMs from main page...`);
      for (let romIdx = 0; romIdx < mainPageROMs.length; romIdx++) {
        const rom = mainPageROMs[romIdx];
        if (rom.pageUrl && !rom.downloadUrl) {
          await sleep(DELAY_MS);
          rom.downloadUrl = await extractDownloadLink(rom.pageUrl);
        }
      }
      allROMs = allROMs.concat(mainPageROMs);
    }
    
    if (hasAlphaNav) {
      logVerbose(`Platform has alphabetical navigation, scraping A-Z pages...`);
      const alphaLinks = getAlphabeticalLinks($, platform.url);
      
      if (alphaLinks.length > 0) {
        logVerbose(`Found ${alphaLinks.length} letter pages`);
        for (const alphaLink of alphaLinks) {
          logVerbose(`  Scraping letter: ${alphaLink.letter}`);
          await sleep(DELAY_MS);
          
          try {
            // Get first page
            const alphaHtml = await fetchWithRetry(alphaLink.url);
            const $alpha = load(alphaHtml);
            let roms = extractROMs($alpha, alphaLink.url);
            allROMs = allROMs.concat(roms);
            logVerbose(`    Found ${roms.length} ROMs on first page`);
            
            // Check for pagination
            const paginationLinks = getPaginationLinks($alpha, alphaLink.url);
            if (paginationLinks.length > 1) {
              logVerbose(`    Found ${paginationLinks.length} pages for letter ${alphaLink.letter}`);
              // Skip first page (already scraped)
              for (let pageIdx = 1; pageIdx < paginationLinks.length; pageIdx++) {
                await sleep(DELAY_MS);
                try {
                  const pageHtml = await fetchWithRetry(paginationLinks[pageIdx]);
                  const $page = load(pageHtml);
                  const pageRoms = extractROMs($page, paginationLinks[pageIdx]);
                  allROMs = allROMs.concat(pageRoms);
                  logVerbose(`      Page ${pageIdx + 1}: Found ${pageRoms.length} ROMs`);
                } catch (error) {
                  logError(`      Failed to scrape page ${pageIdx + 1} of letter ${alphaLink.letter}: ${error.message}`);
                }
              }
            }
            
            // Note: Download links will be extracted after all ROMs are collected
          } catch (error) {
            logError(`    Failed to scrape letter ${alphaLink.letter}: ${error.message}`);
          }
        }
      } else {
        // Fallback to main page
        logVerbose(`No letter links found, scraping main page`);
        allROMs = extractROMs($, platform.url);
        // Extract download links
        logVerbose(`  Extracting download links for ${allROMs.length} ROMs...`);
        for (let romIdx = 0; romIdx < allROMs.length; romIdx++) {
          const rom = allROMs[romIdx];
          if (rom.pageUrl && !rom.downloadUrl) {
            await sleep(DELAY_MS);
            rom.downloadUrl = await extractDownloadLink(rom.pageUrl);
            if (romIdx % 10 === 0 && romIdx > 0) {
              logVerbose(`    Processed ${romIdx}/${allROMs.length} download links...`);
            }
          }
        }
      }
    } else {
      // No alphabetical navigation, scrape main page
      logVerbose(`No alphabetical navigation, scraping main page`);
      allROMs = extractROMs($, platform.url);
      // Extract download links
      logVerbose(`  Extracting download links for ${allROMs.length} ROMs...`);
      for (let romIdx = 0; romIdx < allROMs.length; romIdx++) {
        const rom = allROMs[romIdx];
        if (rom.pageUrl && !rom.downloadUrl) {
          await sleep(DELAY_MS);
          rom.downloadUrl = await extractDownloadLink(rom.pageUrl);
          if (romIdx % 10 === 0 && romIdx > 0) {
            logVerbose(`    Processed ${romIdx}/${allROMs.length} download links...`);
          }
        }
      }
    }
    
    // Extract download links for all ROMs (batch process)
    if (allROMs.length > 0) {
      log(`  Extracting download links for ${allROMs.length} ROMs...`);
      for (let romIdx = 0; romIdx < allROMs.length; romIdx++) {
        const rom = allROMs[romIdx];
        if (rom.pageUrl && !rom.downloadUrl) {
          await sleep(DELAY_MS);
          rom.downloadUrl = await extractDownloadLink(rom.pageUrl);
          if ((romIdx + 1) % 10 === 0 || romIdx === allROMs.length - 1) {
            log(`    Processed ${romIdx + 1}/${allROMs.length} download links...`);
          }
        }
      }
    }
    
    // Create platform data
    const platformData = {
      platform: platform.name,
      romCount: allROMs.length,
      expectedCount: expectedCount || null,
      roms: allROMs,
      top10: top10
    };
    
    // Log count comparison
    if (expectedCount !== null) {
      if (allROMs.length === expectedCount) {
        log(`  ✓ Found all ${allROMs.length} ROMs (matches expected count)`);
      } else {
        log(`  ⚠ Found ${allROMs.length} ROMs, expected ${expectedCount} (missing ${expectedCount - allROMs.length})`);
      }
    }
    
    // Write platform JSON file
    const filename = sanitizeFilename(platform.name) + '.json';
    const filepath = path.join(OUTPUT_DIR, filename);
    
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    fs.writeFileSync(filepath, JSON.stringify(platformData, null, 2), 'utf8');
    log(`  ✓ Saved ${allROMs.length} ROMs to ${filename}`);
    
    // Update progress
    progress.completedPlatforms.push(platform.name);
    progress.data[platform.name] = platformData;
    saveProgress();
    
    // Update index
    const indexEntry = {
      name: platform.name,
      file: `vimm-roms/${filename}`,
      romCount: allROMs.length,
      expectedCount: expectedCount || null,
      hasTop10: top10.monthly.length > 0 || top10.overallRating.length > 0
    };
    
    // Remove existing entry if present
    index.platforms = index.platforms.filter(p => p.name !== platform.name);
    index.platforms.push(indexEntry);
    saveIndex();
    
    return platformData;
  } catch (error) {
    logError(`Failed to scrape platform ${platform.name}: ${error.message}`);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  log('=== Vimm\'s Lair Vault Scraper ===\n');
  
  // Handle --force flag
  if (FORCE) {
    log('Force mode: clearing progress and starting fresh...');
    if (fs.existsSync(PROGRESS_FILE)) {
      fs.unlinkSync(PROGRESS_FILE);
    }
    if (fs.existsSync(OUTPUT_DIR)) {
      fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
    }
    if (fs.existsSync(INDEX_FILE)) {
      fs.unlinkSync(INDEX_FILE);
    }
    progress = {
      lastUpdated: null,
      completedPlatforms: [],
      currentPlatform: null,
      data: {}
    };
    index = {
      version: '1.0',
      lastUpdated: null,
      platforms: []
    };
  } else {
    // Try to load existing progress
    loadProgress();
    loadIndex();
  }
  
  // Extract all platforms
  const platforms = await extractPlatforms();
  
  if (platforms.length === 0) {
    logError('No platforms found. The page structure may have changed.');
    process.exit(1);
  }
  
  // Filter out already completed platforms
  const remainingPlatforms = platforms.filter(p => 
    !progress.completedPlatforms.includes(p.name)
  );
  
  if (remainingPlatforms.length === 0) {
    log('\n✓ All platforms already completed!');
    log(`Total platforms: ${platforms.length}`);
    log(`Output directory: ${OUTPUT_DIR}`);
    log(`Index file: ${INDEX_FILE}`);
    return;
  }
  
  log(`\nPlatforms to scrape: ${remainingPlatforms.length} (${progress.completedPlatforms.length} already completed)`);
  
  // Scrape each platform
  for (let i = 0; i < remainingPlatforms.length; i++) {
    const platform = remainingPlatforms[i];
    progress.currentPlatform = platform.name;
    
    try {
      await scrapePlatform(platform);
      
      // Delay between platforms (except for the last one)
      if (i < remainingPlatforms.length - 1) {
        await sleep(DELAY_MS);
      }
    } catch (error) {
      logError(`Skipping platform ${platform.name} due to error`);
      // Continue with next platform
    }
  }
  
  // Final save
  progress.currentPlatform = null;
  saveProgress();
  saveIndex();
  
  log('\n=== Scraping Complete ===');
  log(`Total platforms: ${platforms.length}`);
  log(`Completed: ${progress.completedPlatforms.length}`);
  log(`Output directory: ${OUTPUT_DIR}`);
  log(`Index file: ${INDEX_FILE}`);
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    logError(`Fatal error: ${error.message}`);
    if (VERBOSE) {
      console.error(error);
    }
    process.exit(1);
  });
}

module.exports = { main };

