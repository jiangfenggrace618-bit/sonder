"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(searchParams.get("message") === "confirmation_failed" ? "邮箱确认链接暂时无法使用，请重新注册或登录。" : "");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { data: { display_name: displayName.trim() || "New Friend" }, emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (signUpError) throw signUpError;
        if (!data.session) setMessage("注册成功！请检查邮箱，点击确认链接后即可进入 Sonder。");
        else { router.push("/journal"); router.refresh(); }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) throw signInError;
        router.push("/journal"); router.refresh();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "操作失败，请稍后重试。");
    } finally { setBusy(false); }
  }

  return (
    <main className="auth-page">
      <div className="auth-topline">SONDER · A LITTLE ARCHIVE OF THE EVERYDAY</div>
      <section className="auth-card">
        <Link href="/" className="auth-logo">sonder<span>.</span></Link>
        <p className="eyebrow">✳ YOUR OWN LITTLE CORNER</p>
        <h1>{mode === "login" ? "欢迎回来。" : "从这里开始。"}</h1>
        <p className="auth-intro">{mode === "login" ? "回到你的日常收藏簿，继续记录那些值得记住的瞬间。" : "创建一个属于自己的小小空间，慢慢收藏生活。"}</p>
        <div className="auth-tabs" role="tablist" aria-label="登录或注册">
          <button type="button" className={mode === "login" ? "selected" : ""} onClick={() => {setMode("login");setError("");setMessage("");}}>登录</button>
          <button type="button" className={mode === "signup" ? "selected" : ""} onClick={() => {setMode("signup");setError("");setMessage("");}}>注册</button>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "signup" && <label><span>怎么称呼你</span><input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="你的昵称" maxLength={40}/></label>}
          <label><span>邮箱地址</span><input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
          <label><span>密码</span><input type="password" autoComplete={mode==="login"?"current-password":"new-password"} minLength={6} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="至少 6 位"/></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          {message && <p className="form-success" role="status">{message}</p>}
          <button className="auth-submit" type="submit" disabled={busy}>{busy?"请稍候…":mode==="login"?"进入我的日记 ↗":"创建我的账户 ↗"}</button>
        </form>
        <p className="auth-footnote">你的日记属于你。每篇记录都可以单独设置可见范围。</p>
        <Link href="/" className="back-home">← 返回首页</Link>
      </section>
    </main>
  );
}
