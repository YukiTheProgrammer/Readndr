import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Readndr",
  description: "Doomscroll through research papers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-light-gray">{children}</body>
    </html>
  );
}
