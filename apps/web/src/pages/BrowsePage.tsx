import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import PlatformIcon from "../components/PlatformIcon";
import { apiGet, apiPost } from "../lib/api";
import type {
  CrocdbApiResponse,
  CrocdbEntry,
  CrocdbPlatformsResponseData,
  CrocdbRegionsResponseData,
  CrocdbSearchResponseData,
  LibraryItem,
  Profile
} from "@crocdesk/shared";

export default function BrowsePage() {
  const location = useLocation();
  const STORAGE_KEY = "crocdesk:browseState";
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchKey, setSearchKey] = useState("");
  const [platform, setPlatform] = useState("");
  const [region, setRegion] = useState("");
  const [results, setResults] = useState<CrocdbEntry[]>([]);
  const [status, setStatus] = useState<string>("");
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");

  const profilesQuery = useQuery({
    queryKey: ["profiles"],
    queryFn: () => apiGet<Profile[]>("/profiles")
  });

  const platformsQuery = useQuery({
    queryKey: ["platforms"],
    queryFn: () => apiGet<CrocdbApiResponse<CrocdbPlatformsResponseData>>("/crocdb/platforms")
  });

  const regionsQuery = useQuery({
    queryKey: ["regions"],
    queryFn: () => apiGet<CrocdbApiResponse<CrocdbRegionsResponseData>>("/crocdb/regions")
  });

  const ownedQuery = useQuery({
    queryKey: ["library-items"],
    queryFn: () => apiGet<LibraryItem[]>("/library/items")
  });

  const ownedSlugs = useMemo(() => {
    return new Set(
      (ownedQuery.data ?? [])
        .map((item) => item.gameSlug)
        .filter((slug): slug is string => Boolean(slug))
    );
  }, [ownedQuery.data]);

  const ownedItemsBySlug = useMemo(() => {
    const map = new Map<string, LibraryItem[]>();
    for (const item of ownedQuery.data ?? []) {
      if (item.gameSlug) {
        const list = map.get(item.gameSlug) ?? [];
        list.push(item);
        map.set(item.gameSlug, list);
      }
    }
    return map;
  }, [ownedQuery.data]);

  const searchMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiPost<CrocdbApiResponse<CrocdbSearchResponseData>>(
        "/crocdb/search",
        payload
      ),
    onSuccess: (response) => {
      setResults(response.data.results ?? []);
      setStatus(`Found ${response.data.total_results} results`);
      try {
        const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
        sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            ...saved,
            searchKey,
            platform,
            region,
            selectedProfileId,
            status: `Found ${response.data.total_results} results`,
            results: response.data.results ?? []
          })
        );
      } catch {}
    },
    onError: (error) => {
      setStatus(error instanceof Error ? error.message : "Search failed");
    }
  });

  const downloadMutation = useMutation({
    mutationFn: (payload: { slug: string; profileId: string }) =>
      apiPost("/jobs/download", payload),
    onSuccess: () => setStatus("Download job queued"),
    onError: (error) =>
      setStatus(error instanceof Error ? error.message : "Download failed")
  });

  const scanMutation = useMutation({
    mutationFn: () => apiPost("/library/scan/local", {}),
    onSuccess: () => setStatus("Scan job queued")
  });

  useEffect(() => {
    // Restore previous state from sessionStorage
    try {
      // Prefer URL query params if present
      const q = searchParams.get("q") || undefined;
      const pf = searchParams.get("pf") || undefined;
      const rg = searchParams.get("rg") || undefined;
      if (q) setSearchKey(q);
      if (pf) setPlatform(pf);
      if (rg) setRegion(rg);

      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as {
          searchKey?: string;
          platform?: string;
          region?: string;
          selectedProfileId?: string;
          results?: CrocdbEntry[];
          status?: string;
        };
        if (!q && saved.searchKey) setSearchKey(saved.searchKey);
        if (!pf && saved.platform) setPlatform(saved.platform);
        if (!rg && saved.region) setRegion(saved.region);
        if (saved.selectedProfileId) setSelectedProfileId(saved.selectedProfileId);
        if (saved.results && !results.length) setResults(saved.results);
        if (saved.status) setStatus(saved.status);
      }
    } catch {}

    if (!selectedProfileId && profilesQuery.data?.length) {
      setSelectedProfileId(profilesQuery.data[0].id);
    }
  }, [profilesQuery.data, selectedProfileId]);

  // After initial hydration, enable persistence writes
  const hydratedRef = useRef(false);
  useEffect(() => {
    hydratedRef.current = true;
    // If URL has params but no results yet, auto-run search to refill grid
    const q = searchParams.get("q") || undefined;
    const pf = searchParams.get("pf") || undefined;
    const rg = searchParams.get("rg") || undefined;
    if ((q || pf || rg) && results.length === 0) {
      searchMutation.mutate({
        search_key: q ?? undefined,
        platforms: pf ? [pf] : undefined,
        regions: rg ? [rg] : undefined,
        max_results: 60,
        page: 1
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist lightweight state on changes
  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...saved,
          searchKey,
          platform,
          region,
          selectedProfileId,
          status,
          results
        })
      );
    } catch {}
  }, [searchKey, platform, region, selectedProfileId, status, results]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextParams: Record<string, string> = {};
    if (searchKey) nextParams.q = searchKey;
    if (platform) nextParams.pf = platform;
    if (region) nextParams.rg = region;
    setSearchParams(nextParams);
    searchMutation.mutate({
      search_key: searchKey || undefined,
      platforms: platform ? [platform] : undefined,
      regions: region ? [region] : undefined,
      max_results: 60,
      page: 1
    });
  }

  return (
    <div className="grid" style={{ gap: "20px" }}>
      <section className="hero">
        <h1>Browse Crocdb</h1>
        <p>Search the Crocdb catalog, queue downloads, and track local ownership.</p>
      </section>

      <section className="card">
        <form className="controls" onSubmit={handleSearch}>
          <div>
            <label htmlFor="search-input">Search</label>
            <input
              id="search-input"
              value={searchKey}
              onChange={(event) => setSearchKey(event.target.value)}
              placeholder="Croc, Zelda, Metroid"
            />
          </div>
          <div>
            <label htmlFor="platform-select">Platform</label>
            <select id="platform-select" value={platform} onChange={(event) => setPlatform(event.target.value)}>
              <option value="">All</option>
              {platformsQuery.data &&
                Object.entries(platformsQuery.data.data.platforms).map(
                  ([id, data]) => (
                    <option key={id} value={id}>
                      {data.name}
                    </option>
                  )
                )}
            </select>
          </div>
          <div>
            <label htmlFor="region-select">Region</label>
            <select id="region-select" value={region} onChange={(event) => setRegion(event.target.value)}>
              <option value="">All</option>
              {regionsQuery.data &&
                Object.entries(regionsQuery.data.data.regions).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label htmlFor="profile-select">Profile</label>
            <select
              id="profile-select"
              value={selectedProfileId}
              onChange={(event) => setSelectedProfileId(event.target.value)}
            >
              {(profilesQuery.data ?? []).map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit">Search</button>
          <button
            className="secondary"
            type="button"
            onClick={() => scanMutation.mutate()}
          >
            Scan Local Library
          </button>
        </form>
        {status && <div className="status">{status}</div>}
      </section>

      <section className="grid cols-3">
        {results.map((entry) => (
          <article className="card" key={entry.slug}>
            <div className="thumb-wrapper">
              <Link
                to={`/game/${entry.slug}`}
                state={{ backgroundLocation: location }}
                aria-label={`Open ${entry.title} details`}
              >
                {entry.boxart_url ? (
                  <img
                    src={entry.boxart_url}
                    alt={`${entry.title} cover art`}
                    className="thumb"
                    loading="lazy"
                    style={{ width: "100%", aspectRatio: "3 / 4", objectFit: "cover", borderRadius: "8px" }}
                  />
                ) : (
                  <div className="thumb-placeholder">
                    <PlatformIcon
                      platform={entry.platform}
                      brand={platformsQuery.data?.data.platforms?.[entry.platform]?.brand}
                      label={platformsQuery.data?.data.platforms?.[entry.platform]?.name ?? entry.platform}
                      size={42}
                    />
                  </div>
                )}
              </Link>
              <div className="platform-badge" title={entry.platform.toUpperCase()}>
                <PlatformIcon
                  platform={entry.platform}
                  brand={platformsQuery.data?.data.platforms?.[entry.platform]?.brand}
                  label={platformsQuery.data?.data.platforms?.[entry.platform]?.name ?? entry.platform}
                  size={24}
                />
              </div>
            </div>
            <div className="row">
              <h3>
                <Link to={`/game/${entry.slug}`} state={{ backgroundLocation: location }}>
                  {entry.title}
                </Link>
              </h3>
              {ownedSlugs.has(entry.slug) && <span className="badge">Owned</span>}
            </div>
            <div className="status">{entry.platform.toUpperCase()}</div>
            <div className="status">{entry.regions.join(", ")}</div>
            <div className="row" style={{ marginTop: "12px" }}>
              <span className="status">Links: {entry.links.length}</span>
              {!ownedSlugs.has(entry.slug) ? (
                <button
                  onClick={() =>
                    selectedProfileId &&
                    downloadMutation.mutate({
                      slug: entry.slug,
                      profileId: selectedProfileId
                    })
                  }
                  disabled={!selectedProfileId}
                >
                  Queue Download
                </button>
              ) : (
                <div className="row" style={{ gap: 8, alignItems: "center" }}>
                  <Link className="link" to={`/game/${entry.slug}`} state={{ backgroundLocation: location }}>
                    View
                  </Link>
                  {ownedItemsBySlug.get(entry.slug)?.[0]?.path && (
                    <a
                      className="link"
                      href={toFileHref(ownedItemsBySlug.get(entry.slug)![0].path)}
                      onClick={(e) => {
                        const p = ownedItemsBySlug.get(entry.slug)![0].path;
                        if (window.crocdesk?.revealInFolder) {
                          e.preventDefault();
                          window.crocdesk.revealInFolder(p);
                        }
                      }}
                    >
                      Show in Folder
                    </a>
                  )}
                </div>
              )}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function toFileHref(p: string): string {
  const normalized = p.replace(/\\/g, "/");
  if (/^[A-Za-z]:\//.test(normalized)) {
    return `file:///${encodeURI(normalized)}`;
  }
  return `file://${encodeURI(normalized)}`;
}
