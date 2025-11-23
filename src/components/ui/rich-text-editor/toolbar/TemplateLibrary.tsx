import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { FileText, Presentation, BookOpen, Lightbulb, Layers } from 'lucide-react';
import { Editor } from '@tiptap/react';
import { templates, Template } from '../templates/template-definitions';
import { useState } from 'react';

interface TemplateLibraryProps {
  editor: Editor;
}

export const TemplateLibrary = ({ editor }: TemplateLibraryProps) => {
  const [open, setOpen] = useState(false);

  const insertTemplate = (template: Template) => {
    editor.commands.setContent(template.content);
    setOpen(false);
  };

  const getCategoryIcon = (category: Template['category']) => {
    switch (category) {
      case 'presentation':
        return <Presentation className="w-4 h-4" />;
      case 'content':
        return <FileText className="w-4 h-4" />;
      case 'process':
        return <Layers className="w-4 h-4" />;
      case 'philosophy':
        return <Lightbulb className="w-4 h-4" />;
    }
  };

  const categories = [
    { value: 'all', label: 'All Templates', icon: BookOpen },
    { value: 'presentation', label: 'Presentations', icon: Presentation },
    { value: 'process', label: 'Processes', icon: Layers },
    { value: 'philosophy', label: 'Philosophy', icon: Lightbulb },
    { value: 'content', label: 'Content', icon: FileText },
  ];

  const getFilteredTemplates = (category: string) => {
    if (category === 'all') return templates;
    return templates.filter(t => t.category === category);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="ghost" title="Template Library">
          <FileText className="w-4 h-4 mr-1" />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Template Library</DialogTitle>
          <DialogDescription>
            Choose a pre-built template to get started quickly
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <TabsTrigger key={cat.value} value={cat.value} className="text-xs">
                  <Icon className="w-3 h-3 mr-1" />
                  {cat.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {categories.map((cat) => (
            <TabsContent key={cat.value} value={cat.value} className="mt-4">
              <ScrollArea className="h-[400px] pr-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getFilteredTemplates(cat.value).map((template) => (
                    <div
                      key={template.id}
                      className="border border-border rounded-lg p-4 hover:border-primary/50 transition-all hover:shadow-md cursor-pointer group"
                      onClick={() => insertTemplate(template)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(template.category)}
                          <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                            {template.name}
                          </h3>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {template.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        {template.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            insertTemplate(template);
                          }}
                        >
                          Use Template
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
