import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import FollowButton from "@/components/follow-button";
import { getLocale } from "@/lib/server-locale";
import { t } from "@/lib/locale";

export const dynamic="force-dynamic";

export default async function ExplorePage() {
  const locale=await getLocale();
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const {data:posts,error}=await supabase.from("posts")
    .select("id,user_id,title,content,visibility,mood,location,created_at,post_photos(id,image_url,caption,sort_order)")
    .eq("visibility","public")
    .order("created_at",{ascending:false}).limit(50);
  const userIds=[...new Set((posts??[]).map(post=>post.user_id))];
  const [{data:profiles},{data:follows}]=await Promise.all([
    userIds.length?supabase.from("profiles").select("id,username,display_name,avatar_url").in("id",userIds):Promise.resolve({data:[]}),
    user?supabase.from("follows").select("followed_id").eq("follower_id",user.id):Promise.resolve({data:[]}),
  ]);
  const profileMap=new Map((profiles??[]).map(profile=>[profile.id,profile]));
  const followed=new Set((follows??[]).map(row=>row.followed_id));
  const cards=await Promise.all((posts??[]).map(async post=>{
    const profile=profileMap.get(post.user_id);
    const {data:avatar}=profile?.avatar_url?await supabase.storage.from("profile-media").createSignedUrl(profile.avatar_url,3600):{data:null};
    const photos=await Promise.all([...(post.post_photos??[])].sort((a,b)=>a.sort_order-b.sort_order).map(async photo=>{
      const {data}=await supabase.storage.from("post-photos").createSignedUrl(photo.image_url,3600);
      return {...photo,url:data?.signedUrl??null};
    }));
    return {...post,profile,avatarUrl:avatar?.signedUrl??null,photos};
  }));
  return <main className="journal-page">
    <header className="journal-header"><Link href="/" className="auth-logo">sonder<span>.</span></Link><div className="journal-header-actions"><Link href="/journal" className="journal-quiet-link">{t(locale,"我的日记","My journal")}</Link>{user?<Link href="/settings/profile" className="journal-quiet-link">{t(locale,"个人设置","Settings")}</Link>:<Link href="/login" className="journal-quiet-link">{t(locale,"登录","Log in")}</Link>}</div></header>
    <section className="social-page">
      <div className="social-heading"><div><p className="eyebrow">✳ THE OPEN JOURNAL</p><h1>{t(locale,"生活的片段。","Little moments of life.")}</h1><p>{t(locale,"看看别人正在收藏的日常，也许会遇见一点共鸣。","Explore the everyday moments others have chosen to keep.")}</p></div><Link href="/journal/new" className="journal-primary-button">{t(locale,"写下自己的故事 ↗","Write your story ↗")}</Link></div>
      {error&&<p className="form-error">{error.message}</p>}
      {cards.length===0?<div className="social-empty"><h2>{t(locale,"这里还很安静。","It is quiet here for now.")}</h2><p>{t(locale,"公开日记出现后，就会在这里慢慢汇集。","Public journal entries will gather here as people share them.")}</p></div>:
      <div className="social-feed">{cards.map(post=>{
        const profile=post.profile;const name=profile?.display_name||t(locale,"一位朋友","A friend");
        return <article className="social-post" key={post.id}>
          <div className="social-author"><Link className="social-author-link" href={profile?.username?"/u/"+profile.username:"/explore"}>
            <span className="social-avatar">{post.avatarUrl?<img src={post.avatarUrl} alt=""/>:name.slice(0,1)}</span><span><span className="social-author-name">{name}</span><span className="social-post-date">{new Date(post.created_at).toLocaleDateString(locale==="en"?"en-US":"zh-CN",{year:"numeric",month:"long",day:"numeric"})}</span></span>
          </Link>{user&&<FollowButton targetUserId={post.user_id} viewerId={user.id} initialFollowing={followed.has(post.user_id)}/>}</div>
          <h2>{post.title}</h2>{post.content&&<p className="social-post-content">{post.content}</p>}
          {(post.mood||post.location)&&<p className="social-post-meta">{[post.mood,post.location].filter(Boolean).join(" · ")}</p>}
          {post.photos.some(photo=>photo.url)&&<div className="journal-photo-grid">{post.photos.map(photo=>photo.url?<figure key={photo.id}><img src={photo.url} alt={photo.caption||post.title}/></figure>:null)}</div>}
        </article>;
      })}</div>}
    </section>
  </main>;
}
