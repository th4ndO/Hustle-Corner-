import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import { APP_NAME } from "@/config";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description:
    "Find trusted student services on your campus — with real reviews from real students.",
};

// Self-hosted at build time: no request to Google from the visitor, and
// next/font sizes the fallback to match, so headings don't jump on load.
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
  variable: "--font-display",
});

export const viewport: Viewport = {
  themeColor: "#14283e",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={display.variable}>
      {/* Column layout so the footer sits at the bottom of short pages. */}
      <body className="flex min-h-dvh flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
