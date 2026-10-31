"use client";

import { useSearchParams } from "next/navigation";

type Tone = "error" | "warning" | "success";

const TONE_CLASSES: Record<Tone, string> = {
  error: "border-error/20 bg-error/10 text-error",
  warning: "border-warning/20 bg-warning/10 text-warning",
  success: "border-success/20 bg-success/10 text-success",
};

const MESSAGES: Record<string, { tone: Tone; title: string; detail: string }> = {
  denied: {
    tone: "warning",
    title: "Instagram connection cancelled",
    detail:
      "You declined the permission prompt on Instagram. Start again and accept all requested permissions.",
  },
  invalid: {
    tone: "error",
    title: "Instagram connection expired",
    detail:
      "The login link was missing or older than 10 minutes. Click Connect Instagram to start a fresh attempt.",
  },
  forbidden: {
    tone: "error",
    title: "Not permitted",
    detail:
      "Only workspace owners and admins can connect an Instagram account.",
  },
  already_connected: {
    tone: "warning",
    title: "Account already connected",
    detail:
      "That Instagram account is connected to another workspace. Disconnect it there first, or connect a different account.",
  },
};

const FB_MESSAGES: Record<string, { tone: Tone; title: string; detail: string }> = {
  connected: {
    tone: "success",
    title: "Página do Facebook conectada com sucesso",
    detail:
      "A sua página do Facebook foi vinculada e já está pronta para receber comentários e enviar mensagens privadas.",
  },
  denied: {
    tone: "warning",
    title: "Conexão com o Facebook cancelada",
    detail:
      "A autorização foi cancelada. Tente novamente concedendo acesso às suas Páginas.",
  },
  invalid: {
    tone: "error",
    title: "Link de login expirado",
    detail:
      "O link de autenticação expirou. Tente conectar novamente clicando em Conectar Página do Facebook.",
  },
  forbidden: {
    tone: "error",
    title: "Não permitido",
    detail:
      "Apenas proprietários e administradores do workspace podem conectar páginas.",
  },
  no_pages: {
    tone: "warning",
    title: "Nenhuma página encontrada",
    detail:
      "Não foram encontradas páginas do Facebook administradas pela conta conectada.",
  },
  error: {
    tone: "error",
    title: "Erro ao conectar Página do Facebook",
    detail:
      "Ocorreu um erro ao obter os tokens das suas páginas. Verifique se o seu App no Meta possui as permissões necessárias.",
  },
};

export function InstagramConnectNotice() {
  const searchParams = useSearchParams();
  const status = searchParams.get("instagram");
  const fbStatus = searchParams.get("facebook");

  if (fbStatus) {
    if (fbStatus === "misconfigured") {
      const missing = (searchParams.get("missing") ?? "")
        .split(",")
        .filter(Boolean);

      return (
        <Notice tone="error" title="Configuração do Facebook incompleta">
          <p>
            Defina as variáveis de ambiente necessárias para a integração com o Facebook:
          </p>
          {missing.length > 0 && (
            <ul className="mt-2 space-y-1">
              {missing.map((name) => (
                <li key={name} className="font-mono text-xs">
                  {name}
                </li>
              ))}
            </ul>
          )}
        </Notice>
      );
    }

    const fbKnown = FB_MESSAGES[fbStatus];
    if (fbKnown) {
      return (
        <Notice tone={fbKnown.tone} title={fbKnown.title}>
          <p>{fbKnown.detail}</p>
        </Notice>
      );
    }
  }

  if (!status) return null;

  if (status === "misconfigured") {
    const missing = (searchParams.get("missing") ?? "")
      .split(",")
      .filter(Boolean);

    return (
      <Notice tone="error" title="Instagram app not configured">
        <p>
          Set{" "}
          {missing.length > 0
            ? "these environment variables"
            : "the required environment variables"}{" "}
          and restart the server:
        </p>
        {missing.length > 0 && (
          <ul className="mt-2 space-y-1">
            {missing.map((name) => (
              <li key={name} className="font-mono text-xs">
                {name}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2">
          See <span className="font-mono text-xs">docs/setup.md</span> for how to
          obtain each value. Note that{" "}
          <span className="font-mono text-xs">ENCRYPTION_KEY</span> must be a
          64-character hex string.
        </p>
      </Notice>
    );
  }

  if (status === "failed") {
    const reason = searchParams.get("reason");

    return (
      <Notice tone="error" title="Instagram connection failed">
        <p>
          Instagram accepted the login but the connection could not be
          completed. This is usually a mismatched redirect URI or an app that is
          missing the required permissions.
        </p>
        {reason && (
          <p className="mt-2 font-mono text-xs break-words opacity-80">
            {reason}
          </p>
        )}
      </Notice>
    );
  }

  const known = MESSAGES[status];
  if (!known) return null;

  return (
    <Notice tone={known.tone} title={known.title}>
      <p>{known.detail}</p>
    </Notice>
  );
}

function Notice({
  tone,
  title,
  children,
}: {
  tone: Tone;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded border p-4 text-sm ${TONE_CLASSES[tone]}`}>
      <p className="font-semibold">{title}</p>
      <div className="mt-1 opacity-90">{children}</div>
    </div>
  );
}
