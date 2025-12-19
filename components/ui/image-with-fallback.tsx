"use client";

import * as React from "react";
import Image, { ImageProps } from "next/image";

export interface ImageWithFallbackProps extends Omit<ImageProps, "onError"> {
  fallbackSrc: string;
}

const ImageWithFallback = React.forwardRef<
  HTMLImageElement,
  ImageWithFallbackProps
>(({ src, fallbackSrc, alt, ...props }, ref) => {
  const [imgSrc, setImgSrc] = React.useState(src);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    setImgSrc(src);
    setHasError(false);
  }, [src]);

  return (
    <Image
      ref={ref}
      src={hasError ? fallbackSrc : imgSrc}
      alt={alt}
      onError={() => {
        if (!hasError) {
          setHasError(true);
          setImgSrc(fallbackSrc);
        }
      }}
      {...props}
    />
  );
});

ImageWithFallback.displayName = "ImageWithFallback";

export { ImageWithFallback };
