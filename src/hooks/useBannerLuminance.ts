import { useEffect, useState } from "react";

/**
 * Sample the average luminance of the top strip of an image to decide
 * whether overlaying header content should be rendered with a light
 * (white) or dark tone for legibility.
 *
 * Returns 'light' when the sampled area is dark (use white text/icons)
 * and 'dark' when the sampled area is light (use dark text/icons).
 */
export function useBannerLuminance(imageSrc: string | null | undefined, sampleHeightRatio = 0.3): "light" | "dark" {
  const [tone, setTone] = useState<"light" | "dark">("light");

  useEffect(() => {
    if (!imageSrc) return;

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";

    img.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement("canvas");
        // Downsample agressivamente — só queremos a média.
        const w = 32;
        const sampleH = Math.max(1, Math.round(32 * sampleHeightRatio));
        canvas.width = w;
        canvas.height = sampleH;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        // Desenha apenas o topo da imagem (área que fica atrás do header).
        ctx.drawImage(img, 0, 0, img.width, img.height * sampleHeightRatio, 0, 0, w, sampleH);
        const { data } = ctx.getImageData(0, 0, w, sampleH);
        let total = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          // Luminância perceptual (Rec. 709).
          const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
          total += lum;
          count += 1;
        }
        const avg = total / count; // 0..255
        // Threshold ~140 funciona bem com gradiente escuro overlay já existente.
        setTone(avg < 140 ? "light" : "dark");
      } catch {
        // Tainted canvas (CORS) → fallback seguro: tom claro (texto branco).
        setTone("light");
      }
    };

    img.onerror = () => {
      if (!cancelled) setTone("light");
    };

    img.src = imageSrc;

    return () => {
      cancelled = true;
    };
  }, [imageSrc, sampleHeightRatio]);

  return tone;
}