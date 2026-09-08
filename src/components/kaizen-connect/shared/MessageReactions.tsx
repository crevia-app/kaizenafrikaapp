import { supabase } from "@/integrations/supabase/client";

interface Reaction {
  emoji: string;
  count: number;
  reacted: boolean;
}

interface MessageReactionsProps {
  reactions: Reaction[];
  messageId: string;
  currentUserId: string;
  onUpdate: () => void;
}

const MessageReactions = ({ reactions, messageId, currentUserId, onUpdate }: MessageReactionsProps) => {
  if (reactions.length === 0) return null;

  const toggleReaction = async (emoji: string, alreadyReacted: boolean) => {
    if (alreadyReacted) {
      await supabase
        .from("message_reactions")
        .delete()
        .eq("message_id", messageId)
        .eq("user_id", currentUserId)
        .eq("emoji", emoji);
    } else {
      await supabase.from("message_reactions").insert({
        message_id: messageId,
        user_id: currentUserId,
        emoji,
      });
    }
    onUpdate();
  };

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          onClick={() => toggleReaction(r.emoji, r.reacted)}
          className={`flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded-full border transition-colors ${
            r.reacted
              ? "border-bronze/40 bg-bronze/10 text-foreground"
              : "border-border bg-muted/50 text-muted-foreground hover:border-bronze/30"
          }`}
        >
          <span>{r.emoji}</span>
          <span className="font-medium">{r.count}</span>
        </button>
      ))}
    </div>
  );
};

export default MessageReactions;
