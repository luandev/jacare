/**
 * Simple Markdown to HTML converter for documentation
 * Converts markdown files to HTML with proper styling
 */

function markdownToHTML(markdown) {
  let html = markdown;

  // Headers
  html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
  html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>");
  html = html.replace(/__(.*?)__/gim, "<strong>$1</strong>");

  // Italic
  html = html.replace(/\*(.*?)\*/gim, "<em>$1</em>");
  html = html.replace(/_(.*?)_/gim, "<em>$1</em>");

  // Code blocks
  html = html.replace(/```([\s\S]*?)```/gim, "<pre><code>$1</code></pre>");
  html = html.replace(/`([^`]+)`/gim, "<code>$1</code>");

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" class="link">$1</a>');

  // Lists
  html = html.replace(/^\* (.*$)/gim, "<li>$1</li>");
  html = html.replace(/^- (.*$)/gim, "<li>$1</li>");
  html = html.replace(/^(\d+)\. (.*$)/gim, "<li>$2</li>");

  // Wrap consecutive list items in ul/ol
  html = html.replace(/(<li>.*<\/li>\n?)+/gim, (match) => {
    const isOrdered = /^\d+\./.test(match);
    const items = match.trim().split(/\n/).filter(Boolean);
    return `<${isOrdered ? "ol" : "ul"} class="list">${items.join("")}</${isOrdered ? "ol" : "ul"}>`;
  });

  // Paragraphs
  html = html.split(/\n\n/).map(para => {
    para = para.trim();
    if (!para || para.startsWith("<")) return para;
    return `<p>${para}</p>`;
  }).join("\n\n");

  // Blockquotes
  html = html.replace(/^> (.*$)/gim, "<blockquote>$1</blockquote>");

  // Horizontal rules
  html = html.replace(/^---$/gim, "<hr>");

  return html;
}

// Export for use in browser
if (typeof module !== "undefined" && module.exports) {
  module.exports = markdownToHTML;
}

