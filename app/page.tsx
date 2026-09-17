import { APP_NAME, CAMPUS_NAME } from "@/config";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-3xl font-bold text-brand-600">{APP_NAME}</h1>
      <p className="text-gray-600">
        Find trusted student services at {CAMPUS_NAME} — with real reviews
        from real students.
      </p>
      <p className="text-sm text-gray-400">
        Setup phase complete. Browsing, search, and seller profiles land in
        Phase 2.
      </p>
    </main>
  );
}
