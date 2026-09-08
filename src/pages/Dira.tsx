import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { useVisualViewport } from "@/hooks/use-visual-viewport";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/use-subscription";
import { useLongPress } from "@/hooks/use-long-press";
import UsageLimitBanner from "@/components/subscription/UsageLimitBanner";
import {
  Lightbulb,
  Users,
  FileText,
  BarChart3,
  TrendingUp,
  Send,
  MessageSquare,
  Plus,
  Search,
  Paperclip,
  Trash2,
  PanelLeftClose,
  PanelLeft,
  Loader2,
  Sparkles,
  ArrowRight,
  FolderOpen,
  ChevronRight,
  Image,
  FileUp,
  X,
  FileSignature,
  Receipt,
  Copy,
  Check,
  Pencil,
  RotateCcw,
  Settings,
  MoreHorizontal,
  Pin,
  PinOff,
  Share2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { CreateProjectDialog } from "@/components/dira/CreateProjectDialog";
import { ProjectDetailSheet } from "@/components/dira/ProjectDetailSheet";
import { ProjectsView } from "@/components/dira/ProjectsView";
import CreateInvoiceDialog from "@/components/studio/CreateInvoiceDialog";
import { ApproveActionDialog } from "@/components/dira/ApproveActionDialog";
import { DiraSettingsPanel } from "@/components/dira/DiraSettingsPanel";
import DiraEmptyState from "@/components/dira/DiraEmptyState";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useUpgradeModal } from "@/components/subscription/UpgradeModal";
// useIOSKeyboardFit removed: it set position:fixed on the Dira container,
// which overlapped and hid the TopBar on iOS Safari (z-index conflict).
// The absolute/inset-0 scroll container + 100dvh AppLayout + useVisualViewport
// input padding handle the iOS keyboard layout correctly without that hook.


interface ChatHistory {
  id: string;
  title: string;
  timestamp: Date;
  project_id?: string | null;
  pinned?: boolean;
}

// ── Unified chat item — desktop (hover-reveal dot) + mobile (always-visible dot) ──
interface ChatItemProps {
  chat: ChatHistory;
  isActive: boolean;
  isRenaming: boolean;
  renameValue: string;
  indent?: boolean;
  isMobile?: boolean;
  onSelect: () => void;
  onRenameChange: (v: string) => void;
  onRenameSubmit: () => void;
  onRenameCancel: () => void;
  onStartRename: () => void;
  onPin: () => void;
  onDelete: () => void;
  onShare: () => void;
  onLongPress?: () => void;
  onLongPressStart?: () => void;
  onLongPressEnd?: () => void;
}

function ChatItem({
  chat, isActive, isRenaming, renameValue, indent = false, isMobile = false,
  onSelect, onRenameChange, onRenameSubmit, onRenameCancel, onStartRename,
  onPin, onDelete, onShare,
  onLongPress, onLongPressStart, onLongPressEnd,
}: ChatItemProps) {
  const [menuOpen, setMenuOpen]           = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const longPress = useLongPress(() => {
    setShowMobileMenu(true);
    setMenuOpen(true);
  }, { delay: 500 });

  const dotVisible = menuOpen || showMobileMenu;

  return (
    <div
      {...longPress}
      onClick={() => { if (!isRenaming) onSelect(); }}
      onContextMenu={(e) => { e.preventDefault(); setShowMobileMenu(true); setMenuOpen(true); }}
      className={cn(
        "group relative flex items-center gap-2 rounded-xl cursor-pointer select-none",
        "transition-all duration-150 ease-out",
        indent ? "py-1.5 pl-8 pr-2" : "py-2 px-2.5",
        isMobile && "min-h-[44px]",
        isActive
          ? "bg-foreground/[0.07] text-foreground"
          : [
              "text-gray-600 dark:text-gray-400",
              "hover:bg-gray-100 dark:hover:bg-[#1A1A1A]",
              "hover:text-gray-900 dark:hover:text-gray-100",
            ].join(" ")
      )}
    >
      {/* Left accent bar — active state */}
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-bronze" />
      )}

      {/* Icon */}
      <MessageSquare className={cn(
        "flex-shrink-0 transition-colors duration-150",
        indent ? "w-3.5 h-3.5" : "w-4 h-4",
        isActive ? "text-bronze" : "opacity-50"
      )} />

      {/* Title */}
      {isRenaming ? (
        <input
          autoFocus
          value={renameValue}
          onChange={(e) => onRenameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onRenameSubmit();
            if (e.key === 'Escape') onRenameCancel();
          }}
          onBlur={onRenameSubmit}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 bg-transparent text-sm font-medium outline-none border-b border-bronze/50 focus:border-bronze text-foreground min-w-0 py-0"
        />
      ) : (
        /* Simple truncate — replaces the maskImage approach which was consuming
           all flex space and leaving no room for the 3-dot button.             */
        <span className="flex-1 min-w-0 text-sm font-medium truncate">
          {chat.title}{chat.pinned ? " 📌" : ""}
        </span>
      )}

      {/* ── 3-dot menu ──────────────────────────────────────────────────────────
          Wrapped in flex-shrink-0 div to GUARANTEE the button always gets its
          32 px, regardless of how wide the title text wants to be. Without the
          wrapper, browsers can let the DropdownMenuTrigger slot shrink to 0 when
          the flex-1 title absorbs all available width.                         */}
      <div
        className={cn(
          "flex-shrink-0 transition-opacity duration-200",
          // Desktop: hidden until group-hover; mobile: hidden until long-press
          "opacity-0 md:group-hover:opacity-100",
          // Always visible when menu is open or long-press was triggered
          dotVisible && "opacity-100"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu
          open={menuOpen}
          onOpenChange={(open) => { setMenuOpen(open); if (!open) setShowMobileMenu(false); }}
        >
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded-lg",
                "text-gray-500 dark:text-gray-400",
                "hover:text-gray-900 dark:hover:text-gray-100",
                "hover:bg-gray-100 dark:hover:bg-[#1A1A1A]",
                "active:bg-gray-200 dark:active:bg-[#222]",
                "transition-colors duration-150"
              )}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={4}
            className="w-48 rounded-xl p-1.5 border border-border/40 bg-card/95 backdrop-blur-xl shadow-xl shadow-black/15"
          >
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onShare(); }}
              className="rounded-lg gap-2.5 cursor-pointer px-3 py-2 text-sm"
            >
              <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
              Share conversation
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onStartRename(); }}
              className="rounded-lg gap-2.5 cursor-pointer px-3 py-2 text-sm"
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onPin(); }}
              className="rounded-lg gap-2.5 cursor-pointer px-3 py-2 text-sm"
            >
              {chat.pinned
                ? <PinOff className="w-3.5 h-3.5 text-muted-foreground" />
                : <Pin className="w-3.5 h-3.5 text-muted-foreground" />}
              {chat.pinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1 opacity-50" />
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="rounded-lg gap-2.5 cursor-pointer px-3 py-2 text-sm text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex gap-3"
    >
      <div className="bg-muted rounded-2xl rounded-tl-md px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <motion.span
                key={i}
                className="block w-1.5 h-1.5 rounded-full bg-bronze"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
          <span className="text-sm text-muted-foreground">Thinking...</span>
        </div>
      </div>
    </motion.div>
  );
}

function StreamingCursor() {
  return (
    <motion.span
      animate={{ opacity: [1, 0] }}
      transition={{ duration: 0.48, repeat: Infinity, repeatType: "reverse" }}
      className="inline-block w-[2px] h-[1.1em] bg-[#F0782F] ml-0.5 align-[-0.15em] rounded-sm"
    />
  );
}

interface Message {
  role: "user" | "assistant";
  content: string;
  file?: string;
  timestamp?: Date;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  custom_instructions: string | null;
  created_at: string;
  updated_at: string;
}

type ViewMode = "chat" | "projects";

function detectDiraIntent(_text: string): string | null {
  // Action cards are disabled — users navigate to Kaizen Studio directly.
  return null;
}

// True when the device's primary pointer is touch (iPad, Android tablet, phones).
// Used to keep the 3-dot visible in the desktop sidebar on touch-primary devices.
const isTouchPrimary = window.matchMedia("(hover: none) and (pointer: coarse)").matches;

// True on phones/tablets — Enter key should insert a newline, not send.
const isMobileDevice =
  typeof window !== "undefined" &&
  (window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0);

// ── Shared typography for streaming + completed assistant bubbles ─────────────
// Defined outside the component so the object reference is stable across renders
// and ReactMarkdown never re-mounts its renderer tree during streaming.
const ASSISTANT_PROSE_CLASS =
  "font-sans antialiased leading-relaxed space-y-4 text-[15px] md:text-[16px]";

