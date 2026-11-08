import type { Metadata } from "next";
import { getLocale } from "@/lib/server-locale";
import LanguageToggle from "@/components/language-toggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "sonder — 生活与记忆的收藏簿",
  description: "A quiet archive of life, memories and moments. 一份关于生活、记忆与瞬间的小小收藏。",
};

export default async function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  const locale = await getLocale();
  return <html lang={locale === "en" ? "en" : "zh-CN"}><body><LanguageToggle initialLocale={locale}/>{children}</body></html>;
}
