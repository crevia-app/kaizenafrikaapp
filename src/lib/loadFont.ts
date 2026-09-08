const injected = new Set<string>();

export function loadGoogleFont(href: string): void {
  if (injected.has(href)) return;
  if (document.querySelector(`link[href="${href}"]`)) { injected.add(href); return; }
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
  injected.add(href);
}

export const KAIZEN_LINK_FONTS =
  "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Playfair+Display:wght@400;600;700&family=DM+Serif+Display&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Outfit:wght@300;400;500;600;700&family=Syne:wght@400;500;600;700;800&display=swap";
