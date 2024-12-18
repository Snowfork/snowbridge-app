import Image from "next/image";

interface SelectItemWithIconProps {
  label: string;
  image: string | undefined;
}
export function SelectItemWithIcon({label, image
}: SelectItemWithIconProps) {
  return (
    <div className="flex items-center">
      {image && <Image
        className="selectIcon"
        src={`/images/${image.toLowerCase()}.png`}
        width={20}
        height={20}
       alt={label}/>}
    {label}
    </div>
  );
}
