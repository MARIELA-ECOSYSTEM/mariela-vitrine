import { Helmet } from "react-helmet-async";
import { SeoOptions, DEFAULT_TITLE, DEFAULT_DESCRIPTION, absoluteUrl } from "@/lib/seo";

export const SEOMeta = ({
  title,
  description,
  image,
  imageWidth = 1200,
  imageHeight = 630,
  url,
  type = "website",
  noIndex = false,
  jsonLd,
}: SeoOptions) => {
  const safeTitle = title ? `${title} | Mariela` : DEFAULT_TITLE;
  const safeDescription = description || DEFAULT_DESCRIPTION;
  const safeUrl = url ? absoluteUrl(url) : (typeof window !== "undefined" ? window.location.href : "");
  const safeImage = absoluteUrl(image);
  const safeImageHttps = safeImage.replace(/^http:\/\//, "https://");

  return (
    <Helmet>
      {/* Basic Tags */}
      <title>{safeTitle}</title>
      <meta name="description" content={safeDescription} />
      <link rel="canonical" href={safeUrl} />
      <meta name="theme-color" content="#ffffff" />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={safeUrl} />
      <meta property="og:title" content={safeTitle} />
      <meta property="og:description" content={safeDescription} />
      <meta property="og:image" content={safeImage} />
      <meta property="og:image:secure_url" content={safeImageHttps} />
      <meta property="og:image:width" content={String(imageWidth)} />
      <meta property="og:image:height" content={String(imageHeight)} />
      <meta property="og:image:alt" content={safeTitle} />
      <meta property="og:locale" content="pt_BR" />
      <meta property="og:site_name" content="Mariela Moda Feminina" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={safeUrl} />
      <meta name="twitter:title" content={safeTitle} />
      <meta name="twitter:description" content={safeDescription} />
      <meta name="twitter:image" content={safeImage} />
      <meta name="twitter:image:alt" content={safeTitle} />

      {/* JSON-LD */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(Array.isArray(jsonLd) ? { "@context": "https://schema.org", "@graph": jsonLd } : { "@context": "https://schema.org", ...jsonLd })}
        </script>
      )}
    </Helmet>
  );
};