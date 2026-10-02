import { BUBBLE_PATH, DOT, LETTERS_PATH, LETTERS_TRANSFORM } from "@/lib/brandMark";

// The corner-bubble logo as inline SVG. "reversed" (white bubble, navy
// letters) is for navy grounds such as the header; "color" for light ones.
export default function BrandMark({
  variant = "color",
  className,
}: {
  variant?: "color" | "reversed";
  className?: string;
}) {
  const bubble = variant === "color" ? "fill-brand-600" : "fill-white";
  const letters = variant === "color" ? "fill-white" : "fill-brand-600";
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
      <path d={BUBBLE_PATH} className={bubble} />
      <path transform={LETTERS_TRANSFORM} d={LETTERS_PATH} className={letters} />
      <circle cx={DOT.cx} cy={DOT.cy} r={DOT.r} className="fill-amber-500" />
    </svg>
  );
}
