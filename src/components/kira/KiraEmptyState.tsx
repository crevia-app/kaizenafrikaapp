import { Sparkles } from "lucide-react";

interface ActiveProject {
  name: string;
  description?: string | null;
}

interface KiraEmptyStateProps {
  userName?: string | null;
  activeProject?: ActiveProject | null;
  onChipClick?: (text: string) => void;
}

const PROJECT_CHIPS = [
  "Summarise this project",
  "What tasks are outstanding?",
  "Draft a status update",
  "Generate a project timeline",
];

// Premium daily greetings — rotate by day of year, no username, no emoji.
const DAILY_GREETINGS = [
  "Hello.",
  "Welcome back.",
  "Ready when you are.",
  "What's on your mind?",
  "Let's get to work.",
  "What can I help you with?",
  "Good day.",
  "How can I assist?",
  "Hi there.",
  "At your service.",
  "What's the plan today?",
  "Ready to work.",
  "How can I help?",
  "What are we working on?",
  "Here whenever you need me.",
  "Let's build something great.",
  "What's on the agenda?",
  "Tell me what you need.",
  "How can I make your day easier?",
  "Greetings.",
  "Glad you're here.",
  "Welcome.",
  "Let's move.",
  "What's next?",
  "I'm here.",
  "What do you need today?",
  "Let's get things done.",
  "Standing by.",
  "Your move.",
  "How can I sharpen your day?",
  "Let's make it happen.",
  "Here for you.",
  "At the ready.",
  "What's the goal today?",
  "Hello, again.",
  "Let's do this.",
  "Good to connect.",
  "What are we solving today?",
  "Tell me everything.",
  "How can I help you win today?",
  "What's happening?",
  "Let's think through this.",
  "What needs your attention?",
];

function getDailyGreeting(): string {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const dayOfYear = Math.floor((Date.now() - start.getTime()) / 86_400_000);
  return DAILY_GREETINGS[dayOfYear % DAILY_GREETINGS.length];
}

const KiraEmptyState = ({
  activeProject,
  onChipClick,
}: KiraEmptyStateProps) => {
  const chips = activeProject ? PROJECT_CHIPS : [];
  const greeting = getDailyGreeting();

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-14 select-none">

      {/* ── Content layer (aura is rendered by parent — no internal orbs) ──── */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-lg w-full">

        {/* Kira icon badge + premium aura */}
        <div className="relative mb-6">
          {/* Massive aura orb — 300px centered on the icon, blur-[72px] creates the
              "expensive" atmospheric glow. Light mode: 25% opacity (warm peach on white).
              Dark mode: 45% opacity (vibrant accent on dark canvas). */}
          <div
            aria-hidden="true"
            className="absolute pointer-events-none opacity-25 dark:opacity-[0.45]"
            style={{
              width: "300px",
              height: "300px",
              background: "radial-gradient(ellipse at center, #F0782F 0%, #d96525 30%, transparent 68%)",
              borderRadius: "50%",
              filter: "blur(72px)",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          />
          <div
            className="relative z-10 flex items-center justify-center w-14 h-14 rounded-2xl"
            style={{
              background: "rgba(240, 120, 47, 0.12)",
              border: "1px solid rgba(240, 120, 47, 0.25)",
              boxShadow: "0 0 24px rgba(240, 120, 47, 0.18)",
            }}
          >
            <Sparkles
              className="w-6 h-6"
              style={{ color: "#F0782F", filter: "drop-shadow(0 0 8px rgba(240,120,47,0.6))" }}
            />
          </div>
        </div>

        {/* Greeting */}
        {activeProject ? (
          <>
            <h1
              className="font-vollkorn text-3xl md:text-4xl font-bold mb-3 animate-kira-greeting"
              style={{
                background: "linear-gradient(135deg, #F0782F 0%, #FF9A5C 50%, #CF5A1A 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {activeProject.name}
            </h1>
            <p
              className="font-poppins text-sm md:text-base text-muted-foreground mb-10 leading-relaxed animate-kira-greeting"
              style={{ animationDelay: "0.1s" }}
            >
              {activeProject.description || "Let's get to work. What do you need from Kira today?"}
            </p>
          </>
        ) : (
          <h1
            className="font-vollkorn text-3xl md:text-[2.25rem] font-bold mb-3 leading-tight text-foreground animate-kira-greeting"
          >
            {greeting}
          </h1>
        )}

        {/* Prompt chips */}
        <div
          className="flex flex-wrap gap-2.5 justify-center animate-kira-greeting"
          style={{ animationDelay: "0.22s" }}
        >
          {chips.map((chip) => (
            <button
              key={chip}
              onClick={() => onChipClick?.(chip)}
              className="
                font-poppins text-xs font-medium
                px-4 py-2.5 rounded-full
                bg-foreground/5 border border-foreground/10
                text-foreground/70 hover:text-foreground
                hover:bg-orange-500/10 hover:border-orange-400/40
                transition-all duration-300
              "
            >
              {chip}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KiraEmptyState;
