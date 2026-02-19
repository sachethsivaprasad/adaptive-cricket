import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Adaptive Cricket Dashboard",
  description: "Analytics and performance visualization for the cricket simulation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-cricket-cream text-cricket-green antialiased">
        {children}
      </body>
    </html>
  );
}
