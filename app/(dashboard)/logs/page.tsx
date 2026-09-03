"use client";

/**
 * DM Logs Page
 *
 * Filterable, paginated table of DM logs.
 */

import { useEffect, useState, useCallback } from "react";
import AccountSelect, { type AccountOption } from "@/components/account-select";
import StatusBadge from "@/components/status-badge";
import { useI18n } from "@/lib/i18n/context";

interface DmLog {
  id: string;
  commenterId: string;
  commenterName: string | null;
  commentText: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  automation: { name: string; keywords: string[] };
  instagramAccount: { username: string };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_FILTERS = [
  "ALL",
  "SENT",
  "FAILED",
  "PENDING",
  "SKIPPED_RATE_LIMIT",
  "SKIPPED_PLAN_LIMIT",
  "SKIPPED_DEDUP",
];

export default function LogsPage() {
  const { t, locale } = useI18n();
  const [logs, setLogs] = useState<DmLog[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("all");
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (selectedAccountId !== "all") {
        params.set("instagramAccountId", selectedAccountId);
      }

      const res = await fetch(`/api/logs?${params}`);
      const data = await res.json();

      if (data.success) {
        setLogs(data.data.logs);
        setPagination(data.data.pagination);
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, selectedAccountId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetch("/api/instagram/accounts")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setAccounts(res.data);
        }
      })
      .catch(() => {});
  }, []);

  function handleAccountChange(accountId: string) {
    setLoading(true);
    setSelectedAccountId(accountId);
    setPage(1);
  }

  function handleStatusChange(status: string) {
    setLoading(true);
    setStatusFilter(status);
    setPage(1);
  }

  const statusLabel = (s: string) => {
    if (s === "ALL") return t.logs.allStatuses;
    if (s === "SENT") return t.logs.sent;
    if (s === "FAILED") return t.logs.failed;
    if (s === "PENDING") return t.logs.pending;
    if (s === "SKIPPED_RATE_LIMIT") return t.logs.skipped;
    return s.replace(/_/g, " ").toLowerCase();
  };

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                statusFilter === status
                  ? "bg-accent text-white"
                  : "bg-surface text-muted hover:text-foreground hover:bg-surface-hover border border-border"
              }`}
            >
              {statusLabel(status)}
            </button>
          ))}
        </div>
        {accounts.length > 1 && (
          <AccountSelect
            accounts={accounts}
            value={selectedAccountId}
            onChange={handleAccountChange}
          />
        )}
      </div>

      {/* Table */}
      <div className="panel rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-4 text-xs font-semibold text-muted uppercase tracking-wider sm:px-6">{t.logs.commenter}</th>
                <th className="px-4 py-4 text-xs font-semibold text-muted uppercase tracking-wider sm:px-6">{t.logs.comment}</th>
                <th className="px-4 py-4 text-xs font-semibold text-muted uppercase tracking-wider sm:px-6">{t.logs.campaign}</th>
                <th className="px-4 py-4 text-xs font-semibold text-muted uppercase tracking-wider sm:px-6">{t.logs.account}</th>
                <th className="px-4 py-4 text-xs font-semibold text-muted uppercase tracking-wider sm:px-6">{t.logs.status}</th>
                <th className="px-4 py-4 text-xs font-semibold text-muted uppercase tracking-wider sm:px-6">{t.logs.time}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <>
                  {[...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-4 py-4 sm:px-6">
                        <div className="h-4 bg-surface-hover rounded" />
                      </td>
                    </tr>
                  ))}
                </>
              )}
              {!loading && logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted sm:px-6">
                    {t.logs.noLogs}
                  </td>
                </tr>
              )}
              {!loading &&
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="px-4 py-4 sm:px-6">
                      <span className="font-medium text-foreground">
                        @{log.commenterName ?? log.commenterId.slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-4 py-4 max-w-[200px] sm:px-6">
                      <span className="text-muted truncate block">{log.commentText}</span>
                    </td>
                    <td className="px-4 py-4 sm:px-6">
                      <span className="text-muted">{log.automation.name}</span>
                    </td>
                    <td className="px-4 py-4 sm:px-6">
                      <span className="text-muted">@{log.instagramAccount.username}</span>
                    </td>
                    <td className="px-4 py-4 sm:px-6">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="px-4 py-4 text-muted whitespace-nowrap sm:px-6">
                      {new Date(log.createdAt).toLocaleString(locale === "pt-BR" ? "pt-BR" : "en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 border-t border-border sm:px-6">
            <p className="text-xs text-muted">
              {locale === "pt-BR" ? "Exibindo" : "Showing"} {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)} {locale === "pt-BR" ? "de" : "of"}{" "}
              {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => {
                  setLoading(true);
                  setPage(page - 1);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted border border-border hover:text-foreground hover:border-border-hover transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                {locale === "pt-BR" ? "Anterior" : "Previous"}
              </button>
              <span className="text-xs text-muted px-2">
                {page} / {pagination.totalPages}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => {
                  setLoading(true);
                  setPage(page + 1);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted border border-border hover:text-foreground hover:border-border-hover transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                {locale === "pt-BR" ? "Próximo" : "Next"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
