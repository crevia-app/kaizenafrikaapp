import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CompleteProfileModalProps {
  userId: string;
  onComplete: () => void;
}

export function CompleteProfileModal({ userId, onComplete }: CompleteProfileModalProps) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setError("Please enter your name."); return; }
    if (trimmed.length < 2) { setError("Name must be at least 2 characters."); return; }

    setSaving(true);
    const { error: dbErr } = await supabase
      .from("profiles")
      .update({ display_name: trimmed })
      .eq("id", userId);

    if (dbErr) {
      setError("Couldn't save — please try again.");
      setSaving(false);
      return;
    }
    onComplete();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ type: "spring", stiffness: 340, damping: 30 }}
          className="relative w-full max-w-sm bg-background border border-border rounded-2xl shadow-2xl p-7"
        >
          <h2 className="font-vollkorn text-2xl font-bold text-center mb-1">
            Welcome to Kaizen Afrika
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            What should we call you?
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                autoFocus
                placeholder="Your name"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(""); }}
                maxLength={60}
                className="h-11 text-base"
              />
              {error && (
                <p className="text-xs text-destructive mt-1.5">{error}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={saving || !name.trim()}
              className="w-full h-11 bg-bronze hover:bg-bronze/90 text-white font-semibold"
            >
              {saving ? "Saving..." : "Continue"}
            </Button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
