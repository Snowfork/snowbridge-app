import { ImageWithFallback } from "./ui/image-with-fallback";

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
  return (
    <div className="flex items-center min-w-0">
      {image && (
        <ImageWithFallback
          className="selectIcon flex-shrink-0"
          src={`/images/${image.toLowerCase()}.png`}
          fallbackSrc={`/images/${(altImage ?? "token_generic").toLowerCase()}.png`}
          width={20}
          height={20}
          alt={image ?? ""}
        />
      )}
      <span className="truncate">{label}</span>
    </div>
  );
}
