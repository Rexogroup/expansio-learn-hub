import { Node, mergeAttributes } from '@tiptap/core';

export interface CalloutBlockOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    calloutBlock: {
      setCalloutBlock: (attributes?: { variant?: string }) => ReturnType;
    };
  }
}

export const CalloutBlock = Node.create<CalloutBlockOptions>({
  name: 'calloutBlock',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: 'info',
        parseHTML: element => element.getAttribute('data-variant'),
        renderHTML: attributes => ({
          'data-variant': attributes.variant,
        }),
      },
      backgroundColor: {
        default: null,
        parseHTML: element => element.getAttribute('data-bg-color'),
        renderHTML: attributes => {
          if (attributes.backgroundColor) {
            return { 'data-bg-color': attributes.backgroundColor };
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
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'callout',
        class: 'callout-block',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setCalloutBlock:
        attributes =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: '💡 Important information or quote goes here' }],
              },
            ],
          });
        },
    };
  },
});
