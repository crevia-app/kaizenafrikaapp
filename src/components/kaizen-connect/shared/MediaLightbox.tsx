import { useEffect } from "react";
import { X, Download } from "lucide-react";

interface MediaLightboxProps {
  media: { url: string; type: "video" | "image" } | null;
  onClose: () => void;
}

/**
 * MediaLightbox — full-screen overlay for video and image media.
 * Images already have their own Dialog-based lightbox in KaizenChat;
 * this component is used specifically for the video expand path.
 */
export function MediaLightbox({ media, onClose }: MediaLightboxProps) {
  // Close on Escape key
  useEffect(() => {
    if (!media) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [media, onClose]);

  if (!media) return null;

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = media.url;
    a.download = media.type === "video" ? "video.mp4" : "image";
    a.target = "_blank";
    a.click();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0A0A0A]/95 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Stop click propagation so tapping the media doesn't close */}
      <div
        className="relative flex items-center justify-center w-full h-full p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {media.type === "video" ? (
          <video
            src={media.url}
            controls
            autoPlay
            playsInline
            className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl"
          />
        ) : (
          <img
            src={media.url}
            alt="Full size"
            className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl"
          />
        )}
      </div>

      {/* Download — top left */}
      <button
        onClick={handleDownload}
        className="absolute top-4 left-4 h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-md flex items-center justify-center text-white transition-all"
        aria-label="Download"
      >
        <Download className="h-4 w-4" />
      </button>

      {/* Close — top right */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-md flex items-center justify-center text-white transition-all"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
