import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Lightbulb, CheckCircle2, Plus } from "lucide-react";

interface AssetSummaryCardProps {
  hasIcpDocument: boolean;
  leadMagnetsCount: number;
  scriptsCount: number;
  onEditIcp?: () => void;
}

export function AssetSummaryCard({ 
  hasIcpDocument, 
  leadMagnetsCount, 
  scriptsCount,
  onEditIcp 
}: AssetSummaryCardProps) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Asset Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* ICP Document Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-md ${hasIcpDocument ? 'bg-green-500/10' : 'bg-muted'}`}>
              <FileText className={`w-4 h-4 ${hasIcpDocument ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <p className="text-sm font-medium">ICP Document</p>
              <p className="text-xs text-muted-foreground">
                {hasIcpDocument ? 'Complete' : 'Not created'}
              </p>
            </div>
          </div>
          {hasIcpDocument ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => navigate('/onboarding/step/2')}
            >
              Create
            </Button>
          )}
        </div>

        {/* Lead Magnets Count */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-md ${leadMagnetsCount > 0 ? 'bg-primary/10' : 'bg-muted'}`}>
              <Lightbulb className={`w-4 h-4 ${leadMagnetsCount > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <p className="text-sm font-medium">Lead Magnets</p>
              <p className="text-xs text-muted-foreground">
                {leadMagnetsCount} saved
              </p>
            </div>
          </div>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => navigate('/script-builder')}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Scripts Count */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-md ${scriptsCount > 0 ? 'bg-primary/10' : 'bg-muted'}`}>
              <FileText className={`w-4 h-4 ${scriptsCount > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <p className="text-sm font-medium">Scripts</p>
              <p className="text-xs text-muted-foreground">
                {scriptsCount} generated
              </p>
            </div>
          </div>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => navigate('/script-builder')}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Quick Add Button */}
        <Button 
          className="w-full mt-2" 
          variant="outline"
          onClick={() => navigate('/script-builder')}
        >
          Open Script Builder
        </Button>
      </CardContent>
    </Card>
  );
}
