import Image from "next/image";
import { SelectIcon } from "@/components/SelectIcon";

interface SelectItemWithIconProps {
  label: string;
  link: string;
}
export function SelectItemWithIcon({label, link
}: SelectItemWithIconProps) {
  return (
    <div className="flex items-center">
      <Image
        className="selectIcon"
        src={link}
        width={20}
        height={20}
       alt={label}/>
    {label}
    </div>
  );
}
