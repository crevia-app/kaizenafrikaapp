import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronRight, ChevronLeft, Brain, Mail,
  Palette, Loader2, Trash2, Pencil, Sparkles, X,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";

type PanelView = "main" | "memory" | "personalization" | "saved-memories";

interface KiraMemory {
  reference_chat_history: boolean;
  reference_saved_memories: boolean;
  nickname: string;
  occupation: string;
  more_about_you: string;
  custom_instructions: string;
}

interface LearnedMemory {
  id: string;
  content: string;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export function KiraSettingsPanel({ open, onOpenChange, userId }: Props) {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [view, setView] = useState<PanelView>("main");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [memory, setMemory] = useState<KiraMemory>({
    reference_chat_history: false,
    reference_saved_memories: false,
    nickname: "",
    occupation: "",
    more_about_you: "",
    custom_instructions: "",
  });
  const [learnedMemories, setLearnedMemories] = useState<LearnedMemory[]>([]);
  const [isLoadingLearned, setIsLoadingLearned] = useState(false);

  useEffect(() => {
    if (open) setView("main");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setIsLoading(true);
      const [{ data: { user } }, { data: profile }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("profiles").select("display_name, dira_memory").eq("id", userId).single(),
      ]);
      if (user?.email) setEmail(user.email);
      if (profile?.display_name) setDisplayName(profile.display_name);
      const raw = (profile?.dira_memory as Record<string, unknown>) || {};
      setMemory({
        reference_chat_history: raw.reference_chat_history === true,
        reference_saved_memories: raw.reference_saved_memories === true,
        nickname: (raw.nickname as string) || "",
        occupation: (raw.occupation as string) || "",
        more_about_you: (raw.more_about_you as string) || "",
        custom_instructions: (raw.custom_instructions as string) || "",
      });
      setIsLoading(false);
    };
    load();
  }, [open, userId]);

  const persistMemory = useCallback(async (updated: KiraMemory): Promise<boolean> => {
    const { data: current } = await supabase.from("profiles").select("dira_memory").eq("id", userId).single();
    const merged = {
      ...(current?.dira_memory as object || {}),
      reference_chat_history: updated.reference_chat_history,
      reference_saved_memories: updated.reference_saved_memories,
      nickname: updated.nickname,
      occupation: updated.occupation,
      more_about_you: updated.more_about_you,
      custom_instructions: updated.custom_instructions,
    };
    const { error } = await supabase.from("profiles").update({ dira_memory: merged }).eq("id", userId);
    return !error;
  }, [userId]);

  const handleToggle = async (
    field: "reference_chat_history" | "reference_saved_memories",
    val: boolean,
  ) => {
    const updated = { ...memory, [field]: val };
    setMemory(updated);
    await persistMemory(updated);
    toast({ title: val ? "Enabled" : "Disabled", description: "Kira updated." });
  };

  const saveTextFields = async () => {
    setIsSaving(true);
    const saved = await persistMemory(memory);
    if (!saved) {
      toast({ title: "Save failed", description: "Could not save settings. Please try again.", variant: "destructive" });
      setIsSaving(false);
      return;
    }
    if (memory.nickname) {
      await supabase.from("profiles").update({ display_name: memory.nickname }).eq("id", userId);
      setDisplayName(memory.nickname);
    }
    toast({ title: "Saved", description: "Kira will use this going forward." });
    setIsSaving(false);
  };

  const deleteMemoryField = async (field: keyof KiraMemory) => {
    const updated = { ...memory, [field]: "" };
    setMemory(updated);
    await persistMemory(updated);
    toast({ title: "Memory removed" });
  };

  const loadLearnedMemories = useCallback(async () => {
    setIsLoadingLearned(true);
    const { data } = await supabase
      .from("dira_memories")
      .select("id, content, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    setLearnedMemories((data as LearnedMemory[]) || []);
    setIsLoadingLearned(false);
  }, [userId]);

  const deleteLearnedMemory = async (memoryId: string) => {
    await supabase.from("dira_memories").delete().eq("id", memoryId);
    setLearnedMemories(prev => prev.filter(m => m.id !== memoryId));
    toast({ title: "Memory removed" });
  };

  const savedItems = [
    { key: "nickname", label: "Nickname", value: memory.nickname },
    { key: "occupation", label: "Occupation", value: memory.occupation },
    { key: "more_about_you", label: "About you", value: memory.more_about_you },
    { key: "custom_instructions", label: "Instructions", value: memory.custom_instructions },
  ].filter((item) => item.value.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        className="p-0 gap-0 max-w-sm w-full rounded-2xl overflow-hidden border border-border/50 bg-card shadow-2xl flex flex-col max-h-[85vh]"
      >
        <DialogTitle className="sr-only">Kira Settings</DialogTitle>

        {isLoading ? (
          <div className="flex items-center justify-center h-60">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* ── MAIN VIEW ── */}
            {view === "main" && (
              <>
                {/* Header row — close button */}
                <div className="flex justify-end px-4 pt-4">
                  <button
                    onClick={() => onOpenChange(false)}
                    className="w-9 h-9 rounded-full border border-border bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                  >
                    <X className="w-4 h-4 text-foreground" />
                  </button>
                </div>

                <ScrollArea className="flex-1 min-h-0">
                  <div className="px-6 pb-6 space-y-6">
                    {/* Avatar + name */}
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-bronze to-bronze-dark flex items-center justify-center text-background font-bold text-xl select-none shadow-lg">
                          {getInitials(displayName) || <Sparkles className="w-6 h-6" />}
                        </div>
                        <button
                          onClick={() => { onOpenChange(false); navigate("/profile/settings"); }}
                          className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center shadow hover:bg-muted transition-colors"
                        >
                          <Pencil className="w-3 h-3 text-foreground" />
                        </button>
                      </div>
                      <span className="font-poppins font-semibold text-base">{displayName || "Your name"}</span>
                    </div>

                    {/* Customize Kira */}
                    <div className="space-y-2">
                      <p className="text-xs font-poppins font-medium text-muted-foreground uppercase tracking-wider px-1">
                        Customize Kira
                      </p>
                      <div className="rounded-xl border border-border/50 bg-background divide-y divide-border/50 overflow-hidden">
                        <SettingsRow
                          icon={<Palette className="w-4 h-4 text-bronze" />}
                          label="Personalization"
                          onClick={() => setView("personalization")}
                          hasChevron
                        />
                        <SettingsRow
                          icon={<Brain className="w-4 h-4 text-bronze" />}
                          label="Memory"
                          onClick={() => setView("memory")}
                          hasChevron
                        />
                      </div>
                    </div>

                    {/* Account */}
                    <div className="space-y-2">
                      <p className="text-xs font-poppins font-medium text-muted-foreground uppercase tracking-wider px-1">
                        Account
                      </p>
                      <div className="rounded-xl border border-border/50 bg-background overflow-hidden">
                        <div className="flex items-center gap-3 px-4 py-4">
                          <div className="w-8 h-8 rounded-lg bg-bronze/10 flex items-center justify-center flex-shrink-0">
                            <Mail className="w-4 h-4 text-bronze" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Email</p>
                            <p className="text-sm font-semibold break-all">{email || "—"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </>
            )}

            {/* ── MEMORY VIEW ── */}
            {view === "memory" && (
              <>
                {/* Header */}
                <div className="flex items-center gap-2 px-4 py-3.5 border-b border-border/50 flex-shrink-0">
                  <button
                    onClick={() => setView("main")}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-poppins font-semibold text-base flex-1 text-center pr-8">Memory</span>
                </div>

                {/* min-h-0 lets the ScrollArea shrink in the flex column so the
                    Save button (flex-shrink-0) is always visible on small screens */}
                <ScrollArea className="flex-1 min-h-0">
                  <div className="p-4 space-y-4">
                    {/* Toggles */}
                    <div className="rounded-xl border border-border/50 bg-background divide-y divide-border/50 overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-4">
                        <div className="flex-1">
                          <p className="text-sm font-medium">Reference chat history</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            Lets Kira reference recent conversations when responding.
                          </p>
                        </div>
                        <Switch
                          checked={memory.reference_chat_history}
                          onCheckedChange={(val) => handleToggle("reference_chat_history", val)}
                          className="data-[state=checked]:bg-green-500 flex-shrink-0"
                        />
                      </div>
                      <div className="flex items-center gap-3 px-4 py-4">
                        <div className="flex-1">
                          <p className="text-sm font-medium">Reference saved memories</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            Lets Kira save and use memories when responding.
                          </p>
                        </div>
                        <Switch
                          checked={memory.reference_saved_memories}
                          onCheckedChange={(val) => handleToggle("reference_saved_memories", val)}
                          className="data-[state=checked]:bg-green-500 flex-shrink-0"
                        />
                      </div>
                    </div>

                    {/* Saved memories link */}
                    <div className="rounded-xl border border-border/50 bg-background overflow-hidden">
                      <button
                        onClick={() => { setView("saved-memories"); loadLearnedMemories(); }}
                        className="w-full flex items-center px-4 py-3.5 hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-sm font-medium flex-1 text-left">Saved memories</span>
                        <div className="flex items-center gap-2">
                          {savedItems.length > 0 && (
                            <span className="text-xs bg-bronze/10 text-bronze px-2 py-0.5 rounded-full font-poppins font-medium">
                              {savedItems.length}
                            </span>
                          )}
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </button>
                    </div>

                    {/* Text fields */}
                    <div className="space-y-1.5">
                      <p className="text-xs font-poppins font-medium text-muted-foreground uppercase tracking-wider px-1">Your nickname</p>
                      <Input
                        value={memory.nickname}
                        onChange={(e) => setMemory((m) => ({ ...m, nickname: e.target.value }))}
                        placeholder="Name"
                        className="rounded-xl bg-background border-border/50 h-11"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-poppins font-medium text-muted-foreground uppercase tracking-wider px-1">Your occupation</p>
                      <Input
                        value={memory.occupation}
                        onChange={(e) => setMemory((m) => ({ ...m, occupation: e.target.value }))}
                        placeholder="Photographer, designer, etc."
                        className="rounded-xl bg-background border-border/50 h-11"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-poppins font-medium text-muted-foreground uppercase tracking-wider px-1">More about you</p>
                      <Textarea
                        value={memory.more_about_you}
                        onChange={(e) => setMemory((m) => ({ ...m, more_about_you: e.target.value }))}
                        placeholder="Interests, values, or preferences to keep..."
                        rows={3}
                        className="rounded-xl bg-background border-border/50 resize-none"
                      />
                    </div>
                  </div>
                </ScrollArea>

                {/* Save pinned to bottom */}
                <div className="px-4 py-4 border-t border-border/50 flex-shrink-0">
                  <Button
                    onClick={saveTextFields}
                    disabled={isSaving}
                    className="w-full h-11 rounded-xl bg-bronze hover:bg-bronze/90 text-background font-poppins font-semibold"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                  </Button>
                </div>
              </>
            )}

            {/* ── SAVED MEMORIES VIEW ── */}
            {view === "saved-memories" && (
              <>
                <div className="flex items-center gap-2 px-4 py-3.5 border-b border-border/50 flex-shrink-0">
                  <button
                    onClick={() => setView("memory")}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-poppins font-semibold text-base flex-1 text-center pr-8">Saved Memories</span>
                </div>
                <ScrollArea className="flex-1 min-h-0">
                  <div className="p-4 space-y-4">
                    {/* Manual memories */}
                    {savedItems.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-poppins font-medium text-muted-foreground uppercase tracking-wider px-1">You told Kira</p>
                        {savedItems.map((item) => (
                          <div
                            key={item.key}
                            className="rounded-xl border border-border/50 bg-background px-4 py-3 flex items-start gap-3"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-1">{item.label}</p>
                              <p className="text-sm leading-snug break-words">{item.value}</p>
                            </div>
                            <button
                              onClick={() => deleteMemoryField(item.key as keyof KiraMemory)}
                              className="flex-shrink-0 mt-0.5 p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Learned memories */}
                    <div className="space-y-2">
                      <p className="text-xs font-poppins font-medium text-muted-foreground uppercase tracking-wider px-1">Kira has learned</p>
                      {isLoadingLearned ? (
                        <div className="flex justify-center py-6">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : learnedMemories.length === 0 ? (
                        <p className="text-xs text-muted-foreground px-1 py-2">
                          Kira will learn facts about you as you chat.
                        </p>
                      ) : (
                        learnedMemories.map((m) => (
                          <div
                            key={m.id}
                            className="rounded-xl border border-border/50 bg-background px-4 py-3 flex items-start gap-3"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm leading-snug break-words">{m.content}</p>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {new Date(m.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <button
                              onClick={() => deleteLearnedMemory(m.id)}
                              className="flex-shrink-0 mt-0.5 p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {savedItems.length === 0 && learnedMemories.length === 0 && !isLoadingLearned && (
                      <div className="py-10 flex flex-col items-center gap-3 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-bronze/10 flex items-center justify-center">
                          <Brain className="w-5 h-5 text-bronze" />
                        </div>
                        <p className="text-sm font-semibold">No memories yet</p>
                        <p className="text-xs text-muted-foreground max-w-[200px]">
                          Fill in your details in Memory and chat with Kira to build up context.
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </>
            )}

            {/* ── PERSONALIZATION VIEW ── */}
            {view === "personalization" && (
              <>
                <div className="flex items-center gap-2 px-4 py-3.5 border-b border-border/50 flex-shrink-0">
                  <button
                    onClick={() => setView("main")}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-poppins font-semibold text-base flex-1 text-center pr-8">Personalization</span>
                </div>
                <ScrollArea className="flex-1 min-h-0">
                  <div className="p-4 space-y-4">
                    <div className="rounded-xl border border-border/50 bg-background p-4 space-y-3">
                      <div>
                        <p className="text-sm font-semibold">Custom instructions for Kira</p>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          Kira will follow these in every conversation on Kaizen Afrika.
                        </p>
                      </div>
                      <Textarea
                        value={memory.custom_instructions}
                        onChange={(e) => setMemory((m) => ({ ...m, custom_instructions: e.target.value }))}
                        placeholder="e.g. I prefer concise answers. Always lead with pricing when relevant. I'm based in Nairobi."
                        rows={6}
                        className="rounded-xl bg-muted/30 border-border/50 resize-none text-sm"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground px-1 leading-relaxed">
                      Be specific — the more context you give, the sharper Kira's responses.
                    </p>
                  </div>
                </ScrollArea>

                {/* Save pinned to bottom */}
                <div className="px-4 py-4 border-t border-border/50 flex-shrink-0">
                  <Button
                    onClick={saveTextFields}
                    disabled={isSaving}
                    className="w-full h-11 rounded-xl bg-bronze hover:bg-bronze/90 text-background font-poppins font-semibold"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  value?: React.ReactNode;
  onClick?: () => void;
  hasChevron?: boolean;
}

function SettingsRow({ icon, label, value, onClick, hasChevron }: SettingsRowProps) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-left ${
        onClick ? "hover:bg-muted/50 cursor-pointer" : ""
      }`}
    >
      <div className="w-8 h-8 rounded-lg bg-bronze/10 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <span className="flex-1 text-sm font-medium">{label}</span>
      {value && <span className="flex-shrink-0">{value}</span>}
      {hasChevron && <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
    </Tag>
  );
}
