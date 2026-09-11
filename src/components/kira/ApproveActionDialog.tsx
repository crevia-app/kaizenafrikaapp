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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, FileSignature, Receipt, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Document {
  id: string;
  title?: string;
  invoice_number?: string;
  client_name: string;
  status: string;
}

interface ApproveActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CONTRACT_TRANSITIONS: Record<string, { value: string; label: string }[]> = {
  draft: [{ value: 'sent', label: 'Mark as Sent' }, { value: 'cancelled', label: 'Cancel' }],
  sent: [{ value: 'signed', label: 'Mark as Signed' }, { value: 'cancelled', label: 'Cancel' }],
  signed: [{ value: 'active', label: 'Mark as Active' }, { value: 'cancelled', label: 'Cancel' }],
  active: [{ value: 'completed', label: 'Mark as Completed' }, { value: 'cancelled', label: 'Cancel' }],
};

const INVOICE_TRANSITIONS: Record<string, { value: string; label: string }[]> = {
  draft: [{ value: 'sent', label: 'Mark as Sent' }, { value: 'cancelled', label: 'Cancel' }],
  sent: [{ value: 'paid', label: 'Mark as Paid' }, { value: 'overdue', label: 'Mark as Overdue' }, { value: 'cancelled', label: 'Cancel' }],
  overdue: [{ value: 'paid', label: 'Mark as Paid' }, { value: 'cancelled', label: 'Cancel' }],
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'text-muted-foreground',
  sent: 'text-blue-500',
  signed: 'text-purple-500',
  active: 'text-green-500',
  completed: 'text-green-600',
  paid: 'text-green-600',
  overdue: 'text-red-500',
  cancelled: 'text-red-400',
};

export function ApproveActionDialog({ open, onOpenChange }: ApproveActionDialogProps) {
  const [docType, setDocType] = useState<'canvas' | 'invoice'>('canvas');
  const [contracts, setContracts] = useState<Document[]>([]);
  const [invoices, setInvoices] = useState<Document[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelectedId('');
      setSelectedStatus('');
      setDone(false);
      return;
    }
    fetchDocuments();
  }, [open]);

  const fetchDocuments = async () => {
    setIsFetching(true);
    const [contractsRes, invoicesRes] = await Promise.all([
      supabase.from('canvases').select('id, title, client_name, status').not('status', 'in', '("completed","cancelled")').order('updated_at', { ascending: false }),
      supabase.from('invoices').select('id, invoice_number, client_name, status').not('status', 'in', '("paid","cancelled")').order('updated_at', { ascending: false }),
    ]);
    if (contractsRes.data) setContracts(contractsRes.data);
    if (invoicesRes.data) setInvoices(invoicesRes.data);
    setIsFetching(false);
  };

  const docs = docType === 'canvas' ? contracts : invoices;
  const selectedDoc = docs.find(d => d.id === selectedId);
  const transitions = selectedDoc
    ? (docType === 'canvas' ? CONTRACT_TRANSITIONS : INVOICE_TRANSITIONS)[selectedDoc.status] ?? []
    : [];

  const handleApprove = async () => {
    if (!selectedId || !selectedStatus) return;
    setIsLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Not authenticated');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/approve-action`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            document_type: docType === 'canvas' ? 'canvas' : 'invoice',
            document_id: selectedId,
            new_status: selectedStatus,
          }),
        }
      );

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Failed to update status');
      } else {
        setDone(true);
        toast.success(`${docType === 'canvas' ? 'Canvas' : 'Invoice'} updated to "${selectedStatus}"`);
        // Refresh lists
        await fetchDocuments();
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Approve or Update a Document</DialogTitle>
          <DialogDescription>
            Select a Canvas or invoice and move it to the next stage.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <p className="text-sm font-medium">Status updated successfully</p>
            <Button variant="outline" onClick={() => { setDone(false); setSelectedId(''); setSelectedStatus(''); }}>
              Update another
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Document type toggle */}
            <div className="flex rounded-lg border border-border/50 overflow-hidden">
              <button
                onClick={() => { setDocType('canvas'); setSelectedId(''); setSelectedStatus(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
                  docType === 'canvas' ? 'bg-bronze text-background' : 'hover:bg-muted/50 text-muted-foreground'
                }`}
              >
                <FileSignature className="w-4 h-4" />
                Canvas
              </button>
              <button
                onClick={() => { setDocType('invoice'); setSelectedId(''); setSelectedStatus(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
                  docType === 'invoice' ? 'bg-bronze text-background' : 'hover:bg-muted/50 text-muted-foreground'
                }`}
              >
                <Receipt className="w-4 h-4" />
                Invoices
              </button>
            </div>

            {isFetching ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : docs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No active {docType === 'canvas' ? 'Canvas' : 'invoices'} found.
              </p>
            ) : (
              <>
                {/* Document select */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Select {docType === 'canvas' ? 'Canvas' : 'Invoice'}</label>
                  <Select value={selectedId} onValueChange={(v) => { setSelectedId(v); setSelectedStatus(''); }}>
                    <SelectTrigger>
                      <SelectValue placeholder={`Choose a ${docType === 'canvas' ? 'Canvas' : 'invoice'}...`} />
                    </SelectTrigger>
                    <SelectContent>
                      {docs.map(doc => (
                        <SelectItem key={doc.id} value={doc.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {docType === 'canvas' ? doc.title : doc.invoice_number}
                            </span>
                            <span className="text-muted-foreground text-xs">— {doc.client_name}</span>
                            <span className={`text-xs capitalize ml-auto ${STATUS_COLORS[doc.status]}`}>
                              {doc.status}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Action select */}
                {selectedId && transitions.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Action</label>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose action..." />
                      </SelectTrigger>
                      <SelectContent>
                        {transitions.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedId && transitions.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    This {docType === 'canvas' ? 'Canvas' : 'invoice'} is already in a final state and cannot be updated.
                  </p>
                )}

                <Button
                  onClick={handleApprove}
                  disabled={!selectedId || !selectedStatus || isLoading}
                  className="w-full bg-bronze hover:bg-bronze/90 text-background"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Confirm
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
