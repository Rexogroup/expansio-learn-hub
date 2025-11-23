import { Node, mergeAttributes } from '@tiptap/core';

export interface HeroBlockOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    heroBlock: {
      setHeroBlock: (attributes?: { backgroundColor?: string; backgroundImage?: string; gradient?: boolean }) => ReturnType;
    };
  }
}

export const HeroBlock = Node.create<HeroBlockOptions>({
  name: 'heroBlock',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      backgroundColor: {
        default: 'blue',
        parseHTML: element => element.getAttribute('data-bg-color'),
        renderHTML: attributes => ({
          'data-bg-color': attributes.backgroundColor,
        }),
      },
      backgroundImage: {
        default: null,
        parseHTML: element => element.getAttribute('data-bg-image'),
        renderHTML: attributes => {
          if (attributes.backgroundImage) {
            return { 'data-bg-image': attributes.backgroundImage };
          }
          return {};
        },
      },
      gradient: {
        default: false,
        parseHTML: element => element.getAttribute('data-gradient') === 'true',
        renderHTML: attributes => ({
          'data-gradient': attributes.gradient.toString(),
        }),
      },
      textColor: {
        default: 'auto',
        parseHTML: element => element.getAttribute('data-text-color'),
        renderHTML: attributes => {
          if (attributes.textColor && attributes.textColor !== 'auto') {
            return { 'data-text-color': attributes.textColor };
          }
          return {};
        },
      },
      opacity: {
        default: 100,
        parseHTML: element => parseInt(element.getAttribute('data-opacity') || '100'),
        renderHTML: attributes => {
          if (attributes.opacity !== 100) {
            return { 'data-opacity': attributes.opacity.toString() };
          }
          return {};
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="hero"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'hero',
        class: 'hero-block',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setHeroBlock:
        attributes =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
            content: [
              {
                type: 'heading',
                attrs: { level: 1 },
                content: [{ type: 'text', text: 'Hero Title' }],
              },
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Subtitle or description goes here' }],
              },
            ],
          });
        },
    };
  },
});
