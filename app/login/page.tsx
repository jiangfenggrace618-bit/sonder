"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeInternalPath } from "@/lib/safe-redirect";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/locale";

function getSafeNextPath() {
  return safeInternalPath(new URLSearchParams(window.location.search).get("next"), window.location.origin);
}

export default function LoginPage() {
  const router = useRouter();
  const locale = useLocale();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("message") === "confirmation_failed") {
      setMessage(t(locale,"邮箱确认链接暂时无法使用，请重新注册或登录。","This confirmation link is no longer valid. Please sign up again or log in."));
    }
  }, [locale]);

  async function resendConfirmation() {
    if (!email.trim()) { setError(t(locale,"请先填写注册邮箱。","Enter the email address you used to sign up.")); return; }
    setResending(true); setError(""); setMessage("");
    try {
      const supabase = createClient();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const callback = new URL(`/auth/callback?next=${encodeURIComponent(getSafeNextPath())}`, siteUrl).toString();
      const { error: resendError } = await supabase.auth.resend({
        type: "signup", email: email.trim(), options: { emailRedirectTo: callback },
      });
      if (resendError) throw resendError;
      setMessage(t(locale,"确认邮件已重新发送，请检查邮箱收件箱和垃圾邮件。","A new confirmation email has been sent. Check your inbox and spam folder."));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t(locale,"邮件发送失败，请稍后重试。","Could not send the email. Please try again."));
    } finally { setResending(false); }
  }

  async function sendPasswordReset() {
    if (!email.trim()) {
      setError(t(locale,"请先填写注册邮箱。","Enter your account email first."));
      return;
    }
    setResetting(true);
    setError("");
    setMessage("");
    try {
      const supabase = createClient();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const callback = new URL("/auth/callback?next=/reset-password", siteUrl).toString();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: callback,
      });
      if (resetError) throw resetError;
      setMessage(t(locale,"如果这个邮箱已注册，我们会发送一封密码重置邮件。请检查收件箱和垃圾邮件。","If this email is registered, a password reset link is on its way. Check your inbox and spam folder."));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t(locale,"暂时无法发送重置邮件，请稍后重试。","Could not send the reset email. Please try again."));
    } finally {
      setResetting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const supabase = createClient();
      const nextPath = getSafeNextPath();
      if (mode === "signup") {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
        const callback = new URL(`/auth/callback?next=${encodeURIComponent(nextPath)}`, siteUrl).toString();
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { data: { display_name: displayName.trim() || "New Friend" }, emailRedirectTo: callback },
        });
        if (signUpError) throw signUpError;
        if (!data.session) setMessage(t(locale,"注册成功！请检查邮箱，点击确认链接后即可进入 Sonder。","You’re signed up! Check your email and follow the confirmation link to enter Sonder."));
        else { router.push(nextPath); router.refresh(); }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) throw signInError;
        router.push(nextPath); router.refresh();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t(locale,"操作失败，请稍后重试。","Something went wrong. Please try again."));
    } finally { setBusy(false); }
  }

  return (
    <main className="auth-page">
      <div className="auth-topline">SONDER · A LITTLE ARCHIVE OF THE EVERYDAY</div>
      <section className="auth-card">
        <Link href="/" className="auth-logo">sonder<span>.</span></Link>
        <p className="eyebrow">✳ YOUR OWN LITTLE CORNER</p>
        <h1>{mode === "login" ? t(locale,"欢迎回来。","Welcome back.") : t(locale,"从这里开始。","A little space of your own.")}</h1>
        <p className="auth-intro">{mode === "login" ? t(locale,"回到你的日常收藏簿，继续记录那些值得记住的瞬间。","Return to your little archive and keep the moments worth remembering.") : t(locale,"创建一个属于自己的小小空间，慢慢收藏生活。","Create a little corner of your own and collect life as it happens.")}</p>
        <div className="auth-tabs" role="tablist" aria-label={t(locale,"登录或注册","Log in or sign up")}>
          <button type="button" className={mode === "login" ? "selected" : ""} onClick={() => {setMode("login");setError("");setMessage("");}}>{t(locale,"登录","Log in")}</button>
          <button type="button" className={mode === "signup" ? "selected" : ""} onClick={() => {setMode("signup");setError("");setMessage("");}}>{t(locale,"注册","Sign up")}</button>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "signup" && <label><span>{t(locale,"怎么称呼你","What should we call you?")}</span><input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder={t(locale,"你的昵称","Your name")} maxLength={40}/></label>}
          <label><span>{t(locale,"邮箱地址","Email address")}</span><input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
          <label><span>{t(locale,"密码","Password")}</span><input type="password" autoComplete={mode==="login"?"current-password":"new-password"} minLength={6} required value={password} onChange={e=>setPassword(e.target.value)} placeholder={t(locale,"至少 6 位","At least 6 characters")}/></label>
          {mode === "login" && <button className="auth-text-button" type="button" onClick={sendPasswordReset} disabled={resetting}>{resetting ? t(locale,"正在发送…","Sending…") : t(locale,"忘记密码？","Forgot password?")}</button>}
          {error && <p className="form-error" role="alert">{error}</p>}
          {error.toLowerCase().includes("email not confirmed") && <button className="auth-submit" type="button" onClick={resendConfirmation} disabled={resending}>{resending ? t(locale,"正在发送…","Sending…") : t(locale,"重新发送确认邮件","Resend confirmation email")}</button>}
          {message && <p className="form-success" role="status">{message}</p>}
          <button className="auth-submit" type="submit" disabled={busy}>{busy?t(locale,"请稍候…","Please wait…"):mode==="login"?t(locale,"进入我的日记 ↗","Open my journal ↗"):t(locale,"创建我的账户 ↗","Create my account ↗")}</button>
        </form>
        <p className="auth-footnote">{t(locale,"你的日记属于你。每篇记录都可以单独设置可见范围。","Your journal belongs to you. Every entry has its own visibility settings.")}</p>
        <Link href="/" className="back-home">{t(locale,"← 返回首页","← Back home")}</Link>
      </section>
    </main>
  );
}
