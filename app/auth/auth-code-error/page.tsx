import Link from "next/link";

export default function AuthCodeErrorPage() {
  return (
    <main className="mx-auto max-w-sm px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Login link expired</h1>
      <p className="mt-2 text-gray-600">
        That link didn&apos;t work — it may have expired or already been
        used.
      </p>
      <Link href="/login" className="text-link mt-6 inline-block">
        Try logging in again
      </Link>
    </main>
  );
}
