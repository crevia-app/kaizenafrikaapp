import { useState } from "react";
import { Smile } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "👀", "🎉", "💯"];

interface EmojiReactionPickerProps {
  onReact: (emoji: string) => void;
}

const EmojiReactionPicker = ({ onReact }: EmojiReactionPickerProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-muted/50">
          <Smile className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-0 shadow-none bg-transparent" side="top" align="center">
        <div className="flex flex-wrap items-center gap-1 p-2 bg-zinc-900 border border-white/10 rounded-xl shadow-xl max-w-[200px]">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onReact(emoji);
                setOpen(false);
              }}
              className="p-2 text-lg transition-transform hover:scale-110 active:scale-95 rounded-lg hover:bg-white/10"
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default EmojiReactionPicker;
