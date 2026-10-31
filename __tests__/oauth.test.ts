import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createOAuthState,
  decryptToken,
  encryptToken,
  getFacebookAuthorizationUrl,
  verifyOAuthState,
} from "../lib/meta/oauth";

beforeEach(() => {
  vi.stubEnv("NEXTAUTH_SECRET", "test-secret-with-enough-length");
  vi.stubEnv(
    "ENCRYPTION_KEY",
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
  );
});

describe("OAuth state and token encryption", () => {
  it("round-trips encrypted tokens", () => {
    const encrypted = encryptToken("long-lived-token");
    expect(encrypted).not.toBe("long-lived-token");
    expect(decryptToken(encrypted)).toBe("long-lived-token");
  });

  it("signs and verifies Instagram OAuth state", () => {
    const state = createOAuthState("workspace_123");
    expect(verifyOAuthState(state)?.workspaceId).toBe("workspace_123");
  });

  it("rejects tampered OAuth state", () => {
    const state = createOAuthState("workspace_123");
    expect(verifyOAuthState(`${state}tampered`)).toBeNull();
  });

  it("generates Facebook authorization URL with required scopes", () => {
    vi.stubEnv("FACEBOOK_APP_ID", "fb_app_123");
    const url = getFacebookAuthorizationUrl(
      "http://localhost:3000/api/facebook/callback",
      "state_123"
    );
    expect(url).toContain("https://www.facebook.com/dialog/oauth");
    expect(url).toContain("client_id=fb_app_123");
    expect(url).toContain("pages_messaging");
    expect(url).toContain("pages_manage_posts");
    expect(url).toContain("state=state_123");
  });
});
