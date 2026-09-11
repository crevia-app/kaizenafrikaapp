import { Helmet } from "react-helmet-async";

const BASE_URL      = "https://kaizenafrika.app";
const DEFAULT_IMAGE = `${BASE_URL}/og-image.jpg`;
const OG_IMAGE_W    = 1200;
const OG_IMAGE_H    = 630;

const DEFAULT_TITLE       = "Kaizen Afrika | The infrastructure to scale your business operations";
const DEFAULT_DESCRIPTION = "Kaizen Afrika gives creatives and founders the infrastructure to scale business operations — invoicing, AI, and link pages in one place.";
const DEFAULT_KEYWORDS    = "invoicing software, invoice generator, business management, AI business assistant, Kira AI, link in bio, client workspace, team collaboration, creative business tools, Kaizen Afrika";

interface SEOProps {
  title?:       string;
  description?: string;
  keywords?:    string;
  image?:       string;
  imageWidth?:  number;
  imageHeight?: number;
  url?:         string;
  type?:        "website" | "article";
  jsonLd?:      object | object[];
  noIndex?:     boolean;
}

export const SEO = ({
  title       = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  keywords    = DEFAULT_KEYWORDS,
  image       = DEFAULT_IMAGE,
  imageWidth  = OG_IMAGE_W,
  imageHeight = OG_IMAGE_H,
  url,
  type        = "website",
  jsonLd,
  noIndex     = false,
}: SEOProps) => {
  const fullTitle = title === DEFAULT_TITLE ? title : `${title} | Kaizen Afrika`;
  const canonical = url ? `${BASE_URL}${url}` : `${BASE_URL}/`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords"    content={keywords} />
      {noIndex
        ? <meta name="robots" content="noindex, nofollow" />
        : <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
      }
      <link rel="canonical" href={canonical} />

      {/* Open Graph */}
      <meta property="og:type"         content={type} />
      <meta property="og:site_name"    content="Kaizen Afrika" />
      <meta property="og:locale"       content="en_US" />
      <meta property="og:url"          content={canonical} />
      <meta property="og:title"        content={fullTitle} />
      <meta property="og:description"  content={description} />
      <meta property="og:image"        content={image} />
      <meta property="og:image:secure_url" content={image} />
      <meta property="og:image:width"  content={String(imageWidth)} />
      <meta property="og:image:height" content={String(imageHeight)} />
      <meta property="og:image:alt"    content={fullTitle} />

      {/* Twitter / X */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:domain"      content="kaizenafrika.app" />
      <meta name="twitter:url"         content={canonical} />
      <meta name="twitter:site"        content="@kaizenafrika" />
      <meta name="twitter:creator"     content="@kaizenafrika" />
      <meta name="twitter:title"       content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image"       content={image} />
      <meta name="twitter:image:alt"   content={fullTitle} />

      {/* Page-specific JSON-LD structured data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(Array.isArray(jsonLd) ? jsonLd : [jsonLd])}
        </script>
      )}
    </Helmet>
  );
};
