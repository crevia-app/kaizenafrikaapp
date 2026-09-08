import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
  // Verify this is called from Supabase Cron or an authorized source
  const authHeader = req.headers.get("authorization");
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (authHeader !== `Bearer ${Deno.env.get("CRON_SECRET")}`) {
    return new Response(
      JSON.stringify({ error: "Unauthorized: Secret mismatch" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Reset all users' daily Dira action counters.
    // NOTE: this previously wrote to "dira_tokens_used_today" and "kira_last_reset",
    // neither of which exists on the profiles table (confirmed against
    // src/integrations/supabase/types.ts and the kira->dira column-rename migration) —
    // every run of this cron job was silently failing. The real daily counter is
    // dira_actions_used (paired with dira_actions_limit).
    //added select() so that i can how many users were reset
    const { data, error } = await supabase
      .from("profiles")
      .update({
        dira_actions_used: 0,
      })
    //   .neq("id", ""); // Update all rows
    .not("id", "is", null) // a more reliable way to select rows in Supabase
    .select(); // Return the updated rows

    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Reset tokens for ${data?.length || 0} users`,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});