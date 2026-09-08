import { useState, useRef, useCallback, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceNotePlayerProps {
  audioUrl: string;
  duration: number; // seconds
  isMine: boolean;
}

const VoiceNotePlayer = ({ audioUrl, duration, isMine }: VoiceNotePlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animRef = useRef<number | null>(null);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    const audio = new Audio();
    // Do NOT set crossOrigin — it forces a CORS preflight that blocks playback
    // on many Android/iOS devices when Supabase CDN headers don't match exactly.
    audio.preload = "metadata";
    audioRef.current = audio;

    audio.addEventListener("loadedmetadata", () => {
      if (audio.duration && isFinite(audio.duration)) {
        setAudioDuration(audio.duration);
      }
    });

    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    });

    audio.addEventListener("error", (e) => {
      console.error("Audio playback error:", e);
      setIsPlaying(false);
    });

    // Set src after attaching listeners
    audio.src = audioUrl;

    return () => {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [audioUrl]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    } else {
      audioRef.current.play().catch((err) => {
        console.error("Play failed:", err);
        setIsPlaying(false);
      });
      setIsPlaying(true);

      const update = () => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
        animRef.current = requestAnimationFrame(update);
      };
      update();
    }
  }, [isPlaying]);

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  // Generate static waveform bars (deterministic based on duration)
  const barCount = 28;
  const bars = Array.from({ length: barCount }, (_, i) => {
    const seed = (i * 7 + 3) % 13;
    return 0.2 + (seed / 13) * 0.8;
  });

  return (
    <div className="flex items-center gap-2.5 min-w-[180px]">
      {/* Play/Pause button */}
      <button
        onClick={togglePlay}
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
          isMine
            ? "bg-background/20 hover:bg-background/30 text-background"
            : "bg-bronze/15 hover:bg-bronze/25 text-bronze"
        )}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4 fill-current" />
        ) : (
          <Play className="h-4 w-4 fill-current ml-0.5" />
        )}
      </button>

      {/* Waveform */}
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-end gap-[2px] h-5">
          {bars.map((height, i) => {
            const barProgress = (i / barCount) * 100;
            const isActive = barProgress <= progress;
            return (
              <div
                key={i}
                className={cn(
                  "w-[3px] rounded-full transition-colors duration-100 flex-shrink-0",
                  isActive
                    ? isMine ? "bg-background/80" : "bg-bronze"
                    : isMine ? "bg-background/25" : "bg-muted-foreground/25"
                )}
                style={{ height: `${height * 20}px` }}
              />
            );
          })}
        </div>

        {/* Time */}
        <span className={cn(
          "text-[10px] font-mono tabular-nums",
          isMine ? "text-background/60" : "text-muted-foreground"
        )}>
          {isPlaying ? formatTime(currentTime) : formatTime(audioDuration)}
        </span>
      </div>
    </div>
  );
};

export default VoiceNotePlayer;