const markdownComponents: Components = {
  p:      ({ children }) => <p      className="font-sans leading-relaxed my-2 w-full">{children}</p>,
  strong: ({ children }) => <strong className="font-sans font-bold text-foreground">{children}</strong>,
  em:     ({ children }) => <em     className="font-sans italic opacity-90">{children}</em>,
  h1:     ({ children }) => <h1     className="font-sans font-semibold text-xl text-orange-500 mt-4 mb-2 tracking-tight">{children}</h1>,
  h2:     ({ children }) => <h2     className="font-sans font-semibold text-lg text-orange-500 mt-4 mb-2 tracking-tight">{children}</h2>,
  h3:     ({ children }) => <h3     className="font-sans font-semibold text-lg text-orange-500 mt-4 mb-2 tracking-tight">{children}</h3>,
  ul:     ({ children }) => <ul     className="list-disc pl-5 space-y-1.5 my-2 font-sans">{children}</ul>,
  ol:     ({ children }) => <ol     className="list-decimal pl-5 space-y-1.5 my-2 font-sans">{children}</ol>,
  li:     ({ children }) => <li     className="font-sans marker:text-orange-500">{children}</li>,
  code:   ({ children }) => <code   className="font-mono text-[13px] bg-muted px-1.5 py-0.5 rounded text-foreground">{children}</code>,
  pre:    ({ children }) => <pre    className="font-mono text-[13px] bg-muted border border-border rounded-xl p-3 overflow-x-auto my-3 text-foreground">{children}</pre>,
  a:      ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-orange-400 underline underline-offset-2 hover:opacity-80">{children}</a>,
  hr:     () => <hr className="border-border my-4" />,
};

