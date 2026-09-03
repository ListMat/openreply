"use client";

/* eslint-disable @next/next/no-img-element */

/**
 * Post Picker
 *
 * Grid of Instagram post thumbnails, selectable (single or multi-select).
 * Fetches from /api/instagram/posts.
 */

import { useEffect, useState } from "react";
import { readCache, writeCache } from "@/lib/client-cache";
import { useI18n } from "@/lib/i18n/context";

const PAGE_SIZE = 60;

export interface InstagramPost {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp: string;
}

export interface SelectedPostItem {
  id: string;
  permalink?: string;
  thumbUrl?: string;
  caption?: string;
}

interface PostPickerProps {
  selectedPostId?: string | null;
  selectedPostIds?: string[];
  instagramAccountId?: string | null;
  /** postId -> name of the campaign already using it. Flagged in the grid. */
  usedPostIds?: Record<string, string>;
  onSelect?: (
    postId: string,
    postUrl?: string,
    thumbUrl?: string,
    caption?: string
  ) => void;
  onSelectionChange?: (
    selectedIds: string[],
    selectedPosts: SelectedPostItem[]
  ) => void;
}

export default function PostPicker({
  selectedPostId,
  selectedPostIds,
  instagramAccountId,
  usedPostIds,
  onSelect,
  onSelectionChange,
}: PostPickerProps) {
  const { t, locale } = useI18n();
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  // The post currently hovered — its video (if it's a reel) plays a preview.
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE_SIZE);

  // Derive active selection from selectedPostIds or fallback to selectedPostId
  const currentSelection: string[] = selectedPostIds
    ? selectedPostIds
    : selectedPostId
      ? [selectedPostId]
      : [];

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (instagramAccountId) {
      params.set("instagramAccountId", instagramAccountId);
    }
    // Load the full library so older posts/reels are selectable, not just the
    // most recent page.
    params.set("all", "true");

    // Show the cached library instantly (stale-while-revalidate), then refresh.
    const cacheKey = `ig-posts:${instagramAccountId ?? "default"}`;
    const cached = readCache<InstagramPost[]>(cacheKey, 15 * 60 * 1000);
    // Hydrating state from cache is a legitimate effect use here.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (cached.data) {
      setPosts(cached.data);
      setLoading(false);
    }
    /* eslint-enable react-hooks/set-state-in-effect */

    fetch(`/api/instagram/posts${params.size ? `?${params}` : ""}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success) {
          setPosts(data.data);
          writeCache(cacheKey, data.data);
        } else if (!cached.data) {
          setError(data.error ?? "Failed to load posts");
        }
      })
      .catch(() => {
        if (!cancelled && !cached.data) setError("Failed to load posts");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [instagramAccountId]);

  function handleTogglePost(post: InstagramPost) {
    const thumb = post.thumbnail_url ?? post.media_url;
    const isSelected = currentSelection.includes(post.id);

    let nextIds: string[];
    if (isSelected) {
      nextIds = currentSelection.filter((id) => id !== post.id);
    } else {
      nextIds = [...currentSelection, post.id];
    }

    const selectedItems: SelectedPostItem[] = nextIds
      .map((id): SelectedPostItem | null => {
        const found = posts.find((p) => p.id === id);
        if (!found) return null;
        return {
          id: found.id,
          permalink: found.permalink,
          thumbUrl: found.thumbnail_url ?? found.media_url,
          caption: found.caption,
        };
      })
      .filter((item): item is SelectedPostItem => item !== null);

    if (onSelectionChange) {
      onSelectionChange(nextIds, selectedItems);
    }

    if (onSelect) {
      if (nextIds.length > 0) {
        const primary = selectedItems[0] ?? {
          id: post.id,
          permalink: post.permalink,
          thumbUrl: thumb,
          caption: post.caption,
        };
        onSelect(primary.id, primary.permalink, primary.thumbUrl, primary.caption);
      } else {
        onSelect("", "", "", "");
      }
    }
  }

  function handleClearSelection() {
    if (onSelectionChange) {
      onSelectionChange([], []);
    }
    if (onSelect) {
      onSelect("", "", "", "");
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded bg-surface border border-border animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-2 text-xs text-accent hover:underline"
        >
          {locale === "pt-BR" ? "Tentar novamente" : "Try again"}
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted">{t.builder.noPostsFound}</p>
      </div>
    );
  }

  const matching = query.trim()
    ? posts.filter((p) =>
        (p.caption ?? "").toLowerCase().includes(query.trim().toLowerCase())
      )
    : posts;

  const visible = matching.slice(0, shown);
  const remaining = matching.length - visible.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShown(PAGE_SIZE);
          }}
          placeholder={t.builder.searchPostsPlaceholder}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-zinc-500 focus:border-accent/40 focus:outline-none"
        />
        <span className="shrink-0 text-xs text-muted">{posts.length}</span>
      </div>

      {currentSelection.length > 0 && (
        <div className="flex items-center justify-between bg-accent/10 border border-accent/30 rounded-lg px-3 py-1.5 text-xs text-foreground">
          <span className="font-medium flex items-center gap-1.5">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
              {currentSelection.length}
            </span>
            {locale === "pt-BR"
              ? `${currentSelection.length} ${currentSelection.length === 1 ? "post/reel selecionado" : "posts/reels selecionados"}`
              : `${currentSelection.length} ${currentSelection.length === 1 ? "post/reel selected" : "posts/reels selected"}`}
          </span>
          <button
            type="button"
            onClick={handleClearSelection}
            className="text-accent hover:underline text-[11px] font-medium"
          >
            {locale === "pt-BR" ? "Limpar seleção" : "Clear selection"}
          </button>
        </div>
      )}

      {visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">
          {locale === "pt-BR"
            ? `Nenhum post corresponde a "${query}"`
            : `No posts match "${query}"`}
        </p>
      ) : (
        <>
          {usedPostIds && Object.keys(usedPostIds).length > 0 && (
            <p className="flex items-center gap-1.5 px-1 text-[11px] text-muted">
              <span className="inline-block h-2.5 w-2.5 rounded-sm border border-warning/50" />
              {locale === "pt-BR" ? "Já utilizado em outra campanha" : "Already used in another campaign"}
            </p>
          )}

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 auto-rows-min content-start overflow-y-auto p-1">
            {visible.map((post) => {
              const selectionIndex = currentSelection.indexOf(post.id);
              const isSelected = selectionIndex !== -1;
              const usedByName = usedPostIds?.[post.id];
              const isUsed = Boolean(usedByName) && !isSelected;
              const thumb = post.thumbnail_url ?? post.media_url;
              const isVideo = post.media_type === "VIDEO";
              const showVideo =
                isVideo && hoveredId === post.id && Boolean(post.media_url);

              return (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => handleTogglePost(post)}
                  onMouseEnter={() => setHoveredId(post.id)}
                  onMouseLeave={() =>
                    setHoveredId((cur) => (cur === post.id ? null : cur))
                  }
                  aria-pressed={isSelected}
                  title={
                    isUsed
                      ? locale === "pt-BR"
                        ? `Já utilizado por "${usedByName}"`
                        : `Already used by "${usedByName}"`
                      : undefined
                  }
                  className={`
                    group relative aspect-square rounded-lg overflow-hidden border-2 transition-all text-left
                    ${
                      isSelected
                        ? "border-accent ring-2 ring-accent/30 shadow-sm"
                        : isUsed
                          ? "border-warning/40 hover:border-warning/60"
                          : "border-border hover:border-border-hover"
                    }
                  `}
                >
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={post.caption?.slice(0, 50) ?? "Instagram post"}
                      loading="lazy"
                      decoding="async"
                      className={`w-full h-full object-cover transition-opacity ${
                        isUsed ? "opacity-75" : ""
                      }`}
                    />
                  ) : (
                    <div className="w-full h-full bg-surface flex items-center justify-center">
                      <span className="text-xs text-muted">
                        {locale === "pt-BR" ? "Sem imagem" : "No image"}
                      </span>
                    </div>
                  )}

                  {showVideo && (
                    <video
                      src={post.media_url}
                      poster={thumb}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="none"
                      className={`absolute inset-0 h-full w-full object-cover ${
                        isUsed ? "opacity-60" : ""
                      }`}
                    />
                  )}

                  {/* Selection Indicator Badge */}
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white shadow-md">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-3 w-3"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}

                  {/* Bottom selection bar */}
                  {isSelected && (
                    <span className="absolute bottom-0 inset-x-0 bg-accent/90 backdrop-blur-xs text-white text-[11px] font-semibold py-0.5 text-center">
                      {locale === "pt-BR" ? "Selecionado" : "Selected"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {remaining > 0 && (
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE_SIZE)}
              className="w-full rounded-lg border border-border py-2 text-sm text-muted hover:text-foreground"
            >
              {locale === "pt-BR"
                ? `Mostrar mais ${Math.min(PAGE_SIZE, remaining)}`
                : `Show ${Math.min(PAGE_SIZE, remaining)} more`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
