"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ExportBackupButton from "@/components/export-backup-button";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/locale";

const themes=["vintage-paper","linen","sage","rose","night","floral","custom"];
const accepted=["image/jpeg","image/png","image/webp","image/gif","image/heic","image/heif"];

export default function ProfileSettingsPage() {
  const router=useRouter();
  const locale=useLocale();
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
    load().catch(e=>{if(alive){setError(e instanceof Error?e.message:t(locale,"读取个人资料失败","Could not load your profile"));setLoading(false);}});
    return ()=>{alive=false;};
  },[router,locale]);

  function pick(file:File|null,kind:"avatar"|"background"){
    if(!file)return;
    if(!accepted.includes(file.type)||file.size>10*1024*1024){setError(t(locale,"请选择 JPG、PNG、WEBP、GIF 或 HEIC 图片，单张不超过 10MB。","Choose a JPG, PNG, WEBP, GIF or HEIC image up to 10 MB."));return;}
    setError("");const url=URL.createObjectURL(file);
    if(kind==="avatar"){setAvatarFile(file);setAvatarPreview(url);}else{setBackgroundFile(file);setBackgroundPreview(url);setTheme("custom");}
  }

  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!/^[a-z0-9_]{3,24}$/.test(username)){setError(t(locale,"用户名需为 3–24 位小写字母、数字或下划线。","Username must be 3–24 lowercase letters, numbers or underscores."));return;}
    if(!displayName.trim()){setError(t(locale,"请填写显示名称。","Please enter a display name."));return;}
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
      setSuccess(t(locale,"个人主页已保存。","Your profile has been saved."));router.refresh();
    }catch(caught){
      if(uploaded.length)await supabase.storage.from("profile-media").remove(uploaded);
      setError(caught instanceof Error?caught.message:t(locale,"保存失败，请稍后重试。","Could not save. Please try again."));
    }finally{setBusy(false);}
  }

  const themeNames:Record<string,string>={"vintage-paper":t(locale,"复古纸张","Vintage paper"),"linen":t(locale,"亚麻","Linen"),"sage":t(locale,"鼠尾草绿","Sage"),"rose":t(locale,"复古玫瑰","Vintage rose"),"night":t(locale,"夜色","Night"),"floral":t(locale,"花卉","Floral"),"custom":t(locale,"自定义背景","Custom background")};
  return <main className="journal-page">
    <header className="journal-header"><Link href="/" className="auth-logo">sonder<span>.</span></Link><Link href="/journal" className="journal-quiet-link">{t(locale,"← 返回我的日记","← Back to my journal")}</Link></header>
    <section className="profile-settings">
      <p className="eyebrow">✳ MAKE THIS SPACE YOURS</p><h1>{t(locale,"装点你的小天地。","Make this space yours.")}</h1><p className="editor-intro">{t(locale,"选择一个名字、写一点介绍，再挑选喜欢的背景。","Choose a name, write a little introduction, and pick a background you love.")}</p>
      {loading?<p>{t(locale,"正在读取个人资料…","Loading your profile…")}</p>:<form className="profile-settings-form" onSubmit={save}>
        <label>{t(locale,"用户名","Username")}<input value={username} onChange={e=>setUsername(e.target.value.toLowerCase())} maxLength={24}/><small>{t(locale,"个人主页地址：","Profile address: ")} /u/{username||"your-name"}</small></label>
        <label>{t(locale,"显示名称","Display name")}<input value={displayName} onChange={e=>setDisplayName(e.target.value)} maxLength={40}/></label>
        <label>{t(locale,"个人介绍","Bio")}<textarea value={bio} onChange={e=>setBio(e.target.value)} maxLength={300} placeholder={t(locale,"写一点关于自己的话…","A few words about you…")}/></label>
        <label>{t(locale,"头像","Avatar")}<input type="file" accept="image/*" onChange={e=>pick(e.target.files?.[0]||null,"avatar")}/>{avatarPreview&&<img className="profile-image-preview" src={avatarPreview} alt={t(locale,"头像预览","Avatar preview")}/>}</label>
        <label>{t(locale,"主页背景","Profile background")}<input type="file" accept="image/*" onChange={e=>pick(e.target.files?.[0]||null,"background")}/>{backgroundPreview&&<img className="profile-background-preview" src={backgroundPreview} alt={t(locale,"背景预览","Background preview")}/>}</label>
        <label>{t(locale,"背景风格","Background style")}<select value={theme} onChange={e=>setTheme(e.target.value)}>{themes.map(value=><option key={value} value={value}>{themeNames[value]}</option>)}</select></label>
        {error&&<p className="form-error">{error}</p>}{success&&<p className="form-success">{success}</p>}
        <div className="editor-actions"><Link href="/journal" className="journal-quiet-link">{t(locale,"取消","Cancel")}</Link><button className="journal-primary-button" disabled={busy}>{busy?t(locale,"正在保存…","Saving…"):t(locale,"保存主页 ↗","Save profile ↗")}</button></div>
        {username&&<Link href={"/u/"+username} className="journal-text-link">{t(locale,"预览我的主页 ↗","Preview my profile ↗")}</Link>}
      </form>}
      {!loading&&userId&&<ExportBackupButton userId={userId}/>}
    </section>
  </main>;
}
