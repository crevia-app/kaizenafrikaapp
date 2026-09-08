import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  MessageSquare,
  Plus,
  Settings,
  Trash2,
  Edit2,
  Check,
  X,
  FolderOpen,
} from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Project {
  id: string;
  name: string;
  description: string | null;
  custom_instructions: string | null;
  created_at: string;
  updated_at: string;
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

interface ProjectDetailSheetProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectUpdated: (project: Project) => void;
  onProjectDeleted: (projectId: string) => void;
  onConversationSelect: (conversationId: string, projectId: string) => void;
  onNewChat: (projectId: string) => void;
}

export const ProjectDetailSheet = ({
  project,
  open,
  onOpenChange,
  onProjectUpdated,
  onProjectDeleted,
  onConversationSelect,
  onNewChat,
}: ProjectDetailSheetProps) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editInstructions, setEditInstructions] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);

  useEffect(() => {
    if (project) {
      setEditName(project.name);
      setEditDescription(project.description || "");
      setEditInstructions(project.custom_instructions || "");
      loadConversations();
    }
  }, [project]);

  const loadConversations = async () => {
    if (!project) return;
    setIsLoadingConversations(true);
    try {
      const { data, error } = await supabase
        .from("dira_conversations")
        .select("id, title, updated_at")
        .eq("project_id", project.id)
        .order("updated_at", { ascending: false });

      if (!error && data) {
        setConversations(data);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const handleSave = async () => {
    if (!project || !editName.trim()) return;
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from("dira_projects")
        .update({
          name: editName.trim(),
          description: editDescription.trim() || null,
          custom_instructions: editInstructions.trim() || null,
        })
        .eq("id", project.id)
        .select()
        .single();

      if (error) throw error;

      onProjectUpdated(data);
      setIsEditing(false);
      toast({
        title: "Project updated",
        description: "Your changes have been saved",
      });
    } catch (error) {
      console.error("Error updating project:", error);
      toast({
        title: "Error",
        description: "Couldn't save changes",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!project) return;
    setIsDeleting(true);
    try {
      // First, unassign all conversations from this project
      await supabase
        .from("dira_conversations")
        .update({ project_id: null })
        .eq("project_id", project.id);

      const { error } = await supabase
        .from("dira_projects")
        .delete()
        .eq("id", project.id);

      if (error) throw error;

      onProjectDeleted(project.id);
      onOpenChange(false);
      toast({
        title: "Project deleted",
        description: `"${project.name}" has been removed`,
      });
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({
        title: "Error",
        description: "Couldn't delete project",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (!project) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
          <SheetHeader className="px-6 py-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-bronze/10 flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-bronze" />
                </div>
                <div>
                  <SheetTitle className="text-left">{project.name}</SheetTitle>
                  <p className="text-xs text-muted-foreground">
                    {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              {!isEditing && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditing(true)}
                  className="h-8 w-8"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </SheetHeader>

          <Tabs defaultValue="chats" className="flex-1 flex flex-col min-h-0">
            <TabsList className="mx-6 mt-4 grid w-auto grid-cols-2">
              <TabsTrigger value="chats">Chats</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="chats" className="flex-1 flex flex-col min-h-0 m-0">
              <div className="px-6 py-4">
                <Button
                  onClick={() => {
                    onNewChat(project.id);
                    onOpenChange(false);
                  }}
                  className="w-full gap-2 bg-bronze hover:bg-bronze-dark text-background"
                >
                  <Plus className="w-4 h-4" />
                  New Chat in Project
                </Button>
              </div>

              <ScrollArea className="flex-1 px-6 pb-6">
                {isLoadingConversations ? (
                  <div className="py-8 text-center">
                    <Loader2 className="w-5 h-5 mx-auto animate-spin text-muted-foreground" />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="py-12 text-center">
                    <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No conversations yet
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Start a new chat to begin
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {conversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => {
                          onConversationSelect(conv.id, project.id);
                          onOpenChange(false);
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
                      >
                        <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{conv.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(conv.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="settings" className="flex-1 m-0 overflow-auto">
              <div className="px-6 py-4 space-y-6">
                {isEditing ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Project Name</label>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Name your project"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Description</label>
                      <Textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="What is this project about?"
                        className="min-h-[80px] resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Custom Instructions
                      </label>
                      <Textarea
                        value={editInstructions}
                        onChange={(e) => setEditInstructions(e.target.value)}
                        placeholder="How should Dira respond in this project? (e.g., tone, format, expertise)"
                        className="min-h-[120px] resize-none"
                      />
                      <p className="text-xs text-muted-foreground">
                        These instructions will be used for all conversations in
                        this project.
                      </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          setEditName(project.name);
                          setEditDescription(project.description || "");
                          setEditInstructions(project.custom_instructions || "");
                        }}
                        disabled={isSaving}
                        className="flex-1"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={isSaving || !editName.trim()}
                        className="flex-1 bg-bronze hover:bg-bronze-dark text-background"
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 mr-2" />
                        )}
                        Save
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Description</p>
                      <p className="text-sm text-muted-foreground">
                        {project.description || "No description set"}
                      </p>
                    </div>

                    {project.custom_instructions && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Custom Instructions</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {project.custom_instructions}
                        </p>
                      </div>
                    )}

                    <div className="pt-4 border-t border-border/50">
                      <Button
                        variant="destructive"
                        onClick={() => setShowDeleteDialog(true)}
                        className="w-full"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Project
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete "{project.name}" and remove it from all
              conversations. The conversations themselves will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
