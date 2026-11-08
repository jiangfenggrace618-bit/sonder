import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import GuestbookWall from "@/components/guestbook-wall";
import { getLocale, t } from "@/lib/locale";

export const dynamic="force-dynamic";

export default async function GuestbookPage() {
  const locale=await getLocale();
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const {data:rows,error}=await supabase.from("guestbook_entries")
    .select("id,profile_id,author_id,message,created_at")
    .is("profile_id",null).order("created_at",{ascending:false}).limit(100);
  const authorIds=[...new Set((rows??[]).map(row=>row.author_id))];
  const {data:profiles}=authorIds.length?await supabase.from("profiles").select("id,display_name").in("id",authorIds):{data:[]};
  const names=new Map((profiles??[]).map(profile=>[profile.id,profile.display_name]));
  const entries=(rows??[]).map(row=>({...row,author_name:names.get(row.author_id)||"一位朋友"}));
  const {data:viewerProfile}=user?await supabase.from("profiles").select("display_name").eq("id",user.id).maybeSingle():{data:null};
  return <main className="journal-page">
    <header className="journal-header"><Link href="/" className="auth-logo">sonder<span>.</span></Link><Link href="/explore" className="journal-quiet-link">{t(locale,"去看看日常 ↗","Explore the journal ↗")}</Link></header>
    <section className="social-page">
      <p className="eyebrow">✳ THE GUESTBOOK</p><h1>{t(locale,"留一点话语。","Leave a little note.")}</h1><p className="editor-intro">{t(locale,"一份小小的留言簿。写下问候、感受，或只是路过的痕迹。","A little guestbook for greetings, thoughts, or simply a trace of your visit.")}</p>
      {error&&<p className="form-error">{error.message}</p>}
      <GuestbookWall initialEntries={entries} profileId={null} viewerId={user?.id??null} viewerName={viewerProfile?.display_name||user?.email?.split("@")[0]||t(locale,"朋友","Friend")}/>
    </section>
  </main>;
}
