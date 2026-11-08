import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./logout-button";
import DeletePostButton from "@/components/delete-post-button";
import { getLocale } from "@/lib/server-locale";
import { t } from "@/lib/locale";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const locale = await getLocale();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/journal");

  const [{ data: profile }, { data: posts, error }] = await Promise.all([
    supabase.from("profiles").select("display_name,username").eq("id", user.id).maybeSingle(),
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
  const visibilityLabel: Record<string,string> = {public:t(locale,"公开","Public"),followers:t(locale,"关注者可见","Followers"),private:t(locale,"仅自己","Only me")};

  return (
    <main className="journal-page">
      <header className="journal-header">
        <Link href="/" className="auth-logo">sonder<span>.</span></Link>
        <div className="journal-header-actions"><Link href="/explore" className="journal-quiet-link">{t(locale,"日常广场","Explore")}</Link><Link href="/friends" className="journal-quiet-link">{t(locale,"好友","Friends")}</Link>{profile?.username&&<Link href={"/u/"+profile.username} className="journal-quiet-link">{t(locale,"我的主页","My profile")}</Link>}<Link href="/settings/profile" className="journal-quiet-link">{t(locale,"设置","Settings")}</Link><span className="journal-user">{displayName}</span><LogoutButton/></div>
      </header>
      <section className="journal-content">
        <div className="journal-welcome">
          <p className="eyebrow">✳ YOUR PERSONAL ARCHIVE</p><h1>{locale==="en"?"Hello, ":"你好，"}{displayName}{locale==="en"?".":"。"}</h1>
          <p>{t(locale,"每一天都值得被温柔地收藏。","Every day deserves a gentle place to be kept.")}</p><Link href="/journal/new" className="journal-primary-button">{t(locale,"写一篇日记 ↗","Write a journal ↗")}</Link>
        </div>
        <div className="journal-list-heading"><div><p className="eyebrow">THE JOURNAL</p><h2>{t(locale,"你的日常记录。","Your journal.")}</h2></div><span>{String(entries.length).padStart(2,"0")} ENTRIES</span></div>
        {error && <p className="form-error">{t(locale,"暂时无法读取日记：","Could not load your journal: ")}{error.message}</p>}
        {entries.length===0 ? <div className="journal-empty"><span>✳</span><h3>{t(locale,"这里还很安静。","It is quiet here for now.")}</h3><p>{t(locale,"写下第一篇日记，让这个小小的收藏簿慢慢丰富起来。","Write your first entry and let this little archive grow.")}</p><Link href="/journal/new" className="journal-text-link">{t(locale,"写下第一篇 ↗","Write your first entry ↗")}</Link></div> :
          <div className="journal-entry-list">{entries.map(entry=><article className="journal-entry" key={entry.id}>
            <div className="journal-entry-meta"><time dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleDateString(locale==="en"?"en-US":"zh-CN",{year:"numeric",month:"long",day:"numeric"})}</time><span>{visibilityLabel[entry.visibility]??entry.visibility}</span></div>
            <div className="journal-entry-title-row"><h3>{entry.title}</h3><div className="journal-entry-actions"><Link href={`/journal/${entry.id}/edit`} className="journal-entry-edit">{t(locale,"编辑","Edit")}</Link><DeletePostButton postId={entry.id}/></div></div>{entry.content&&<p className="journal-entry-content">{entry.content}</p>}
            {(entry.mood||entry.location)&&<p className="journal-entry-extra">{[entry.mood,entry.location].filter(Boolean).join(" · ")}</p>}
            {entry.photos.length>0&&<div className="journal-photo-grid">{entry.photos.map(photo=>photo.signedUrl?<figure key={photo.id}><img src={photo.signedUrl} alt={photo.caption||entry.title}/>{photo.caption&&<figcaption>{photo.caption}</figcaption>}</figure>:null)}</div>}
          </article>)}</div>}
      </section>
    </main>
  );
}
