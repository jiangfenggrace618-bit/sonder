import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FollowButton from "@/components/follow-button";

export const dynamic = "force-dynamic";

type Profile = { id: string; username: string | null; display_name: string; bio: string | null; avatar_url: string | null };

export default async function FriendsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/friends");

  const [{ data: followingRows }, { data: followerRows }] = await Promise.all([
    supabase.from("follows").select("followed_id,created_at").eq("follower_id", user.id).order("created_at", { ascending: false }),
    supabase.from("follows").select("follower_id,created_at").eq("followed_id", user.id).order("created_at", { ascending: false }),
  ]);

  const followingIds = (followingRows ?? []).map(row => row.followed_id);
  const followerIds = (followerRows ?? []).map(row => row.follower_id);
  const mutualIds = new Set(followingIds.filter(id => followerIds.includes(id)));
  const allIds = [...new Set([...followingIds, ...followerIds])];

  const [{ data: profiles }, { data: ownProfile }] = await Promise.all([
    allIds.length
      ? supabase.from("profiles").select("id,username,display_name,bio,avatar_url").in("id", allIds)
      : Promise.resolve({ data: [] as Profile[] }),
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
  ]);

  const profilesWithAvatars = await Promise.all((profiles ?? []).map(async profile => {
    if (!profile.avatar_url) return profile as Profile;
    const { data } = await supabase.storage.from("profile-media").createSignedUrl(profile.avatar_url, 3600);
    return { ...profile, avatar_url: data?.signedUrl ?? null } as Profile;
  }));
  const profileMap = new Map(profilesWithAvatars.map(profile => [profile.id, profile]));
  const following = followingIds.map(id => profileMap.get(id)).filter((p): p is Profile => !!p);
  const followers = followerIds.map(id => profileMap.get(id)).filter((p): p is Profile => !!p);
  const friends = [...mutualIds].map(id => profileMap.get(id)).filter((p): p is Profile => !!p);

  const { data: feedRows } = followingIds.length
    ? await supabase.from("posts")
        .select("id,user_id,title,content,mood,location,created_at,post_photos(id,image_url,caption,sort_order)")
        .in("user_id", followingIds)
        .in("visibility", ["public", "followers"])
        .order("created_at", { ascending: false })
        .limit(30)
    : { data: [] };

  const feed = await Promise.all((feedRows ?? []).map(async post => {
    const profile = profileMap.get(post.user_id);
    const photos = await Promise.all([...(post.post_photos ?? [])].sort((a,b) => a.sort_order - b.sort_order).map(async photo => {
      const { data } = await supabase.storage.from("post-photos").createSignedUrl(photo.image_url, 3600);
      return { ...photo, url: data?.signedUrl ?? null };
    }));
    return { ...post, profile, photos };
  }));

  function peopleSection(title: string, description: string, people: Profile[], kind: "friend" | "following" | "follower") {
    return <section className="friends-section">
      <div className="friends-section-heading"><div><p className="eyebrow">✳ YOUR CIRCLE</p><h2>{title}</h2><p>{description}</p></div><span>{String(people.length).padStart(2, "0")}</span></div>
      {people.length === 0 ? <div className="social-empty"><p>{kind === "friend" ? "当你们互相关注，就会在这里相遇。" : kind === "following" ? "还没有关注任何人。去日常广场认识一些新朋友吧。" : "还没有新的关注者，慢慢来。"}</p></div> :
        <div className="friends-grid">{people.map(person => <article className="friend-card" key={person.id}>
          <Link href={person.username ? "/u/" + person.username : "/friends"} className="friend-card-main">
            <span className="social-avatar">{person.avatar_url ? <img src={person.avatar_url} alt="" /> : person.display_name.slice(0,1)}</span>
            <span><b>{person.display_name}</b><small>@{person.username || "sonder-friend"}</small>{person.bio && <em>{person.bio}</em>}</span>
          </Link>
          {kind !== "friend" && <FollowButton targetUserId={person.id} viewerId={user.id} initialFollowing={followingIds.includes(person.id)} />}
          {kind === "friend" && <span className="friend-mutual-label">✳ 互相关注</span>}
        </article>)}</div>}
    </section>;
  }

  return <main className="journal-page">
    <header className="journal-header"><Link href="/" className="auth-logo">sonder<span>.</span></Link><div className="journal-header-actions"><Link href="/journal" className="journal-quiet-link">我的日记</Link><Link href="/explore" className="journal-quiet-link">日常广场</Link><Link href="/settings/profile" className="journal-quiet-link">设置</Link></div></header>
    <section className="social-page">
      <p className="eyebrow">✳ YOUR PEOPLE, YOUR LITTLE WORLD</p>
      <div className="friends-hero"><div><h1>与你有关的人。</h1><p>{ownProfile?.display_name || "朋友"}，这里收藏着你在 Sonder 遇见的朋友与他们的日常。</p></div><Link href="/explore" className="journal-primary-button">去认识新朋友 ↗</Link></div>
      <div className="friends-summary"><div><b>{friends.length}</b><span>好友 · 互相关注</span></div><div><b>{following.length}</b><span>正在关注</span></div><div><b>{followers.length}</b><span>关注者</span></div></div>
      {peopleSection("我的好友。", "你们彼此关注，也彼此看见。", friends, "friend")}
      {peopleSection("正在关注。", "你主动收藏的那些人。", following, "following")}
      {peopleSection("关注着我。", "最近来到你生活里的朋友。", followers, "follower")}
      <section className="friends-section"><div className="friends-section-heading"><div><p className="eyebrow">✳ FROM YOUR CIRCLE</p><h2>朋友的近况。</h2><p>来自你关注的人，愿意与你分享的日常。</p></div></div>
        {feed.length === 0 ? <div className="social-empty"><p>这里还没有新的日常。关注一些朋友后，他们公开或对好友可见的日记会出现在这里。</p></div> :
          <div className="social-feed">{feed.map(post => <article className="social-post" key={post.id}>
            <div className="social-author"><Link className="social-author-link" href={post.profile?.username ? "/u/" + post.profile.username : "/friends"}><span className="social-avatar">{post.profile?.avatar_url ? <img src={post.profile.avatar_url} alt="" /> : (post.profile?.display_name || "友").slice(0,1)}</span><span><span className="social-author-name">{post.profile?.display_name || "一位朋友"}</span><span className="social-post-date">{new Date(post.created_at).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })}</span></span></Link></div>
            <h2>{post.title}</h2>{post.content && <p className="social-post-content">{post.content}</p>}{(post.mood || post.location) && <p className="social-post-meta">{[post.mood, post.location].filter(Boolean).join(" · ")}</p>}
            {post.photos.some(photo => photo.url) && <div className="journal-photo-grid">{post.photos.map(photo => photo.url ? <figure key={photo.id}><img src={photo.url} alt={photo.caption || post.title} /></figure> : null)}</div>}
          </article>)}</div>}
      </section>
    </section>
  </main>;
}
