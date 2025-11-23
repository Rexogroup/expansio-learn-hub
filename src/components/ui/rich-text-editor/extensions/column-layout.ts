import { Node, mergeAttributes } from '@tiptap/core';

export interface ColumnLayoutOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    columnLayout: {
      setColumnLayout: (attributes?: { columns?: number }) => ReturnType;
    };
  }
}

export const ColumnLayout = Node.create<ColumnLayoutOptions>({
  name: 'columnLayout',
  group: 'block',
  content: 'columnItem+',
  defining: true,

  addAttributes() {
    return {
      columns: {
        default: 2,
        parseHTML: element => parseInt(element.getAttribute('data-columns') || '2'),
        renderHTML: attributes => ({
          'data-columns': attributes.columns.toString(),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="column-layout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'column-layout',
        class: 'column-layout',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setColumnLayout:
        attributes =>
        ({ commands }) => {
          const columns = attributes?.columns || 2;
          const columnItems = [];
          
          for (let i = 0; i < columns; i++) {
            columnItems.push({
              type: 'columnItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: `Column ${i + 1} content` }],
                },
              ],
            });
          }

          return commands.insertContent({
            type: this.name,
            attrs: attributes,
            content: columnItems,
          });
        },
    };
  },
});

export const ColumnItem = Node.create({
  name: 'columnItem',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
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
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="column-item"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'column-item',
        class: 'column-item',
      }),
      0,
    ];
  },
});
