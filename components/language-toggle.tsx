"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/locale";

export default function LanguageToggle({ initialLocale = "zh" }: { initialLocale?: Locale }) {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>(initialLocale);

  useEffect(() => {
    const sync = () => {
      setLocale(window.localStorage.getItem("sonder-language") === "en" ? "en" : "zh");
    };
    sync();
    window.addEventListener("sonder-language-change", sync);
    return () => window.removeEventListener("sonder-language-change", sync);
  }, []);

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
