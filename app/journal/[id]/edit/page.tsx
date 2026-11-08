"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const accepted=["image/jpeg","image/png","image/webp","image/gif","image/heic","image/heif"];
type Photo={id:string;image_url:string;caption:string;sort_order:number;url:string|null};

export default function EditJournalPage(){
  const {id}=useParams<{id:string}>();
  const router=useRouter();
  const [title,setTitle]=useState("");const [content,setContent]=useState("");
  const [visibility,setVisibility]=useState<"public"|"followers"|"private">("private");
  const [mood,setMood]=useState("");const [location,setLocation]=useState("");
  const [photos,setPhotos]=useState<Photo[]>([]);const [removed,setRemoved]=useState<string[]>([]);
  const [files,setFiles]=useState<File[]>([]);const [previews,setPreviews]=useState<string[]>([]);
  const [busy,setBusy]=useState(false);const [loading,setLoading]=useState(true);const [error,setError]=useState("");

  useEffect(()=>{
    const urls=files.map(file=>URL.createObjectURL(file));setPreviews(urls);
    return ()=>urls.forEach(url=>URL.revokeObjectURL(url));
  },[files]);

  useEffect(()=>{
    let alive=true;
    async function load(){
      const supabase=createClient();
      const {data:{user}}=await supabase.auth.getUser();
      if(!user){router.replace("/login");return;}
      const {data:post,error:postError}=await supabase.from("posts").select("id,title,content,visibility,mood,location").eq("id",id).eq("user_id",user.id).single();
      if(postError)throw postError;
      const {data:photoRows,error:photoError}=await supabase.from("post_photos").select("id,image_url,caption,sort_order").eq("post_id",id).order("sort_order");
      if(photoError)throw photoError;
      const photoList=await Promise.all((photoRows??[]).map(async photo=>{
        const {data}=await supabase.storage.from("post-photos").createSignedUrl(photo.image_url,3600);
        return {...photo,url:data?.signedUrl??null};
      }));
      if(!alive)return;
      setTitle(post.title);setContent(post.content||"");setVisibility(post.visibility);setMood(post.mood||"");setLocation(post.location||"");setPhotos(photoList);setLoading(false);
    }
    load().catch(e=>{if(alive){setError(e instanceof Error?e.message:"读取日记失败");setLoading(false);}});
    return ()=>{alive=false;};
  },[id,router]);

  function chooseFiles(list:FileList|null){
    if(!list)return;const selected=Array.from(list);
    if(photos.length-removed.length+selected.length>8){setError("一篇日记最多保留 8 张照片。");return;}
    if(selected.some(file=>!accepted.includes(file.type)||file.size>10*1024*1024)){setError("照片需为 JPG、PNG、WEBP、GIF 或 HEIC 格式，且单张不超过 10MB。");return;}
    setError("");setFiles(selected);
  }

  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!title.trim()){setError("标题不能为空。");return;}
    setBusy(true);setError("");const supabase=createClient();const uploaded:string[]=[];
    try{
      const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error("登录状态已失效，请重新登录。");
      const {error:updateError}=await supabase.from("posts").update({title:title.trim(),content:content.trim(),visibility,mood:mood.trim()||null,location:location.trim()||null,updated_at:new Date().toISOString()}).eq("id",id).eq("user_id",user.id);
      if(updateError)throw updateError;
      const newRows=[];
      for(const [index,file] of files.entries()){
        const ext=file.name.split(".").pop()?.toLowerCase()||"jpg";const path=`${user.id}/${id}/${crypto.randomUUID()}.${ext}`;
        const {error:uploadError}=await supabase.storage.from("post-photos").upload(path,file,{contentType:file.type,upsert:false});
        if(uploadError)throw uploadError;uploaded.push(path);
        newRows.push({post_id:id,user_id:user.id,image_url:path,caption:"",sort_order:photos.length+index});
      }
      if(newRows.length){const {error:insertError}=await supabase.from("post_photos").insert(newRows);if(insertError)throw insertError;}
      const removedPhotos=photos.filter(photo=>removed.includes(photo.id));
      if(removedPhotos.length){
        const {error:deleteRowsError}=await supabase.from("post_photos").delete().in("id",removed);
        if(deleteRowsError)throw deleteRowsError;
        const {error:deleteFilesError}=await supabase.storage.from("post-photos").remove(removedPhotos.map(photo=>photo.image_url));
        if(deleteFilesError)throw deleteFilesError;
      }
      router.push("/journal");router.refresh();
    }catch(caught){
      if(uploaded.length)await supabase.storage.from("post-photos").remove(uploaded);
      setError(caught instanceof Error?caught.message:"保存失败，请稍后重试。");
    }finally{setBusy(false);}
  }

  if(loading)return <main className="journal-page"><section className="editor-content">正在打开这篇日记…{error&&<p className="form-error">{error}</p>}</section></main>;
  return <main className="journal-page">
    <header className="journal-header"><Link href="/" className="auth-logo">sonder<span>.</span></Link><Link href="/journal" className="journal-quiet-link">← 返回我的日记</Link></header>
    <section className="editor-content"><p className="eyebrow">✳ REVISIT A MOMENT</p><h1>重新整理。</h1><p className="editor-intro">有些记忆，值得再补充一点细节。</p>
      <form className="journal-form" onSubmit={save}>
        <label><span>标题</span><input value={title} onChange={e=>setTitle(e.target.value)} maxLength={120} required/></label>
        <label><span>日记内容</span><textarea value={content} onChange={e=>setContent(e.target.value)} rows={8}/></label>
        <div className="journal-form-two"><label><span>心情</span><input value={mood} onChange={e=>setMood(e.target.value)} maxLength={40}/></label><label><span>地点</span><input value={location} onChange={e=>setLocation(e.target.value)} maxLength={100}/></label></div>
        <div><span className="eyebrow">已有照片 · 点击移除</span><div className="upload-preview-grid">{photos.filter(p=>!removed.includes(p.id)).map(photo=><figure key={photo.id}><button type="button" className="photo-remove" onClick={()=>setRemoved(current=>[...current,photo.id])}>移除 ×</button>{photo.url&&<img src={photo.url} alt={photo.caption||title}/>}</figure>)}</div></div>
        <label><span>添加照片 <i>最多 8 张 · 单张不超过 10MB</i></span><input type="file" accept="image/*" multiple onChange={e=>chooseFiles(e.target.files)}/></label>
        {previews.length>0&&<div className="upload-preview-grid">{previews.map((url,index)=><figure key={url}><img src={url} alt={files[index].name}/></figure>)}</div>}
        <fieldset className="visibility-field"><legend>谁可以看见这篇日记？</legend>
          <label className={visibility==="public"?"visibility-option chosen":"visibility-option"}><input type="radio" name="visibility" checked={visibility==="public"} onChange={()=>setVisibility("public")}/><span><b>公开</b><small>所有人都可以看见</small></span></label>
          <label className={visibility==="followers"?"visibility-option chosen":"visibility-option"}><input type="radio" name="visibility" checked={visibility==="followers"} onChange={()=>setVisibility("followers")}/><span><b>仅好友</b><small>关注你的人可以看见</small></span></label>
          <label className={visibility==="private"?"visibility-option chosen":"visibility-option"}><input type="radio" name="visibility" checked={visibility==="private"} onChange={()=>setVisibility("private")}/><span><b>仅自己</b><small>只有你自己可以看见</small></span></label>
        </fieldset>
        {error&&<p className="form-error">{error}</p>}
        <div className="editor-actions"><Link href="/journal" className="journal-quiet-link">取消</Link><button className="journal-primary-button" disabled={busy}>{busy?"正在保存…":"保存修改 ↗"}</button></div>
      </form>
    </section>
  </main>;
}
