import { useState, useEffect, useCallback, useRef } from "react";

const toDateStr = (d: Date) => d.toISOString().split("T")[0];
const addDays = (dateStr: string, days: number) => {
  const d = new Date(dateStr); d.setDate(d.getDate() + days); return toDateStr(d);
};
import SuccessOverlay from "@/components/ui/SuccessOverlay";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Trash2, Receipt, Users, ChevronDown, ChevronUp, BookUser, CreditCard, X as XIcon } from "lucide-react";
import { toast } from "sonner";
import ClientAddressBook, { type SavedClient } from "@/components/studio/ClientAddressBook";
import { useSubscription } from "@/hooks/use-subscription";
import { useUpgradeModal } from "@/components/subscription/UpgradeModal";

interface InvoiceItem {
  id?: string;
  description: string;
  quantity: string;
  unit_price: string;
  total: number;
}

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingInvoice?: any;
  onSuccess: (invoice?: any) => void;
  onCreated?: (id: string) => void;
  folderId?: string | null;
  kiraContext?: Record<string, unknown> | null;
}

interface PaymentDetails {
  method: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  branchCode: string;
  reference: string;
  instructions: string;
}

const defaultPaymentDetails: PaymentDetails = {
  method: "", accountName: "", bankName: "",
  accountNumber: "", branchCode: "", reference: "", instructions: "",
};

// Field labels per payment method — only keys present are rendered
const PAYMENT_METHOD_FIELDS: Record<string, Partial<Record<keyof PaymentDetails, string>>> = {
  "Bank Transfer": {
    accountName:   "Account Holder Name",
    bankName:      "Bank Name",
    accountNumber: "Account Number",
    branchCode:    "Branch / SWIFT / Sort Code",
    reference:     "Payment Reference",
  },
  "M-Pesa": {
    accountName:   "Business / Person Name",
    accountNumber: "Till No. · Paybill · Phone",
    reference:     "Account No. / Reference",
  },
};

const currencies = [
  { code: "KES", name: "Kenyan Shilling" },
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "NGN", name: "Nigerian Naira" },
  { code: "ZAR", name: "South African Rand" },
  { code: "GHS", name: "Ghanaian Cedi" },
  { code: "TZS", name: "Tanzanian Shilling" },
  { code: "UGX", name: "Ugandan Shilling" },
];

