"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/locale";

export function useLocale(): Locale {
  const [locale, setLocale] = useState<Locale>("zh");

  useEffect(() => {
    const sync = () => {
      const stored = window.localStorage.getItem("sonder-language");
      const cookie = document.cookie.split("; ").find(item => item.startsWith("sonder-language="))?.split("=")[1];
      setLocale(stored === "en" || stored === "zh" ? stored : cookie === "en" ? "en" : "zh");
    };
    sync();
    window.addEventListener("sonder-language-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("sonder-language-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return locale;
}
