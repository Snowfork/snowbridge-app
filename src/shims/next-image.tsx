// Vite shim for `next/image`. On a static/IPFS host there is no image
// optimization server, so this renders a plain <img>. Mirrors the prop
// surface the app relies on (src/alt/width/height/fill/className/priority).
import React from "react";

type StaticImport = { src: string; height?: number; width?: number };

export interface ImageProps
  extends Omit<
    React.ImgHTMLAttributes<HTMLImageElement>,
    "src" | "width" | "height"
  > {
  src: string | StaticImport;
  alt: string;
  width?: number | string;
  height?: number | string;
  fill?: boolean;
  priority?: boolean;
  quality?: number;
  unoptimized?: boolean;
}

function resolveSrc(src: string | StaticImport): string {
  return typeof src === "string" ? src : src.src;
}

const Image = React.forwardRef<HTMLImageElement, ImageProps>(
  (
    {
      src,
      alt,
      width,
      height,
      fill,
      priority,
      quality,
      unoptimized,
      style,
      ...rest
    },
    ref,
  ) => {
    const fillStyle: React.CSSProperties | undefined = fill
      ? {
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          ...style,
        }
      : style;
    return (
      <img
        ref={ref}
        src={resolveSrc(src)}
        alt={alt}
        width={fill ? undefined : (width as number | undefined)}
        height={fill ? undefined : (height as number | undefined)}
        loading={priority ? "eager" : "lazy"}
        style={fillStyle}
        {...rest}
      />
    );
  },
);
Image.displayName = "Image";

export default Image;