const CreateInvoiceDialog = ({
  open,
  onOpenChange,
  editingInvoice,
  onSuccess,
  onCreated,
  folderId,
  kiraContext,
}: CreateInvoiceDialogProps) => {
  const { limits } = useSubscription();
  const { openUpgradeModal } = useUpgradeModal();
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const createdInvoiceRef = useRef<any>(null);
  const [invoiceAccentColor, setInvoiceAccentColor] = useState("#B07D3A");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const today = toDateStr(new Date());
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState(addDays(today, 30));
  const [currency, setCurrency] = useState("KES");
  const [taxRate, setTaxRate] = useState<string>("");
  const [discountAmount, setDiscountAmount] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("Payment is due within 30 days of invoice date.");
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: "", quantity: "", unit_price: "", total: 0 },
  ]);
  // Payment details
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>(defaultPaymentDetails);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);

  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null);

  // Address book state
  const [savedClients, setSavedClients] = useState<SavedClient[]>([]);
  const [autofillOpen, setAutofillOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [saveToBook, setSaveToBook] = useState(false);
  const [addressBookOpen, setAddressBookOpen] = useState(false);

  // Effect 1 — synchronous form reset the moment the dialog opens
  useEffect(() => {
    if (!open) return;
    if (editingInvoice) {
      setInvoiceNumber(editingInvoice.invoice_number);
      setClientName(editingInvoice.client_name);
      setClientEmail(editingInvoice.client_email || "");
      setClientAddress(editingInvoice.client_address || "");
      setIssueDate(editingInvoice.issue_date);
      setDueDate(editingInvoice.due_date);
      setCurrency(editingInvoice.currency);
      setTaxRate(editingInvoice.tax_rate ? String(editingInvoice.tax_rate) : "");
      setDiscountAmount(editingInvoice.discount_amount ? String(editingInvoice.discount_amount) : "");
      setNotes(editingInvoice.notes || "");
      setTerms(editingInvoice.terms || "");
      if (editingInvoice.payment_details) {
        setPaymentDetails({ ...defaultPaymentDetails, ...editingInvoice.payment_details });
        setShowPaymentDetails(true);
      } else {
        setPaymentDetails(defaultPaymentDetails);
        setShowPaymentDetails(false);
      }
      fetchItems(editingInvoice.id);
    } else {
      // Immediate sync reset with defaults (settings will override below)
      generateInvoiceNumber();
      setClientName(""); setClientEmail(""); setClientAddress("");
      const t = toDateStr(new Date());
      setIssueDate(t);
      setDueDate(addDays(t, 30)); setDiscountAmount(""); setNotes("");
      setCurrency("KES");
      setTaxRate("");
      setTerms("Payment is due within 30 days of invoice date.");
      setItems([{ description: "", quantity: "", unit_price: "", total: 0 }]);
      setPaymentDetails(defaultPaymentDetails);
      setShowPaymentDetails(false);

      // Kira context
      if (kiraContext) {
        if (kiraContext.client_name) setClientName(kiraContext.client_name as string);
        if (kiraContext.client_email) setClientEmail(kiraContext.client_email as string);
        if (kiraContext.currency) setCurrency(kiraContext.currency as string);
        if (kiraContext.notes) setNotes(kiraContext.notes as string);
        if (Array.isArray(kiraContext.items) && kiraContext.items.length > 0) {
          setItems(
            (kiraContext.items as Array<{ description: string; quantity: number; unit_price: number }>).map(
              (item) => ({
                description: item.description || "",
                quantity: String(item.quantity || 1),
                unit_price: String(item.unit_price || 0),
                total: (item.quantity || 1) * (item.unit_price || 0),
              })
            )
          );
        }
      }
    }
  }, [open, editingInvoice, kiraContext]);

  // Effect 2 — async settings fetch for currency and payment terms defaults only
  useEffect(() => {
    if (!open || editingInvoice) return;

    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled || !session) return;

      const { data: bs } = await (supabase as any)
        .from("business_settings")
        .select("default_currency, default_payment_terms, invoice_accent_color, invoice_payment_details")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (cancelled || !bs) return;
      if (bs.default_currency) setCurrency(bs.default_currency);
      if (bs.default_payment_terms) setTerms(bs.default_payment_terms);
      if (bs.invoice_accent_color) setInvoiceAccentColor(bs.invoice_accent_color);
      if (bs.invoice_payment_details?.method) {
        setPaymentDetails({ ...defaultPaymentDetails, ...bs.invoice_payment_details });
        setShowPaymentDetails(true);
      }
    })();

    return () => { cancelled = true; };
  }, [open, editingInvoice]);

  // Effect 3 — fetch saved clients for autofill
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await (supabase as any)
        .from("saved_clients")
        .select("*")
        .eq("user_id", session.user.id)
        .order("client_name", { ascending: true });
      setSavedClients(data || []);
    })();
  }, [open]);

  const applyClient = (client: SavedClient) => {
    setClientName(client.client_name);
    setClientEmail(client.client_email || "");
    setClientAddress(client.billing_address || "");
    setAutofillOpen(false);
    setClientSearch("");
    toast.success(`Autofilled from ${client.client_name}`);
  };

  const filteredClients = savedClients.filter(c =>
    c.client_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.client_email || "").toLowerCase().includes(clientSearch.toLowerCase())
  );

  const fetchItems = async (invoiceId: string) => {
    const { data } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoiceId);

    if (data && data.length > 0) {
      setItems(data.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: String(item.quantity),
        unit_price: String(item.unit_price),
        total: Number(item.total),
      })));
    }
  };

  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    setInvoiceNumber(`INV-${year}${month}-${random}`);
  };

  const updateItemTotal = (index: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === "quantity" || field === "unit_price") {
      const qty = parseFloat(newItems[index].quantity) || 0;
      const price = parseFloat(newItems[index].unit_price) || 0;
      newItems[index].total = qty * price;
    }
    
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { description: "", quantity: "", unit_price: "", total: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((acc, item) => acc + item.total, 0);
    const numTaxRate = parseFloat(taxRate) || 0;
    const numDiscount = parseFloat(discountAmount) || 0;
    const taxAmount = subtotal * (numTaxRate / 100);
    const total = subtotal + taxAmount - numDiscount;
    return { subtotal, taxAmount, total };
  };

  const handleSubmit = async () => {
    if (!clientName || !dueDate || items.some((i) => !i.description)) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to create invoices");
        return;
      }

      const { subtotal, taxAmount, total } = calculateTotals();

      if (editingInvoice) {
        // Update invoice
        const { error: invoiceError } = await supabase
          .from("invoices")
          .update({
            invoice_number: invoiceNumber,
            client_name: clientName,
            client_email: clientEmail || null,
            client_address: clientAddress || null,
            issue_date: issueDate,
            due_date: dueDate,
            currency,
            tax_rate: parseFloat(taxRate) || 0,
            tax_amount: taxAmount,
            discount_amount: parseFloat(discountAmount) || 0,
            subtotal,
            total,
            notes: notes || null,
            terms: terms || null,
            payment_details: (showPaymentDetails && paymentDetails.method)
              ? paymentDetails as any : null,
          })
          .eq("id", editingInvoice.id);

        if (invoiceError) throw invoiceError;

        // Delete existing items and insert new ones
        await supabase.from("invoice_items").delete().eq("invoice_id", editingInvoice.id);

        const { error: itemsError } = await supabase.from("invoice_items").insert(
          items.map((item) => ({
            invoice_id: editingInvoice.id,
            description: item.description,
            quantity: parseFloat(item.quantity) || 0,
            unit_price: parseFloat(item.unit_price) || 0,
            total: item.total,
          }))
        );

        if (itemsError) throw itemsError;

        onSuccess();
        onOpenChange(false);
        toast.success("Invoice updated");
      } else {
        const { data: invoice, error: invoiceError } = await supabase
          .from("invoices")
          .insert({
            user_id: session.user.id,
            invoice_number: invoiceNumber,
            client_name: clientName,
            client_email: clientEmail || null,
            client_address: clientAddress || null,
            issue_date: issueDate,
            due_date: dueDate,
            currency,
            tax_rate: parseFloat(taxRate) || 0,
            tax_amount: taxAmount,
            discount_amount: parseFloat(discountAmount) || 0,
            subtotal,
            total,
            notes: notes || null,
            terms: terms || null,
            payment_details: (showPaymentDetails && paymentDetails.method)
              ? paymentDetails as any : null,
            accent_color: invoiceAccentColor,
            folder_id: folderId ?? null,
          })
          .select()
          .single();

        if (invoiceError) throw invoiceError;

        // Insert items
        const { error: itemsError } = await supabase.from("invoice_items").insert(
          items.map((item) => ({
            invoice_id: invoice.id,
            description: item.description,
            quantity: parseFloat(item.quantity) || 0,
            unit_price: parseFloat(item.unit_price) || 0,
            total: item.total,
          }))
        );

        if (itemsError) throw itemsError;

        if (invoice?.id) {
          createdInvoiceRef.current = invoice;
          onCreated?.(invoice.id);
        }

        // Save client to address book if requested
        if (saveToBook && clientName) {
          await (supabase as any).from("saved_clients").upsert(
            {
              user_id: session.user.id,
              client_name: clientName,
              client_email: clientEmail || null,
              billing_address: clientAddress || null,
            },
            { onConflict: "user_id,client_name", ignoreDuplicates: false }
          );
          setSaveToBook(false);
        }

        onSuccess();        // refresh list immediately — don't wait for overlay
        onOpenChange(false);
        setShowSuccess(true);
      }
    } catch (error: any) {
      if (error.message?.includes("invoice_limit_reached")) {
        toast.error("Monthly limit reached", {
          description: "Free plan allows 2 invoices per month. Upgrade to Pro for unlimited.",
        });
      } else {
        toast.error(error.message || "Failed to save invoice");
      }
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, taxAmount, total } = calculateTotals();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  return (
    <>
    <SuccessOverlay
      show={showSuccess}
      title="Invoice Created"
      subtitle="Your invoice is ready to send"
      onComplete={() => { setShowSuccess(false); onSuccess(createdInvoiceRef.current); createdInvoiceRef.current = null; }}
    />
    <ClientAddressBook
      open={addressBookOpen}
      onOpenChange={open => {
        setAddressBookOpen(open);
        // Refresh client list when address book closes
        if (!open) {
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) return;
            (supabase as any)
              .from("saved_clients")
              .select("*")
              .eq("user_id", session.user.id)
              .order("client_name", { ascending: true })
              .then(({ data }: { data: SavedClient[] | null }) => setSavedClients(data || []));
          });
        }
      }}
    />
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-16px)] sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden [&>button:last-child]:hidden">
        <div className="flex items-center justify-between w-full pb-4 border-b border-white/10">
          <DialogTitle className="flex items-center gap-2 font-vollkorn text-xl">
            <Receipt className="h-5 w-5 text-bronze" />
            {editingInvoice ? "Edit Invoice" : "Create New Invoice"}
          </DialogTitle>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0" onClick={() => onOpenChange(false)}>
            <XIcon className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-6 w-full min-w-0">
          {/* Invoice Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Invoice Name</Label>
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="mt-1 h-11 text-base"
              />
            </div>
            <div>
              <Label>Issue Date</Label>
              <Input
                type="date"
                value={issueDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setIssueDate(val);
                  // Keep due date at least 1 day ahead of the new issue date
                  if (dueDate && dueDate <= val) setDueDate(addDays(val, 30));
                }}
                className="mt-1 h-11 text-base"
              />
            </div>
            <div>
              <Label>Due Date *</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) return;
                  setDueDate(val);
                }}
                className="mt-1 h-11 text-base"
              />
            </div>
          </div>

          {/* Client Details */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-xl">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground">Client Information</h3>
              <div className="flex items-center gap-2">
                {/* Autofill combobox */}
                <Popover open={autofillOpen} onOpenChange={setAutofillOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs border-bronze/30 text-bronze hover:bg-bronze/5">
                      <Users className="h-3.5 w-3.5" />
                      Autofill
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-2" align="end">
                    <Input
                      placeholder="Search saved clients..."
                      value={clientSearch}
                      onChange={e => setClientSearch(e.target.value)}
                      className="mb-2 h-11 text-base"
                      autoFocus
                    />
                    <div className="max-h-48 overflow-y-auto space-y-0.5">
                      {filteredClients.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          {savedClients.length === 0 ? "No saved clients yet" : "No matches"}
                        </p>
                      ) : (
                        filteredClients.map(client => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => applyClient(client)}
                            className="w-full text-left px-3 py-3 min-h-[44px] rounded-lg hover:bg-muted/60 transition-colors"
                          >
                            <p className="text-sm font-medium text-foreground leading-tight">{client.client_name}</p>
                            {client.client_email && (
                              <p className="text-xs text-muted-foreground mt-0.5">{client.client_email}</p>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Manage address book */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setAddressBookOpen(true)}
                >
                  <BookUser className="h-3.5 w-3.5" />
                  Manage
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Client Name *</Label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Company or individual name"
                  className="mt-1 h-11 text-base"
                />
              </div>
              <div>
                <Label>Client Email</Label>
                <Input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="mt-1 h-11 text-base"
                />
              </div>
            </div>
            <div>
              <Label>Client Address</Label>
              <Textarea
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                placeholder="Full address"
                className="mt-1 h-11 text-base"
                rows={2}
              />
            </div>

            {/* Save to address book — only shown for new invoices with a client name */}
            {!editingInvoice && clientName.trim() && (
              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="save-to-book"
                  checked={saveToBook}
                  onCheckedChange={v => setSaveToBook(!!v)}
                  className="border-bronze/50 data-[state=checked]:bg-bronze data-[state=checked]:border-bronze"
                />
                <Label htmlFor="save-to-book" className="text-xs text-muted-foreground cursor-pointer font-normal">
                  Save <span className="font-medium text-foreground">{clientName}</span> to my Client Address Book for future invoices
                </Label>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Line Items</h3>
              <Button variant="outline" onClick={addItem} className="h-11 gap-1">
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </div>

            {/* Column Headers — hidden on mobile, shown on sm+ */}
            <div className="hidden sm:grid grid-cols-12 gap-2 mb-1">
              <div className="col-span-5">
                <Label className="text-xs text-muted-foreground font-medium">Description</Label>
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground font-medium">Qty</Label>
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground font-medium">Unit Price</Label>
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground font-medium">Total</Label>
              </div>
              <div className="col-span-1" />
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex flex-col sm:grid sm:grid-cols-12 gap-2 p-3 sm:p-0 rounded-xl sm:rounded-none border sm:border-0 border-border bg-muted/20 sm:bg-transparent">
                  {/* Description — full width on mobile, col-span-5 on desktop */}
                  <div className="sm:col-span-5">
                    <Label className="text-xs text-muted-foreground sm:hidden mb-1 block">Description</Label>
                    <Input
                      placeholder="Service or product name"
                      value={item.description}
                      onChange={(e) => updateItemTotal(index, "description", e.target.value)}
                      className="h-11 text-base"
                    />
                  </div>
                  {/* Qty / Price / Total in a row on mobile */}
                  <div className="grid grid-cols-3 gap-2 sm:contents">
                    <div className="sm:col-span-2">
                      <Label className="text-xs text-muted-foreground sm:hidden mb-1 block">Qty</Label>
                      <Input
                        type="number"
                        placeholder="1"
                        value={item.quantity}
                        onChange={(e) => updateItemTotal(index, "quantity", e.target.value)}
                        min={1}
                        className="h-11 text-base"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-xs text-muted-foreground sm:hidden mb-1 block">Unit Price</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={item.unit_price}
                        onChange={(e) => updateItemTotal(index, "unit_price", e.target.value)}
                        min={0}
                        className="h-11 text-base"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-xs text-muted-foreground sm:hidden mb-1 block">Total</Label>
                      <Input
                        value={formatCurrency(item.total)}
                        disabled
                        className="bg-muted h-11 text-base"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-1 flex sm:block justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPendingDeleteIndex(index)}
                      disabled={items.length === 1}
                      className="h-11 w-11 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Currency and Tax */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="mt-1 h-11 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code} - {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tax Rate (%)</Label>
              <Input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                placeholder="0"
                className="mt-1 h-11 text-base"
                min={0}
                max={100}
              />
            </div>
            <div>
              <Label>Discount</Label>
              <Input
                type="number"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                placeholder="0"
                className="mt-1 h-11 text-base"
                min={0}
              />
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gradient-to-r from-bronze/10 to-transparent p-4 rounded-xl space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            {(parseFloat(taxRate) || 0) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax ({taxRate}%)</span>
                <span className="font-medium">{formatCurrency(taxAmount)}</span>
              </div>
            )}
            {(parseFloat(discountAmount) || 0) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount</span>
                <span className="font-medium text-emerald-500">-{formatCurrency(parseFloat(discountAmount) || 0)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-semibold pt-2 border-t border-border">
              <span>Total</span>
              <span className="text-bronze">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Notes and Terms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes for the client"
                className="mt-1 text-base"
                rows={3}
              />
            </div>
            <div>
              <Label>Payment Terms</Label>
              <Textarea
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Payment terms and conditions"
                className="mt-1 text-base"
                rows={3}
              />
            </div>
          </div>

          {/* Payment Details */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                if (!limits.hasInvoiceCustomization) { openUpgradeModal("Custom Payment Details"); return; }
                setShowPaymentDetails((v) => !v);
              }}
              className="w-full flex items-center justify-between gap-2 p-3.5 rounded-xl border border-dashed border-border hover:border-bronze/50 hover:bg-bronze/5 transition-all duration-200 group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-bronze/10 flex items-center justify-center flex-shrink-0 group-hover:bg-bronze/20 transition-colors">
                  <CreditCard className="h-4 w-4 text-bronze" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground leading-tight">
                    Payment Details
                    {!limits.hasInvoiceCustomization && <span className="ml-2 text-[10px] font-semibold text-bronze border border-bronze/40 rounded-full px-1.5 py-0.5">Pro</span>}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    {showPaymentDetails ? "Shown on invoice" : "Add bank / M-Pesa / PayPal info to your invoice"}
                  </p>
                </div>
              </div>
              {showPaymentDetails
                ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
            </button>

            {showPaymentDetails && (
              <div className="p-4 bg-muted/30 rounded-xl border border-border/50 space-y-4">
                {/* Method */}
                <div>
                  <Label>Payment Method <span className="text-destructive">*</span></Label>
                  <Select
                    value={paymentDetails.method}
                    onValueChange={(v) => setPaymentDetails((p) => ({ ...defaultPaymentDetails, method: v }))}
                  >
                    <SelectTrigger className="mt-1 h-11 text-base">
                      <SelectValue placeholder="Select how you'd like to be paid" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(PAYMENT_METHOD_FIELDS).map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Dynamic fields */}
                {paymentDetails.method && (() => {
                  const fields = PAYMENT_METHOD_FIELDS[paymentDetails.method] || {};
                  const fieldKeys = (Object.keys(fields) as Array<keyof PaymentDetails>).filter(k => k !== "instructions");
                  return (
                    <>
                      {fieldKeys.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {fieldKeys.map((key) => (
                            <div key={key} className={key === "accountNumber" || key === "reference" ? "sm:col-span-1" : ""}>
                              <Label className="text-xs">{fields[key]}</Label>
                              <Input
                                value={paymentDetails[key] as string}
                                onChange={(e) => setPaymentDetails((p) => ({ ...p, [key]: e.target.value }))}
                                placeholder={fields[key]}
                                className="mt-1 h-11 text-base"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      <div>
                        <Label className="text-xs">Additional Instructions <span className="text-muted-foreground font-normal">(optional)</span></Label>
                        <Textarea
                          value={paymentDetails.instructions}
                          onChange={(e) => setPaymentDetails((p) => ({ ...p, instructions: e.target.value }))}
                          placeholder="e.g. Please include the invoice number as reference when transferring"
                          className="mt-1 text-base resize-none"
                          rows={2}
                        />
                      </div>
                    </>
                  );
                })()}

                {!paymentDetails.method && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Select a payment method above to add details.
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => { setShowPaymentDetails(false); setPaymentDetails(defaultPaymentDetails); }}
                  className="text-[11px] text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                >
                  <XIcon className="h-3 w-3" /> Remove payment details
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-border">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full sm:w-auto bg-bronze hover:bg-bronze/90"
            >
              {loading ? "Saving..." : editingInvoice ? "Update Invoice" : "Create Invoice"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* ── Delete Confirmation Modal ─────────────────────────────────── */}
    <Dialog open={pendingDeleteIndex !== null} onOpenChange={(open) => { if (!open) setPendingDeleteIndex(null); }}>
      <DialogContent className="max-w-sm w-[92vw] rounded-2xl border border-border/60 bg-card p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Remove Invoice Item</DialogTitle>
        </DialogHeader>
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Trash2 className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">Remove Invoice Item</p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Are you certain you wish to remove this item? This action is permanent and once deleted, the data will no longer be accessible.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPendingDeleteIndex(null)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (pendingDeleteIndex !== null) removeItem(pendingDeleteIndex);
                setPendingDeleteIndex(null);
              }}
              className="rounded-xl bg-red-500 hover:bg-red-600 text-white"
            >
              Remove Item
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default CreateInvoiceDialog;
