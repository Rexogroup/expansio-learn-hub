import { Node, mergeAttributes } from '@tiptap/core';

export interface EmbedBlockOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    embedBlock: {
      setEmbed: (attributes: {
        url: string;
        embedType?: string;
        aspectRatio?: string;
        title?: string;
        allowFullscreen?: boolean;
      }) => ReturnType;
    };
  }
}

export const EmbedBlock = Node.create<EmbedBlockOptions>({
  name: 'embedBlock',
  group: 'block',
  atom: true,
  
  addAttributes() {
    return {
      url: {
        default: null,
        parseHTML: element => element.getAttribute('data-url'),
        renderHTML: attributes => ({ 'data-url': attributes.url }),
      },
      embedType: {
        default: 'generic',
        parseHTML: element => element.getAttribute('data-embed-type'),
        renderHTML: attributes => ({ 'data-embed-type': attributes.embedType }),
      },
      aspectRatio: {
        default: '16:9',
        parseHTML: element => element.getAttribute('data-aspect-ratio'),
        renderHTML: attributes => ({ 'data-aspect-ratio': attributes.aspectRatio }),
      },
      title: {
        default: '',
        parseHTML: element => element.getAttribute('data-title'),
        renderHTML: attributes => ({ 'data-title': attributes.title }),
      },
      allowFullscreen: {
        default: true,
        parseHTML: element => element.getAttribute('data-fullscreen') === 'true',
        renderHTML: attributes => ({ 'data-fullscreen': attributes.allowFullscreen.toString() }),
      },
    };
  },
  
  parseHTML() {
    return [{ tag: 'div[data-type="embed"]' }];
  },
  
  renderHTML({ HTMLAttributes }) {
    const { url, aspectRatio, title, allowFullscreen } = HTMLAttributes;
    
    const embedContainer = [
      'div',
      { class: `embed-container aspect-${aspectRatio.replace(':', '\\:')}` },
      [
        'iframe',
        {
          src: url,
          title: title || 'Embedded content',
          frameborder: '0',
          allowfullscreen: allowFullscreen ? 'true' : 'false',
          sandbox: 'allow-scripts allow-same-origin allow-presentation allow-forms',
          loading: 'lazy',
        },
      ],
    ];

    const children: any[] = [embedContainer];
    
    if (title) {
      children.push([
        'div',
        { class: 'embed-caption' },
        title
      ]);
    }
    
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'embed',
        class: 'embed-block',
      }),
      ...children
    ];
  },
  
  addCommands() {
    return {
      setEmbed:
        (attributes) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          });
        },
    };
  },
});
