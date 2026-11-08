import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type JournalPhoto = {
  id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
};

export default async function JournalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=/journal/${id}`);

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id,user_id,title,content,visibility,mood,location,created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (postError || !post) notFound();

  const { data: photoRows, error: photosError } = await supabase
    .from("post_photos")
    .select("id,image_url,caption,sort_order")
    .eq("post_id", id)
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true });

  const photos: Array<JournalPhoto & { signedUrl: string | null }> = await Promise.all(
    (photoRows ?? []).map(async (photo: JournalPhoto) => {
      const { data, error } = await supabase.storage
        .from("post-photos")
        .createSignedUrl(photo.image_url, 60 * 60);

      return {
        ...photo,
        signedUrl: error ? null : data?.signedUrl ?? null,
      };
    }),
  );

  const visibilityLabel: Record<string, string> = {
    public: "公开",
    followers: "仅好友",
    private: "仅自己",
  };

  return (
    <main className="journal-page">
      <header className="journal-header">
        <Link href="/" className="auth-logo">sonder<span>.</span></Link>
        <div className="journal-header-actions">
          <Link href="/journal" className="journal-quiet-link">← 返回我的日记</Link>
          <Link href={`/journal/${id}/edit`} className="journal-entry-edit">编辑</Link>
        </div>
      </header>

      <article className="journal-detail-page">
        <div className="journal-entry-meta">
          <time dateTime={post.created_at}>
            {new Date(post.created_at).toLocaleDateString("zh-CN", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
          <span>{visibilityLabel[post.visibility] ?? post.visibility}</span>
        </div>

        <h1 className="journal-detail-title">{post.title}</h1>

        {post.content && <p className="journal-detail-content">{post.content}</p>}

        {(post.mood || post.location) && (
          <p className="journal-detail-extra">
            {[post.mood, post.location].filter(Boolean).join(" · ")}
          </p>
        )}

        {photos.length > 0 && (
          <div className="journal-detail-photo-grid">
            {photos.map((photo) => (
              <figure key={photo.id}>
                {photo.signedUrl ? (
                  <img
                    src={photo.signedUrl}
                    alt={photo.caption || post.title}
                    loading="eager"
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="journal-detail-photo-error" role="status">
                    图片暂时无法加载，请稍后刷新
                  </div>
                )}
                {photo.caption && <figcaption>{photo.caption}</figcaption>}
              </figure>
            ))}
          </div>
        )}

        {photosError && (
          <p className="form-error">照片信息读取失败：{photosError.message}</p>
        )}
      </article>
    </main>
  );
}
