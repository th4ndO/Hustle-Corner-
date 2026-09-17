import type { Metadata } from "next";
import { APP_NAME } from "@/config";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description:
    "Find trusted student services on your campus — with real reviews from real students.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
