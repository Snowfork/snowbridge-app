import Link from "next/link";

export default function Blocked() {
  return (
    <div className="flex-col gap-2 ">
      <p>Page Not Found</p>
      <div className="flex w-full justify-center">
        <Link className="text-xs underline" href="/">
          Go Home
        </Link>
      </div>
    </div>
  );
}
