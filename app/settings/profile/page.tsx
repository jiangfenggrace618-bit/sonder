"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const themes=["vintage-paper","linen","sage","rose","night","floral","custom"];
const accepted=["image/jpeg","image/png","image/webp","image/gif","image/heic","image/heif"];

export default function ProfileSettingsPage() {
  const router=useRouter();
  const [userId,setUserId]=useState("");
  const [username,setUsername]=useState("");
  const [displayName,setDisplayName]=useState("");
  const [bio,setBio]=useState("");
  const [theme,setTheme]=useState("vintage-paper");
  const [avatarPath,setAvatarPath]=useState("");
  const [backgroundPath,setBackgroundPath]=useState("");
  const [avatarFile,setAvatarFile]=useState<File|null>(null);
  const [backgroundFile,setBackgroundFile]=useState<File|null>(null);
  const [avatarPreview,setAvatarPreview]=useState("");
  const [backgroundPreview,setBackgroundPreview]=useState("");
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [success,setSuccess]=useState("");

  useEffect(()=>{
    let alive=true;
    async function load(){
      const supabase=createClient();
      const {data:{user}}=await supabase.auth.getUser();
      if(!user){router.replace("/login?next=/settings/profile");return;}
      const {data:profile,error:profileError}=await supabase.from("profiles").select("*").eq("id",user.id).single();
      if(profileError)throw profileError;
      if(!alive)return;
      setUserId(user.id);setUsername(profile.username||"sonder-"+user.id.slice(0,6));
      setDisplayName(profile.display_name||"");setBio(profile.bio||"");setTheme(profile.background_theme||"vintage-paper");
      setAvatarPath(profile.avatar_url||"");setBackgroundPath(profile.background_url||"");
      if(profile.avatar_url){const {data}=await supabase.storage.from("profile-media").createSignedUrl(profile.avatar_url,3600);if(alive)setAvatarPreview(data?.signedUrl||"");}
      if(profile.background_url){const {data}=await supabase.storage.from("profile-media").createSignedUrl(profile.background_url,3600);if(alive)setBackgroundPreview(data?.signedUrl||"");}
      if(alive)setLoading(false);
    }
    load().catch(e=>{if(alive){setError(e instanceof Error?e.message:"读取个人资料失败");setLoading(false);}});
    return ()=>{alive=false;};
  },[router]);

  function pick(file:File|null,kind:"avatar"|"background"){
    if(!file)return;
    if(!accepted.includes(file.type)||file.size>10*1024*1024){setError("请选择 JPG、PNG、WEBP、GIF 或 HEIC 图片，单张不超过 10MB。");return;}
    setError("");const url=URL.createObjectURL(file);
    if(kind==="avatar"){setAvatarFile(file);setAvatarPreview(url);}else{setBackgroundFile(file);setBackgroundPreview(url);setTheme("custom");}
  }

  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!/^[a-z0-9_]{3,24}$/.test(username)){setError("用户名需为 3–24 位小写字母、数字或下划线。");return;}
    if(!displayName.trim()){setError("请填写显示名称。");return;}
    setBusy(true);setError("");setSuccess("");
    const supabase=createClient();const uploaded:string[]=[];
    try{
      let nextAvatar=avatarPath;let nextBackground=backgroundPath;
      for(const [kind,file] of [["avatar",avatarFile],["background",backgroundFile]] as const){
        if(!file)continue;
        const ext=file.name.split(".").pop()?.toLowerCase()||"jpg";
        const path=`${userId}/profile/${kind}-${crypto.randomUUID()}.${ext}`;
        const {error:uploadError}=await supabase.storage.from("profile-media").upload(path,file,{contentType:file.type,upsert:false});
        if(uploadError)throw uploadError;
        uploaded.push(path);
        if(kind==="avatar")nextAvatar=path;else nextBackground=path;
      }
      const {error:updateError}=await supabase.from("profiles").update({
        username:username.trim(),display_name:displayName.trim(),bio:bio.trim(),
        background_theme:theme,avatar_url:nextAvatar||null,background_url:nextBackground||null,updated_at:new Date().toISOString(),
      }).eq("id",userId);
      if(updateError)throw updateError;
      setAvatarPath(nextAvatar);setBackgroundPath(nextBackground);setAvatarFile(null);setBackgroundFile(null);
      setSuccess("个人主页已保存。");router.refresh();
    }catch(caught){
      if(uploaded.length)await supabase.storage.from("profile-media").remove(uploaded);
      setError(caught instanceof Error?caught.message:"保存失败，请稍后重试。");
    }finally{setBusy(false);}
  }

  const themeNames:Record<string,string>={"vintage-paper":"复古纸张","linen":"亚麻","sage":"鼠尾草绿","rose":"复古玫瑰","night":"夜色","floral":"花卉","custom":"自定义背景"};
  return <main className="journal-page">
    <header className="journal-header"><Link href="/" className="auth-logo">sonder<span>.</span></Link><Link href="/journal" className="journal-quiet-link">← 返回我的日记</Link></header>
    <section className="profile-settings">
      <p className="eyebrow">✳ MAKE THIS SPACE YOURS</p><h1>装点你的小天地。</h1><p className="editor-intro">选择一个名字、写一点介绍，再挑选喜欢的背景。</p>
      {loading?<p>正在读取个人资料…</p>:<form className="profile-settings-form" onSubmit={save}>
        <label>用户名<input value={username} onChange={e=>setUsername(e.target.value.toLowerCase())} maxLength={24}/><small>个人主页地址：/u/{username||"your-name"}</small></label>
        <label>显示名称<input value={displayName} onChange={e=>setDisplayName(e.target.value)} maxLength={40}/></label>
        <label>个人介绍<textarea value={bio} onChange={e=>setBio(e.target.value)} maxLength={300} placeholder="写一点关于自己的话…"/></label>
        <label>头像<input type="file" accept="image/*" onChange={e=>pick(e.target.files?.[0]||null,"avatar")}/>{avatarPreview&&<img className="profile-image-preview" src={avatarPreview} alt="头像预览"/>}</label>
        <label>主页背景<input type="file" accept="image/*" onChange={e=>pick(e.target.files?.[0]||null,"background")}/>{backgroundPreview&&<img className="profile-background-preview" src={backgroundPreview} alt="背景预览"/>}</label>
        <label>背景风格<select value={theme} onChange={e=>setTheme(e.target.value)}>{themes.map(value=><option key={value} value={value}>{themeNames[value]}</option>)}</select></label>
        {error&&<p className="form-error">{error}</p>}{success&&<p className="form-success">{success}</p>}
        <div className="editor-actions"><Link href="/journal" className="journal-quiet-link">取消</Link><button className="journal-primary-button" disabled={busy}>{busy?"正在保存…":"保存主页 ↗"}</button></div>
        {username&&<Link href={"/u/"+username} className="journal-text-link">预览我的主页 ↗</Link>}
      </form>}
    </section>
  </main>;
}
