import type { Metadata } from "next";
import { Geist, Space_Grotesk } from "next/font/google";
import './globals.css'

// Google Fonts
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

// Metadata for SEO & Social Sharing
export const metadata: Metadata = {
  title: "AuraConnect - Elite Connections",
  description: "High-frequency interaction for the modern professional.",
};

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<any>;
}) {
  // Ensure compatibility with Next.js 15.x for async layout
  await params;

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${spaceGrotesk.variable} antialiased`}
      >
        {/* Full-page dark luxury gradient */}
        <div className="fixed inset-0 z-0 bg-gradient-to-b from-[#2E1065] via-[#1A0B2E] to-[#0D0B14]" />

        {/* Page content */}
        <div className="relative flex flex-col min-h-screen z-10">
          <main className="flex-1 relative">{children}</main>
        </div>
      </body>
    </html>
  );
}