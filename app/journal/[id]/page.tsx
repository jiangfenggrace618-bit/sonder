import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocale, t } from "@/lib/locale";

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
  const locale = await getLocale();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=${encodeURIComponent(`/journal/${id}`)}`);

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
    public: t(locale,"公开","Public"),
    followers: t(locale,"仅好友","Friends"),
    private: t(locale,"仅自己","Private"),
  };

  return (
    <main className="journal-page">
      <header className="journal-header">
        <Link href="/" className="auth-logo">sonder<span>.</span></Link>
        <div className="journal-header-actions">
          <Link href="/journal" className="journal-quiet-link">{t(locale,"← 返回我的日记","← Back to my journal")}</Link>
          <Link href={`/journal/${id}/edit`} className="journal-entry-edit">{t(locale,"编辑","Edit")}</Link>
        </div>
      </header>

      <article className="journal-detail-page">
        <div className="journal-entry-meta">
          <time dateTime={post.created_at}>
            {new Date(post.created_at).toLocaleDateString(locale==="en"?"en-US":"zh-CN", {
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
                    {t(locale,"图片暂时无法加载，请稍后刷新","This photo could not be loaded. Please refresh.")}
                  </div>
                )}
                {photo.caption && <figcaption>{photo.caption}</figcaption>}
              </figure>
            ))}
          </div>
        )}

        {photosError && (
          <p className="form-error">{t(locale,"照片信息读取失败：","Could not load photo details: ")}{photosError.message}</p>
        )}
      </article>
    </main>
  );
}
