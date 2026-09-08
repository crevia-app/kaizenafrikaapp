import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
);

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const username = Array.isArray(req.query.username)
    ? req.query.username[0]
    : req.query.username;

  if (!username) {
    res.status(400).send("Bad request");
    return;
  }

  const { data: profile } = await supabase
    .from("link_profiles")
    .select("display_name, bio, profile_picture, username")
    .eq("username", username)
    .single();

  const name        = profile?.display_name || username;
  const description = profile?.bio || `Check out ${name}'s links on Kaizen Afrika.`;
  const avatar      = profile?.profile_picture || "https://kaizenafrika.app/kaizen-logo.png";
  const pageUrl     = `https://kaizenafrika.app/${username}`;
  const title       = `${name} | kaizenafrika.app`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />

  <!-- Open Graph -->
  <meta property="og:type"        content="profile" />
  <meta property="og:url"         content="${pageUrl}" />
  <meta property="og:title"       content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:image"       content="${avatar}" />
  <meta property="og:image:width"  content="800" />
  <meta property="og:image:height" content="800" />
  <meta property="og:image:alt"   content="${esc(name)}'s profile picture" />
  <meta property="og:site_name"   content="Kaizen Afrika" />

  <!-- Twitter / X -->
  <meta name="twitter:card"        content="summary" />
  <meta name="twitter:title"       content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image"       content="${avatar}" />
  <meta name="twitter:site"        content="@kaizenafrika" />

  <!-- Redirect real users to the SPA immediately -->
  <meta http-equiv="refresh" content="0;url=${pageUrl}" />
</head>
<body>
  <p>Redirecting to <a href="${pageUrl}">${esc(name)}'s Kaizen Link</a>…</p>
</body>
</html>`;

  res
    .setHeader("Content-Type", "text/html; charset=utf-8")
    .setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400")
    .setHeader("Vary", "User-Agent")
    .status(200)
    .send(html);
}
