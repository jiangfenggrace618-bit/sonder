"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }
  return <button type="button" className="journal-quiet-button" onClick={logout} disabled={busy}>{busy?"退出中…":"退出登录"}</button>;
}
