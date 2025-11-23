import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * Allows safe HTML tags and attributes commonly used in rich text content
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'strong', 'em', 'u', 's', 'code', 'pre',
      'ul', 'ol', 'li',
      'blockquote',
      'a', 'img',
      'br', 'hr',
      'span', 'div',
      'table', 'thead', 'tbody', 'tr', 'th', 'td'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title',
      'class', 'style',
      'target', 'rel',
      'data-type', 'data-bg-color', 'data-bg-image', 'data-gradient',
      'data-padding', 'data-variant', 'data-step-number', 'data-columns'
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    ADD_ATTR: ['target'],
    KEEP_CONTENT: true,
    RETURN_TRUSTED_TYPE: false
  });
}
