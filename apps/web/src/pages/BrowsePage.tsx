import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
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

  const searchMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiPost<CrocdbApiResponse<CrocdbSearchResponseData>>(
        "/crocdb/search",
        payload
      ),
    onSuccess: (response) => {
      setResults(response.data.results ?? []);
      setStatus(`Found ${response.data.total_results} results`);
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
    if (!selectedProfileId && profilesQuery.data?.length) {
      setSelectedProfileId(profilesQuery.data[0].id);
    }
  }, [profilesQuery.data, selectedProfileId]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
            <label>Search</label>
            <input
              value={searchKey}
              onChange={(event) => setSearchKey(event.target.value)}
              placeholder="Croc, Zelda, Metroid"
            />
          </div>
          <div>
            <label>Platform</label>
            <select value={platform} onChange={(event) => setPlatform(event.target.value)}>
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
            <label>Region</label>
            <select value={region} onChange={(event) => setRegion(event.target.value)}>
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
            <label>Profile</label>
            <select
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
            {entry.boxart_url && (
              <img
                src={entry.boxart_url}
                alt={`${entry.title} cover art`}
                className="thumb"
                loading="lazy"
                style={{ width: "100%", aspectRatio: "3 / 4", objectFit: "cover", borderRadius: "8px" }}
              />
            )}
            <div className="row">
              <h3>
                <Link to={`/game/${entry.slug}`}>{entry.title}</Link>
              </h3>
              {ownedSlugs.has(entry.slug) && <span className="badge">Owned</span>}
            </div>
            <div className="status">{entry.platform.toUpperCase()}</div>
            <div className="status">{entry.regions.join(", ")}</div>
            <div className="row" style={{ marginTop: "12px" }}>
              <span className="status">Links: {entry.links.length}</span>
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
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
