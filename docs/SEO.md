# SEO Documentation for Jacare GitHub Pages

This document explains how the SEO system works for the Jacare documentation site and how to maintain it.

## Overview

The Jacare documentation site includes comprehensive SEO features to improve discoverability and organic traffic:

- **Meta tags**: Title, description, keywords, canonical URLs
- **Social previews**: Open Graph and Twitter Card tags
- **Structured data**: JSON-LD schemas for search engines
- **Sitemap**: XML sitemap for better indexing
- **Robots.txt**: Web crawler instructions

## File Structure

```
docs/
├── index.html              # Main page with SEO meta tags
├── seo-config.json         # Centralized SEO configuration
├── generate-seo-files.js   # Script to generate sitemap & robots.txt
├── sitemap.xml            # Generated sitemap (auto-generated)
├── robots.txt             # Generated robots file (auto-generated)
└── SEO.md                 # This documentation file
```

## Configuration

All SEO settings are centralized in `seo-config.json`:

```json
{
  "site": {
    "name": "Jacare",
    "title": "Jacare | Retro ROM Library Manager",
    "description": "...",
    "url": "https://luandev.github.io/jacare",
    "image": "https://luandev.github.io/jacare/demo.gif",
    "keywords": "..."
  },
  "organization": { ... },
  "pages": { ... }
}
```

### Updating Site-Wide Settings

Edit `seo-config.json` to change:
- Site title and description
- Base URL
- Social media handles
- Organization information
- Default keywords

### Adding New Pages

To add a new page to the sitemap:

1. Edit `docs/generate-seo-files.js`
2. Add the page to the `pages` array:
   ```javascript
   { url: '/your-page.md', priority: '0.6', changefreq: 'monthly' }
   ```
3. Run `npm run docs:seo` to regenerate sitemap and robots.txt

## Meta Tags Included

### Basic SEO
- `<title>`: Unique title per page
- `<meta name="description">`: Page description
- `<meta name="keywords">`: Relevant keywords
- `<link rel="canonical">`: Canonical URL
- `<meta name="robots">`: Indexing instructions

### Open Graph (Facebook, LinkedIn)
- `og:type`, `og:url`, `og:title`, `og:description`
- `og:image`: Social preview image
- `og:site_name`, `og:locale`

### Twitter Cards
- `twitter:card`: Large image card
- `twitter:title`, `twitter:description`, `twitter:image`
- `twitter:creator`, `twitter:site`

### Additional Tags
- Theme color for mobile browsers
- Apple mobile web app tags
- Preconnect hints for performance

## JSON-LD Structured Data

The site includes multiple schema.org types:

### WebSite Schema
Defines the website with:
- Name, description, URL
- Search action capability
- Publisher information

### Organization Schema
Describes the Jacare project:
- Name, logo, description
- Social media links (sameAs)
- Founding date

### WebPage Schema
Current page metadata:
- Title, description, URL
- Part of the website
- About the organization

### BreadcrumbList Schema
Navigation breadcrumbs for SEO:
- Shows page hierarchy
- Helps search engines understand structure

### SoftwareApplication Schema
Describes Jacare as software:
- Application category
- Operating systems
- Features list
- Download URL
- License information
- Screenshots

## Generating SEO Files

To regenerate sitemap.xml and robots.txt:

```bash
npm run docs:seo
```

This script:
1. Reads configuration from `seo-config.json`
2. Generates `sitemap.xml` with all pages
3. Generates `robots.txt` with sitemap reference
4. Uses current date for lastmod timestamps

## Testing and Validation

### 1. Meta Tags
Use browser DevTools to inspect the `<head>` section:
```html
<!-- Check for these tags -->
<title>...</title>
<meta name="description" content="..." />
<link rel="canonical" href="..." />
```

