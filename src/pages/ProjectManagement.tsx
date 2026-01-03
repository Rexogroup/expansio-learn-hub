import { useState } from "react";
import { ProjectStats } from "@/components/project-management/ProjectStats";
import { ProjectsTable } from "@/components/project-management/ProjectsTable";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ProjectDetailsModal } from "@/components/project-management/ProjectDetailsModal";

export default function ProjectManagement() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Project Management</h1>
          <p className="text-muted-foreground">
            Track and manage client onboarding projects
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      <ProjectStats />

      <div className="mt-8">
        <ProjectsTable onProjectClick={setSelectedProjectId} />
      </div>

      <ProjectDetailsModal
        projectId={selectedProjectId}
        isOpen={!!selectedProjectId}
        onClose={() => setSelectedProjectId(null)}
      />

      <ProjectDetailsModal
        projectId={null}
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </main>
  );
}
