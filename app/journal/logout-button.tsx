"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/locale";

export default function LogoutButton() {
  const router = useRouter();
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }
  return <button type="button" className="journal-quiet-button" onClick={logout} disabled={busy}>{busy?t(locale,"退出中…","Signing out…"):t(locale,"退出登录","Log out")}</button>;
}
