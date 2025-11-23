import { Node, mergeAttributes } from '@tiptap/core';

export interface StepIndicatorOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    stepIndicator: {
      setStepIndicator: (attributes?: { stepCount?: number; activeStep?: number; labels?: string[] }) => ReturnType;
    };
  }
}

export const StepIndicator = Node.create<StepIndicatorOptions>({
  name: 'stepIndicator',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      stepCount: {
        default: 4,
        parseHTML: element => parseInt(element.getAttribute('data-step-count') || '4'),
        renderHTML: attributes => ({
          'data-step-count': attributes.stepCount.toString(),
        }),
      },
      activeStep: {
        default: 1,
        parseHTML: element => parseInt(element.getAttribute('data-active-step') || '1'),
        renderHTML: attributes => ({
          'data-active-step': attributes.activeStep.toString(),
        }),
      },
      labels: {
        default: [],
        parseHTML: element => {
          try {
            return JSON.parse(element.getAttribute('data-labels') || '[]');
          } catch {
            return [];
          }
        },
        renderHTML: attributes => ({
          'data-labels': JSON.stringify(attributes.labels || []),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="step-indicator"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const stepCount = parseInt(HTMLAttributes['data-step-count'] || '4');
    const activeStep = parseInt(HTMLAttributes['data-active-step'] || '1');
    const labels = (() => {
      try {
        return JSON.parse(HTMLAttributes['data-labels'] || '[]');
      } catch {
        return [];
      }
    })();

    const steps = [];
    for (let i = 1; i <= stepCount; i++) {
      const stepChildren = [
        ['div', { class: 'step-number' }, i.toString()]
      ];
      
      if (labels[i - 1]) {
        stepChildren.push(['div', { class: 'step-label' }, labels[i - 1]]);
      }

      steps.push([
        'div',
        {
          class: `step-indicator-item ${i <= activeStep ? 'active' : 'inactive'}`,
          'data-step': i.toString(),
        },
        ...stepChildren
      ]);
    }

    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'step-indicator',
        class: 'step-indicator-container',
      }),
      ...steps
    ];
  },

  addCommands() {
    return {
      setStepIndicator:
        (attributes) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes || { stepCount: 4, activeStep: 1, labels: [] },
          });
        },
    };
  },
});
