import Link from "next/link";
import Icon, { type IconName } from "@/components/Icon";

// "Nothing here yet" box: says what happened and gives one clear next step,
// instead of a lone grey sentence.
export default function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: IconName;
  title: string;
  body: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand-600 ring-1 ring-gray-200">
        <Icon name={icon} />
      </span>
      <p className="mt-4 font-semibold text-gray-900">{title}</p>
      <p className="mx-auto mt-1 max-w-xs text-sm text-gray-600">{body}</p>
      {action && (
        <Link
          href={action.href}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-95"
        >
          {action.label}
          <Icon name="arrowRight" className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
