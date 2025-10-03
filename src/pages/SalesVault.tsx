import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { BrandCard } from "@/components/BrandCard";
import { Phone } from "lucide-react";

interface SalesCall {
  id: string;
  title: string;
  thumbnail_url: string | null;
  video_url: string | null;
  duration: number | null;
  call_sequence: number | null;
  call_label: string | null;
  brand_id: string | null;
}

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  arr_value: string | null;
  order_index: number;
}

export default function SalesVault() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [calls, setCalls] = useState<SalesCall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [brandsResponse, callsResponse] = await Promise.all([
        supabase.from("brands").select("*").order("order_index", { ascending: true }),
        supabase.from("sales_calls").select("id, title, thumbnail_url, video_url, duration, call_sequence, call_label, brand_id"),
      ]);

      if (brandsResponse.error) throw brandsResponse.error;
      if (callsResponse.error) throw callsResponse.error;

      setBrands(brandsResponse.data || []);
      setCalls(callsResponse.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const uncategorizedCalls = calls.filter(call => !call.brand_id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4 text-foreground">
            Sales Vault
          </h1>
          <p className="text-xl text-muted-foreground">
            Real Deals, Real Conversations, Real Results
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading sales vault...</p>
          </div>
        ) : brands.length === 0 && uncategorizedCalls.length === 0 ? (
          <div className="text-center py-12">
            <Phone className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-xl text-muted-foreground">No sales calls available yet</p>
          </div>
        ) : (
          <div className="space-y-8">
            {brands.map((brand) => {
              const brandCalls = calls.filter(call => call.brand_id === brand.id);
              if (brandCalls.length === 0) return null;
              
              return (
                <BrandCard
                  key={brand.id}
                  name={brand.name}
                  logo_url={brand.logo_url}
                  arr_value={brand.arr_value}
                  calls={brandCalls}
                />
              );
            })}

            {uncategorizedCalls.length > 0 && (
              <div className="mt-12 pt-8 border-t border-border/50">
                <h2 className="text-2xl font-bold mb-6 text-muted-foreground">Uncategorized Calls</h2>
                <BrandCard
                  name="Uncategorized"
                  logo_url={null}
                  arr_value={null}
                  calls={uncategorizedCalls}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
