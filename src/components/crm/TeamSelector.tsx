import { Team } from "@/pages/CRM";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users } from "lucide-react";

interface TeamSelectorProps {
  teams: Team[];
  selectedTeamId: string | null;
  onSelect: (teamId: string) => void;
}

export const TeamSelector = ({ teams, selectedTeamId, onSelect }: TeamSelectorProps) => {
  if (teams.length === 0) {
    return null;
  }

  return (
    <Select value={selectedTeamId || undefined} onValueChange={onSelect}>
      <SelectTrigger className="w-[200px]">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <SelectValue placeholder="Select team" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {teams.map((team) => (
          <SelectItem key={team.id} value={team.id}>
            {team.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
