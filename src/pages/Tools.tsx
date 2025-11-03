import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { ToolCard } from "@/components/ToolCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

interface Tool {
  id: string;
  name: string;
  description: string | null;
  price: string | null;
  thumbnail_url: string | null;
  affiliate_link: string;
  category_id: string | null;
  features: any;
}

interface ToolCategory {
  id: string;
  name: string;
  description: string | null;
  order_index: number;
}

const Tools = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["tool-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tool_categories")
        .select("*")
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data as ToolCategory[];
    },
  });

  const { data: tools, isLoading: toolsLoading } = useQuery({
    queryKey: ["tools", selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from("tools")
        .select("*")
        .eq("is_published", true)
        .order("order_index", { ascending: true });

      if (selectedCategory) {
        query = query.eq("category_id", selectedCategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Tool[];
    },
  });

  const isLoading = categoriesLoading || toolsLoading;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Tools Directory</h1>
          <p className="text-muted-foreground">
            Discover powerful tools to enhance your Expansio experience
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs
            defaultValue="all"
            onValueChange={(value) =>
              setSelectedCategory(value === "all" ? null : value)
            }
          >
            <TabsList className="mb-6">
              <TabsTrigger value="all">All Tools</TabsTrigger>
              {categories?.map((category) => (
                <TabsTrigger key={category.id} value={category.id}>
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tools?.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </div>
            </TabsContent>

            {categories?.map((category) => (
              <TabsContent key={category.id} value={category.id} className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tools?.map((tool) => (
                    <ToolCard key={tool.id} tool={tool} />
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}

        {!isLoading && tools?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No tools available in this category yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tools;
