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
        default: 'accent',
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
