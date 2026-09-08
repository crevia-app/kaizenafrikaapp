import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { iconOptions, iconCategories } from "./iconOptions";
import { Search } from "lucide-react";

interface EditButtonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (button: any) => void;
  button: any;
}

export function EditButtonDialog({ open, onOpenChange, onSave, button }: EditButtonDialogProps) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [icon, setIcon] = useState("link");
  const [style, setStyle] = useState("filled");
  const [iconSearch, setIconSearch] = useState("");

  useEffect(() => {
    if (button) {
      setTitle(button.title || "");
      setUrl(button.url || "");
      setIcon(button.icon || "link");
      setStyle(button.style || "filled");
      setIconSearch("");
    }
  }, [button]);

  const filteredIcons = iconSearch
    ? iconOptions.filter(
        (o) =>
          o.label.toLowerCase().includes(iconSearch.toLowerCase()) ||
          o.category.toLowerCase().includes(iconSearch.toLowerCase())
      )
    : iconOptions;

  const selectedIcon = iconOptions.find((o) => o.value === icon);

  const handleSubmit = () => {
    if (!title || !url) return;
    onSave({ ...button, title, url, icon, style });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-vollkorn text-2xl">Edit Button</DialogTitle>
          <DialogDescription>Update your link button details</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="edit-title">Button Title</Label>
            <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My Portfolio" className="mt-2 h-11 text-base" />
          </div>
          <div>
            <Label htmlFor="edit-url">URL</Label>
            <Input id="edit-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" className="mt-2 h-11 text-base" />
          </div>

          <div>
            <Label>Icon</Label>
            <div className="mt-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={iconSearch}
                onChange={(e) => setIconSearch(e.target.value)}
                placeholder="Search icons..."
                className="pl-9 h-11 text-base"
              />
            </div>
            <ScrollArea className="h-48 mt-2 border rounded-lg p-2">
              {(iconSearch ? ["Results"] : iconCategories).map((cat) => {
                const items = iconSearch
                  ? filteredIcons
                  : filteredIcons.filter((o) => o.category === cat);
                if (items.length === 0) return null;
                return (
                  <div key={cat} className="mb-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
                      {cat}
                    </p>
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-1">
                      {items.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setIcon(opt.value);
                            setIconSearch("");
                          }}
                          className={`flex flex-col items-center gap-1 p-3 min-h-[56px] rounded-lg text-xs transition-all ${
                            icon === opt.value
                              ? "bg-bronze text-white"
                              : "hover:bg-muted text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <opt.icon className="w-5 h-5" />
                          <span className="truncate w-full text-center text-[10px] leading-tight">
                            {opt.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {filteredIcons.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No icons found</p>
              )}
            </ScrollArea>
            {selectedIcon && (
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <selectedIcon.icon className="w-4 h-4 text-bronze" />
                Selected: <span className="font-medium text-foreground">{selectedIcon.label}</span>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="edit-style">Button Style</Label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="filled">Filled</SelectItem>
                <SelectItem value="outline">Outline</SelectItem>
                <SelectItem value="minimal">Minimal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!title || !url} className="bg-bronze hover:bg-bronze-dark">Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
