import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FollowButton from "@/components/follow-button";
import GuestbookWall from "@/components/guestbook-wall";

export const dynamic="force-dynamic";

export default async function PublicProfilePage({params}:{params:Promise<{username:string}>}) {
  const {username}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const {data:profile}=await supabase.from("profiles").select("id,username,display_name,bio,avatar_url,background_url,background_theme").eq("username",username).maybeSingle();
  if(!profile)notFound();

  const [
    {data:posts},
    {count:followerCount},
    {count:followingCount},
    {data:viewerFollow},
    {data:guestRows},
    {data:viewerProfile}
  ]=await Promise.all([
    supabase.from("posts").select("id,user_id,title,content,visibility,mood,location,created_at,post_photos(id,image_url,caption,sort_order)").eq("user_id",profile.id).order("created_at",{ascending:false}),
    supabase.from("follows").select("id",{count:"exact",head:true}).eq("followed_id",profile.id),
    supabase.from("follows").select("id",{count:"exact",head:true}).eq("follower_id",profile.id),
    user?supabase.from("follows").select("id").eq("follower_id",user.id).eq("followed_id",profile.id).maybeSingle():Promise.resolve({data:null}),
    supabase.from("guestbook_entries").select("id,profile_id,author_id,message,created_at").eq("profile_id",profile.id).order("created_at",{ascending:false}).limit(50),
    user?supabase.from("profiles").select("display_name").eq("id",user.id).maybeSingle():Promise.resolve({data:null})
  ]);

  const authorIds=[...new Set((guestRows??[]).map(row=>row.author_id))];
  const {data:guestAuthors}=authorIds.length?await supabase.from("profiles").select("id,display_name").in("id",authorIds):{data:[]};
  const guestNames=new Map((guestAuthors??[]).map(p=>[p.id,p.display_name]));
  const guestEntries=(guestRows??[]).map(row=>({...row,author_name:guestNames.get(row.author_id)||"一位朋友"}));
  const {data:avatar}=profile.avatar_url?await supabase.storage.from("profile-media").createSignedUrl(profile.avatar_url,3600):{data:null};
  const {data:background}=profile.background_url?await supabase.storage.from("profile-media").createSignedUrl(profile.background_url,3600):{data:null};
  const entries=await Promise.all((posts??[]).map(async post=>{
    const photos=await Promise.all([...(post.post_photos??[])].sort((a,b)=>a.sort_order-b.sort_order).map(async photo=>{
      const {data}=await supabase.storage.from("post-photos").createSignedUrl(photo.image_url,3600);
      return {...photo,url:data?.signedUrl??null};
    }));
    return {...post,photos};
  }));
  const isOwner=user?.id===profile.id;
  const viewerName=viewerProfile?.display_name||user?.email?.split("@")[0]||"朋友";

  return <main className="journal-page">
    <header className="journal-header"><Link href="/" className="auth-logo">sonder<span>.</span></Link><div className="journal-header-actions"><Link href="/explore" className="journal-quiet-link">日常广场</Link>{isOwner&&<Link href="/settings/profile" className="journal-quiet-link">编辑主页</Link>}</div></header>
    <section className="social-page">
      <div className="social-profile-hero" data-theme={profile.background_theme} style={background?.signedUrl?{backgroundImage:`linear-gradient(#e8e0d1bb,#e8e0d1bb),url("${background.signedUrl}")`,backgroundSize:"cover",backgroundPosition:"center"}:undefined}>
        <div className="social-profile-top"><div className="social-profile-avatar">{avatar?.signedUrl?<img src={avatar.signedUrl} alt={profile.display_name}/>:profile.display_name.slice(0,1)}</div><div><h1>{profile.display_name}</h1><p className="journal-user">@{profile.username}</p><FollowButton targetUserId={profile.id} viewerId={user?.id??null} initialFollowing={!!viewerFollow}/></div></div>
        {profile.bio&&<p className="social-profile-bio">{profile.bio}</p>}
        <div className="social-profile-stats"><span><b>{entries.length}</b> 日记</span><span><b>{followerCount??0}</b> 关注者</span><span><b>{followingCount??0}</b> 正在关注</span></div>
      </div>
      <p className="eyebrow">✳ THE JOURNAL</p><h2 className="profile-section-title">收藏的日常。</h2>
      {entries.length===0?<div className="social-empty"><p>这里还没有你能看见的日记。</p></div>:<div className="social-feed">{entries.map(post=><article className="social-post" key={post.id}><div className="journal-entry-meta"><time>{new Date(post.created_at).toLocaleDateString("zh-CN",{year:"numeric",month:"long",day:"numeric"})}</time><span>{post.visibility==="followers"?"仅好友":"公开"}</span></div><h2>{post.title}</h2>{post.content&&<p className="social-post-content">{post.content}</p>}{(post.mood||post.location)&&<p className="social-post-meta">{[post.mood,post.location].filter(Boolean).join(" · ")}</p>}{post.photos.some(p=>p.url)&&<div className="journal-photo-grid">{post.photos.map(photo=>photo.url?<figure key={photo.id}><img src={photo.url} alt={photo.caption||post.title}/></figure>:null)}</div>}</article>)}</div>}
      <div style={{marginTop:60}}><p className="eyebrow">✳ THE GUESTBOOK</p><h2 className="profile-section-title">留下一句话。</h2><GuestbookWall initialEntries={guestEntries} profileId={profile.id} viewerId={user?.id??null} viewerName={viewerName}/></div>
    </section>
  </main>;
}
