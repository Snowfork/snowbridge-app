import { useState } from "react";

interface SelectItemWithIconProps {
  label: string;
  image: string | undefined;
  altImage?: string;
}
export function SelectItemWithIcon({
  label,
  image,
  altImage,
}: SelectItemWithIconProps) {
  const [error, setError] = useState(0);
  return (
    <div className="flex items-center">
      {image && error === 0 && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="selectIcon"
          src={`/images/${image.toLowerCase()}.png`}
          width={20}
          height={20}
          alt={image ?? ""}
          onError={() => {
            setError(1);
          }}
        />
      )}
      {altImage && error === 1 && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="selectIcon"
          src={`/images/${altImage.toLowerCase()}.png`}
          width={20}
          height={20}
          alt={image ?? ""}
          onError={() => {
            setError(2);
          }}
        />
      )}
      {label}
    </div>
  );
}
