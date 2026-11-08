"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Entry={id:string;profile_id:string|null;author_id:string;message:string;created_at:string;author_name:string};

export default function GuestbookWall({initialEntries,profileId,viewerId,viewerName}:{initialEntries:Entry[];profileId:string|null;viewerId:string|null;viewerName:string}) {
  const [entries,setEntries]=useState(initialEntries);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!message.trim())return;
    if(!viewerId){setError("请先登录，再留下你的话。");return;}
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
      setError(caught instanceof Error?caught.message:"留言失败，请稍后重试。");
    } finally {setBusy(false);}
  }
  async function remove(id:string) {
    if(!window.confirm("删除这条留言？"))return;
    const supabase=createClient();
    const {error:deleteError}=await supabase.from("guestbook_entries").delete().eq("id",id);
    if(deleteError){setError(deleteError.message);return;}
    setEntries(current=>current.filter(entry=>entry.id!==id));
  }
  return <>
    {viewerId?<form className="guestbook-form" onSubmit={submit}>
      <textarea value={message} onChange={e=>setMessage(e.target.value)} maxLength={1000} placeholder="写下一句话，给这里留一点温度…" required/>
      <div className="editor-actions"><small>{message.length}/1000</small><button className="journal-primary-button" type="submit" disabled={busy}>{busy?"正在发送…":"留下这句话 ↗"}</button></div>
    </form>:<p className="guestbook-login-note"><Link href="/login">登录</Link> 后可以留下你的话。</p>}
    {error&&<p className="form-error">{error}</p>}
    {entries.length===0?<div className="journal-empty"><span>✳</span><h3>还没有留言。</h3><p>成为第一个留下话语的人吧。</p></div>:
      <div className="guestbook-wall">{entries.map(entry=><article className="guestbook-entry" key={entry.id}>
        <div className="guestbook-entry-top"><span>{entry.author_name}</span><time>{new Date(entry.created_at).toLocaleDateString("zh-CN",{year:"numeric",month:"short",day:"numeric"})}</time></div>
        <p>{entry.message}</p>
        {(viewerId===entry.author_id||(profileId!==null&&viewerId===profileId))&&<button className="guestbook-entry-delete" onClick={()=>remove(entry.id)}>删除留言</button>}
      </article>)}</div>}
  </>;
}
