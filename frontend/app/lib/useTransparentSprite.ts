"use client";

import { useEffect, useState, useRef } from "react";

const cache = new Map<string, string>();

export function useTransparentSprite(src: string): string {
  const [processed, setProcessed] = useState(() => cache.get(src) || "");
  const srcRef = useRef(src);

  useEffect(() => {
    srcRef.current = src;

    if (cache.has(src)) {
      setProcessed(cache.get(src)!);
      return;
    }

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (srcRef.current !== src) return;

      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      const threshold = 35;
      const fadeRange = 40;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brightness = Math.max(r, g, b);

        if (brightness < threshold) {
          data[i + 3] = 0;
        } else if (brightness < threshold + fadeRange) {
          const t = (brightness - threshold) / fadeRange;
          data[i + 3] = Math.floor(t * data[i + 3]);
        }
      }

      ctx.putImageData(imageData, 0, 0);
      const dataUrl = canvas.toDataURL("image/png");
      cache.set(src, dataUrl);
      if (srcRef.current === src) {
        setProcessed(dataUrl);
      }
    };
    img.src = src;
  }, [src]);

  return processed || src;
}
