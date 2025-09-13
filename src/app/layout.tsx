import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Snake Torpedo",
  description: "Modern Snake Torpedo game with advanced graphics - Navigate and collect energy cores",
  keywords: ["snake torpedo", "modern game", "javascript game", "browser game", "torpedo game"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-900 text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}