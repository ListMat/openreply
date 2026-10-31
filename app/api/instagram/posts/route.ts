import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspaceId } from "@/lib/auth";
import { getWorkspaceInstagramAccount } from "@/lib/instagram-accounts";
import { getAllUserMedia, getUserMedia, getFacebookPageVideos, getFacebookPagePosts } from "@/lib/meta/client";
import { decryptToken } from "@/lib/meta/oauth";

export async function GET(request: NextRequest) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const account = await getWorkspaceInstagramAccount(
    workspaceId,
    request.nextUrl.searchParams.get("instagramAccountId")
  );

  if (!account) {
    return NextResponse.json(
      {
        success: false,
        error: "Instagram account not connected. Please connect your account first.",
      },
      { status: 400 }
    );
  }

  try {
    const accessToken = decryptToken(account.accessToken);

    if (account.platform === "FACEBOOK") {
      const [videos, posts] = await Promise.all([
        getFacebookPageVideos(accessToken, account.instagramId, 100),
        getFacebookPagePosts(accessToken, account.instagramId, 100),
      ]);

      const formattedVideos = videos.map((v) => ({
        id: v.id,
        caption: v.title ? `${v.title}\n${v.description ?? ""}` : (v.description ?? ""),
        media_type: "VIDEO",
        thumbnail_url: v.picture,
        media_url: v.picture,
        permalink: v.permalink_url,
        timestamp: v.created_time,
      }));

      const formattedPosts = posts.map((p) => ({
        id: p.id,
        caption: p.message ?? "",
        media_type: "FEED",
        thumbnail_url: p.full_picture,
        media_url: p.full_picture,
        permalink: p.permalink_url,
        timestamp: p.created_time,
      }));

      // Combine videos and posts, sorting newest first
      const allMedia = [...formattedVideos, ...formattedPosts].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return NextResponse.json({ success: true, data: allMedia });
    }

    // `all=true` paginates the full library (for the campaign post picker);
    // otherwise return a single recent page.
    const loadAll = request.nextUrl.searchParams.get("all") === "true";
    let posts;
    if (loadAll) {
      posts = await getAllUserMedia(accessToken, 300);
    } else {
      const limitParam = request.nextUrl.searchParams.get("limit");
      const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : 25;
      const limit = Number.isFinite(parsedLimit)
        ? Math.min(Math.max(parsedLimit, 1), 50)
        : 25;
      posts = await getUserMedia(accessToken, limit);
    }

    return NextResponse.json({ success: true, data: posts });
  } catch (err) {
    console.error("[Instagram Posts] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch Instagram posts" },
      { status: 500 }
    );
  }
}
