"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/locale";

export default function DeletePostButton({postId}:{postId:string}) {
  const [busy,setBusy]=useState(false);
  const locale=useLocale();
  const router=useRouter();
  async function remove() {
    if(!window.confirm(t(locale,"确定删除这篇日记吗？删除后无法恢复。","Delete this entry? This cannot be undone.")))return;
    setBusy(true);
    const supabase=createClient();
    try {
      const {data:photos}=await supabase.from("post_photos").select("image_url").eq("post_id",postId);
      const paths=(photos??[]).map(photo=>photo.image_url);
      if(paths.length) {
        const {error}=await supabase.storage.from("post-photos").remove(paths);
        if(error)throw error;
      }
      const {error:photoError}=await supabase.from("post_photos").delete().eq("post_id",postId);
      if(photoError)throw photoError;
      const {error}=await supabase.from("posts").delete().eq("id",postId);
      if(error)throw error;
      router.refresh();
    } catch(error) {
      window.alert(error instanceof Error?error.message:t(locale,"删除失败，请稍后重试。","Could not delete. Please try again."));
    } finally {setBusy(false);}
  }
  return <button type="button" className="journal-entry-delete" onClick={remove} disabled={busy}>{busy?t(locale,"删除中…","Deleting…"):t(locale,"删除","Delete")}</button>;
}
