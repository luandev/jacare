#!/usr/bin/env node

/**
 * SEO Files Generator for Jacare Documentation
 * 
 * This script generates:
 * - sitemap.xml: Sitemap for search engines
 * - robots.txt: Robots file for web crawlers
 * 
 * Usage: node generate-seo-files.js
 */

const fs = require('fs');
const path = require('path');

// Load SEO configuration
const configPath = path.join(__dirname, 'seo-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const { site } = config;
const baseUrl = site.url;

// Define all pages to include in sitemap
const pages = [
  { url: '/', priority: '1.0', changefreq: 'weekly' },
  { url: '/README.md', priority: '0.8', changefreq: 'monthly' },
  { url: '/user/README.md', priority: '0.8', changefreq: 'monthly' },
  { url: '/user/retro-handhelds.md', priority: '0.6', changefreq: 'monthly' },
  { url: '/RELEASE.md', priority: '0.5', changefreq: 'monthly' },
];

/**
 * Generate sitemap.xml
 */
function generateSitemap() {
  const now = new Date().toISOString().split('T')[0];
  
  let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
  sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  sitemap += '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';
  
  pages.forEach(page => {
    const fullUrl = `${baseUrl}${page.url}`;
    sitemap += '  <url>\n';
    sitemap += `    <loc>${fullUrl}</loc>\n`;
    sitemap += `    <lastmod>${now}</lastmod>\n`;
    sitemap += `    <changefreq>${page.changefreq}</changefreq>\n`;
    sitemap += `    <priority>${page.priority}</priority>\n`;
    sitemap += '  </url>\n';
  });
  
  sitemap += '</urlset>\n';
  
  const sitemapPath = path.join(__dirname, 'sitemap.xml');
  fs.writeFileSync(sitemapPath, sitemap, 'utf8');
  console.log('✅ Generated sitemap.xml');
}

/**
 * Generate robots.txt
 */
function generateRobotsTxt() {
  let robots = '# Robots.txt for Jacare Documentation\n';
  robots += '# https://www.robotstxt.org/\n\n';
  robots += 'User-agent: *\n';
  robots += 'Allow: /\n\n';
  robots += '# Sitemap\n';
  robots += `Sitemap: ${baseUrl}/sitemap.xml\n`;
  
  const robotsPath = path.join(__dirname, 'robots.txt');
  fs.writeFileSync(robotsPath, robots, 'utf8');
  console.log('✅ Generated robots.txt');
}

/**
 * Main execution
 */
function main() {
  console.log('🔧 Generating SEO files for Jacare Documentation...\n');
  
  try {
    generateSitemap();
    generateRobotsTxt();
    
    console.log('\n✨ All SEO files generated successfully!');
    console.log(`   Base URL: ${baseUrl}`);
    console.log(`   Pages: ${pages.length}`);
  } catch (error) {
    console.error('❌ Error generating SEO files:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { generateSitemap, generateRobotsTxt };
