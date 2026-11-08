import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "sonder — 生活与记忆的收藏簿",
  description: "A quiet archive of life, memories and moments. 一份关于生活、记忆与瞬间的小小收藏。",
};
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}