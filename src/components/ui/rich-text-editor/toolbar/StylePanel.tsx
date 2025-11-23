import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Palette } from 'lucide-react';
import { Editor } from '@tiptap/react';

interface StylePanelProps {
  editor: Editor;
}

export const StylePanel = ({ editor }: StylePanelProps) => {
  const colorOptions = [
    { name: 'Blue', value: 'blue', class: 'bg-[hsl(217,91%,60%)]' },
    { name: 'Navy', value: 'navy', class: 'bg-[hsl(222,47%,20%)]' },
    { name: 'Purple', value: 'purple', class: 'bg-[hsl(270,91%,65%)]' },
    { name: 'Pink', value: 'pink', class: 'bg-[hsl(330,81%,60%)]' },
    { name: 'Green', value: 'green', class: 'bg-[hsl(142,76%,36%)]' },
    { name: 'Orange', value: 'orange', class: 'bg-[hsl(38,92%,50%)]' },
    { name: 'Red', value: 'red', class: 'bg-[hsl(0,84%,60%)]' },
    { name: 'Teal', value: 'teal', class: 'bg-[hsl(180,77%,47%)]' },
    { name: 'Yellow', value: 'yellow', class: 'bg-[hsl(48,96%,53%)]' },
    { name: 'Indigo', value: 'indigo', class: 'bg-[hsl(243,75%,59%)]' },
    { name: 'Gray', value: 'gray', class: 'bg-[hsl(220,9%,46%)]' },
    { name: 'White', value: 'white', class: 'bg-white border' },
  ];

  const textColorOptions = [
    { name: 'Auto', value: 'auto' },
    { name: 'White', value: 'white' },
    { name: 'Black', value: 'black' },
    { name: 'Gray', value: 'gray' },
  ];

  const calloutVariants = [
    { name: 'Info', value: 'info' },
    { name: 'Success', value: 'success' },
    { name: 'Warning', value: 'warning' },
    { name: 'Quote', value: 'quote' },
  ];

  const updateBlockAttribute = (attribute: string, value: any) => {
    const { state } = editor;
    const { from } = state.selection;
    const node = state.doc.nodeAt(from);
    
    if (node) {
      const blockTypes = [
        'heroBlock', 
        'cardBlock', 
        'calloutBlock', 
        'stepCard', 
        'columnItem', 
        'stepIndicator'
      ];
      
      blockTypes.forEach(blockType => {
        if (node.type.name === blockType) {
          editor.chain().focus()
            .updateAttributes(blockType, { [attribute]: value })
            .run();
        }
      });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" size="sm" variant="ghost" title="Style Options">
          <Palette className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-3 block">Background Color</Label>
            <div className="grid grid-cols-4 gap-2">
              {colorOptions.map((color) => (
                <Button
                  key={color.value}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => updateBlockAttribute('backgroundColor', color.value)}
                  className="h-auto flex-col gap-1 p-2"
                  title={color.name}
                >
                  <div className={`w-8 h-8 rounded ${color.class}`} />
                  <span className="text-xs">{color.name}</span>
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Text Color</Label>
            <div className="grid grid-cols-4 gap-2">
              {textColorOptions.map((color) => (
                <Button
                  key={color.value}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => updateBlockAttribute('textColor', color.value)}
                  className="justify-start"
                >
                  {color.name}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Callout Variant</Label>
            <div className="grid grid-cols-2 gap-2">
              {calloutVariants.map((variant) => (
                <Button
                  key={variant.value}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => updateBlockAttribute('variant', variant.value)}
                  className="justify-start"
                >
                  {variant.name}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Padding</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => updateBlockAttribute('padding', 'small')}
              >
                Small
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => updateBlockAttribute('padding', 'normal')}
              >
                Normal
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => updateBlockAttribute('padding', 'large')}
              >
                Large
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Gradient (Hero/Card)</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => updateBlockAttribute('gradient', true)}
              >
                Enable
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => updateBlockAttribute('gradient', false)}
              >
                Disable
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
