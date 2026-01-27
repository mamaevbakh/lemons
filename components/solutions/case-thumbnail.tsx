"use client";

import { useState } from "react";

interface CaseThumbnailProps {
  src: string;
  alt: string;
}

export function CaseThumbnail({ src, alt }: CaseThumbnailProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground text-sm">
        No preview
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="h-full w-full object-cover"
      loading="lazy"
      decoding="async"
      onError={() => setHasError(true)}
    />
  );
}
