const TRUSTED_DOMAINS = [
  'youtube.com',
  'youtu.be',
  'vimeo.com',
  'docs.google.com',
  'drive.google.com',
  'sheets.google.com',
  'slides.google.com',
  'forms.google.com',
  'typeform.com',
  'loom.com',
  'figma.com',
  'miro.com',
  'airtable.com',
  'gamma.app',
  'codepen.io',
  'jsfiddle.net',
  'codesandbox.io',
];

export interface EmbedValidationResult {
  valid: boolean;
  type: string;
  error?: string;
}

export function validateEmbedUrl(url: string): EmbedValidationResult {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '');
    
    // Check if domain is trusted
    const isTrusted = TRUSTED_DOMAINS.some(domain => hostname.includes(domain));
    
    if (!isTrusted) {
      return {
        valid: false,
        type: 'unknown',
        error: 'This domain is not in the trusted list. Only verified platforms are allowed.',
      };
    }
    
    // Determine embed type
    let type = 'generic';
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      type = 'youtube';
    } else if (hostname.includes('vimeo.com')) {
      type = 'vimeo';
    } else if (hostname.includes('docs.google.com')) {
      type = 'google-docs';
    } else if (hostname.includes('sheets.google.com')) {
      type = 'google-sheets';
    } else if (hostname.includes('slides.google.com')) {
      type = 'google-slides';
    } else if (hostname.includes('forms.google.com')) {
      type = 'google-forms';
    } else if (hostname.includes('typeform.com')) {
      type = 'typeform';
    } else if (hostname.includes('loom.com')) {
      type = 'loom';
    } else if (hostname.includes('figma.com')) {
      type = 'figma';
    } else if (hostname.includes('miro.com')) {
      type = 'miro';
    } else if (hostname.includes('airtable.com')) {
      type = 'airtable';
    } else if (hostname.includes('gamma.app')) {
      type = 'gamma';
    }
    
    return { valid: true, type };
  } catch (error) {
    return {
      valid: false,
      type: 'unknown',
      error: 'Invalid URL format',
    };
  }
}

export function transformEmbedUrl(url: string, type: string): string {
  try {
    const urlObj = new URL(url);
    
    switch (type) {
      case 'youtube': {
        // Convert youtube.com/watch?v=xxx to youtube.com/embed/xxx
        const videoId = urlObj.searchParams.get('v') || urlObj.pathname.split('/').pop();
        if (videoId) {
          return `https://www.youtube.com/embed/${videoId}`;
        }
        break;
      }
      case 'vimeo': {
        // Convert vimeo.com/xxx to player.vimeo.com/video/xxx
        const videoId = urlObj.pathname.split('/').filter(Boolean)[0];
        if (videoId) {
          return `https://player.vimeo.com/video/${videoId}`;
        }
        break;
      }
      case 'google-docs':
      case 'google-sheets':
      case 'google-slides': {
        // Ensure /preview or /embed is at the end
        if (!url.includes('/preview') && !url.includes('/embed')) {
          return url.replace(/\/(edit|view).*$/, '/preview');
        }
        break;
      }
      case 'loom': {
        // Convert loom.com/share/xxx to loom.com/embed/xxx
        return url.replace('/share/', '/embed/');
      }
    }
    
    return url;
  } catch (error) {
    return url;
  }
}
