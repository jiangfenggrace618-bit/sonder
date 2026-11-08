import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./logout-button";
import DeletePostButton from "@/components/delete-post-button";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/journal");

  const [{ data: profile }, { data: posts, error }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    supabase.from("posts")
      .select("id,title,content,visibility,mood,location,created_at,post_photos(id,image_url,caption,sort_order)")
      .eq("user_id", user.id).order("created_at", { ascending: false }),
  ]);

  const entries = await Promise.all((posts ?? []).map(async post => {
    const photos = await Promise.all([...(post.post_photos ?? [])].sort((a,b)=>a.sort_order-b.sort_order).map(async photo => {
      const { data } = await supabase.storage.from("post-photos").createSignedUrl(photo.image_url, 3600);
      return { ...photo, signedUrl: data?.signedUrl ?? null };
    }));
    return { ...post, photos };
  }));

  const displayName = profile?.display_name || user.email?.split("@")[0] || "朋友";
  const visibilityLabel: Record<string,string> = {public:"公开",followers:"仅好友",private:"仅自己"};

  return (
    <main className="journal-page">
      <header className="journal-header">
        <Link href="/" className="auth-logo">sonder<span>.</span></Link>
        <div className="journal-header-actions"><span className="journal-user">{displayName}</span><LogoutButton/></div>
      </header>
      <section className="journal-content">
        <div className="journal-welcome">
          <p className="eyebrow">✳ YOUR PERSONAL ARCHIVE</p><h1>你好，{displayName}。</h1>
          <p>每一天都值得被温柔地收藏。</p><Link href="/journal/new" className="journal-primary-button">写一篇日记 ↗</Link>
        </div>
        <div className="journal-list-heading"><div><p className="eyebrow">THE JOURNAL</p><h2>你的日常记录。</h2></div><span>{String(entries.length).padStart(2,"0")} ENTRIES</span></div>
        {error && <p className="form-error">暂时无法读取日记：{error.message}</p>}
        {entries.length===0 ? <div className="journal-empty"><span>✳</span><h3>这里还很安静。</h3><p>写下第一篇日记，让这个小小的收藏簿慢慢丰富起来。</p><Link href="/journal/new" className="journal-text-link">写下第一篇 ↗</Link></div> :
          <div className="journal-entry-list">{entries.map(entry=><article className="journal-entry" key={entry.id}>
            <div className="journal-entry-meta"><time dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleDateString("zh-CN",{year:"numeric",month:"long",day:"numeric"})}</time><span>{visibilityLabel[entry.visibility]??entry.visibility}</span></div>
            <div className="journal-entry-title-row"><h3>{entry.title}</h3><div className="journal-entry-actions"><Link href={`/journal/${entry.id}/edit`} className="journal-entry-edit">编辑</Link><DeletePostButton postId={entry.id}/></div></div>{entry.content&&<p className="journal-entry-content">{entry.content}</p>}
            {(entry.mood||entry.location)&&<p className="journal-entry-extra">{[entry.mood,entry.location].filter(Boolean).join(" · ")}</p>}
            {entry.photos.length>0&&<div className="journal-photo-grid">{entry.photos.map(photo=>photo.signedUrl?<figure key={photo.id}><img src={photo.signedUrl} alt={photo.caption||entry.title}/>{photo.caption&&<figcaption>{photo.caption}</figcaption>}</figure>:null)}</div>}
          </article>)}</div>}
      </section>
    </main>
  );
}
