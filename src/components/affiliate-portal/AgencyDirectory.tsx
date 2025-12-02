import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { AgencyCard } from "./AgencyCard";
import { Search, Filter, X } from "lucide-react";

interface ServiceCategory {
  id: string;
  name: string;
  icon: string | null;
}

interface AgencyProfile {
  id: string;
  user_id: string;
  agency_name: string;
  tagline: string | null;
  logo_url: string | null;
  location: string | null;
  open_to_collaborations: boolean;
  verified: boolean;
  services: Array<{
    category: {
      id: string;
      name: string;
    };
  }>;
}

export const AgencyDirectory = () => {
  const [agencies, setAgencies] = useState<AgencyProfile[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
      await Promise.all([fetchCategories(), fetchAgencies()]);
    };
    init();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("service_categories")
      .select("id, name, icon")
      .order("order_index");
    
    setCategories(data || []);
  };

  const fetchAgencies = async () => {
    const { data } = await supabase
      .from("agency_profiles")
      .select(`
        id,
        user_id,
        agency_name,
        tagline,
        logo_url,
        location,
        open_to_collaborations,
        verified,
        services:agency_services(
          category:service_categories(id, name)
        )
      `)
      .eq("is_public", true)
      .order("verified", { ascending: false })
      .order("created_at", { ascending: false });

    setAgencies(data as any || []);
    setLoading(false);
  };

  const filteredAgencies = agencies.filter((agency) => {
    // Don't show own agency in directory
    if (agency.user_id === currentUserId) return false;

    const matchesSearch = agency.agency_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agency.tagline?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agency.location?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === "all" || 
      agency.services?.some(s => s.category?.id === selectedCategory);

    const matchesOpenFilter = !showOpenOnly || agency.open_to_collaborations;

    return matchesSearch && matchesCategory && matchesOpenFilter;
  });

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setShowOpenOnly(false);
  };

  const hasActiveFilters = searchTerm || selectedCategory !== "all" || showOpenOnly;

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search agencies by name, tagline, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="All Services" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={showOpenOnly ? "default" : "outline"}
          onClick={() => setShowOpenOnly(!showOpenOnly)}
          className="whitespace-nowrap"
        >
          Open to Collaborate
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" onClick={clearFilters} size="icon">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {filteredAgencies.length} {filteredAgencies.length === 1 ? "agency" : "agencies"} found
      </div>

      {/* Agency Grid */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filteredAgencies.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No agencies found matching your criteria.</p>
          {hasActiveFilters && (
            <Button variant="link" onClick={clearFilters} className="mt-2">
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAgencies.map((agency) => (
            <AgencyCard key={agency.id} agency={agency} />
          ))}
        </div>
      )}
    </div>
  );
};
