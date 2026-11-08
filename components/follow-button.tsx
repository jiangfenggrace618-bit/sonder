"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/locale";

export default function FollowButton({targetUserId,viewerId,initialFollowing}:{targetUserId:string;viewerId:string|null;initialFollowing:boolean}) {
  const pathname=usePathname();
  const locale=useLocale();
  const [following,setFollowing]=useState(initialFollowing);
  const [busy,setBusy]=useState(false);
  if(!viewerId)return <Link className="follow-button" href={`/login?next=${encodeURIComponent(pathname||"/explore")}`}>{t(locale,"登录后关注","Log in to follow")}</Link>;
  if(viewerId===targetUserId)return null;
  async function toggle() {
    setBusy(true);
    try {
      const supabase=createClient();
      if(following) {
        const {error}=await supabase.from("follows").delete().eq("follower_id",viewerId).eq("followed_id",targetUserId);
        if(error)throw error;
        setFollowing(false);
      } else {
        const {error}=await supabase.from("follows").insert({follower_id:viewerId,followed_id:targetUserId});
        if(error)throw error;
        setFollowing(true);
      }
    } catch(error) {
      window.alert(error instanceof Error?error.message:t(locale,"操作失败，请稍后重试。","Something went wrong. Please try again."));
    } finally {setBusy(false);}
  }
  return <button type="button" className={following?"follow-button following":"follow-button"} onClick={toggle} disabled={busy}>{busy?t(locale,"请稍候…","Please wait…"):following?t(locale,"已关注 · 取消","Following · Unfollow"):t(locale,"＋ 关注","＋ Follow")}</button>;
}
