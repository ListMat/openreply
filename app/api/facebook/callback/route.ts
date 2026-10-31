import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { getBaseUrl } from "@/lib/env";
import {
  getFacebookLongLivedToken,
  getFacebookUserPages,
  subscribeFacebookPageToWebhooks,
} from "@/lib/meta/client";
import {
  encryptToken,
  exchangeFacebookCodeForToken,
  verifyOAuthState,
} from "@/lib/meta/oauth";
import { canManageWorkspace } from "@/lib/workspace-access";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const state = verifyOAuthState(request.nextUrl.searchParams.get("state"));
  const baseUrl = getBaseUrl();

  if (error) {
    return NextResponse.redirect(`${baseUrl}/settings?facebook=denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/settings?facebook=invalid`);
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(`${baseUrl}/login`);
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId: state.workspaceId,
      userId: session.user.id,
    },
  });

  if (!membership || !canManageWorkspace(membership.role)) {
    return NextResponse.redirect(`${baseUrl}/settings?facebook=forbidden`);
  }

  try {
    const redirectUri = `${baseUrl}/api/facebook/callback`;
    const { accessToken: shortLivedToken } = await exchangeFacebookCodeForToken(
      code,
      redirectUri
    );
    const { accessToken: longLivedUserToken } = await getFacebookLongLivedToken(
      shortLivedToken
    );
    const pages = await getFacebookUserPages(longLivedUserToken);

    if (pages.length === 0) {
      return NextResponse.redirect(`${baseUrl}/settings?facebook=no_pages`);
    }

    // Connect all managed Facebook pages to this workspace
    for (const page of pages) {
      const encryptedToken = encryptToken(page.access_token);
      let webhookSubscribed = false;

      try {
        const sub = await subscribeFacebookPageToWebhooks(
          page.id,
          page.access_token
        );
        webhookSubscribed = Boolean(sub.success);
      } catch (err) {
        console.warn(
          `[Facebook Callback] Webhook subscription failed for page ${page.id}:`,
          err
        );
      }

      await prisma.instagramAccount.upsert({
        where: { instagramId: page.id },
        create: {
          workspaceId: state.workspaceId,
          instagramId: page.id,
          username: page.name,
          name: page.name,
          accessToken: encryptedToken,
          tokenExpiresAt: null, // Page tokens from long-lived user tokens never expire
          webhookSubscribed,
          platform: "FACEBOOK",
        },
        update: {
          workspaceId: state.workspaceId,
          username: page.name,
          name: page.name,
          accessToken: encryptedToken,
          webhookSubscribed,
          platform: "FACEBOOK",
        },
      });
    }

    return NextResponse.redirect(`${baseUrl}/settings?facebook=connected`);
  } catch (err) {
    console.error("[Facebook Callback] Error connecting Facebook Page:", err);
    return NextResponse.redirect(`${baseUrl}/settings?facebook=error`);
  }
}

