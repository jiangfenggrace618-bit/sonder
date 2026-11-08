"use client";

import { FormEvent, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/locale";

type Entry={id:string;profile_id:string|null;author_id:string;message:string;created_at:string;author_name:string};

export default function GuestbookWall({initialEntries,profileId,viewerId,viewerName}:{initialEntries:Entry[];profileId:string|null;viewerId:string|null;viewerName:string}) {
  const pathname=usePathname();
  const locale=useLocale();
  const [entries,setEntries]=useState(initialEntries);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!message.trim())return;
    if(!viewerId){setError(t(locale,"请先登录，再留下你的话。","Please log in before leaving a note."));return;}
    setBusy(true);setError("");
    try {
      const supabase=createClient();
      const {data,error:insertError}=await supabase.from("guestbook_entries")
        .insert({profile_id:profileId,author_id:viewerId,message:message.trim()})
        .select("id,profile_id,author_id,message,created_at").single();
      if(insertError)throw insertError;
      setEntries(current=>[{...data,author_name:viewerName},...current]);
      setMessage("");
    } catch(caught) {
      setError(caught instanceof Error?caught.message:t(locale,"留言失败，请稍后重试。","Could not post your note. Please try again."));
    } finally {setBusy(false);}
  }
  async function remove(id:string) {
    if(!window.confirm(t(locale,"删除这条留言？","Delete this note?")))return;
    const supabase=createClient();
    const {error:deleteError}=await supabase.from("guestbook_entries").delete().eq("id",id);
    if(deleteError){setError(deleteError.message);return;}
    setEntries(current=>current.filter(entry=>entry.id!==id));
  }
  return <>
    {viewerId?<form className="guestbook-form" onSubmit={submit}>
      <textarea value={message} onChange={e=>setMessage(e.target.value)} maxLength={1000} placeholder={t(locale,"写下一句话，给这里留一点温度…","Leave a few words here…")} required/>
      <div className="editor-actions"><small>{message.length}/1000</small><button className="journal-primary-button" type="submit" disabled={busy}>{busy?t(locale,"正在发送…","Sending…"):t(locale,"留下这句话 ↗","Leave this note ↗")}</button></div>
    </form>:<p className="guestbook-login-note"><Link href={`/login?next=${encodeURIComponent(pathname||"/guestbook")}`}>{t(locale,"登录","Log in")}</Link> {t(locale,"后可以留下你的话。","to leave a note.")}</p>}
    {error&&<p className="form-error">{error}</p>}
    {entries.length===0?<div className="journal-empty"><span>✳</span><h3>{t(locale,"还没有留言。","No notes yet.")}</h3><p>{t(locale,"成为第一个留下话语的人吧。","Be the first to leave a note.")}</p></div>:
      <div className="guestbook-wall">{entries.map(entry=><article className="guestbook-entry" key={entry.id}>
        <div className="guestbook-entry-top"><span>{entry.author_name}</span><time>{new Date(entry.created_at).toLocaleDateString(locale==="en"?"en-US":"zh-CN",{year:"numeric",month:"short",day:"numeric"})}</time></div>
        <p>{entry.message}</p>
        {(viewerId===entry.author_id||(profileId!==null&&viewerId===profileId))&&<button className="guestbook-entry-delete" onClick={()=>remove(entry.id)}>{t(locale,"删除留言","Delete note")}</button>}
      </article>)}</div>}
  </>;
}
