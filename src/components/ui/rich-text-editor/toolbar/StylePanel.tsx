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
    { name: 'Gamma Blue', value: 'accent' },
    { name: 'Dark Blue', value: 'primary' },
    { name: 'Navy', value: 'secondary' },
    { name: 'Light', value: 'muted' },
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
      if (node.type.name === 'heroBlock') {
        editor.chain().focus().updateAttributes('heroBlock', { [attribute]: value }).run();
      } else if (node.type.name === 'cardBlock') {
        editor.chain().focus().updateAttributes('cardBlock', { [attribute]: value }).run();
      } else if (node.type.name === 'calloutBlock') {
        editor.chain().focus().updateAttributes('calloutBlock', { [attribute]: value }).run();
      }
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" size="sm" variant="ghost" title="Style Options">
          <Palette className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Background Color</Label>
            <div className="grid grid-cols-2 gap-2">
              {colorOptions.map((color) => (
                <Button
                  key={color.value}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => updateBlockAttribute('backgroundColor', color.value)}
                  className="justify-start"
                >
                  <div className={`w-4 h-4 rounded mr-2 bg-${color.value}`} />
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
            <div className="grid grid-cols-2 gap-2">
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
        </div>
      </PopoverContent>
    </Popover>
  );
};
