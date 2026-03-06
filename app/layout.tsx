import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar"; // Ensure this path matches your file location

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AuraConnect",
  description: "High-frequency connections for the modern elite.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-aura-black text-white`}
      >
        <div className="flex min-h-screen">
          {/* The Sidebar component handles its own visibility. 
              It will return null on /auth or / landing pages.
          */}
          < Sidebar />
          
          <main className="flex-1">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}