const Dira = () => {
  const { toast } = useToast();
  const { diraActionsToday, diraActionsLimit, showDiraCounter, isFree } = useSubscription();
  const { openUpgradeModal } = useUpgradeModal();
  const { keyboardOpen } = useVisualViewport();
  const isAtDiraLimit = diraActionsToday >= diraActionsLimit;
  const [userType, setUserType] = useState<'creator' | 'brand' | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const messagesEndRef    = useRef<HTMLDivElement>(null);
  // Direct scroll-container ref — used for reliable programmatic scrollToBottom.
  // scrollIntoView() is unreliable on iOS/Android when the scroll container has
  // percentage-based children (it can't always identify the scrollable ancestor).
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Removed window.scrollTo(0,0) — it was fighting the inner scroll container
  // and causing sudden page jumps during conversation.

  const [userName, setUserName] = useState<string | null>(null);
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileContent, setSelectedFileContent] = useState<string | null>(null);
  const [selectedFileType, setSelectedFileType] = useState<'image' | 'text' | null>(null);
  
  // View modes and dialogs
  const [viewMode, setViewMode] = useState<ViewMode>("chat");
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectDetailOpen, setProjectDetailOpen] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [diraInvoiceContext, setDiraInvoiceContext] = useState<Record<string, unknown> | null>(null);

  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [memoryPanelOpen, setMemoryPanelOpen] = useState(false);
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [mobileLongPressChat, setMobileLongPressChat] = useState<ChatHistory | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamBufferRef = useRef('');
  const animFrameRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const networkDoneRef = useRef(false);
  // Accumulates chars already revealed to the user (for the final DB commit).
  const streamDisplayRef = useRef('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // When handleSend creates a new conversation it calls setActiveChat, which
  // triggers the loadMessages effect. That effect would overwrite the optimistic
  // user message with an empty DB result (nothing saved yet). This ref tells the
  // effect to skip the DB load for that one firing.
  const skipNextLoadRef = useRef(false);
  // Index of the single message that should animate in. -1 = none (history load).
  // Only the message the user just sent or the new assistant reply gets a fade-in.
  const newMessageIndexRef = useRef<number>(-1);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  // Smart auto-scroll: only pull to bottom if the user is already near it.
  // When the user scrolls up to read history, streaming chars don't fight them.
  const isNearBottomRef = useRef(true);
  // Tracks the pending rAF so we cancel before scheduling a new one.
  // Prevents multiple overlapping scroll mutations during streaming on iOS.
  const scrollRafRef = useRef<number | null>(null);

  // ── NEW: message interaction state ──
  const [editingMessageIdx, setEditingMessageIdx] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  // Separate streaming display state — keeps the messages array stable during streaming.
  const [streamingDisplay, setStreamingDisplay] = useState("");

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_type, display_name, handle')
          .eq('id', user.id)
          .single();

        if (profile) {
          setUserType(profile.user_type);
          setUserName(profile.display_name || profile.handle || null);
        }

        const { data: conversations, error } = await supabase
          .from('dira_conversations')
          .select('*')
          .order('updated_at', { ascending: false });

        if (!error && conversations) {
          setChatHistories(conversations.map(c => ({
            id: c.id,
            title: c.title,
            timestamp: new Date(c.updated_at),
            project_id: c.project_id,
            pinned: c.pinned ?? false,
          })));
          // Always land on a fresh new-chat state; user picks from sidebar to resume
        }

        const { data: projectsData, error: projectsError } = await supabase
          .from('dira_projects')
          .select('*')
          .order('updated_at', { ascending: false });

        if (!projectsError && projectsData) {
          setProjects(projectsData);
        }
        setIsLoadingProjects(false);
      }
      setIsLoadingHistory(false);
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    // Always start a newly-opened chat scrolled to the bottom.
    isNearBottomRef.current = true;
    const loadMessages = async () => {
      if (!activeChat) {
        setMessages([]);
        return;
      }

      // handleSend sets this flag when it creates a new conversation and has
      // already placed the optimistic user message. Skip the DB fetch so we
      // don't race-overwrite those messages with an empty result.
      if (skipNextLoadRef.current) {
        skipNextLoadRef.current = false;
        return;
      }

      const { data: msgs, error } = await supabase
        .from('dira_messages')
        .select('*')
        .eq('conversation_id', activeChat)
        .order('created_at', { ascending: true });

      if (!error && msgs) {
        // History load — suppress all entry animations so the list renders instantly.
        newMessageIndexRef.current = -1;
        setMessages(msgs.map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
          file: m.file_name || undefined,
          timestamp: new Date(m.created_at),
        })));
      }
    };

    loadMessages();
  }, [activeChat]);

  // TopBar hamburger fires this — opens mobile sheet or toggles desktop collapse
  useEffect(() => {
    const handler = () => {
      if (window.innerWidth < 768) {
        setMobileSidebarOpen(true);
      } else {
        setSidebarCollapsed(prev => !prev);
      }
    };
    window.addEventListener("dira:toggle-sidebar", handler);
    return () => window.removeEventListener("dira:toggle-sidebar", handler);
  }, []);

  // TopBar "Dira" wordmark fires this — resets to the new-chat landing state
  useEffect(() => {
    const handler = () => handleNewChat(null);
    window.addEventListener("dira:new-chat", handler);
    return () => window.removeEventListener("dira:new-chat", handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scroll path 1: non-streaming message updates ─────────────────────────
  // Cancelable rAF so React state batches don't queue multiple scroll ops.
  useEffect(() => {
    if (isStreaming) return; // streaming has its own direct path below
    const el = scrollContainerRef.current;
    if (!el || !isNearBottomRef.current) return;
    if (scrollRafRef.current !== null) cancelAnimationFrame(scrollRafRef.current);
    scrollRafRef.current = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
      scrollRafRef.current = null;
    });
    return () => {
      if (scrollRafRef.current !== null) cancelAnimationFrame(scrollRafRef.current);
    };
  }, [messages, isStreaming]);

  // ── Scroll path 2: active streaming — rAF-throttled ─────────────────────
  // One rAF per tick max: avoids forcing layout recalc on every 20ms token
  // update while still keeping scroll visually flush with new content.
  useEffect(() => {
    if (!isStreaming) return;
    const el = scrollContainerRef.current;
    if (!el || !isNearBottomRef.current) return;
    if (scrollRafRef.current !== null) return; // already queued
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollContainerRef.current?.scrollTo({ top: scrollContainerRef.current.scrollHeight });
      scrollRafRef.current = null;
    });
    return () => {
      if (scrollRafRef.current !== null) cancelAnimationFrame(scrollRafRef.current);
    };
  }, [streamingDisplay, isStreaming]);

  // Reset textarea height whenever input is cleared (after send or new chat).
  useEffect(() => {
    if (input === "" && textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input]);

  const saveMessage = async (conversationId: string, role: "user" | "assistant", content: string, fileName?: string) => {
    if (!content) {
      console.log("saveMessage skipped- content is empty");
      return;
    }
    const { error } = await supabase.from('dira_messages').insert({
      conversation_id: conversationId,
      role,
      content,
      file_name: fileName
    });

    if (error) {
      console.log("saveMessage error:", JSON.stringify(error));
      console.log("values:", { conversationId, role, content, fileName });
    }
  };

  const updateConversationTitle = async (conversationId: string, firstMessage: string) => {
    const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '');
    await supabase
      .from('dira_conversations')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', conversationId);
    
    setChatHistories(prev => prev.map(c => 
      c.id === conversationId ? { ...c, title, timestamp: new Date() } : c
    ));
  };

  const getActiveProject = () => {
    return projects.find(p => p.id === activeProjectId);
  };

  // Smooth text-reveal: drains streamBufferRef character-by-character at 50fps.
  // The messages array is NEVER modified during streaming — only streamingDisplay
  // state changes, so the rest of the conversation list is completely stable.
  // When all chars are revealed + network is done, the final content is committed
  // to the messages array in one atomic update and the stream is closed.
  useEffect(() => {
    if (!isStreaming) return;
    const INTERVAL_MS = 20;  // 50 fps
    const CHARS_PER_TICK = 5; // ~250 chars/sec — fast but visibly "typing"

    const tick = () => {
      const available = streamBufferRef.current;

      if (available.length > 0) {
        // Near the end: drain remaining buffer in one shot for a snappy finish.
        const batch = (networkDoneRef.current && available.length <= CHARS_PER_TICK * 4)
          ? available
          : available.slice(0, CHARS_PER_TICK);
        streamBufferRef.current = available.slice(batch.length);
        streamDisplayRef.current += batch;
        setStreamingDisplay(streamDisplayRef.current);
      }

      if (networkDoneRef.current && streamBufferRef.current.length === 0) {
        // All chars revealed — atomically commit to messages array.
        const finalContent = streamDisplayRef.current;
        if (finalContent.length > 0) {
          setMessages(prev => {
            newMessageIndexRef.current = -1; // content was already visible — skip entry animation
            return [...prev, { role: 'assistant', content: finalContent, timestamp: new Date() }];
          });
        }
        streamDisplayRef.current = '';
        setStreamingDisplay('');
        setIsStreaming(false);
        // Haptic tap on Android — gracefully ignored on iOS Safari.
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(50);
        }
        return;
      }

      animFrameRef.current = setTimeout(tick, INTERVAL_MS);
    };

    animFrameRef.current = setTimeout(tick, INTERVAL_MS);
    return () => {
      if (animFrameRef.current !== null) clearTimeout(animFrameRef.current);
    };
  }, [isStreaming]);

  // Broadcast streaming state so the bottom nav visibility hook can lock
  // itself and stop evaluating scroll deltas during AI response generation.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("dira:streaming", { detail: { active: isStreaming || isLoading } }));
  }, [isStreaming, isLoading]);

  const streamDiraResponse = useCallback(async (
    userMessages: Message[],
    conversationId: string,
    attachContent?: string | null,
    attachType?: 'image' | 'text' | null,
    projectCtx?: { name: string; description: string | null; custom_instructions: string | null } | null,
  ) => {
    const lastUserContent = userMessages[userMessages.length - 1].content;
    const history = userMessages.slice(-7, -1).map(m => ({ role: m.role, content: m.content }));

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error("Not authenticated");

    const body: Record<string, unknown> = { prompt: lastUserContent, history, conversationId };
    if (attachContent && attachType) {
      body.fileContent = attachContent;
      body.fileType = attachType;
    }
    if (projectCtx) {
      body.projectContext = projectCtx;
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dira-gpt`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      let msg = "Couldn't reach Dira right now. Please try again!";
      try {
        const body = await response.json();
        if (body?.error) msg = body.error;
      } catch { /* ignore */ }
      throw new Error(msg);
    }

    const contentType = response.headers.get('content-type') ?? '';

    // Streaming path — edge function returns text/plain
    if (contentType.includes('text/plain') && response.body) {
      streamBufferRef.current = '';
      networkDoneRef.current = false;
      streamDisplayRef.current = '';
      setStreamingDisplay('');
      setIsStreaming(true);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;
          streamBufferRef.current += chunk;
        }
        networkDoneRef.current = true;
      } catch (err) {
        streamBufferRef.current = '';
        networkDoneRef.current = true;
        throw err;
      }

      await saveMessage(conversationId, 'assistant', fullContent);
      return fullContent;
    }

    // Fallback: JSON (prompt-abuse reply or unexpected content-type)
    const data = await response.json();
    const assistantContent = data.reply;
    if (!assistantContent) throw new Error("Dira didn't respond. Please try again!");
    setMessages(prev => [...prev, { role: 'assistant', content: assistantContent, timestamp: new Date() }]);
    await saveMessage(conversationId, 'assistant', assistantContent);
    return assistantContent;
  }, [userType, activeProjectId, projects]);

  // ── NEW: copy handler ──
  const handleCopy = (content: string, idx: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  // ── NEW: send with optional override (used by retry/edit) ──
  const handleSend = async (overrideInput?: string) => {
    const messageContent = overrideInput ?? input;
    if (!messageContent.trim() && !selectedFile) return;
    if (!userId) {
      toast({
        title: "Please sign in",
        description: "You need to be logged in to chat with Dira",
        variant: "destructive",
      });
      return;
    }
    if (isAtDiraLimit) {
      if (isFree) {
        openUpgradeModal("Dira AI – Power Credits");
      } else {
        toast({
          title: "Monthly limit reached",
          description: "You've reached your monthly Dira limit. It resets on the 1st of next month.",
          variant: "destructive",
        });
      }
      return;
    }
    
    const newMessage: Message = { 
      role: "user", 
      content: messageContent,
      file: selectedFile?.name,
      timestamp: new Date(),
    };
    
    let conversationId = activeChat;
    
    if (!conversationId) {
      const { data: newConvo, error } = await supabase
        .from('dira_conversations')
        .insert({ 
          user_id: userId, 
          title: 'New conversation',
          project_id: activeProjectId 
        })
        .select()
        .single();
      
      if (error || !newConvo) {
        toast({
          title: "Error",
          description: "Couldn't start a new conversation",
          variant: "destructive",
        });
        return;
      }
      
      conversationId = newConvo.id;
      // Tell the activeChat effect to skip the DB load — messages are set below.
      skipNextLoadRef.current = true;
      setActiveChat(conversationId);
      setChatHistories(prev => [{
        id: newConvo.id,
        title: 'New conversation',
        timestamp: new Date(),
        project_id: activeProjectId
      }, ...prev]);
    }

    const updatedMessages = [...messages, newMessage];
    const attachContent = selectedFileContent;
    const attachType = selectedFileType;
    // User just sent — always scroll to their message regardless of where they were.
    isNearBottomRef.current = true;
    // Only the newly-sent user message + the upcoming assistant reply animate in.
    newMessageIndexRef.current = updatedMessages.length - 1;
    setMessages(updatedMessages);
    if (!overrideInput) setInput("");
    setSelectedFile(null);
    setSelectedFileContent(null);
    setSelectedFileType(null);
    setPendingAction(null);
    setDiraInvoiceContext(null);
    setIsLoading(true);

    await saveMessage(conversationId, "user", newMessage.content, newMessage.file);

    if (messages.length === 0) {
      await updateConversationTitle(conversationId, newMessage.content);
    }

    try {
      const activeProject = projects.find(p => p.id === activeProjectId);
      const projectCtx = activeProject
        ? { name: activeProject.name, description: activeProject.description, custom_instructions: activeProject.custom_instructions }
        : null;

      const responseContent = await streamDiraResponse(updatedMessages, conversationId, attachContent, attachType, projectCtx);

      if (responseContent) {
        const intent = detectDiraIntent(responseContent);
        if (intent) setPendingAction(intent);
      }

      const nowIso = new Date().toISOString();
      await supabase
        .from('dira_conversations')
        .update({ updated_at: nowIso })
        .eq('id', conversationId);

      // Keep project activity timestamp in sync so "Sort by Activity" is accurate
      if (activeProjectId) {
        await supabase
          .from('dira_projects')
          .update({ updated_at: nowIso })
          .eq('id', activeProjectId);
        setProjects(prev =>
          prev.map(p => p.id === activeProjectId ? { ...p, updated_at: nowIso } : p),
        );
      }

    } catch (error) {
      // Hard-stop any in-progress stream so the UI doesn't hang.
      if (animFrameRef.current !== null) clearTimeout(animFrameRef.current);
      streamBufferRef.current = '';
      streamDisplayRef.current = '';
      networkDoneRef.current = true;
      setStreamingDisplay('');
      setIsStreaming(false);
      toast({
        title: "Oops!",
        description: error instanceof Error ? error.message : "Couldn't reach Dira right now. Please try again!",
        variant: "destructive",
      });
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I had a little hiccup! Could you try asking me again?",
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // ── NEW: edit + retry handler ──
  const handleEditRetry = async (idx: number) => {
    const edited = editingContent.trim();
    if (!edited) return;

    // Slice off this message and everything after it
    const newMessages = messages.slice(0, idx);
    setMessages(newMessages);
    setEditingMessageIdx(null);
    setEditingContent("");

    // Send the edited content directly
    await handleSend(edited);
  };

  // ── NEW: retry without editing ──
  const handleRetry = async (content: string, idx: number) => {
    const newMessages = messages.slice(0, idx);
    setMessages(newMessages);
    await handleSend(content);
  };

  const handleNewChat = (projectId?: string | null) => {
    setActiveChat(null);
    setActiveProjectId(projectId ?? null);
    setMessages([]);
    setViewMode("chat");
  };

  const handleDeleteChat = async (chatId: string) => {
    const { error } = await supabase
      .from('dira_conversations')
      .delete()
      .eq('id', chatId);

    if (!error) {
      setChatHistories(prev => prev.filter(c => c.id !== chatId));
      if (activeChat === chatId) {
        const remaining = chatHistories.filter(c => c.id !== chatId);
        setActiveChat(remaining.length > 0 ? remaining[0].id : null);
      }
    }
    setChatToDelete(null);
  };

  const handlePinChat = async (chatId: string, currentlyPinned: boolean) => {
    const { error } = await supabase
      .from('dira_conversations')
      .update({ pinned: !currentlyPinned })
      .eq('id', chatId);
    if (!error) {
      setChatHistories(prev => prev.map(c =>
        c.id === chatId ? { ...c, pinned: !currentlyPinned } : c
      ));
    }
  };

  const handleRenameChat = async (chatId: string) => {
    const trimmed = renameValue.trim();
    setRenamingChatId(null);
    setRenameValue("");
    if (!trimmed) return;
    const { error } = await supabase
      .from('dira_conversations')
      .update({ title: trimmed })
      .eq('id', chatId);
    if (!error) {
      setChatHistories(prev => prev.map(c =>
        c.id === chatId ? { ...c, title: trimmed } : c
      ));
    }
  };

  const handleShareChat = async (chatId: string, chatTitle: string) => {
    const url = `${window.location.origin}/dira`;
    const shareData = {
      title: chatTitle,
      text: `Dira AI conversation: "${chatTitle}"`,
      url,
    };
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData);
      } catch {
        // user cancelled — no toast needed
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copied", description: chatTitle });
      } catch {
        toast({ title: "Couldn't copy link", variant: "destructive" });
      }
    }
  };

  const handleLongPressStart = (chat: ChatHistory) => {
    longPressTimerRef.current = setTimeout(() => {
      setMobileLongPressChat(chat);
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/") || item.type.startsWith("video/") || item.type === "application/pdf") {
        const file = item.getAsFile();
        if (!file) continue;
        // Route through the existing attachment flow via a synthetic ChangeEvent
        const dt = new DataTransfer();
        dt.items.add(file);
        handleFileSelect({ target: { files: dt.files, value: "" } } as unknown as React.ChangeEvent<HTMLInputElement>);
        e.preventDefault();
        break;
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isText = file.type === 'text/plain' || file.name.endsWith('.txt');

    if (!isImage && !isText) {
      toast({ title: "Unsupported file type", description: "Only images and .txt files are supported", variant: "destructive" });
      return;
    }

    setSelectedFile(file);

    if (isImage) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new window.Image();
        img.onload = () => {
          const MAX = 1024;
          let { width, height } = img;
          if (width > MAX || height > MAX) {
            const ratio = Math.min(MAX / width, MAX / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
          setSelectedFileContent(canvas.toDataURL('image/jpeg', 0.85));
          setSelectedFileType('image');
        };
        img.src = ev.target!.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setSelectedFileContent((ev.target!.result as string).slice(0, 6000));
        setSelectedFileType('text');
      };
      reader.readAsText(file);
    }
  };

  const handleSelectProject = async (projectId: string | null) => {
    setActiveProjectId(projectId);
    if (activeChat) {
      await supabase
        .from('dira_conversations')
        .update({ project_id: projectId })
        .eq('id', activeChat);
      setChatHistories(prev => prev.map(c =>
        c.id === activeChat ? { ...c, project_id: projectId } : c
      ));
    }
  };

  const handleProjectCreated = (project: Project) => {
    setProjects(prev => [project, ...prev]);
  };

  const handleProjectUpdated = (project: Project) => {
    setProjects(prev => prev.map(p => p.id === project.id ? project : p));
    setSelectedProject(project);
  };

  const handleProjectDeleted = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    if (activeProjectId === projectId) {
      setActiveProjectId(null);
    }
  };

  const handleConversationSelect = (conversationId: string, projectId: string) => {
    setActiveChat(conversationId);
    setActiveProjectId(projectId);
    setViewMode("chat");
  };

  const filteredChats = chatHistories.filter(chat =>
    chat.title !== 'New conversation' &&
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const generalChats = filteredChats.filter(c => !c.project_id);
  const projectChats = filteredChats.filter(c => c.project_id);
  const pinnedGeneralChats = generalChats.filter(c => c.pinned);
  const unpinnedGeneralChats = generalChats.filter(c => !c.pinned);

  const quickActions = userType === 'brand' ? [
    { icon: Users, label: "Find creators", prompt: "Help me find creators for my next campaign" },
    { icon: FileText, label: "Write a brief", prompt: "Help me write a campaign brief" },
    { icon: BarChart3, label: "Analyze ROI", prompt: "How do I measure influencer marketing ROI?" },
    { icon: TrendingUp, label: "Strategy tips", prompt: "Give me campaign optimization tips" },
  ] : [
    { icon: Lightbulb, label: "Content ideas", prompt: "Give me content ideas for this week" },
    { icon: FileText, label: "Write a pitch", prompt: "Help me write a brand pitch" },
    { icon: Users, label: "Find collabs", prompt: "How do I find brand collaborations?" },
    { icon: TrendingUp, label: "Growth tips", prompt: "Give me tips to grow my audience" },
  ];

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
  };

  const activeProject = getActiveProject();

  // const formatTime = (date?: Date) => {
  //   if (!date) return "";
  //   return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  // };

  return (
    <div ref={chatContainerRef} className="relative flex h-full w-full max-w-full overflow-hidden bg-background overscroll-none">
      {/* Desktop Sidebar */}
      <div 
        className={`hidden md:flex flex-col bg-card/50 border-r border-bronze/[0.10] transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-72'
        }`}
      >
        <div className="px-3 pt-3 pb-3">
          <Button
            onClick={() => handleNewChat(null)}
            className={`w-full gap-2 bg-bronze hover:bg-bronze/90 text-background font-poppins ${
              sidebarCollapsed ? 'px-0 justify-center' : 'justify-start'
            }`}
            size="sm"
          >
            <Plus className="w-4 h-4" />
            {!sidebarCollapsed && "New Chat"}
          </Button>
        </div>

        {!sidebarCollapsed && (
          <div className="px-3 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search chats..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm bg-muted/50 border-border/50"
              />
            </div>
          </div>
        )}

        {!sidebarCollapsed && (
          <div className="px-3 space-y-1 mb-2">
            <button
              onClick={() => setViewMode("chat")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                viewMode === "chat" ? "bg-bronze/10 text-foreground" : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Chats
            </button>
            <button
              onClick={() => setViewMode("projects")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                viewMode === "projects" ? "bg-bronze/10 text-foreground" : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              Projects
              <span className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">
                {projects.length}
              </span>
            </button>
          </div>
        )}

        {!sidebarCollapsed && viewMode === "chat" && (
          <>
            <div className="px-3 py-2">
              <p className="text-xs font-poppins font-medium text-muted-foreground uppercase tracking-wider">
                Recent Chats
              </p>
            </div>

            <div className={[
                "flex-1 min-h-0 overflow-y-auto overscroll-contain",
                "[&::-webkit-scrollbar]:w-1",
                "[&::-webkit-scrollbar-track]:bg-transparent",
                "[&::-webkit-scrollbar-thumb]:rounded-full",
                "[&::-webkit-scrollbar-thumb]:bg-border/40",
                "[&::-webkit-scrollbar-thumb:hover]:bg-border",
              ].join(" ")}>
              <div className="space-y-1 pb-3 px-2">
                {isLoadingHistory ? (
                  <div className="py-8 text-center">
                    <Loader2 className="w-5 h-5 mx-auto text-muted-foreground animate-spin mb-2" />
                    <p className="text-xs text-muted-foreground">Loading...</p>
                  </div>
                ) : generalChats.length === 0 && projectChats.length === 0 ? (
                  <div className="py-8 text-center">
                    <MessageSquare className="w-6 h-6 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-xs text-muted-foreground">
                      {searchQuery ? 'No chats found' : 'No chats yet'}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Pinned section */}
                    {pinnedGeneralChats.length > 0 && (
                      <div className="mb-1">
                        <p className="text-xs font-medium text-muted-foreground px-2 py-1.5 flex items-center gap-1.5">
                          <Pin className="w-3 h-3" /> Pinned
                        </p>
                        {pinnedGeneralChats.map((chat) => (
                          <ChatItem
                            key={chat.id}
                            chat={chat}
                            isActive={activeChat === chat.id}
                            isRenaming={renamingChatId === chat.id}
                            renameValue={renameValue}
                            isMobile={false}
                            onSelect={() => { setActiveChat(chat.id); setActiveProjectId(null); setViewMode("chat"); }}
                            onRenameChange={setRenameValue}
                            onRenameSubmit={() => handleRenameChat(chat.id)}
                            onRenameCancel={() => { setRenamingChatId(null); setRenameValue(""); }}
                            onStartRename={() => { setRenamingChatId(chat.id); setRenameValue(chat.title); }}
                            onPin={() => handlePinChat(chat.id, !!chat.pinned)}
                            onDelete={() => setChatToDelete(chat.id)}
                            onShare={() => handleShareChat(chat.id, chat.title)}
                          />
                        ))}
                      </div>
                    )}

                    {/* Recent chats */}
                    {unpinnedGeneralChats.map((chat) => (
                      <ChatItem
                        key={chat.id}
                        chat={chat}
                        isActive={activeChat === chat.id}
                        isRenaming={renamingChatId === chat.id}
                        renameValue={renameValue}
                        isMobile={false}
                        onSelect={() => { setActiveChat(chat.id); setActiveProjectId(null); setViewMode("chat"); }}
                        onRenameChange={setRenameValue}
                        onRenameSubmit={() => handleRenameChat(chat.id)}
                        onRenameCancel={() => { setRenamingChatId(null); setRenameValue(""); }}
                        onStartRename={() => { setRenamingChatId(chat.id); setRenameValue(chat.title); }}
                        onPin={() => handlePinChat(chat.id, !!chat.pinned)}
                        onDelete={() => setChatToDelete(chat.id)}
                        onShare={() => handleShareChat(chat.id, chat.title)}
                      />
                    ))}

                    {projects.map(project => {
                      const projectConversations = projectChats.filter(c => c.project_id === project.id);
                      if (projectConversations.length === 0) return null;
                      return (
                        <div key={project.id} className="mt-3">
                          <button
                            onClick={() => { setSelectedProject(project); setProjectDetailOpen(true); }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <FolderOpen className="w-3 h-3" />
                            <span className="truncate">{project.name}</span>
                            <ChevronRight className="w-3 h-3 ml-auto" />
                          </button>
                          <div className="space-y-1 mt-1">
                            {projectConversations.slice(0, 3).map((chat) => (
                              <ChatItem
                                key={chat.id}
                                chat={chat}
                                isActive={activeChat === chat.id}
                                isRenaming={renamingChatId === chat.id}
                                renameValue={renameValue}
                                indent
                                isMobile={false}
                                onSelect={() => { setActiveChat(chat.id); setActiveProjectId(project.id); setViewMode("chat"); }}
                                onRenameChange={setRenameValue}
                                onRenameSubmit={() => handleRenameChat(chat.id)}
                                onRenameCancel={() => { setRenamingChatId(null); setRenameValue(""); }}
                                onStartRename={() => { setRenamingChatId(chat.id); setRenameValue(chat.title); }}
                                onPin={() => handlePinChat(chat.id, !!chat.pinned)}
                                onDelete={() => setChatToDelete(chat.id)}
                                onShare={() => handleShareChat(chat.id, chat.title)}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {sidebarCollapsed && (
          <div className="flex flex-col items-center gap-2 px-2 flex-1">
            <Button variant="ghost" size="icon" onClick={() => { setSidebarCollapsed(false); setViewMode("chat"); }} className="w-10 h-10 text-muted-foreground hover:text-foreground">
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => { setSidebarCollapsed(false); setViewMode("projects"); }} className="w-10 h-10 text-muted-foreground hover:text-foreground">
              <FolderOpen className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Settings — pinned to bottom */}
        <div className={`border-t border-border/40 p-3 flex-shrink-0 ${sidebarCollapsed ? 'flex justify-center' : ''}`}>
          <button
            onClick={() => setMemoryPanelOpen(true)}
            className={`group flex flex-col items-start gap-1 rounded-xl transition-all duration-200 hover:bg-bronze/10 ${
              sidebarCollapsed ? 'p-2 items-center' : 'w-full py-2.5 pl-2'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-muted/60 group-hover:bg-bronze/15 border border-border/50 group-hover:border-bronze/30 flex items-center justify-center transition-all shadow-sm">
              <Settings className="w-4 h-4 text-muted-foreground group-hover:text-bronze transition-colors" />
            </div>
            {!sidebarCollapsed && (
              <span className="text-[10px] font-semibold text-muted-foreground group-hover:text-bronze transition-colors font-poppins tracking-wide uppercase">
                Settings
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="w-80 p-0 bg-card">
          <SheetHeader className="flex items-center px-4 border-b border-border/50 pb-3 pt-[env(safe-area-inset-top,16px)] min-h-14">
            <SheetTitle>
              <button
                onClick={() => { handleNewChat(null); setMobileSidebarOpen(false); }}
                className="font-vollkorn text-2xl font-bold text-foreground tracking-tight cursor-pointer hover:opacity-70 transition-opacity"
              >
                Dira
              </button>
            </SheetTitle>
          </SheetHeader>
          
          <div className="flex flex-col h-[calc(100%-56px)]">
            <div className="p-3">
              <Button onClick={() => { handleNewChat(null); setMobileSidebarOpen(false); }} className="w-full justify-start gap-2 bg-bronze hover:bg-bronze/90 text-background h-11 text-base">
                <Plus className="w-4 h-4" />
                New Chat
              </Button>
            </div>

            <div className="px-3 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search chats..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-11 text-base" />
              </div>
            </div>

            <div className="px-3 space-y-1 mb-2">
              <button onClick={() => setViewMode("chat")} className={`w-full flex items-center gap-2 px-3 py-3 min-h-[44px] rounded-lg text-sm transition-colors ${viewMode === "chat" ? "bg-bronze/10 text-foreground" : "text-muted-foreground hover:bg-muted/50"}`}>
                <MessageSquare className="w-4 h-4" />
                Chats
              </button>
              <button onClick={() => { setViewMode("projects"); setMobileSidebarOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-3 min-h-[44px] rounded-lg text-sm transition-colors ${viewMode === "projects" ? "bg-bronze/10 text-foreground" : "text-muted-foreground hover:bg-muted/50"}`}>
                <FolderOpen className="w-4 h-4" />
                Projects
                <span className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">{projects.length}</span>
              </button>
            </div>

            <div className="px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent Chats</p>
            </div>

            <div className={[
                "flex-1 min-h-0 overflow-y-auto overscroll-contain",
                "[&::-webkit-scrollbar]:w-1",
                "[&::-webkit-scrollbar-track]:bg-transparent",
                "[&::-webkit-scrollbar-thumb]:rounded-full",
                "[&::-webkit-scrollbar-thumb]:bg-border/40",
                "[&::-webkit-scrollbar-thumb:hover]:bg-border",
              ].join(" ")}>
              <div className="space-y-1 pb-3 px-2">
                {/* Pinned general chats */}
                {pinnedGeneralChats.length > 0 && (
                  <p className="text-xs font-medium text-muted-foreground px-2 py-1.5 flex items-center gap-1.5">
                    <Pin className="w-3 h-3" /> Pinned
                  </p>
                )}
                {pinnedGeneralChats.map((chat) => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    isActive={activeChat === chat.id}
                    isRenaming={renamingChatId === chat.id}
                    renameValue={renameValue}
                    isMobile
                    onSelect={() => { setActiveChat(chat.id); setActiveProjectId(null); setMobileSidebarOpen(false); setViewMode("chat"); }}
                    onRenameChange={setRenameValue}
                    onRenameSubmit={() => handleRenameChat(chat.id)}
                    onRenameCancel={() => { setRenamingChatId(null); setRenameValue(""); }}
                    onStartRename={() => { setRenamingChatId(chat.id); setRenameValue(chat.title); }}
                    onPin={() => handlePinChat(chat.id, !!chat.pinned)}
                    onDelete={() => setChatToDelete(chat.id)}
                    onShare={() => handleShareChat(chat.id, chat.title)}
                    onLongPress={() => setMobileLongPressChat(chat)}
                    onLongPressStart={() => handleLongPressStart(chat)}
                    onLongPressEnd={handleLongPressEnd}
                  />
                ))}

                {/* Unpinned general chats */}
                {unpinnedGeneralChats.map((chat) => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    isActive={activeChat === chat.id}
                    isRenaming={renamingChatId === chat.id}
                    renameValue={renameValue}
                    isMobile
                    onSelect={() => { setActiveChat(chat.id); setActiveProjectId(null); setMobileSidebarOpen(false); setViewMode("chat"); }}
                    onRenameChange={setRenameValue}
                    onRenameSubmit={() => handleRenameChat(chat.id)}
                    onRenameCancel={() => { setRenamingChatId(null); setRenameValue(""); }}
                    onStartRename={() => { setRenamingChatId(chat.id); setRenameValue(chat.title); }}
                    onPin={() => handlePinChat(chat.id, !!chat.pinned)}
                    onDelete={() => setChatToDelete(chat.id)}
                    onShare={() => handleShareChat(chat.id, chat.title)}
                    onLongPress={() => setMobileLongPressChat(chat)}
                    onLongPressStart={() => handleLongPressStart(chat)}
                    onLongPressEnd={handleLongPressEnd}
                  />
                ))}

                {/* Project groups — matches desktop sidebar grouping */}
                {projects.map(project => {
                  const projectConversations = projectChats.filter(c => c.project_id === project.id);
                  if (projectConversations.length === 0) return null;
                  return (
                    <div key={project.id} className="mt-3">
                      <button
                        onClick={() => { setSelectedProject(project); setProjectDetailOpen(true); setMobileSidebarOpen(false); }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors min-h-[36px]"
                      >
                        <FolderOpen className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate flex-1">{project.name}</span>
                        <ChevronRight className="w-3 h-3 flex-shrink-0" />
                      </button>
                      <div className="space-y-1 mt-1">
                        {projectConversations.slice(0, 3).map((chat) => (
                          <ChatItem
                            key={chat.id}
                            chat={chat}
                            isActive={activeChat === chat.id}
                            isRenaming={renamingChatId === chat.id}
                            renameValue={renameValue}
                            isMobile
                            indent
                            onSelect={() => { setActiveChat(chat.id); setActiveProjectId(project.id); setMobileSidebarOpen(false); setViewMode("chat"); }}
                            onRenameChange={setRenameValue}
                            onRenameSubmit={() => handleRenameChat(chat.id)}
                            onRenameCancel={() => { setRenamingChatId(null); setRenameValue(""); }}
                            onStartRename={() => { setRenamingChatId(chat.id); setRenameValue(chat.title); }}
                            onPin={() => handlePinChat(chat.id, !!chat.pinned)}
                            onDelete={() => setChatToDelete(chat.id)}
                            onShare={() => handleShareChat(chat.id, chat.title)}
                            onLongPress={() => setMobileLongPressChat(chat)}
                            onLongPressStart={() => handleLongPressStart(chat)}
                            onLongPressEnd={handleLongPressEnd}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Settings — pinned to bottom of mobile sidebar */}
            <div className="border-t border-border/40 p-3 flex-shrink-0">
              <button
                onClick={() => { setMemoryPanelOpen(true); setMobileSidebarOpen(false); }}
                className="group flex flex-col items-start gap-1 rounded-xl transition-all duration-200 hover:bg-bronze/10 w-full py-2.5 pl-2"
              >
                <div className="w-9 h-9 rounded-xl bg-muted/60 group-hover:bg-bronze/15 border border-border/50 group-hover:border-bronze/30 flex items-center justify-center transition-all shadow-sm">
                  <Settings className="w-4 h-4 text-muted-foreground group-hover:text-bronze transition-colors" />
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground group-hover:text-bronze transition-colors font-poppins tracking-wide uppercase">
                  Settings
                </span>
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full max-w-full overflow-hidden overscroll-none">

        {viewMode === "projects" ? (
          <ProjectsView
            projects={projects}
            isLoading={isLoadingProjects}
            onCreateProject={() => setCreateProjectOpen(true)}
            onSelectProject={(project) => { setSelectedProject(project); setProjectDetailOpen(true); }}
            onDeleteProject={handleProjectDeleted}
          />
        ) : (
        <div className="flex-1 flex flex-col min-w-0 relative">

          {/* ── Unified premium aura ──────────────────────────────────────────────
              Single atmospheric layer that spans the ENTIRE chat column — from the
              greeting down through the input bar — so the page reads as one canvas.
              All three orbs are positioned inside an overflow:hidden clip container
              so they never bleed outside the chat column into the sidebar.
              Only visible on the empty (new-chat) state.                         */}
          {messages.length === 0 && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
            >
              {/* Primary orb — upper-center, very soft ambient glow */}
              <div
                className="absolute"
                style={{
                  top: "-10%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "88%",
                  height: "65%",
                  background:
                    "radial-gradient(ellipse at center, rgba(240,120,47,0.20) 0%, rgba(207,90,26,0.10) 35%, transparent 65%)",
                  borderRadius: "50%",
                  filter: "blur(110px)",
                }}
              />
              {/* Bridge orb — centre connector, barely visible */}
              <div
                className="absolute"
                style={{
                  top: "48%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "58%",
                  height: "40%",
                  background:
                    "radial-gradient(ellipse at center, rgba(255,140,70,0.08) 0%, transparent 62%)",
                  borderRadius: "50%",
                  filter: "blur(80px)",
                }}
              />
              {/* Lower orb — floats behind input, very diffuse */}
              <div
                className="absolute"
                style={{
                  bottom: "-8%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "76%",
                  height: "54%",
                  background:
                    "radial-gradient(ellipse at center, rgba(232,99,28,0.16) 0%, rgba(184,68,10,0.07) 38%, transparent 66%)",
                  borderRadius: "50%",
                  filter: "blur(120px)",
                }}
              />
            </div>
          )}

          {/* Project Context Banner */}
          {activeProject && (
            <button
              onClick={() => { setSelectedProject(activeProject); setProjectDetailOpen(true); }}
              className="flex items-center gap-2 px-4 py-3 min-h-[44px] bg-bronze/5 border-b border-bronze/20 hover:bg-bronze/10 transition-colors"
            >
              <FolderOpen className="w-4 h-4 text-bronze" />
              <span className="text-sm font-medium">{activeProject.name}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
            </button>
          )}

          {/* Messages Area
              Native overflow-y-auto is used here instead of Radix <ScrollArea>
              because Radix injects a display:table wrapper that confuses iOS Safari
              and Android Chrome touch-scroll detection. A plain div with
              touch-pan-y + overscroll-y-contain is the correct cross-platform
              primitive for a chat message list. */}
          {/* Messages wrapper — flex col so the banner stays pinned at top
              and the scroll region fills all remaining height.
              The inner "relative flex-1 min-h-0" div gives the absolutely-
              positioned scroll child a definite pixel height, which is the only
              100%-reliable cross-browser way to get overflow-y: auto to scroll
              on Android Chrome and iOS Safari inside a deep flex chain. */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative z-10">
            {showDiraCounter && (
              <UsageLimitBanner
                current={diraActionsToday}
                limit={diraActionsLimit}
                feature="Dira AI prompts"
              />
            )}
            <div className="relative flex-1 min-h-0">
            <div
              ref={scrollContainerRef}
              className="absolute inset-0 overflow-y-auto overscroll-y-contain touch-pan-y transform-gpu"
              style={{ overflowAnchor: "none", contain: "strict", willChange: "transform", WebkitOverflowScrolling: "touch" }}
              onScroll={() => {
                const el = scrollContainerRef.current;
                if (!el) return;
                isNearBottomRef.current =
                  el.scrollHeight - el.scrollTop - el.clientHeight < 150;
              }}
            >
              {messages.length === 0 ? (
                /* ── Premium animated empty state ────────────────────────── */
                <DiraEmptyState
                  userName={userName}
                  activeProject={activeProject ?? null}
                  onChipClick={(text) => setInput(text)}
                />
              ) : (
                <div className="px-4 py-6">
                  <div className="w-full">
                    <div className="space-y-6 py-4">
                      {messages.map((msg, idx) => (
                        <motion.div
                          key={idx}
                          initial={idx === newMessageIndexRef.current ? { opacity: 0, y: 6 } : false}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.18, ease: "easeOut" }}
                          onMouseEnter={() => setHoveredIdx(idx)}
                          onMouseLeave={() => setHoveredIdx(null)}
                          className="group"
                        >
                          <div className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            {msg.role === 'user' && (
                              <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-bronze text-background">
                                <span className="text-xs font-semibold">You</span>
                              </div>
                            )}

                            <div className={`flex-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                              
                              {/* ── EDIT MODE ── */}
                              {editingMessageIdx === idx ? (
                                <div className="inline-flex flex-col gap-2 max-w-[85%] w-full text-left">
                                  <textarea
                                    value={editingContent}
                                    onChange={(e) => setEditingContent(e.target.value)}
                                    className="w-full rounded-2xl px-4 py-3 text-base bg-muted border border-bronze/50 focus:outline-none focus:ring-1 focus:ring-bronze resize-none"
                                    rows={3}
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleEditRetry(idx);
                                      }
                                      if (e.key === 'Escape') setEditingMessageIdx(null);
                                    }}
                                  />
                                  <div className="flex gap-2 justify-end">
                                    <button
                                      onClick={() => { setEditingMessageIdx(null); setEditingContent(""); }}
                                      className="px-3 py-1.5 text-xs rounded-lg border border-border/50 text-muted-foreground hover:bg-muted transition-colors"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => handleEditRetry(idx)}
                                      className="px-3 py-1.5 text-xs rounded-lg bg-bronze text-background hover:bg-bronze/90 transition-colors"
                                    >
                                      Resend
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {/* ── MESSAGE BUBBLE ── */}
                                  <div
                                    className={cn(
                                      "rounded-2xl px-4 py-3",
                                      msg.role === 'user'
                                        ? 'inline-block max-w-[85%] bg-bronze text-background rounded-tr-md'
                                        : 'block w-full bg-muted rounded-tl-md'
                                    )}
                                  >
                                    {msg.role === 'assistant' ? (
                                      <div className={`${ASSISTANT_PROSE_CLASS} max-w-none text-left [&>*:first-child]:mt-0 [&>*:last-child]:mb-0`}>
                                        <ReactMarkdown components={markdownComponents}>{msg.content}</ReactMarkdown>
                                      </div>
                                    ) : (
                                      <p className="text-base whitespace-pre-wrap text-left">
                                        {msg.content}
                                      </p>
                                    )}
                                    {msg.file && (
                                      <div className="mt-2 flex items-center gap-2 text-xs opacity-70">
                                        <Paperclip className="w-3 h-3" />
                                        {msg.file}
                                      </div>
                                    )}
                                  </div>

                                 

                                  {/* ── ACTION BUTTONS: always visible on mobile, hover-reveal on desktop ── */}
                                  <div className={`flex items-center gap-1 mt-1 transition-opacity duration-150 opacity-60 md:opacity-0 md:group-hover:opacity-100 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <button
                                      onClick={() => handleCopy(msg.content, idx)}
                                      className="flex items-center gap-1.5 px-2.5 py-2 min-h-[44px] rounded-lg text-xs text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted transition-all border border-transparent hover:border-border/50"
                                    >
                                      {copiedIdx === idx ? (
                                        <><Check className="w-3 h-3 text-green-500" /><span className="hidden sm:inline text-green-500">Copied</span></>
                                      ) : (
                                        <><Copy className="w-3 h-3" /><span className="hidden sm:inline">Copy</span></>
                                      )}
                                    </button>

                                    {msg.role === 'user' && (
                                      <>
                                        <button
                                          onClick={() => { setEditingMessageIdx(idx); setEditingContent(msg.content); }}
                                          className="flex items-center gap-1.5 px-2.5 py-2 min-h-[44px] rounded-lg text-xs text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted transition-all border border-transparent hover:border-border/50"
                                        >
                                          <Pencil className="w-3 h-3" />
                                          <span className="hidden sm:inline">Edit</span>
                                        </button>
                                        <button
                                          onClick={() => handleRetry(msg.content, idx)}
                                          className="flex items-center gap-1.5 px-2.5 py-2 min-h-[44px] rounded-lg text-xs text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted transition-all border border-transparent hover:border-border/50"
                                        >
                                          <RotateCcw className="w-3 h-3" />
                                          <span className="hidden sm:inline">Retry</span>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Action card — shown below last assistant message */}
                          {msg.role === 'assistant' && idx === messages.length - 1 && !isLoading && !isStreaming &&
                            (pendingAction === 'open_invoice' || pendingAction === 'open_approve') && (
                            <div className="ml-11 mt-3">
                              {pendingAction === 'open_invoice' && (
                                <button onClick={() => setInvoiceDialogOpen(true)} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-bronze/40 bg-bronze/5 hover:bg-bronze/10 hover:border-bronze/60 transition-all text-left w-fit">
                                  <div className="p-1.5 rounded-lg bg-bronze/15 text-bronze"><Receipt className="w-4 h-4" /></div>
                                  <div><p className="text-sm font-medium">Create Invoice</p><p className="text-xs text-muted-foreground">Open the invoice builder</p></div>
                                  <ArrowRight className="w-4 h-4 text-bronze ml-2" />
                                </button>
                              )}
                              {pendingAction === 'open_approve' && (
                                <button onClick={() => setApproveDialogOpen(true)} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-bronze/40 bg-bronze/5 hover:bg-bronze/10 hover:border-bronze/60 transition-all text-left w-fit">
                                  <div className="p-1.5 rounded-lg bg-bronze/15 text-bronze"><FileSignature className="w-4 h-4" /></div>
                                  <div><p className="text-sm font-medium">Approve / Update Document</p><p className="text-xs text-muted-foreground">Move an invoice to the next stage</p></div>
                                  <ArrowRight className="w-4 h-4 text-bronze ml-2" />
                                </button>
                              )}
                            </div>
                          )}
                        </motion.div>
                      ))}
                      
                      {/* Standalone streaming bubble ─────────────────────────────────
                          Lives outside the messages array so the rest of the list never
                          re-renders during streaming.  Shows plain text (no ReactMarkdown)
                          to prevent layout jumps from partially-formed markdown tokens.
                          When the stream finishes, this bubble vanishes and the final
                          message is committed to `messages` in the same React batch. */}
                      <AnimatePresence>
                        {isStreaming && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="group"
                          >
                            <div className="flex gap-3">
                              <div className="flex-1">
                                <div className="block w-full bg-muted rounded-2xl rounded-tl-md px-4 py-3">
                                  <div className={`${ASSISTANT_PROSE_CLASS} max-w-none text-left [&>*:first-child]:mt-0 [&>*:last-child]:mb-0`}>
                                    <span className="whitespace-pre-wrap">{streamingDisplay}</span>
                                    <StreamingCursor />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Thinking indicator — shown before streaming begins */}
                      <AnimatePresence>
                        {isLoading && !isStreaming && messages[messages.length - 1]?.role === 'user' && (
                          <ThinkingIndicator />
                        )}
                      </AnimatePresence>
                      <div ref={messagesEndRef} className="h-px w-full" />
                    </div>
                  </div>
                </div>
              )}
            </div>{/* end scroll container */}
            </div>{/* end positioned wrapper */}
          </div>{/* end messages wrapper */}

          {/* Input Area
              When on the empty (new-chat) state the wrapper is transparent so the
              unified aura behind it shows through.  Once the conversation starts it
              gets bg-background to keep the messages readable while scrolling.
              Bottom padding uses --nav-bottom-offset so it contracts in sync
              with the bottom nav sliding away. On desktop the variable is 0px
              (set in :root) so md:p-6 wins via the inline-style guard below. */}
          <div
            className={`w-full flex-shrink-0 pt-3 px-4 relative z-10 transition-[padding-bottom,background-color] duration-300 ease-in-out md:p-6 ${messages.length === 0 ? 'bg-transparent' : 'bg-background'}`}
            style={
              // Only apply the dynamic padding on mobile — on desktop let md:p-6
              // handle it so the inline style doesn't override the 24 px desktop value.
              window.innerWidth < 768
                ? {
                    paddingBottom: keyboardOpen
                      ? "0.75rem"   // 12 px — keyboard is up, no nav gap needed
                      : "calc(var(--nav-bottom-offset) + 0.75rem)", // nav height + gap
                  }
                : undefined
            }
          >
            <div className="max-w-2xl mx-auto">
              {/* File attachment preview */}
              {selectedFile && (
                <div className="mb-2 flex items-center gap-2 px-4 py-2 bg-muted rounded-2xl text-sm border border-border/50">
                  {selectedFileType === 'image' && selectedFileContent ? (
                    <img src={selectedFileContent} alt="preview" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                  ) : (
                    <Paperclip className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="flex-1 truncate text-foreground/80">{selectedFile.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedFile(null); setSelectedFileContent(null); setSelectedFileType(null); }} className="h-9 w-9 p-0 hover:bg-destructive/10 rounded-full flex-shrink-0">
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}

              {/* Smart input — single line on load, grows up to ~5 lines */}
              <div className="flex items-end gap-1 bg-muted/40 rounded-2xl border border-border/60 px-2 py-1.5 shadow-sm transition-all duration-200 focus-within:border-bronze/50 focus-within:bg-card focus-within:shadow-md">
                <input type="file" ref={imageInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />
                <input type="file" ref={textInputRef} onChange={handleFileSelect} className="hidden" accept=".txt,text/plain" />

                {/* Plus / attachment menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full hover:bg-background/80 flex-shrink-0">
                      <Plus className="w-5 h-5 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuItem onClick={() => imageInputRef.current?.click()} className="gap-3 cursor-pointer">
                      <Image className="w-4 h-4 text-muted-foreground" />
                      <div className="flex flex-col"><span className="font-medium">Add images</span><span className="text-xs text-muted-foreground">Photos, screenshots, charts</span></div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => textInputRef.current?.click()} className="gap-3 cursor-pointer">
                      <FileUp className="w-4 h-4 text-muted-foreground" />
                      <div className="flex flex-col"><span className="font-medium">Add files</span><span className="text-xs text-muted-foreground">.txt files only</span></div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="gap-3 cursor-pointer">
                        <FolderOpen className="w-4 h-4 text-muted-foreground" />
                        <div className="flex flex-col text-left">
                          <span className="font-medium">Use project</span>
                          <span className="text-xs text-muted-foreground truncate max-w-[130px]">
                            {activeProject ? activeProject.name : 'Add project context'}
                          </span>
                        </div>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-52">
                        {activeProjectId && (
                          <>
                            <DropdownMenuItem onClick={() => handleSelectProject(null)} className="gap-2 cursor-pointer text-muted-foreground">
                              <X className="w-3.5 h-3.5" />
                              <span className="text-sm">Remove project</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        {projects.length === 0 ? (
                          <DropdownMenuItem onClick={() => setCreateProjectOpen(true)} className="gap-2 cursor-pointer">
                            <Plus className="w-3.5 h-3.5" />
                            <span className="text-sm">Create first project</span>
                          </DropdownMenuItem>
                        ) : (
                          <>
                            {projects.map(p => (
                              <DropdownMenuItem key={p.id} onClick={() => handleSelectProject(p.id)} className="gap-2 cursor-pointer">
                                <FolderOpen className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                <span className="text-sm truncate flex-1">{p.name}</span>
                                {activeProjectId === p.id && <Check className="w-3.5 h-3.5 text-bronze flex-shrink-0" />}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setCreateProjectOpen(true)} className="gap-2 cursor-pointer text-muted-foreground">
                              <Plus className="w-3.5 h-3.5" />
                              <span className="text-sm">New project</span>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Smart textarea — desktop: Enter sends / Shift+Enter newline; mobile: Enter = newline */}
                <textarea
                  ref={textareaRef}
                  value={input}
                  rows={1}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (isMobileDevice) return; // mobile: natural newline
                      if (!e.shiftKey && !isLoading && !isAtDiraLimit) {
                        e.preventDefault();
                        handleSend();
                      }
                      // shift+enter on desktop: natural newline
                    }
                  }}
                  placeholder={
                    isAtDiraLimit
                      ? "Daily limit reached · Upgrade to continue"
                      : isLoading
                        ? "Dira is responding..."
                        : activeProject
                          ? `Ask Dira about ${activeProject.name}...`
                          : "Ask Dira anything..."
                  }
                  onPaste={handlePaste}
                  className="border-none outline-none ring-0 focus:ring-0 focus:outline-none bg-transparent text-base px-2 flex-1 min-w-0 resize-none overflow-hidden leading-relaxed py-1.5 min-h-[36px] max-h-[120px] placeholder:text-muted-foreground/60"
                  disabled={isAtDiraLimit}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="sentences"
                  spellCheck={false}
                  data-form-type="other"
                />

                {/* Send button — always visible; disabled when nothing to send */}
                <Button
                  onClick={() => handleSend()}
                  disabled={isLoading || isAtDiraLimit || (!input.trim() && !selectedFile)}
                  size="icon"
                  className="h-11 w-11 rounded-full bg-bronze hover:bg-bronze/90 text-background flex-shrink-0 disabled:opacity-30 transition-opacity"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>

            </div>
          </div>
        </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateProjectDialog
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
        userId={userId ?? ""}
        onProjectCreated={handleProjectCreated}
      />

      <ProjectDetailSheet
        project={selectedProject}
        open={projectDetailOpen}
        onOpenChange={setProjectDetailOpen}
        onProjectUpdated={handleProjectUpdated}
        onProjectDeleted={handleProjectDeleted}
        onConversationSelect={handleConversationSelect}
        onNewChat={(projectId) => handleNewChat(projectId)}
      />

      <CreateInvoiceDialog
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
        onSuccess={() => setInvoiceDialogOpen(false)}
        diraContext={diraInvoiceContext}
      />

      <ApproveActionDialog
        open={approveDialogOpen}
        onOpenChange={setApproveDialogOpen}
      />

      {userId && (
        <DiraSettingsPanel
          open={memoryPanelOpen}
          onOpenChange={setMemoryPanelOpen}
          userId={userId}
        />
      )}

      {/* Mobile long-press chat actions */}
      <Sheet open={!!mobileLongPressChat} onOpenChange={(open) => { if (!open) setMobileLongPressChat(null); }}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8">
          <SheetHeader className="pb-3">
            <SheetTitle className="text-sm font-medium truncate text-left">
              {mobileLongPressChat?.title}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-1">
            <button
              onClick={() => {
                handleShareChat(mobileLongPressChat!.id, mobileLongPressChat!.title);
                setMobileLongPressChat(null);
              }}
              className="w-full flex items-center gap-3 px-3 py-3 min-h-[44px] rounded-xl hover:bg-muted transition-colors text-left"
            >
              <Share2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Share conversation</span>
            </button>
            <button
              onClick={() => {
                handlePinChat(mobileLongPressChat!.id, !!mobileLongPressChat!.pinned);
                setMobileLongPressChat(null);
              }}
              className="w-full flex items-center gap-3 px-3 py-3 min-h-[44px] rounded-xl hover:bg-muted transition-colors text-left"
            >
              {mobileLongPressChat?.pinned
                ? <PinOff className="w-4 h-4 text-muted-foreground" />
                : <Pin className="w-4 h-4 text-muted-foreground" />}
              <span className="text-sm font-medium">{mobileLongPressChat?.pinned ? 'Unpin' : 'Pin'}</span>
            </button>
            <button
              onClick={() => {
                setRenamingChatId(mobileLongPressChat!.id);
                setRenameValue(mobileLongPressChat!.title);
                setActiveChat(mobileLongPressChat!.id);
                setMobileLongPressChat(null);
                setMobileSidebarOpen(true);
              }}
              className="w-full flex items-center gap-3 px-3 py-3 min-h-[44px] rounded-xl hover:bg-muted transition-colors text-left"
            >
              <Pencil className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Rename</span>
            </button>
            <button
              onClick={() => {
                setChatToDelete(mobileLongPressChat!.id);
                setMobileLongPressChat(null);
              }}
              className="w-full flex items-center gap-3 px-3 py-3 min-h-[44px] rounded-xl hover:bg-destructive/10 text-destructive transition-colors text-left"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm font-medium">Delete</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Chat delete confirmation */}
      <AlertDialog open={!!chatToDelete} onOpenChange={(open) => { if (!open) setChatToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This conversation will be permanently deleted and cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => chatToDelete && handleDeleteChat(chatToDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dira;