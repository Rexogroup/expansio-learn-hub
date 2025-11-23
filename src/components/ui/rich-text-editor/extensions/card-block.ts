import { Node, mergeAttributes } from '@tiptap/core';

export interface CardBlockOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    cardBlock: {
      setCardBlock: (attributes?: { backgroundColor?: string; padding?: string }) => ReturnType;
    };
  }
}

export const CardBlock = Node.create<CardBlockOptions>({
  name: 'cardBlock',
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
      padding: {
        default: 'normal',
        parseHTML: element => element.getAttribute('data-padding'),
        renderHTML: attributes => ({
          'data-padding': attributes.padding,
        }),
      },
      badgeNumber: {
        default: null,
        parseHTML: element => element.getAttribute('data-badge-number'),
        renderHTML: attributes => {
          if (attributes.badgeNumber) {
            return {
              'data-badge-number': attributes.badgeNumber,
            };
          }
          return {};
        },
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
      borderColor: {
        default: null,
        parseHTML: element => element.getAttribute('data-border-color'),
        renderHTML: attributes => {
          if (attributes.borderColor) {
            return { 'data-border-color': attributes.borderColor };
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
    return [{ tag: 'div[data-type="card"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'card',
        class: 'card-block',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setCardBlock:
        attributes =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Card content goes here...' }],
              },
            ],
          });
        },
    };
  },
});
