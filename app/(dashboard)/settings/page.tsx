"use client";

import { Suspense, useEffect, useState } from "react";
import type { AccountOption } from "@/components/account-select";
import { InstagramConnectNotice } from "@/components/instagram-connect-notice";
import { useI18n } from "@/lib/i18n/context";

interface SettingsData {
  workspace: {
    name: string;
    dmsSentThisPeriod: number;
  };
  instagramAccount: {
    id: string;
    username: string;
    instagramId: string;
    tokenExpiresAt: string | null;
    webhookSubscribed: boolean;
  } | null;
  instagramAccounts: Array<
    AccountOption & {
      tokenExpiresAt: string | null;
      webhookSubscribed: boolean;
      platform?: string;
    }
  >;
}

interface WorkspaceMembersData {
  currentUserRole: "OWNER" | "ADMIN" | "MEMBER";
  members: Array<{
    id: string;
    role: "OWNER" | "ADMIN" | "MEMBER";
    createdAt: string;
    user: {
      id: string;
      email: string | null;
      name: string | null;
    };
  }>;
  invitations: Array<{
    id: string;
    email: string;
    role: "OWNER" | "ADMIN" | "MEMBER";
    inviteUrl: string;
    expiresAt: string;
  }>;
}

export default function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const [data, setData] = useState<SettingsData | null>(null);
  const [membersData, setMembersData] = useState<WorkspaceMembersData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [memberError, setMemberError] = useState<string | null>(null);
  const [langSuccess, setLangSuccess] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/stats").then((res) => res.json()),
      fetch("/api/workspace/members").then((res) => res.json()),
    ])
      .then(([statsPayload, membersPayload]) => {
        if (statsPayload.success) setData(statsPayload.data);
        if (membersPayload.success) setMembersData(membersPayload.data);
      })
      .finally(() => setLoading(false));
  }, []);

  async function refreshMembers() {
    const res = await fetch("/api/workspace/members");
    const payload = await res.json();
    if (payload.success) setMembersData(payload.data);
  }

  async function disconnectInstagram(instagramAccountId: string) {
    if (!confirm(locale === "pt-BR" ? "Desconectar o Instagram? As campanhas desta conta pararão de enviar DMs." : "Disconnect Instagram? Campaigns for this account will stop sending DMs.")) {
      return;
    }

    setBusy(`disconnect:${instagramAccountId}`);
    await fetch("/api/instagram/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instagramAccountId }),
    });
    window.location.reload();
  }

  async function inviteMember(event: React.FormEvent) {
    event.preventDefault();
    setMemberError(null);
    setBusy("invite");
    const res = await fetch("/api/workspace/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    const payload = await res.json();
    if (payload.success) {
      setMembersData(payload.data);
      setInviteEmail("");
    } else {
      setMemberError(payload.error ?? "Could not invite member");
    }
    setBusy(null);
  }

  async function removeInvitation(invitationId: string) {
    setBusy(`invite:${invitationId}`);
    await fetch("/api/workspace/members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationId }),
    });
    await refreshMembers();
    setBusy(null);
  }

  if (loading) {
    return <div className="panel rounded p-8 h-64 animate-pulse bg-surface/50" />;
  }

  const accounts = data?.instagramAccounts ?? [];
  const canManageMembers =
    membersData?.currentUserRole === "OWNER" ||
    membersData?.currentUserRole === "ADMIN";

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <Suspense fallback={null}>
        <InstagramConnectNotice />
      </Suspense>

      <section className="panel rounded p-4 sm:p-6">
        <h2 className="text-base font-semibold mb-2">{t.settings.languageSection}</h2>
        <p className="text-xs text-muted mb-5">{t.settings.languageDescription}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setLocale("pt-BR");
              setLangSuccess(true);
              setTimeout(() => setLangSuccess(false), 3000);
            }}
            className={`flex items-center justify-between p-3.5 rounded border text-left transition-all ${
              locale === "pt-BR"
                ? "border-accent bg-accent/10 text-foreground font-medium"
                : "border-border bg-surface text-muted hover:text-foreground hover:bg-surface-hover"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🇧🇷</span>
              <div>
                <p className="text-sm font-semibold">{t.settings.portuguese}</p>
                <p className="text-xs text-muted">Português padrão</p>
              </div>
            </div>
            {locale === "pt-BR" && (
              <span className="text-xs font-bold text-accent px-2 py-0.5 rounded bg-accent/20">
                Ativo
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setLocale("en");
              setLangSuccess(true);
              setTimeout(() => setLangSuccess(false), 3000);
            }}
            className={`flex items-center justify-between p-3.5 rounded border text-left transition-all ${
              locale === "en"
                ? "border-accent bg-accent/10 text-foreground font-medium"
                : "border-border bg-surface text-muted hover:text-foreground hover:bg-surface-hover"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🇺🇸</span>
              <div>
                <p className="text-sm font-semibold">{t.settings.english}</p>
                <p className="text-xs text-muted">English standard</p>
              </div>
            </div>
            {locale === "en" && (
              <span className="text-xs font-bold text-accent px-2 py-0.5 rounded bg-accent/20">
                Active
              </span>
            )}
          </button>
        </div>

        {langSuccess && (
          <p className="mt-3 text-xs text-success font-medium animate-fade-in">
            ✓ {t.settings.languageChanged}
          </p>
        )}
      </section>

      <section className="panel rounded p-4 sm:p-6">
        <h2 className="text-base font-semibold mb-6">{locale === "pt-BR" ? "Contas & Páginas Conectadas" : "Connected Accounts & Pages"}</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 py-3 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Status</p>
              <p className="text-xs text-muted mt-0.5">
                {locale === "pt-BR"
                  ? "Webhooks de comentários e respostas privadas dependem desta conexão."
                  : "Comment webhooks and private replies depend on this connection."}
              </p>
            </div>
            <span
              className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                accounts.length > 0
                  ? "bg-success/10 text-success"
                  : "bg-warning/10 text-warning"
              }`}
            >
              {accounts.length > 0
                ? (locale === "pt-BR" ? "Conectado" : "Connected")
                : (locale === "pt-BR" ? "Não conectado" : "Not connected")}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 py-3 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">
                {locale === "pt-BR" ? "Contas Conectadas" : "Accounts"}
              </p>
              <p className="text-xs text-muted mt-0.5">
                {accounts.length}{" "}
                {locale === "pt-BR" ? "perfil(s) do Instagram ou Página(s) do Facebook" : "Instagram profile(s) or Facebook Page(s)"}
              </p>
            </div>
            <span className="text-sm text-muted">
              {accounts.length > 0
                ? `${accounts.length} ${locale === "pt-BR" ? "conectada(s)" : "connected"}`
                : (locale === "pt-BR" ? "Nenhuma" : "None")}
            </span>
          </div>

          <div className="space-y-3 py-3">
            {accounts.length === 0 && (
              <p className="text-sm text-muted">
                {t.settings.noAccountsConnected}
              </p>
            )}
            {accounts.map((account) => {
              const isFb = account.platform === "FACEBOOK";
              return (
                <div
                  key={account.id}
                  className="flex flex-col gap-3 rounded border border-border bg-surface/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide ${
                          isFb
                            ? "bg-[#1877F2]/15 text-[#1877F2] border border-[#1877F2]/30"
                            : "bg-pink-500/15 text-pink-400 border border-pink-500/30"
                        }`}
                      >
                        {isFb ? "FACEBOOK PAGE" : "INSTAGRAM"}
                      </span>
                      <p className="text-sm font-semibold text-foreground">
                        {isFb ? (account.name || account.username) : `@${account.username}`}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {account.tokenExpiresAt
                        ? `${t.settings.tokenValidUntil} ${new Date(account.tokenExpiresAt).toLocaleDateString()}`
                        : (isFb ? (locale === "pt-BR" ? "Token permanente da Página" : "Permanent Page Token") : "—")}{" "}
                      · {account.webhookSubscribed ? t.settings.webhookActive : t.settings.webhookInactive}
                    </p>
                  </div>
                  <button
                    onClick={() => disconnectInstagram(account.id)}
                    disabled={busy === `disconnect:${account.id}`}
                    className="inline-flex items-center justify-center rounded border border-error/20 px-4 py-2 text-sm font-medium text-error transition-all hover:border-error/40 hover:bg-error/10 disabled:opacity-50"
                  >
                    {busy === `disconnect:${account.id}`
                      ? (locale === "pt-BR" ? "Desconectando..." : "Disconnecting...")
                      : t.settings.disconnect}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border flex flex-wrap gap-3">
          <a
            href="/api/instagram/connect"
            className="px-4 py-2 rounded text-sm font-medium transition-colors bg-accent text-white hover:bg-accent-hover inline-flex items-center gap-2"
          >
            <span>{locale === "pt-BR" ? "Conectar Instagram" : "Connect Instagram"}</span>
          </a>
          <a
            href="/api/facebook/connect"
            className="px-4 py-2 rounded text-sm font-medium transition-colors bg-[#1877F2] text-white hover:bg-[#166fe5] inline-flex items-center gap-2 shadow-sm"
          >
            <span>{locale === "pt-BR" ? "Conectar Página do Facebook" : "Connect Facebook Page"}</span>
          </a>
        </div>
      </section>

      <section className="panel rounded p-4 sm:p-6">
        <h2 className="text-base font-semibold mb-2">{t.settings.teamSection}</h2>
        <p className="text-xs text-muted mb-5">{t.settings.teamDescription}</p>

        <div className="space-y-3">
          {membersData?.members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {member.user.name ?? member.user.email ?? "Membro"}
                </p>
                <p className="text-xs text-muted">{member.user.email}</p>
              </div>
              <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted">
                {member.role === "OWNER"
                  ? t.settings.owner
                  : member.role === "ADMIN"
                  ? t.settings.admin
                  : t.settings.member}
              </span>
            </div>
          ))}
        </div>

        {membersData?.invitations.length ? (
          <div className="mt-6 border-t border-border pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t.settings.pendingInvites}
            </p>
            <div className="space-y-3">
              {membersData.invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex flex-col gap-3 rounded border border-border bg-surface/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {invitation.email}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {invitation.role} · {invitation.inviteUrl}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void navigator.clipboard?.writeText(invitation.inviteUrl)
                      }
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-border-hover hover:text-foreground"
                    >
                      {t.settings.copyLink}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeInvitation(invitation.id)}
                      disabled={busy === `invite:${invitation.id}`}
                      className="rounded-lg border border-error/20 px-3 py-1.5 text-xs font-medium text-error transition-colors hover:bg-error/10 disabled:opacity-50"
                    >
                      {t.settings.revoke}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {canManageMembers && (
          <form
            onSubmit={inviteMember}
            className="mt-6 grid gap-3 border-t border-border pt-4 sm:grid-cols-[1fr_140px_auto]"
          >
            <input
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="colega@empresa.com"
              className="rounded border border-border bg-surface px-4 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent/40"
              required
            />
            <select
              value={inviteRole}
              onChange={(event) =>
                setInviteRole(event.target.value as "ADMIN" | "MEMBER")
              }
              className="rounded border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent/40"
            >
              <option value="MEMBER">{t.settings.member}</option>
              <option value="ADMIN">{t.settings.admin}</option>
            </select>
            <button
              type="submit"
              disabled={busy === "invite"}
              className="rounded bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {busy === "invite" ? "Enviando..." : t.settings.sendInvite}
            </button>
            {memberError && (
              <p className="sm:col-span-3 text-sm text-error">{memberError}</p>
            )}
          </form>
        )}
      </section>

      <section className="panel rounded p-4 sm:p-6">
        <h2 className="text-base font-semibold mb-6">{t.settings.workspaceSection}</h2>
        <div className="flex items-center justify-between gap-3 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              {t.settings.usageThisMonth}
            </p>
            <p className="text-xs text-muted mt-0.5">
              {locale === "pt-BR" ? "Auto-hospedado — sem limites de plano." : "Self-hosted — no plan limits."}
            </p>
          </div>
          <span className="text-sm font-semibold text-foreground">
            {data?.workspace.dmsSentThisPeriod ?? 0}
          </span>
        </div>
      </section>
    </div>
  );
}