### 2. Open Graph Preview
Test social previews:
- **Facebook**: [Sharing Debugger](https://developers.facebook.com/tools/debug/)
- **Twitter**: [Card Validator](https://cards-dev.twitter.com/validator)
- **LinkedIn**: [Post Inspector](https://www.linkedin.com/post-inspector/)

### 3. JSON-LD Validation
Validate structured data:
- **Google**: [Rich Results Test](https://search.google.com/test/rich-results)
- **Schema.org**: [Validator](https://validator.schema.org/)

### 4. Sitemap & Robots
Check accessibility:
- Visit `https://luandev.github.io/jacare/sitemap.xml`
- Visit `https://luandev.github.io/jacare/robots.txt`
- Use [XML Sitemap Validator](https://www.xml-sitemaps.com/validate-xml-sitemap.html)

### 5. Lighthouse SEO
Run Lighthouse audit in Chrome DevTools:
```
Target score: 90+ for SEO
```

Check for:
- Valid meta tags
- Proper heading structure
- Image alt attributes
- Mobile-friendly design

## Best Practices

### 1. Keep Descriptions Unique
Each page should have a unique description (155-160 characters recommended).

### 2. Use Descriptive Titles
Format: `Page Name | Site Name` (60 characters or less)

### 3. Update Sitemap Regularly
Run `npm run docs:seo` when adding new pages or changing URLs.

### 4. Optimize Images
- Use descriptive filenames
- Add alt text
- Consider WebP format
- Keep file sizes reasonable

### 5. Monitor Performance
- Check Google Search Console for indexing status
- Monitor for crawl errors
- Review search performance metrics

### 6. Keep Keywords Relevant
Focus on:
- ROM manager, retro gaming, emulator
- Game library, ROM collection
- Open source, desktop app
- Game metadata, emulation

## Canonical URLs

All canonical URLs use the production GitHub Pages domain:
```
https://luandev.github.io/jacare/
```

This ensures search engines index the correct URL and prevents duplicate content issues.

## Robots Meta Tags

Current settings:
- `index, follow`: Allow indexing and following links
- `max-image-preview:large`: Allow large image previews
- `max-snippet:-1`: No snippet length limit
- `max-video-preview:-1`: No video preview limit

To prevent indexing a specific page, add:
```html
<meta name="robots" content="noindex, nofollow" />
```

## Maintenance Schedule

### Weekly
- Check for broken links
- Monitor search console for errors

### Monthly
- Review and update keywords
- Check Lighthouse scores
- Update lastmod dates in sitemap

### Quarterly
- Review and update meta descriptions
- Analyze search performance
- Update structured data if needed

### After Major Updates
- Regenerate sitemap: `npm run docs:seo`
- Test all meta tags
- Validate JSON-LD
- Submit sitemap to search engines

## Submitting to Search Engines

### Google
1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add property: `https://luandev.github.io/jacare/`
3. Submit sitemap: `https://luandev.github.io/jacare/sitemap.xml`

### Bing
1. Go to [Bing Webmaster Tools](https://www.bing.com/webmasters)
2. Add site: `https://luandev.github.io/jacare/`
3. Submit sitemap: `https://luandev.github.io/jacare/sitemap.xml`

## Troubleshooting

### Meta tags not showing up
- Clear browser cache
- Check HTML syntax
- Verify file is deployed to GitHub Pages

### Social previews not working
- Verify image URLs are absolute
- Check image dimensions (recommended: 1200x630)
- Clear Facebook/Twitter cache using debugger tools

### Sitemap not accessible
- Ensure `sitemap.xml` is in the docs root directory
- Check GitHub Pages deployment logs
- Verify no .gitignore excludes .xml files

### JSON-LD errors
- Validate with Google Rich Results Test
- Check for syntax errors in JSON
- Verify all required fields are present
- Ensure URLs use https://

## Additional Resources

- [Google SEO Starter Guide](https://developers.google.com/search/docs/beginner/seo-starter-guide)
- [Schema.org Documentation](https://schema.org/)
- [Open Graph Protocol](https://ogp.me/)
- [Twitter Cards Documentation](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)

## Support

For questions or issues with SEO:
1. Check this documentation
2. Review the [GitHub Issues](https://github.com/luandev/jacare/issues)
3. Open a new issue with the `documentation` label
