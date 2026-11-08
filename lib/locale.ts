export type Locale = "zh" | "en";

export function t(locale: Locale, chinese: string, english: string): string {
  return locale === "en" ? english : chinese;
}
