import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiGet, apiPost } from "../lib/api";
import type { CrocdbApiResponse, CrocdbEntryResponseData, Profile } from "@crocdesk/shared";

export default function GameDetailPage() {
  const { slug } = useParams();

  const entryQuery = useQuery({
    queryKey: ["entry", slug],
    queryFn: () =>
      apiPost<CrocdbApiResponse<CrocdbEntryResponseData>>("/crocdb/entry", { slug }),
    enabled: Boolean(slug)
  });

  const profilesQuery = useQuery({
    queryKey: ["profiles"],
    queryFn: () => apiGet<Profile[]>("/profiles")
  });

  const [selectedProfileId, setSelectedProfileId] = useState<string>("");

  useEffect(() => {
    if (!selectedProfileId && profilesQuery.data?.length) {
      setSelectedProfileId(profilesQuery.data[0].id);
    }
  }, [profilesQuery.data, selectedProfileId]);

  const downloadMutation = useMutation({
    mutationFn: (payload: { slug: string; profileId: string }) =>
      apiPost("/jobs/download", payload)
  });

  const entry = entryQuery.data?.data.entry;
  const profileId = selectedProfileId;

  if (!entry) {
    return (
      <section className="card">
        <h3>Loading entry...</h3>
      </section>
    );
  }

  return (
    <div className="grid" style={{ gap: "20px" }}>
      <section className="hero">
        <h1>{entry.title}</h1>
        <p>
          {entry.platform.toUpperCase()} - {entry.regions.join(", ")}
        </p>
      </section>

      <section className="card">
        <div className="row">
          <h3>Download links</h3>
          <span className="status">{entry.links.length} sources</span>
        </div>
        <div className="controls" style={{ marginTop: "12px" }}>
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
        </div>
        <div className="list" style={{ marginTop: "12px" }}>
          {entry.links.map((link) => (
            <div className="row" key={link.url}>
              <div>
                <strong>{link.name}</strong>
                <div className="status">
                  {link.host} - {link.format} - {link.size_str}
                </div>
              </div>
              <button
                onClick={() =>
                  profileId &&
                  downloadMutation.mutate({ slug: entry.slug, profileId })
                }
                disabled={!profileId}
              >
                Queue Download
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
