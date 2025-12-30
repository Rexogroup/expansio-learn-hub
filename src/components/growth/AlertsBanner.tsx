import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Alert {
  id: string;
  email_address: string;
  alert_type: string;
  severity: string;
  current_value: number | null;
}

export function AlertsBanner() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from('email_account_alerts')
      .select('id, email_address, alert_type, severity, current_value')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .order('severity', { ascending: false });

    if (data) {
      setAlerts(data);
    }
  };

  if (dismissed || alerts.length === 0) return null;

  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const isCritical = criticalAlerts.length > 0;

  return (
    <div className={`rounded-lg p-4 flex items-center justify-between gap-4 ${
      isCritical 
        ? 'bg-destructive/10 border border-destructive/30' 
        : 'bg-amber-500/10 border border-amber-500/30'
    }`}>
      <div className="flex items-center gap-3">
        <AlertTriangle className={`w-5 h-5 ${isCritical ? 'text-destructive' : 'text-amber-500'}`} />
        <div>
          <p className={`font-medium ${isCritical ? 'text-destructive' : 'text-amber-600 dark:text-amber-400'}`}>
            {criticalAlerts.length > 0 
              ? `${criticalAlerts.length} critical infrastructure issue${criticalAlerts.length > 1 ? 's' : ''} detected`
              : `${alerts.length} infrastructure warning${alerts.length > 1 ? 's' : ''}`
            }
          </p>
          <p className="text-sm text-muted-foreground">
            {criticalAlerts[0]?.email_address || alerts[0]?.email_address} - {criticalAlerts[0]?.alert_type || alerts[0]?.alert_type}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button 
          size="sm" 
          variant={isCritical ? "destructive" : "outline"}
          onClick={() => navigate('/integrations')}
        >
          View Issues
        </Button>
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-8 w-8"
          onClick={() => setDismissed(true)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
