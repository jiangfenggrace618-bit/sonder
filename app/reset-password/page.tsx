"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/locale";

export default function ResetPasswordPage() {
  const router = useRouter();
  const locale = useLocale();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let alive = true;
    createClient().auth.getUser().then(({ data, error: authError }) => {
      if (!alive) return;
      if (authError || !data.user) {
        setError(t(locale,"重置链接已失效或已过期，请重新申请。","This reset link is invalid or expired. Please request a new one."));
      }
      setReady(true);
    });
    return () => { alive = false; };
  }, [locale]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 6) {
      setError(t(locale,"新密码至少需要 6 位。","Your new password must be at least 6 characters."));
      return;
    }
    if (password !== confirmPassword) {
      setError(t(locale,"两次输入的密码不一致。","The passwords do not match."));
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const { error: updateError } = await createClient().auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(t(locale,"密码已更新，正在返回你的日记…","Password updated. Taking you back to your journal…"));
      router.replace("/journal");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t(locale,"密码更新失败，请重新申请重置链接。","Could not update your password. Please request a new reset link."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-topline">SONDER · A LITTLE ARCHIVE OF THE EVERYDAY</div>
      <section className="auth-card">
        <Link href="/" className="auth-logo">sonder<span>.</span></Link>
        <p className="eyebrow">✳ A FRESH START</p>
        <h1>{t(locale,"设置新密码。","Choose a new password.")}</h1>
        <p className="auth-intro">{t(locale,"设置一个新的密码，继续收藏那些值得记住的瞬间。","Set a new password and return to the moments worth keeping.")}</p>
        {!ready ? <p>{t(locale,"正在验证重置链接…","Verifying your reset link…")}</p> : error && !success ? (
          <div><p className="form-error" role="alert">{error}</p><Link href="/login" className="journal-text-link">{t(locale,"返回登录并重新申请 ↗","Back to login and request a new link ↗")}</Link></div>
        ) : (
          <form className="auth-form" onSubmit={submit}>
            <label><span>{t(locale,"新密码","New password")}</span><input type="password" autoComplete="new-password" minLength={6} required value={password} onChange={e=>setPassword(e.target.value)} placeholder={t(locale,"至少 6 位","At least 6 characters")}/></label>
            <label><span>{t(locale,"再次输入新密码","Confirm new password")}</span><input type="password" autoComplete="new-password" minLength={6} required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder={t(locale,"再次输入密码","Enter it again")}/></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            {success && <p className="form-success" role="status">{success}</p>}
            <button className="auth-submit" type="submit" disabled={busy}>{busy ? t(locale,"正在更新…","Updating…") : t(locale,"更新密码 ↗","Update password ↗")}</button>
          </form>
        )}
        <Link href="/" className="back-home">{t(locale,"← 返回首页","← Back home")}</Link>
      </section>
    </main>
  );
}
