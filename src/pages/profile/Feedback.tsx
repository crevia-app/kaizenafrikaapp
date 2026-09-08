import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Lightbulb, Send, Rocket } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Feedback = () => {
  const [message, setMessage] = useState("");
  const [featureTitle, setFeatureTitle] = useState("");
  const [featureDescription, setFeatureDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const notifyAdmin = (feedback_id: string) => {
    supabase.functions.invoke("feedback-notify", { body: { feedback_id } }).catch(() => {});
  };

  const handleSubmitFeedback = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: created, error } = await supabase
        .from("feedback" as any)
        .insert({ user_id: session?.user?.id ?? null, type: "thought", message: message.trim() })
        .select("id")
        .single();
      if (error) throw error;
      if (created?.id) notifyAdmin(created.id);
      toast.success("Thank you for your feedback!", { description: "Your voice shapes Kaizen Afrika's future." });
      setMessage("");
    } catch {
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitFeature = async () => {
    if (!featureTitle.trim() || !featureDescription.trim()) return;
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: created, error } = await supabase
        .from("feedback" as any)
        .insert({
          user_id: session?.user?.id ?? null,
          type: "feature",
          title: featureTitle.trim(),
          message: featureDescription.trim(),
        })
        .select("id")
        .single();
      if (error) throw error;
      if (created?.id) notifyAdmin(created.id);
      toast.success("Feature request submitted!", { description: "Great idea! We'll evaluate this for our roadmap." });
      setFeatureTitle("");
      setFeatureDescription("");
    } catch {
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background">
      {/* Hero */}
      <div className="border-b border-border/30">
        <div className="container mx-auto px-4 sm:px-6 py-12 md:py-20 max-w-2xl text-center">
          <h1 className="font-vollkorn text-3xl sm:text-4xl md:text-5xl font-bold mb-3 md:mb-4 text-foreground">
            Feedback
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Help us make Kaizen Afrika better for everyone.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-8 md:py-12 max-w-xl">
        <Tabs defaultValue="thoughts" className="space-y-6 md:space-y-8">
          <TabsList className="grid w-full grid-cols-2 h-11 p-1 bg-muted/40">
            <TabsTrigger
              value="thoughts"
              className="data-[state=active]:bg-bronze data-[state=active]:text-white text-sm gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Thoughts
            </TabsTrigger>
            <TabsTrigger
              value="feature"
              className="data-[state=active]:bg-bronze data-[state=active]:text-white text-sm gap-2"
            >
              <Lightbulb className="w-4 h-4" />
              Feature
            </TabsTrigger>
          </TabsList>

          {/* Thoughts */}
          <TabsContent value="thoughts">
            <Card className="p-5 sm:p-6 md:p-8 border-border/40">
              <h2 className="font-vollkorn text-lg md:text-xl font-bold mb-1">Share Your Thoughts</h2>
              <p className="text-xs md:text-sm text-muted-foreground mb-5 md:mb-6">
                Feedback, suggestions, or bug reports — anything goes.
              </p>

              <div className="space-y-4">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What's on your mind?"
                  rows={5}
                  className="resize-none bg-background/50"
                />

                <Button
                  onClick={handleSubmitFeedback}
                  className="w-full h-11 bg-bronze hover:bg-bronze-dark text-white"
                  disabled={!message.trim() || submitting}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {submitting ? "Submitting…" : "Submit"}
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Feature Request */}
          <TabsContent value="feature">
            <Card className="p-5 sm:p-6 md:p-8 border-border/40">
              <h2 className="font-vollkorn text-lg md:text-xl font-bold mb-1">Request a Feature</h2>
              <p className="text-xs md:text-sm text-muted-foreground mb-5 md:mb-6">
                Got an idea that would make Kaizen Afrika better?
              </p>

              <div className="space-y-4">
                <Input
                  value={featureTitle}
                  onChange={(e) => setFeatureTitle(e.target.value)}
                  placeholder="Feature name"
                  className="h-11 bg-background/50"
                />

                <Textarea
                  value={featureDescription}
                  onChange={(e) => setFeatureDescription(e.target.value)}
                  placeholder="Describe the feature and the problem it solves..."
                  rows={5}
                  className="resize-none bg-background/50"
                />

                <Button
                  onClick={handleSubmitFeature}
                  className="w-full h-11 bg-bronze hover:bg-bronze-dark text-white"
                  disabled={!featureTitle.trim() || !featureDescription.trim() || submitting}
                >
                  <Rocket className="w-4 h-4 mr-2" />
                  {submitting ? "Submitting…" : "Submit"}
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Feedback;
