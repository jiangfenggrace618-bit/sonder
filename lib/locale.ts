import { cookies } from "next/headers";

export type Locale = "zh" | "en";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return store.get("sonder-language")?.value === "en" ? "en" : "zh";
}

export function t(locale: Locale, chinese: string, english: string): string {
  return locale === "en" ? english : chinese;
}
