"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/locale";

export default function LanguageToggle({ initialLocale = "zh" }: { initialLocale?: Locale }) {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>(initialLocale);

  useEffect(() => {
    const sync = () => {
      const stored = window.localStorage.getItem("sonder-language");
      const saved = stored === "en" || stored === "zh" ? stored : initialLocale;
      const current = document.cookie.split("; ").find(item => item.startsWith("sonder-language="))?.split("=")[1];
      setLocale(saved);
      if (current !== saved) {
        document.cookie = `sonder-language=${saved}; path=/; max-age=31536000; samesite=lax`;
        router.refresh();
      }
    };
    sync();
    window.addEventListener("sonder-language-change", sync);
    return () => window.removeEventListener("sonder-language-change", sync);
  }, [router]);

  function change(next: Locale) {
    window.localStorage.setItem("sonder-language", next);
    document.cookie = `sonder-language=${next}; path=/; max-age=31536000; samesite=lax`;
    setLocale(next);
    window.dispatchEvent(new Event("sonder-language-change"));
    router.refresh();
  }

  return (
    <div className="global-language-toggle" aria-label="选择语言 / Choose language">
      <button type="button" className={locale === "zh" ? "active" : ""} onClick={() => change("zh")} aria-pressed={locale === "zh"}>中文</button>
      <span>/</span>
      <button type="button" className={locale === "en" ? "active" : ""} onClick={() => change("en")} aria-pressed={locale === "en"}>EN</button>
    </div>
  );
}
