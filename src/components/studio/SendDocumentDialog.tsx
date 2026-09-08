import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send, Receipt, FileSignature, Mail } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SendDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "invoice" | "contract" | "canvas";
  documentId: string;
  defaultEmail: string;
  documentLabel: string;
  onSent?: () => void;
}


export function SendDocumentDialog({
  open,
  onOpenChange,
  type,
  documentId,
  defaultEmail,
  documentLabel,
  onSent,
}: SendDocumentDialogProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const Icon = type === "invoice" ? Receipt : FileSignature;
  const fnName = type === "invoice" ? "invoice-send" : "canvas-send";
  const bodyKey = type === "invoice" ? "invoice_id" : "contract_id";

  useEffect(() => {
    if (open) {
      setEmail(defaultEmail);
      setNote("");
    }
  }, [open, defaultEmail]);

  const handleEmailSend = async () => {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Enter a valid email address");
      return;
    }

    setSending(true);
    try {
      if (trimmed !== defaultEmail) {
        const table = type === "invoice" ? "invoices" : "canvases";
        await supabase.from(table).update({ client_email: trimmed }).eq("id", documentId);
      }

      const { error, data } = await supabase.functions.invoke(fnName, {
        body: { [bodyKey]: documentId, note: note.trim() || undefined },
      });

      if (error) {
        let msg = error.message;
        try {
          const body = await (error as any).context?.json?.();
          if (body?.error) msg = body.error;
        } catch {}
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);

      toast.success(`${type === "invoice" ? "Invoice" : "Canvas"} sent!`, {
        description: `Sent to ${trimmed}. They'll receive an email and an in-app notification if they have a Kaizen Afrika account.`,
      });
      onSent?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Failed to send", { description: err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-bronze/10 flex items-center justify-center">
              <Icon className="w-4 h-4 text-bronze" />
            </div>
            <DialogTitle className="font-vollkorn text-lg">
              Send {type === "invoice" ? "Invoice" : "Canvas"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            {documentLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="send-email" className="text-sm font-medium">
                Recipient email
              </Label>
              <Input
                id="send-email"
                type="email"
                placeholder="client@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                They'll receive a full copy by email. If they have a Kaizen Afrika account, they'll also get an in-app notification and can view it under <strong>Received</strong>.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="send-note" className="text-sm font-medium">
                Personal note <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="send-note"
                placeholder="Hi — please find the attached invoice. Let me know if you have any questions."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="resize-none h-20 text-sm"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                disabled={sending}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-bronze hover:bg-bronze-dark text-white gap-1.5"
                onClick={handleEmailSend}
                disabled={sending}
              >
                <Send className="w-3.5 h-3.5" />
                {sending ? "Sending…" : "Send"}
              </Button>
            </div>
          </div>
      </DialogContent>
    </Dialog>
  );
}
