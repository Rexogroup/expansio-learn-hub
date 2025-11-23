import { Node, mergeAttributes } from '@tiptap/core';

export interface StepCardOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    stepCard: {
      setStepCard: (attributes?: { stepNumber?: number }) => ReturnType;
    };
  }
}

export const StepCard = Node.create<StepCardOptions>({
  name: 'stepCard',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      stepNumber: {
        default: 1,
        parseHTML: element => parseInt(element.getAttribute('data-step-number') || '1'),
        renderHTML: attributes => ({
          'data-step-number': attributes.stepNumber.toString(),
        }),
      },
      backgroundColor: {
        default: 'card',
        parseHTML: element => element.getAttribute('data-bg-color'),
        renderHTML: attributes => ({
          'data-bg-color': attributes.backgroundColor,
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
    return [{ tag: 'div[data-type="step"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'step',
        class: 'step-card',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setStepCard:
        attributes =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
            content: [
              {
                type: 'heading',
                attrs: { level: 3 },
                content: [{ type: 'text', text: 'Step Title' }],
              },
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Step description goes here...' }],
              },
            ],
          });
        },
    };
  },
});
