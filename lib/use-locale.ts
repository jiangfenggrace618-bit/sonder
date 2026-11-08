"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/locale";

export function useLocale(): Locale {
  const [locale, setLocale] = useState<Locale>("zh");

  useEffect(() => {
    const sync = () => {
      setLocale(window.localStorage.getItem("sonder-language") === "en" ? "en" : "zh");
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
