import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, BarChart3, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Poll data shape (stored as JSON in chat_messages.content) ───────────────
//
//  {
//    "type": "poll",
//    "question": "Which delivery date works best?",
//    "options": [
//      { "id": "a", "text": "Friday June 6" },
//      { "id": "b", "text": "Monday June 9" },
//      { "id": "c", "text": "Anytime next week" }
//    ]
//  }
//
//  Votes are stored in a separate table: workspace_poll_votes
//  (poll_message_id, user_id, option_id) — one row per user.
//
// ─────────────────────────────────────────────────────────────────────────────

interface PollOption {
  id: string;
  text: string;
}

interface PollData {
  type: "poll";
  question: string;
  options: PollOption[];
}

interface WorkspacePollMessageProps {
  messageId: string;      // chat_messages.id — used as the poll identifier
  content: string;        // raw JSON from chat_messages.content
  currentUserId: string;
  isMine: boolean;
}

// ── Parse poll JSON safely ─────────────────────────────────────────────────────
function parsePoll(content: string): PollData | null {
  try {
    const data = JSON.parse(content);
    if (data?.type === "poll" && Array.isArray(data.options)) return data as PollData;
    return null;
  } catch {
    return null;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function WorkspacePollMessage({
  messageId,
  content,
  currentUserId,
  isMine,
}: WorkspacePollMessageProps) {
  const poll = parsePoll(content);
  const [votes, setVotes] = useState<Record<string, string[]>>({}); // optionId → userId[]
  const [myVote, setMyVote] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchVotes = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("workspace_poll_votes")
      .select("user_id, option_id")
      .eq("poll_message_id", messageId);

    if (!data) { setLoading(false); return; }

    const grouped: Record<string, string[]> = {};
    let mine: string | null = null;
    for (const row of data) {
      grouped[row.option_id] = [...(grouped[row.option_id] ?? []), row.user_id];
      if (row.user_id === currentUserId) mine = row.option_id;
    }
    setVotes(grouped);
    setMyVote(mine);
    setLoading(false);
  }, [messageId, currentUserId]);

  useEffect(() => {
    fetchVotes();

    // Real-time subscription so all participants see votes instantly
    const channel = supabase
      .channel(`poll:${messageId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "workspace_poll_votes", filter: `poll_message_id=eq.${messageId}` },
        () => fetchVotes()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchVotes, messageId]);

  const handleVote = async (optionId: string) => {
    if (voting) return;
    if (myVote === optionId) return; // already voted this option

    setVoting(true);
    try {
      if (myVote) {
        // Change vote — delete old, insert new
        await (supabase as any)
          .from("workspace_poll_votes")
          .delete()
          .eq("poll_message_id", messageId)
          .eq("user_id", currentUserId);
      }

      const { error } = await (supabase as any)
        .from("workspace_poll_votes")
        .insert({ poll_message_id: messageId, user_id: currentUserId, option_id: optionId });

      if (error) throw error;

      // Optimistic local update
      setVotes(prev => {
        const next = { ...prev };
        if (myVote && next[myVote]) next[myVote] = next[myVote].filter(id => id !== currentUserId);
        next[optionId] = [...(next[optionId] ?? []), currentUserId];
        return next;
      });
      setMyVote(optionId);
    } catch {
      toast.error("Failed to record vote");
    } finally {
      setVoting(false);
    }
  };

  if (!poll) return null;

  const totalVotes = Object.values(votes).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className={cn(
      "rounded-2xl border p-4 space-y-3 min-w-[220px] max-w-[320px]",
      isMine
        ? "border-background/25 bg-background/10"
        : "border-bronze/20 bg-bronze/5"
    )}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart3 className={cn("w-3.5 h-3.5 flex-shrink-0", isMine ? "text-background/70" : "text-bronze")} />
        <span className={cn("text-[10px] font-bold uppercase tracking-wider", isMine ? "text-background/60" : "text-bronze/70")}>
          Poll
        </span>
      </div>

      {/* Question */}
      <p className={cn("text-sm font-semibold leading-snug", isMine ? "text-background/90" : "text-foreground")}>
        {poll.question}
      </p>

      {/* Options */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex justify-center py-2">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          poll.options.map((opt) => {
            const count = votes[opt.id]?.length ?? 0;
            const pct   = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            const voted = myVote === opt.id;

            return (
              <button
                key={opt.id}
                onClick={() => handleVote(opt.id)}
                disabled={voting}
                className={cn(
                  "w-full text-left relative rounded-xl overflow-hidden border transition-all duration-200",
                  "px-3 py-2.5 text-sm font-medium",
                  voted
                    ? isMine
                      ? "border-white/40 bg-white/15 text-background"
                      : "border-bronze text-bronze bg-bronze/10"
                    : isMine
                      ? "border-background/20 text-background/80 hover:bg-background/10"
                      : "border-border/50 text-foreground hover:bg-muted/40"
                )}
              >
                {/* Progress bar behind text */}
                {totalVotes > 0 && (
                  <div
                    className={cn(
                      "absolute inset-0 rounded-xl transition-all duration-500",
                      voted
                        ? isMine ? "bg-white/10" : "bg-bronze/15"
                        : isMine ? "bg-white/5" : "bg-muted/40"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                )}
                <span className="relative flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    {voted && <CheckCircle2 className="w-3 h-3 flex-shrink-0" />}
                    {opt.text}
                  </span>
                  <span className={cn(
                    "text-[11px] font-semibold flex-shrink-0",
                    voted
                      ? isMine ? "text-background/80" : "text-bronze"
                      : isMine ? "text-background/50" : "text-muted-foreground"
                  )}>
                    {pct}%
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <p className={cn("text-[10px]", isMine ? "text-background/40" : "text-muted-foreground")}>
        {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
        {myVote && " · You voted"}
      </p>
    </div>
  );
}

// ── Helper: build poll JSON for insertion ──────────────────────────────────────
//
// Usage in sendMessage or a dedicated "Create Poll" flow:
//
//   const pollContent = buildPollContent(
//     "Which delivery date works best?",
//     ["Friday June 6", "Monday June 9", "Anytime next week"]
//   );
//   // Insert a chat_message with content = pollContent, message_type = "poll"
//
export function buildPollContent(question: string, options: string[]): string {
  return JSON.stringify({
    type: "poll",
    question: question.trim(),
    options: options.map((text, i) => ({ id: String.fromCharCode(97 + i), text: text.trim() })),
  });
}
