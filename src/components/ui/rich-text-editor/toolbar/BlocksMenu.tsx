import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Blocks, Presentation, Square, MessageSquare, ListOrdered, Columns2 } from 'lucide-react';
import { Editor } from '@tiptap/react';
import { StepIndicatorDialog } from './StepIndicatorDialog';
import { EmbedDialog } from './EmbedDialog';

interface BlocksMenuProps {
  editor: Editor;
}

export const BlocksMenu = ({ editor }: BlocksMenuProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="sm" variant="ghost" title="Insert Block">
          <Blocks className="w-4 h-4 mr-1" />
          Blocks
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem
          onClick={() => editor.chain().focus().setHeroBlock().run()}
        >
          <Presentation className="w-4 h-4 mr-2" />
          Hero Section
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => editor.chain().focus().setCardBlock().run()}
        >
          <Square className="w-4 h-4 mr-2" />
          Card Block
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => editor.chain().focus().setCalloutBlock().run()}
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Callout
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => editor.chain().focus().setStepCard({ stepNumber: 1 }).run()}
        >
          <ListOrdered className="w-4 h-4 mr-2" />
          Step Card
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <StepIndicatorDialog editor={editor} />
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => editor.chain().focus().setColumnLayout({ columns: 2 }).run()}
        >
          <Columns2 className="w-4 h-4 mr-2" />
          2 Columns
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => editor.chain().focus().setColumnLayout({ columns: 3 }).run()}
        >
          <Columns2 className="w-4 h-4 mr-2" />
          3 Columns
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <EmbedDialog editor={editor} />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
