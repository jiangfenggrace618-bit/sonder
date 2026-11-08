"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DeletePostButton({postId}:{postId:string}) {
  const [busy,setBusy]=useState(false);
  const router=useRouter();
  async function remove() {
    if(!window.confirm("确定删除这篇日记吗？删除后无法恢复。"))return;
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
      window.alert(error instanceof Error?error.message:"删除失败，请稍后重试。");
    } finally {setBusy(false);}
  }
  return <button type="button" className="journal-entry-delete" onClick={remove} disabled={busy}>{busy?"删除中…":"删除"}</button>;
}
