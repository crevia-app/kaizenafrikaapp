import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { HelpCircle, CheckCircle, MessageSquare } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const Help = () => {
  const { t } = useLanguage();
  const [subject, setSubject]         = useState("");
  const [message, setMessage]         = useState("");
  const [ticketType, setTicketType]   = useState<"general" | "bug">("general");
  const [submitting, setSubmitting]   = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [tickets, setTickets]       = useState<any[]>([]);

  useEffect(() => { loadTickets(); }, []);

  const loadTickets = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase
      .from("support_tickets" as any)
      .select("id, subject, message, status, admin_reply, replied_at, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setTickets(data ?? []);
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Please fill in both fields");
      return;
    }
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      const { error } = await supabase.from("support_tickets" as any).insert({
        user_id: session.user.id,
        subject: subject.trim(),
        message: message.trim(),
        type: ticketType,
      });
      if (error) throw error;

      setSubmitted(true);
      setSubject("");
      setMessage("");
      loadTickets();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background">
      <div className="container mx-auto px-6 py-12 max-w-5xl space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <HelpCircle className="w-8 h-8 text-bronze" />
            <h1 className="font-vollkorn text-4xl font-bold">{t("help.title")}</h1>
          </div>
          <p className="text-muted-foreground">{t("help.subtitle")}</p>
        </div>

        {/* Submit form */}
        <Card className="p-8">
          <h2 className="font-vollkorn text-2xl font-bold mb-6">{t("help.contactSupport")}</h2>

          {submitted ? (
            <div className="flex flex-col items-center py-10 text-center gap-3">
              <CheckCircle className="w-12 h-12 text-bronze" />
              <p className="font-semibold text-lg">Request submitted!</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                We'll review your request and get back to you as soon as possible.
              </p>
              <Button variant="outline" className="mt-2" onClick={() => setSubmitted(false)}>
                Submit another
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Ticket type */}
              <div className="flex gap-2">
                {([
                  { id: "general" as const, label: "General support" },
                  { id: "bug"     as const, label: "Bug report" },
                ]).map(opt => (
                  <button key={opt.id} type="button" onClick={() => setTicketType(opt.id)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-sm font-medium border transition-all",
                      ticketType === opt.id
                        ? "bg-bronze/10 border-bronze/40 text-bronze"
                        : "border-border text-muted-foreground hover:border-bronze/20"
                    )}>{opt.label}</button>
                ))}
              </div>
              <Input
                placeholder={t("help.subject")}
                value={subject}
                onChange={e => setSubject(e.target.value)}
              />
              <Textarea
                placeholder={t("help.describeIssue")}
                rows={5}
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-bronze hover:bg-bronze-dark"
              >
                {submitting ? "Submitting…" : t("help.submitRequest")}
              </Button>
            </div>
          )}
        </Card>

        {/* Past tickets */}
        {tickets.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-semibold text-base">Your support history</h2>
            </div>
            <div className="space-y-3">
              {tickets.map(tk => (
                <Card key={tk.id} className="p-5 space-y-3">
                  {/* Ticket header */}
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{tk.subject}</p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {tk.type === "bug" && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">Bug</span>
                      )}
                      <span className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                        tk.status === "closed"
                          ? "bg-muted text-muted-foreground border-border"
                          : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      )}>{tk.status}</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(tk.created_at), "dd MMM yyyy")}</span>
                    </div>
                  </div>

                  {/* User message */}
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{tk.message}</p>

                  {/* Admin reply */}
                  {tk.admin_reply && (
                    <div className="bg-bronze/5 border border-bronze/20 rounded-xl p-4">
                      <p className="text-[11px] text-bronze font-semibold mb-1.5">
                        Response from Kaizen Afrika · {tk.replied_at ? format(new Date(tk.replied_at), "dd MMM yyyy") : ""}
                      </p>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{tk.admin_reply}</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Help;
