"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type PhotoRow = {
  id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
};

async function fileAsDataUrl(
  supabase: ReturnType<typeof createClient>,
  bucket: "post-photos" | "profile-media",
  path: string,
) {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error) throw new Error(`备份图片失败（${path}）：${error.message}`);

  const bytes = new Uint8Array(await data.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }

  return {
    bucket,
    path,
    fileName: path.split("/").pop() || "image",
    contentType: data.type || "application/octet-stream",
    dataUrl: `data:${data.type || "application/octet-stream"};base64,${btoa(binary)}`,
  };
}

export default function ExportBackupButton({ userId }: { userId: string }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function exportBackup() {
    setBusy(true);
    setStatus("正在整理你的日记…");
    setError("");

    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user || user.id !== userId) {
        throw new Error("登录状态已失效，请重新登录后再备份。");
      }

      const [
        { data: profile, error: profileError },
        { data: posts, error: postsError },
        { data: follows, error: followsError },
        { data: guestbookEntries, error: guestbookError },
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase.from("posts")
          .select("id,title,content,visibility,mood,location,created_at,updated_at,post_photos(id,image_url,caption,sort_order,created_at)")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase.from("follows")
          .select("follower_id,followed_id,created_at")
          .or(`follower_id.eq.${userId},followed_id.eq.${userId}`),
        supabase.from("guestbook_entries")
          .select("id,profile_id,author_id,message,created_at")
          .or(`author_id.eq.${userId},profile_id.eq.${userId}`)
          .order("created_at", { ascending: false }),
      ]);

      if (profileError) throw profileError;
      if (postsError) throw postsError;
      if (followsError) throw followsError;
      if (guestbookError) throw guestbookError;

      const allPhotoRows = (posts ?? []).flatMap(post => (post.post_photos ?? []) as PhotoRow[]);
      const totalFiles = allPhotoRows.length + Number(Boolean(profile?.avatar_url)) + Number(Boolean(profile?.background_url));
      let completedFiles = 0;
      const files: Array<Awaited<ReturnType<typeof fileAsDataUrl>>> = [];

      async function addFile(bucket: "post-photos" | "profile-media", path: string) {
        completedFiles += 1;
        setStatus(`正在备份照片和主页图片（${completedFiles}/${totalFiles}）…`);
        files.push(await fileAsDataUrl(supabase, bucket, path));
      }

      for (const photo of allPhotoRows) {
        await addFile("post-photos", photo.image_url);
      }
      if (profile?.avatar_url) await addFile("profile-media", profile.avatar_url);
      if (profile?.background_url) await addFile("profile-media", profile.background_url);

      const fileByPath = new Map(files.map(file => [`${file.bucket}:${file.path}`, file]));
      const backup = {
        format: "sonder-personal-backup",
        version: 1,
        exported_at: new Date().toISOString(),
        account: { id: user.id, email: user.email ?? null },
        profile: profile ? {
          ...profile,
          avatar_file: profile.avatar_url ? fileByPath.get(`profile-media:${profile.avatar_url}`) ?? null : null,
          background_file: profile.background_url ? fileByPath.get(`profile-media:${profile.background_url}`) ?? null : null,
        } : null,
        posts: (posts ?? []).map(post => {
          const { post_photos, ...entry } = post;
          return {
            ...entry,
            photos: ((post_photos ?? []) as PhotoRow[]).map(photo => ({
              ...photo,
              file: fileByPath.get(`post-photos:${photo.image_url}`) ?? null,
            })),
          };
        }),
        follows: follows ?? [],
        guestbook_entries: guestbookEntries ?? [],
        files,
      };

      setStatus("正在生成备份文件…");
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json;charset=utf-8",
      });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `sonder-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      setStatus("备份已下载到你的设备。请妥善保存文件。");
    } catch (caught) {
      setStatus("");
      setError(caught instanceof Error ? caught.message : "备份失败，请稍后重试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="backup-panel">
      <div>
        <h2>带走你的收藏。</h2>
        <p>导出个人资料、日记、照片、关注关系和留言，生成一份保存在本地的 JSON 备份。</p>
        <small>备份文件可能较大；请妥善保存，不要公开分享。</small>
      </div>
      <button type="button" className="journal-primary-button" onClick={exportBackup} disabled={busy || !userId}>
        {busy ? "正在备份…" : "导出我的数据 ↗"}
      </button>
      {status && <p className="form-success" role="status" aria-live="polite">{status}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>
  );
}
