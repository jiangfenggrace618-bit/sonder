"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/locale";

const MAX_SIZE=10*1024*1024;
const ACCEPTED=["image/jpeg","image/png","image/webp","image/gif","image/heic","image/heif"];

export default function NewJournalPage() {
  const router=useRouter();
  const locale=useLocale();
  const [title,setTitle]=useState("");
  const [content,setContent]=useState("");
  const [visibility,setVisibility]=useState<"public"|"followers"|"private">("private");
  const [mood,setMood]=useState("");
  const [location,setLocation]=useState("");
  const [files,setFiles]=useState<File[]>([]);
  const [previews,setPreviews]=useState<string[]>([]);
  useEffect(()=>{
    const urls=files.map(file=>URL.createObjectURL(file));
    setPreviews(urls);
    return ()=>urls.forEach(url=>URL.revokeObjectURL(url));
  },[files]);
  const [busy,setBusy]=useState(false);
  const [saveStage,setSaveStage]=useState("");
  const [error,setError]=useState("");

  function chooseFiles(list:FileList|null) {
    if(!list)return;
    const selected=Array.from(list);
    if(selected.length>8){setError(t(locale,"一次最多上传 8 张照片。","You can upload up to 8 photos per entry."));return;}
    if(selected.some(file=>!ACCEPTED.includes(file.type)||file.size>MAX_SIZE)){setError(t(locale,"照片需为 JPG、PNG、WEBP、GIF 或 HEIC 格式，且单张不超过 10MB。","Photos must be JPG, PNG, WEBP, GIF or HEIC, up to 10 MB each."));return;}
    setError("");setFiles(selected);
  }

  async function handleSubmit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!title.trim()){setError(t(locale,"先为这篇日记写一个标题吧。","Give this entry a title first."));return;}
    setBusy(true);setSaveStage(t(locale,"正在保存日记内容…","Saving your entry…"));setError("");
    const supabase=createClient();
    const uploaded:string[]=[];
    let postId:string|null=null;
    try {
      const {data:{user},error:authError}=await supabase.auth.getUser();
      if(authError||!user){router.push("/login?next=/journal/new");return;}
      const {data:post,error:postError}=await supabase.from("posts").insert({
        user_id:user.id,title:title.trim(),content:content.trim(),visibility,
        mood:mood.trim()||null,location:location.trim()||null,
      }).select("id").single();
      if(postError)throw postError;
      postId=post.id;
      const photoRows=[];
      if(files.length)setSaveStage(locale==="en"?`Entry saved. Uploading ${files.length} photo(s)…`:`日记已保存，正在上传 ${files.length} 张照片…`);
      for(const [index,file] of files.entries()){
        const ext=file.name.includes(".")?file.name.split(".").pop()!.toLowerCase():(file.type.split("/")[1]||"jpg");
        const path=`${user.id}/${post.id}/${crypto.randomUUID()}.${ext}`;
        const {error:uploadError}=await supabase.storage.from("post-photos").upload(path,file,{contentType:file.type,upsert:false});
        if(uploadError)throw uploadError;
        uploaded.push(path);
        photoRows.push({post_id:post.id,user_id:user.id,image_url:path,caption:"",sort_order:index});
      }
      if(photoRows.length){setSaveStage(t(locale,"照片已上传，正在完成保存…","Photos uploaded. Finishing up…"));const {error:photoError}=await supabase.from("post_photos").insert(photoRows);if(photoError)throw photoError;}
      setSaveStage(t(locale,"保存成功，正在打开你的日记…","Saved. Opening your journal…"));
      router.replace("/journal");
      router.refresh();
    } catch(caught) {
      if(uploaded.length)await supabase.storage.from("post-photos").remove(uploaded);
      if(postId){await supabase.from("post_photos").delete().eq("post_id",postId);await supabase.from("posts").delete().eq("id",postId);}
      setError(caught instanceof Error?caught.message:t(locale,"保存失败，请稍后重试。","Could not save. Please try again."));
      setSaveStage("");
    } finally {setBusy(false);}
  }

  return <main className="journal-page">
    <header className="journal-header"><Link href="/" className="auth-logo">sonder<span>.</span></Link><Link href="/journal" className="journal-quiet-link">{t(locale,"← 返回我的日记","← Back to my journal")}</Link></header>
    <section className="editor-content">
      <p className="eyebrow">✳ A MOMENT TO KEEP</p><h1>{t(locale,"写下这一刻。","Keep this moment.")}</h1><p className="editor-intro">{t(locale,"不必写得多么精彩，只要它值得被你记住。","It does not need to be extraordinary to be worth remembering.")}</p>
      <form className="journal-form" onSubmit={handleSubmit}>
        <label><span>{t(locale,"标题","Title")} <i>{t(locale,"必填","Required")}</i></span><input value={title} onChange={e=>setTitle(e.target.value)} maxLength={120} required placeholder={t(locale,"给今天起一个名字…","Give today a name…")}/></label>
        <label><span>{t(locale,"记录一点什么","A few words")}</span><textarea value={content} onChange={e=>setContent(e.target.value)} rows={8} placeholder={t(locale,"今天发生了什么？有什么想留住的念头？","What happened today? What would you like to keep?")}/></label>
        <div className="journal-form-two">
          <label><span>{t(locale,"此刻的心情","How you feel")}</span><input value={mood} onChange={e=>setMood(e.target.value)} maxLength={40} placeholder={t(locale,"例如：平静、开心…","e.g. peaceful, happy…")}/></label>
          <label><span>{t(locale,"所在的地方","Where you are")}</span><input value={location} onChange={e=>setLocation(e.target.value)} maxLength={100} placeholder={t(locale,"例如：家附近的咖啡馆","e.g. a café around the corner")}/></label>
        </div>
        <label><span>{t(locale,"照片","Photos")} <i>{t(locale,"最多 8 张 · 单张不超过 10MB","Up to 8 · 10 MB each")}</i></span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif" multiple onChange={e=>chooseFiles(e.target.files)}/></label>
        {files.length>0&&<div className="upload-preview-grid">{files.map((file,index)=><figure key={file.name+file.lastModified}>{previews[index]&&<img src={previews[index]} alt={file.name}/>}<figcaption>{file.name} · {(file.size/1024/1024).toFixed(1)} MB</figcaption></figure>)}</div>}
        <fieldset className="visibility-field"><legend>{t(locale,"谁可以看见这篇日记？","Who can see this entry?")}</legend>
          <label className={visibility==="public"?"visibility-option chosen":"visibility-option"}><input type="radio" name="visibility" checked={visibility==="public"} onChange={()=>setVisibility("public")}/><span><b>{t(locale,"公开","Public")}</b><small>{t(locale,"所有人都可以看见","Visible to everyone")}</small></span></label>
          <label className={visibility==="followers"?"visibility-option chosen":"visibility-option"}><input type="radio" name="visibility" checked={visibility==="followers"} onChange={()=>setVisibility("followers")}/><span><b>{t(locale,"关注者可见","Followers")}</b><small>{t(locale,"关注你的人可以看见","Visible to your followers")}</small></span></label>
          <label className={visibility==="private"?"visibility-option chosen":"visibility-option"}><input type="radio" name="visibility" checked={visibility==="private"} onChange={()=>setVisibility("private")}/><span><b>{t(locale,"仅自己","Only me")}</b><small>{t(locale,"只有你自己可以看见","Visible only to you")}</small></span></label>
        </fieldset>
        {error&&<p className="form-error" role="alert">{error}</p>}
        {busy&&saveStage&&<p className="editor-save-status" role="status" aria-live="polite">{saveStage}</p>}
        <div className="editor-actions"><Link href="/journal" className="journal-quiet-link">{t(locale,"暂不保存","Cancel")}</Link><button type="submit" className="journal-primary-button" disabled={busy}>{busy?(saveStage||t(locale,"正在收藏…","Saving…")):t(locale,"收藏这篇日记 ↗","Save this entry ↗")}</button></div>
      </form>
    </section>
  </main>;
}
