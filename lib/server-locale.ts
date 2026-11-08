import { cookies } from "next/headers";
import type { Locale } from "@/lib/locale";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return store.get("sonder-language")?.value === "en" ? "en" : "zh";
}
