import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  FolderOpen,
  LayoutGrid,
  Loader2,
  Trash2,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string | null;
  custom_instructions: string | null;
  created_at: string;
  updated_at: string;
}

interface ProjectsViewProps {
  projects: Project[];
  isLoading: boolean;
  onCreateProject: () => void;
  onSelectProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
}

export const ProjectsView = ({
  projects,
  isLoading,
  onCreateProject,
  onSelectProject,
  onDeleteProject,
}: ProjectsViewProps) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"activity" | "name" | "created">("activity");
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    try {
      await supabase
        .from("dira_conversations")
        .update({ project_id: null })
        .eq("project_id", projectToDelete.id);

      const { error } = await supabase
        .from("dira_projects")
        .delete()
        .eq("id", projectToDelete.id);

      if (error) throw error;

      onDeleteProject(projectToDelete.id);
      toast({ title: "Project deleted", description: `"${projectToDelete.name}" has been removed` });
    } catch {
      toast({ title: "Error", description: "Couldn't delete project", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setProjectToDelete(null);
    }
  };

  const filteredProjects = projects
    .filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description?.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === "activity") {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      } else if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      } else {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="px-6 py-6 border-b border-border/50">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-vollkorn text-3xl font-bold">Projects</h1>
            <Button
              onClick={onCreateProject}
              className="gap-2 bg-bronze hover:bg-bronze-dark text-background"
            >
              <Plus className="w-4 h-4" />
              New project
            </Button>
          </div>

          {/* Search & Sort */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="pl-10 h-11 bg-muted/50 border-border/50"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by</span>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-[130px] h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activity">Activity</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="created">Created</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-6">
          {isLoading ? (
            <div className="py-20 text-center">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Loading projects...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-muted/50 flex items-center justify-center">
                <LayoutGrid className="w-10 h-10 text-muted-foreground/50" />
              </div>
              {searchQuery ? (
                <>
                  <h3 className="text-lg font-semibold mb-2">No projects found</h3>
                  <p className="text-muted-foreground text-sm">
                    Try a different search term
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold mb-2">
                    Looking to start a project?
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
                    Set custom instructions and organize conversations in one space.
                  </p>
                  <Button
                    onClick={onCreateProject}
                    variant="outline"
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    New project
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="group relative text-left p-5 rounded-2xl border border-border/50 hover:border-bronze/50 bg-card hover:bg-muted/30 transition-all cursor-pointer"
                  onClick={() => onSelectProject(project)}
                >
                  {/* Delete button */}
                  <button
                    className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                    onClick={(e) => { e.stopPropagation(); setProjectToDelete(project); }}
                    aria-label="Delete project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="w-12 h-12 rounded-xl bg-bronze/10 flex items-center justify-center mb-4 group-hover:bg-bronze/20 transition-colors">
                    <FolderOpen className="w-6 h-6 text-bronze" />
                  </div>
                  <h3 className="font-semibold mb-1 truncate pr-6">{project.name}</h3>
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {project.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Updated {new Date(project.updated_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      <AlertDialog open={!!projectToDelete} onOpenChange={(open) => { if (!open) setProjectToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{projectToDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This project will be permanently deleted. All chats linked to it will be moved to general chats.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={confirmDeleteProject}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
