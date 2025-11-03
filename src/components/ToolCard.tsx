import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

interface Tool {
  id: string;
  name: string;
  description: string | null;
  price: string | null;
  thumbnail_url: string | null;
  affiliate_link: string;
  features: any;
}

interface ToolCardProps {
  tool: Tool;
}

export const ToolCard = ({ tool }: ToolCardProps) => {
  const handleVisitTool = () => {
    window.open(tool.affiliate_link, "_blank", "noopener,noreferrer");
  };

  return (
    <Card className="flex flex-col h-full hover:shadow-lg transition-shadow">
      <CardHeader className="pb-4">
        {tool.thumbnail_url && (
          <div className="aspect-video w-full mb-4 rounded-md overflow-hidden bg-muted">
            <img
              src={tool.thumbnail_url}
              alt={tool.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="flex items-start justify-between">
          <CardTitle className="text-xl">{tool.name}</CardTitle>
          {tool.price && (
            <Badge variant="secondary" className="ml-2 shrink-0">
              {tool.price}
            </Badge>
          )}
        </div>
        {tool.description && (
          <CardDescription className="mt-2 line-clamp-3">
            {tool.description}
          </CardDescription>
        )}
      </CardHeader>

      {tool.features && Array.isArray(tool.features) && tool.features.length > 0 && (
        <CardContent className="flex-grow">
          <div className="space-y-1">
            <p className="text-sm font-medium mb-2">Key Features:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {tool.features.slice(0, 4).map((feature: string, index: number) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      )}

      <CardFooter className="pt-4">
        <Button onClick={handleVisitTool} className="w-full" variant="default">
          Visit Tool
          <ExternalLink className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};
