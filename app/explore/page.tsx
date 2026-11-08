import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import FollowButton from "@/components/follow-button";

export const dynamic="force-dynamic";

export default async function ExplorePage() {
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const {data:posts,error}=await supabase.from("posts")
    .select("id,user_id,title,content,visibility,mood,location,created_at,post_photos(id,image_url,caption,sort_order)")
    .order("created_at",{ascending:false}).limit(50);
  const userIds=[...new Set((posts??[]).map(post=>post.user_id))];
  const [{data:profiles},{data:follows}]=await Promise.all([
    userIds.length?supabase.from("profiles").select("id,username,display_name,avatar_url").in("id",userIds):Promise.resolve({data:[]}),
    user?supabase.from("follows").select("followed_id").eq("follower_id",user.id):Promise.resolve({data:[]}),
  ]);
  const profileMap=new Map((profiles??[]).map(profile=>[profile.id,profile]));
  const followed=new Set((follows??[]).map(row=>row.followed_id));
  const cards=await Promise.all((posts??[]).map(async post=>{
    const photos=await Promise.all([...(post.post_photos??[])].sort((a,b)=>a.sort_order-b.sort_order).map(async photo=>{
      const {data}=await supabase.storage.from("post-photos").createSignedUrl(photo.image_url,3600);
      return {...photo,url:data?.signedUrl??null};
    }));
    return {...post,profile:profileMap.get(post.user_id),photos};
  }));
  return <main className="journal-page">
    <header className="journal-header"><Link href="/" className="auth-logo">sonder<span>.</span></Link><div className="journal-header-actions"><Link href="/journal" className="journal-quiet-link">我的日记</Link>{user?<Link href="/settings/profile" className="journal-quiet-link">个人设置</Link>:<Link href="/login" className="journal-quiet-link">登录</Link>}</div></header>
    <section className="social-page">
      <div className="social-heading"><div><p className="eyebrow">✳ THE OPEN JOURNAL</p><h1>生活的片段。</h1><p>看看别人正在收藏的日常，也许会遇见一点共鸣。</p></div><Link href="/journal/new" className="journal-primary-button">写下自己的故事 ↗</Link></div>
      {error&&<p className="form-error">{error.message}</p>}
      {cards.length===0?<div className="social-empty"><h2>这里还很安静。</h2><p>公开日记出现后，就会在这里慢慢汇集。</p></div>:
      <div className="social-feed">{cards.map(post=>{
        const profile=post.profile;const name=profile?.display_name||"一位朋友";
        return <article className="social-post" key={post.id}>
          <div className="social-author"><Link className="social-author-link" href={profile?.username?"/u/"+profile.username:"/explore"}>
            <span className="social-avatar">{name.slice(0,1)}</span><span><span className="social-author-name">{name}</span><span className="social-post-date">{new Date(post.created_at).toLocaleDateString("zh-CN",{year:"numeric",month:"long",day:"numeric"})}</span></span>
          </Link>{user&&<FollowButton targetUserId={post.user_id} viewerId={user.id} initialFollowing={followed.has(post.user_id)}/>}</div>
          <h2>{post.title}</h2>{post.content&&<p className="social-post-content">{post.content}</p>}
          {(post.mood||post.location)&&<p className="social-post-meta">{[post.mood,post.location].filter(Boolean).join(" · ")}</p>}
          {post.photos.some(photo=>photo.url)&&<div className="journal-photo-grid">{post.photos.map(photo=>photo.url?<figure key={photo.id}><img src={photo.url} alt={photo.caption||post.title}/></figure>:null)}</div>}
        </article>;
      })}</div>}
    </section>
  </main>;
}
