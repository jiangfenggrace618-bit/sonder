import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "sonder — a little archive of life",
  description: "A quiet corner for memories, small moments, and the stories that make a life.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}