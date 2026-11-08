"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/use-locale";
import { t, type Locale } from "@/lib/locale";

type StoredFile = {
  bucket: "post-photos" | "profile-media";
  storagePath: string;
  archivePath: string;
  fileName: string;
  contentType: string;
  bytes: Uint8Array;
};
type ZipEntry = { name: string; bytes: Uint8Array };

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createZip(entries: ZipEntry[]) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((Math.max(1980, now.getFullYear()) - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  let localOffset = 0;
  let centralSize = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const checksum = crc32(entry.bytes);
    const entryOffset = localOffset;
    const localHeader = new Uint8Array(30);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, dosTime, true);
    localView.setUint16(12, dosDate, true);
    localView.setUint32(14, checksum, true);
    localView.setUint32(18, entry.bytes.length, true);
    localView.setUint32(22, entry.bytes.length, true);
    localView.setUint16(26, name.length, true);
    localView.setUint16(28, 0, true);
    localParts.push(localHeader, name, entry.bytes);
    localOffset += localHeader.length + name.length + entry.bytes.length;

    const centralHeader = new Uint8Array(46);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, dosTime, true);
    centralView.setUint16(14, dosDate, true);
    centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, entry.bytes.length, true);
    centralView.setUint32(24, entry.bytes.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, entryOffset, true);
    centralParts.push(centralHeader, name);
    centralSize += centralHeader.length + name.length;
  }

  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, localOffset, true);
  endView.setUint16(20, 0, true);

  const output = new Uint8Array(localOffset + centralSize + end.length);
  let cursor = 0;
  for (const part of [...localParts, ...centralParts, end]) {
    output.set(part, cursor);
    cursor += part.length;
  }
  return output;
}

function htmlEscape(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char] as string);
}

