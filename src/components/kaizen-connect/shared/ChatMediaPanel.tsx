import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, File, Image as ImageIcon, Link2, FileSignature, Receipt, ExternalLink, Video, Play } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface MediaMessage {
  id: string;
  content: string | null;
  message_type: string;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  invoice_id: string | null;
  contract_id: string | null;
  created_at: string;
}

interface ChatMediaPanelProps {
  roomId: string;
  defaultTab?: TabType;
}

type TabType = "media" | "docs" | "links";

const ChatMediaPanel = ({ roomId, defaultTab = "media" }: ChatMediaPanelProps) => {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const [allMessages, setAllMessages] = useState<MediaMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchMedia = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("chat_messages")
        .select("id, content, message_type, file_url, file_name, file_type, file_size, invoice_id, contract_id, created_at")
        .eq("room_id", roomId)
        .in("message_type", ["file", "invoice", "contract", "text"])
        .order("created_at", { ascending: false });

      setAllMessages(data || []);
      setLoading(false);
    };
    fetchMedia();
  }, [roomId]);

  // Fetch signed URLs for all image/video attachments so thumbnails actually render
  useEffect(() => {
    if (allMessages.length === 0) return;

    const mediaMsgs = allMessages.filter(
      (m) =>
        m.message_type === "file" &&
        (m.file_type?.startsWith("image/") || m.file_type?.startsWith("video/")) &&
        m.file_url &&
        !m.file_url.startsWith("http")
    );

    if (mediaMsgs.length === 0) return;

    Promise.all(
      mediaMsgs.map(async (m) => {
        const { data } = await supabase.storage
          .from("chat-files")
          .createSignedUrl(m.file_url!, 3600);
        return data?.signedUrl ? { path: m.file_url!, url: data.signedUrl } : null;
      })
    ).then((results) => {
      const map: Record<string, string> = {};
      results.forEach((r) => { if (r) map[r.path] = r.url; });
      setSignedUrls(map);
    });
  }, [allMessages]);

  const getUrl = (fileUrl: string) => {
    if (fileUrl.startsWith("http")) return fileUrl;
    return signedUrls[fileUrl] ?? "";
  };

  const urlRegex = /(https?:\/\/[^\s]+)/g;

  // Media = images + videos
  const mediaItems = useMemo(
    () =>
      allMessages.filter(
        (m) =>
          m.message_type === "file" &&
          (m.file_type?.startsWith("image/") || m.file_type?.startsWith("video/"))
      ),
    [allMessages]
  );

  // Docs = non-image/non-video files + invoices + contracts
  const docItems = useMemo(
    () =>
      allMessages.filter(
        (m) =>
          (m.message_type === "file" &&
            !m.file_type?.startsWith("image/") &&
            !m.file_type?.startsWith("video/")) ||
          m.message_type === "invoice" ||
          m.message_type === "contract"
      ),
    [allMessages]
  );

  const linkItems = useMemo(() => {
    const links: { id: string; url: string; created_at: string }[] = [];
    allMessages.forEach((m) => {
      if (m.content) {
        const matches = m.content.match(urlRegex);
        if (matches) {
          matches.forEach((url) => links.push({ id: m.id + url, url, created_at: m.created_at }));
        }
      }
    });
    return links;
  }, [allMessages]);

  const tabs: { id: TabType; label: string; count: number }[] = [
    { id: "media", label: "Media", count: mediaItems.length },
    { id: "docs", label: "Docs", count: docItems.length },
    { id: "links", label: "Links", count: linkItems.length },
  ];

  const downloadFile = async (fileUrl: string, fileName: string) => {
    if (fileUrl.startsWith("http")) {
      const a = document.createElement("a");
      a.href = fileUrl;
      a.download = fileName;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
    const { data, error } = await supabase.storage.from("chat-files").download(fileUrl);
    if (error) {
      toast.error("Download failed");
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const groupByMonth = <T extends { created_at: string }>(items: T[]) => {
    const groups: { label: string; items: T[] }[] = [];
    let currentLabel = "";
    items.forEach((item) => {
      const label = format(new Date(item.created_at), "MMMM yyyy").toUpperCase();
      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ label, items: [item] });
      } else {
        groups[groups.length - 1].items.push(item);
      }
    });
    return groups;
  };

  return (
    <div className="mt-2">
      {/* Tabs */}
      <div className="flex border-b border-border relative">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 text-xs font-semibold tracking-wider uppercase text-center transition-colors relative ${
              activeTab === tab.id ? "text-bronze" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1 text-[10px] opacity-60">{tab.count}</span>
            )}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-bronze rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <ScrollArea className="h-[260px] mt-2">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-8">
            Loading...
          </div>
        ) : (
          <>
            {/* Media Tab — images + videos */}
            {activeTab === "media" && (
              mediaItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                  <ImageIcon className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-xs">No media shared yet</p>
                </div>
              ) : (
                <div className="space-y-3 px-1">
                  {groupByMonth(mediaItems).map((group) => (
                    <div key={group.label}>
                      <p className="text-[10px] font-bold text-muted-foreground tracking-wider mb-2">
                        {group.label}
                      </p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {group.items.map((item) => {
                          const isVideo = item.file_type?.startsWith("video/");
                          const url = item.file_url ? getUrl(item.file_url) : "";
                          return (
                            <button
                              key={item.id}
                              onClick={() => item.file_url && downloadFile(item.file_url, item.file_name || (isVideo ? "video" : "image"))}
                              className="aspect-square rounded-lg bg-muted overflow-hidden hover:opacity-80 transition-opacity relative group"
                            >
                              {url ? (
                                isVideo ? (
                                  <>
                                    <video
                                      src={url}
                                      className="w-full h-full object-cover"
                                      preload="metadata"
                                      muted
                                    />
                                    {/* Play overlay */}
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                      <div className="h-7 w-7 rounded-full bg-black/50 flex items-center justify-center">
                                        <Play className="h-3.5 w-3.5 text-white fill-white ml-0.5" />
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <img
                                    src={url}
                                    alt={item.file_name || "image"}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                )
                              ) : (
                                /* Loading skeleton while signed URL is being fetched */
                                <div className="w-full h-full flex items-center justify-center bg-bronze/10 animate-pulse">
                                  {isVideo
                                    ? <Video className="h-6 w-6 text-bronze/30" />
                                    : <ImageIcon className="h-6 w-6 text-bronze/30" />
                                  }
                                </div>
                              )}
                              {/* Download overlay on hover */}
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                <Download className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Docs Tab */}
            {activeTab === "docs" && (
              docItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                  <File className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-xs">No documents shared yet</p>
                </div>
              ) : (
                <div className="space-y-3 px-1">
                  {groupByMonth(docItems).map((group) => (
                    <div key={group.label}>
                      <p className="text-[10px] font-bold text-muted-foreground tracking-wider mb-2">
                        {group.label}
                      </p>
                      <div className="space-y-1.5">
                        {group.items.map((item) => {
                          const isInvoice = item.message_type === "invoice";
                          const isContract = item.message_type === "contract";
                          const Icon = isInvoice ? Receipt : isContract ? FileSignature : File;

                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                if (item.file_url) downloadFile(item.file_url, item.file_name || "file");
                              }}
                              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors text-left"
                            >
                              <div className="h-10 w-10 rounded-lg bg-bronze/10 flex items-center justify-center flex-shrink-0">
                                <Icon className="h-5 w-5 text-bronze" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">
                                  {isInvoice ? "Invoice" : isContract ? "Canvas" : item.file_name || "File"}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {item.file_size ? formatFileSize(item.file_size) + " • " : ""}
                                  {format(new Date(item.created_at), "MMM d, yyyy")}
                                </p>
                              </div>
                              {item.file_url && (
                                <Download className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Links Tab */}
            {activeTab === "links" && (
              linkItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                  <Link2 className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-xs">No links shared yet</p>
                </div>
              ) : (
                <div className="space-y-3 px-1">
                  {groupByMonth(linkItems).map((group) => (
                    <div key={group.label}>
                      <p className="text-[10px] font-bold text-muted-foreground tracking-wider mb-2">
                        {group.label}
                      </p>
                      <div className="space-y-1.5">
                        {group.items.map((item) => {
                          let displayUrl = item.url;
                          try {
                            const parsed = new URL(item.url);
                            displayUrl = parsed.hostname + (parsed.pathname !== "/" ? parsed.pathname : "");
                          } catch {}

                          return (
                            <a
                              key={item.id}
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors"
                            >
                              <div className="h-10 w-10 rounded-lg bg-bronze/10 flex items-center justify-center flex-shrink-0">
                                <Link2 className="h-5 w-5 text-bronze" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate text-foreground">{displayUrl}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {format(new Date(item.created_at), "MMM d, yyyy")}
                                </p>
                              </div>
                              <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </>
        )}
      </ScrollArea>
    </div>
  );
};

export default ChatMediaPanel;
