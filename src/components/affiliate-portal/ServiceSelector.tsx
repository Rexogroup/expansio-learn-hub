import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { 
  Target, Mail, Calendar, TrendingUp, Megaphone, Code, 
  Palette, Video, FileText, Database, Settings, Briefcase 
} from "lucide-react";

interface ServiceCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
}

interface ServiceSelectorProps {
  selectedServices: string[];
  onServicesChange: (services: string[]) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  Target: <Target className="w-4 h-4" />,
  Mail: <Mail className="w-4 h-4" />,
  Calendar: <Calendar className="w-4 h-4" />,
  TrendingUp: <TrendingUp className="w-4 h-4" />,
  Megaphone: <Megaphone className="w-4 h-4" />,
  Code: <Code className="w-4 h-4" />,
  Palette: <Palette className="w-4 h-4" />,
  Video: <Video className="w-4 h-4" />,
  FileText: <FileText className="w-4 h-4" />,
  Database: <Database className="w-4 h-4" />,
  Settings: <Settings className="w-4 h-4" />,
  Briefcase: <Briefcase className="w-4 h-4" />,
};

export const ServiceSelector = ({ selectedServices, onServicesChange }: ServiceSelectorProps) => {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from("service_categories")
        .select("id, name, description, icon")
        .order("order_index");
      
      setCategories(data || []);
      setLoading(false);
    };
    fetchCategories();
  }, []);

  const handleToggle = (categoryId: string) => {
    if (selectedServices.includes(categoryId)) {
      onServicesChange(selectedServices.filter(id => id !== categoryId));
    } else {
      onServicesChange([...selectedServices, categoryId]);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => (
        <div
          key={category.id}
          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
            selectedServices.includes(category.id)
              ? "bg-primary/10 border-primary"
              : "hover:bg-muted/50"
          }`}
          onClick={() => handleToggle(category.id)}
        >
          <Checkbox
            checked={selectedServices.includes(category.id)}
            onCheckedChange={() => handleToggle(category.id)}
          />
          <div className="flex items-center gap-2 flex-1">
            {category.icon && iconMap[category.icon] ? (
              <span className="text-muted-foreground">{iconMap[category.icon]}</span>
            ) : (
              <Briefcase className="w-4 h-4 text-muted-foreground" />
            )}
            <Label className="cursor-pointer font-normal">{category.name}</Label>
          </div>
        </div>
      ))}
    </div>
  );
};