function makeOfflinePage(profile: any, posts: any[], locale: Locale) {
  const name = htmlEscape(profile?.display_name || profile?.username || "Sonder");
  const bio = htmlEscape(profile?.bio || "");
  const entries = posts.map(post => {
    const photos = (post.photos ?? []).map((photo: any) => {
      if (!photo.archive_path) return "";
      return '<img src="./' + htmlEscape(photo.archive_path) + '" alt="' +
        htmlEscape(photo.caption || post.title || "Journal photo") + '" loading="lazy">';
    }).join("");
    const date = htmlEscape(post.created_at ? new Date(post.created_at).toLocaleDateString(
      locale === "en" ? "en-US" : "zh-CN", { year: "numeric", month: "long", day: "numeric" }
    ) : "");
    const mood = post.mood ? "<span>" + htmlEscape(post.mood) + "</span>" : "";
    const place = post.location ? "<span>" + htmlEscape(post.location) + "</span>" : "";
    return "<article><time>" + date + "</time><h2>" + htmlEscape(post.title || "") +
      "</h2>" + mood + place + "<p>" + htmlEscape(post.content || "").replace(/\r?\n/g, "<br>") +
      '</p><div class="photos">' + photos + "</div></article>";
  }).join("\n");
  const intro = locale === "en" ? "A little archive of life, memories and moments." : "一份关于生活、记忆与日常的收藏。";
  const empty = locale === "en" ? "No journal entries in this archive yet." : "这份备份里还没有日记。";
  return '<!doctype html><html lang="' + (locale === "en" ? "en" : "zh-CN") +
    '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    "<title>" + name + ' · Sonder archive</title><style>*{box-sizing:border-box}body{margin:0;background:#f5f1e8;color:#292820;font-family:Georgia,serif}.wrap{max-width:900px;margin:0 auto;padding:56px 28px}header{border-bottom:1px solid #d8d0c1;padding-bottom:30px;margin-bottom:42px}h1{font-size:48px;font-weight:400;margin:0 0 12px}header p{color:#777165;line-height:1.8}article{padding:28px 0;border-bottom:1px solid #d8d0c1}time,article span{font:12px monospace;color:#817965;margin-right:14px}h2{font-size:30px;font-weight:400;margin:14px 0}article p{font-size:16px;line-height:2}.photos{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-top:22px}.photos img{width:100%;height:auto;max-height:460px;object-fit:cover}footer{margin-top:50px;color:#898373;font:11px monospace}@media(max-width:600px){.wrap{padding:34px 20px}h1{font-size:36px}}</style></head><body><main class="wrap"><header><h1>" +
    name + "</h1><p>" + (bio || intro) + "</p></header>" + (entries || "<p>" + empty + "</p>") +
    "<footer>SONDER · PERSONAL ARCHIVE</footer></main></body></html>";
}

async function downloadStorageFile(
  supabase: ReturnType<typeof createClient>,
  bucket: StoredFile["bucket"],
  storagePath: string,
  archivePath: string,
  locale: Locale,
): Promise<StoredFile> {
  const { data, error } = await supabase.storage.from(bucket).download(storagePath);
  if (error || !data) {
    const fileName = storagePath.split("/").pop() || storagePath;
    throw new Error(t(locale,
      "照片备份失败（" + fileName + "）：" + (error?.message || "无法读取文件"),
      "Could not back up " + fileName + ": " + (error?.message || "File could not be read")
    ));
  }
  return {
    bucket, storagePath, archivePath,
    fileName: storagePath.split("/").pop() || "image",
    contentType: data.type || "application/octet-stream",
    bytes: new Uint8Array(await data.arrayBuffer()),
  };
}

export default function ExportBackupButton({ userId }: { userId: string }) {
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function exportBackup() {
    setBusy(true);
    setStatus(t(locale, "正在整理你的日记…", "Preparing your archive…"));
    setError("");

    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user || user.id !== userId) {
        throw new Error(t(locale, "登录状态已失效，请重新登录后再备份。", "Your session expired. Please log in again before exporting."));
      }

      const [
        { data: profile, error: profileError },
        { data: posts, error: postsError },
        { data: photos, error: photosError },
        { data: follows, error: followsError },
        { data: guestbookEntries, error: guestbookError },
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase.from("posts").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("post_photos").select("*").eq("user_id", userId).order("sort_order", { ascending: true }),
        supabase.from("follows").select("*").or("follower_id.eq." + userId + ",followed_id.eq." + userId),
        supabase.from("guestbook_entries").select("*").or("author_id.eq." + userId + ",profile_id.eq." + userId).order("created_at", { ascending: false }),
      ]);

      if (profileError) throw profileError;
      if (postsError) throw postsError;
      if (photosError) throw photosError;
      if (followsError) throw followsError;
      if (guestbookError) throw guestbookError;

      const photoRows = photos ?? [];
      const storageItems: Array<{ bucket: StoredFile["bucket"]; path: string; archivePath: string }> = [];
      const storagePathToArchive = new Map<string, string>();
      const usedPaths = new Set<string>();

      function addStorageItem(bucket: StoredFile["bucket"], path: string, folder: string, index: number) {
        if (!path) return;
        const key = bucket + ":" + path;
        if (storagePathToArchive.has(key)) return;
        const originalName = path.split("/").pop() || ("image-" + (index + 1) + ".bin");
        const safeName = originalName.replace(/[^a-zA-Z0-9._-]+/g, "_") || ("image-" + (index + 1) + ".bin");
        let archivePath = folder + "/" + (index + 1) + "-" + safeName;
        let suffix = 1;
        while (usedPaths.has(archivePath)) {
          archivePath = folder + "/" + (index + 1) + "-" + suffix++ + "-" + safeName;
        }
        usedPaths.add(archivePath);
        storagePathToArchive.set(key, archivePath);
        storageItems.push({ bucket, path, archivePath });
      }

      photoRows.forEach((photo: any, index: number) => addStorageItem("post-photos", photo.image_url, "photos", index));
      addStorageItem("profile-media", profile?.avatar_url, "profile", photoRows.length);
      addStorageItem("profile-media", profile?.background_url, "profile", photoRows.length + 1);

      const storedFiles: StoredFile[] = [];
      for (let index = 0; index < storageItems.length; index++) {
        const item = storageItems[index];
        setStatus(locale === "en"
          ? "Downloading photos and profile images (" + (index + 1) + "/" + storageItems.length + ")…"
          : "正在下载照片和主页图片（" + (index + 1) + "/" + storageItems.length + "）…");
        storedFiles.push(await downloadStorageFile(supabase, item.bucket, item.path, item.archivePath, locale));
      }

      const fileByPath = new Map(storedFiles.map(file => [file.bucket + ":" + file.storagePath, file.archivePath]));
      const photosByPost = new Map<string, any[]>();
      for (const photo of photoRows) {
        const current = photosByPost.get(photo.post_id) ?? [];
        current.push({ ...photo, archive_path: fileByPath.get("post-photos:" + photo.image_url) ?? null });
        photosByPost.set(photo.post_id, current);
      }

      const backup = {
        format: "sonder-personal-backup",
        version: 2,
        exported_at: new Date().toISOString(),
        account: { id: user.id, email: user.email ?? null },
        profile: profile ? {
          ...profile,
          avatar_archive_path: profile.avatar_url ? fileByPath.get("profile-media:" + profile.avatar_url) ?? null : null,
          background_archive_path: profile.background_url ? fileByPath.get("profile-media:" + profile.background_url) ?? null : null,
        } : null,
        posts: (posts ?? []).map((post: any) => ({ ...post, photos: photosByPost.get(post.id) ?? [] })),
        follows: follows ?? [],
        guestbook_entries: guestbookEntries ?? [],
        files: storedFiles.map(file => ({
          bucket: file.bucket, storage_path: file.storagePath, archive_path: file.archivePath,
          file_name: file.fileName, content_type: file.contentType, size_bytes: file.bytes.length,
        })),
      };

      setStatus(t(locale, "正在打包备份文件…", "Packing your backup…"));
      const encoder = new TextEncoder();
      const readme = locale === "en"
        ? "SONDER PERSONAL ARCHIVE\n\n1. Open index.html in a browser to browse your saved journal offline.\n2. data.json contains your profile, journal entries, photo metadata, follows and guestbook notes.\n3. photos/ and profile/ contain the original image files.\n4. Keep this ZIP private. It may contain personal writing and photos.\n\nThis is an export archive. Importing it back into a live Sonder account is a separate feature.\n"
        : "SONDER 个人日记备份\n\n1. 解压后打开 index.html，可离线浏览已保存的日记。\n2. data.json 保存个人资料、日记正文、照片信息、关注关系和留言。\n3. photos/ 与 profile/ 文件夹保存原始照片、头像和主页背景。\n4. 请妥善保管整个 ZIP 文件，其中可能包含私人文字和照片。\n\n这是完整导出备份；重新导入在线 Sonder 账号需要单独的恢复功能。\n";
      const archiveEntries: ZipEntry[] = [
        { name: "data.json", bytes: encoder.encode(JSON.stringify(backup, null, 2)) },
        { name: "index.html", bytes: encoder.encode(makeOfflinePage(profile, backup.posts, locale)) },
        { name: "README.txt", bytes: encoder.encode(readme) },
        ...storedFiles.map(file => ({ name: file.archivePath, bytes: file.bytes })),
      ];
      const zipBytes = createZip(archiveEntries);
      const zipBuffer = zipBytes.buffer.slice(zipBytes.byteOffset, zipBytes.byteOffset + zipBytes.byteLength) as ArrayBuffer;
      const blob = new Blob([zipBuffer], { type: "application/zip" });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "sonder-backup-" + new Date().toISOString().slice(0, 10) + ".zip";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);

      setStatus(t(locale,
        "备份已生成：" + (posts ?? []).length + " 篇日记、" + photoRows.length + " 张照片。请在下载文件夹中找到 ZIP 文件。",
        "Backup ready: " + (posts ?? []).length + " journal entries and " + photoRows.length + " photos. Find the ZIP file in your Downloads folder."
      ));
    } catch (caught) {
      setStatus("");
      setError(caught instanceof Error ? caught.message : t(locale, "备份失败，请稍后重试。", "Backup failed. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="backup-panel">
      <div>
        <h2>{t(locale, "带走你的收藏。", "Take your archive with you.")}</h2>
        <p>{t(locale, "导出个人资料、日记、照片、关注关系和留言，打包为可离线浏览的 ZIP 备份。", "Export your profile, journal entries, photos, follows and guestbook notes as an offline-browsable ZIP archive.")}</p>
        <small>{t(locale, "ZIP 内含 index.html、data.json 和原始图片文件。备份可能较大，请妥善保存。", "The ZIP includes index.html, data.json and original image files. It may be large; store it safely.")}</small>
      </div>
      <button type="button" className="journal-primary-button" onClick={exportBackup} disabled={busy || !userId}>
        {busy ? t(locale, "正在备份…", "Exporting…") : t(locale, "导出完整备份 ↗", "Export full backup ↗")}
      </button>
      {status && <p className="form-success" role="status" aria-live="polite">{status}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>
  );
}
