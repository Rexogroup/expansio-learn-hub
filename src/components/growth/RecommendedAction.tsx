import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, ArrowRight, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface RecommendedActionProps {
  title: string;
  description: string;
  actionLabel: string;
  actionPath?: string;
  onAction?: () => void;
}

interface InfrastructureAlert {
  id: string;
  email_address: string;
  alert_type: string;
  severity: string;
  current_value: number;
}

export function RecommendedAction({
  title,
  description,
  actionLabel,
  actionPath,
  onAction,
}: RecommendedActionProps) {
  const navigate = useNavigate();
  const [infrastructureAlerts, setInfrastructureAlerts] = useState<InfrastructureAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInfrastructureAlerts();
  }, []);

  const fetchInfrastructureAlerts = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('email_account_alerts')
        .select('id, email_address, alert_type, severity, current_value')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .order('severity', { ascending: true });

      if (error) throw error;
      setInfrastructureAlerts(data || []);
    } catch (error) {
      console.error('Error fetching infrastructure alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    if (onAction) {
      onAction();
    } else if (actionPath) {
      navigate(actionPath);
    }
  };

  // Check if there are critical infrastructure alerts
  const criticalAlerts = infrastructureAlerts.filter(a => a.severity === 'critical');
  const hasInfrastructureIssues = infrastructureAlerts.length > 0;

  // If there are infrastructure issues, override the recommended action
  if (!loading && hasInfrastructureIssues) {
    const isCritical = criticalAlerts.length > 0;
    const alertCount = isCritical ? criticalAlerts.length : infrastructureAlerts.length;

    return (
      <Card className={cn(
        "border-2",
        isCritical 
          ? "border-destructive/50 bg-gradient-to-br from-destructive/10 to-transparent" 
          : "border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-transparent"
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-2 rounded-lg",
              isCritical ? "bg-destructive/20" : "bg-amber-500/20"
            )}>
              <ShieldAlert className={cn(
                "w-5 h-5",
                isCritical ? "text-destructive" : "text-amber-500"
              )} />
            </div>
            <CardTitle className="text-base font-semibold">
              {isCritical ? 'Critical: Protect Your Infrastructure' : 'Warning: Infrastructure Needs Attention'}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className={cn(
              "font-semibold",
              isCritical ? "text-destructive" : "text-amber-600 dark:text-amber-400"
            )}>
              {alertCount} Email Account{alertCount > 1 ? 's' : ''} {isCritical ? 'Need Immediate Action' : 'Need Monitoring'}
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              {isCritical 
                ? 'High bounce rate or critically low health score detected. Pause these accounts from campaigns immediately to prevent domain blacklisting.'
                : 'Some accounts show warning signs. Consider reducing sending volume and enabling warmup mode.'}
            </p>
            <ul className="text-xs text-muted-foreground mt-2 space-y-1">
              {infrastructureAlerts.slice(0, 3).map((alert) => (
                <li key={alert.id} className="flex items-center gap-1">
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    alert.severity === 'critical' ? "bg-destructive" : "bg-amber-500"
                  )} />
                  {alert.email_address.split('@')[0]}@... - {alert.alert_type === 'high_bounce_rate' 
                    ? `${alert.current_value.toFixed(1)}% bounce` 
                    : `${alert.current_value.toFixed(0)}% health`}
                </li>
              ))}
              {infrastructureAlerts.length > 3 && (
                <li className="text-muted-foreground">+{infrastructureAlerts.length - 3} more</li>
              )}
            </ul>
          </div>
          <Button 
            onClick={() => {
              // Scroll to infrastructure card or navigate to integrations
              const infraCard = document.querySelector('[data-infrastructure-card]');
              if (infraCard) {
                infraCard.scrollIntoView({ behavior: 'smooth' });
              }
            }} 
            className={cn(
              "w-full group",
              isCritical 
                ? "bg-destructive hover:bg-destructive/90" 
                : "bg-amber-500 hover:bg-amber-600 text-white"
            )}
          >
            View At-Risk Accounts
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Default recommended action
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Lightbulb className="w-5 h-5 text-primary" />
          </div>
          <CardTitle className="text-base font-semibold">
            Recommended Next Action
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold text-foreground">{title}</h4>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        <Button onClick={handleClick} className="w-full group">
          {actionLabel}
          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </CardContent>
    </Card>
  );
}
