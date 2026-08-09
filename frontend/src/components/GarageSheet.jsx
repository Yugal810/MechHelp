import { useState } from "react";
import { fetchNearestGarages } from "../api";

function formatDistanceText(val) {
  if (!val) return "";
  if (typeof val === "string" || typeof val === "number") return String(val);
  if (typeof val === "object") {
    return val.distance_range || val.distance || val.distance_km || "";
  }
  return "";
}

export default function GarageSheet({
  address,
  setAddress,
  garages,
  setGarages,
  selected,
  setSelected,
  onResults,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch() {
    const trimmed = address.trim();
    if (!trimmed) {
      setError("Enter a pickup landmark or area.");
      return;
    }

    setLoading(true);
    setError("");
    setGarages(null);
    setSelected(null);
    onResults(null, []);

    try {
      const results = await fetchNearestGarages(trimmed);
      setGarages(results);
      if (!results?.length) {
        setError("No partner garages found for that location.");
        onResults(null, []);
        return;
      }
      const first = results[0];
      setSelected(`${first.garage_name}-${first.lat}`);
      onResults(
        { lat: first.cust_lat, lon: first.cust_lon },
        results
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      setError("Could not calculate routes right now.");
      onResults(null, []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sheet">
      <div>
        <h2>Where do you need service?</h2>
      </div>

      <div className="where-box">
        <span className="pin-dot" aria-hidden="true" />
        <input
          id="addressInput"
          type="text"
          placeholder="Enter pickup location"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
          autoComplete="street-address"
        />
        <button
          type="button"
          className={`btn-go ${address.trim() ? "is-ready" : ""}`}
          onClick={handleSearch}
          disabled={loading}
        >
          {loading ? "..." : "Go"}
        </button>
      </div>

      <div className="results">
        {loading && (
          <div className="status-line">Finding the fastest routes...</div>
        )}

        {!loading && error && (
          <div className="status-line error">{error}</div>
        )}

        {!loading &&
          !error &&
          garages?.map((g, index) => {
            const id = `${g.garage_name}-${g.lat}`;
            return (
              <button
                key={id}
                type="button"
                className={`garage-row ${selected === id ? "is-active" : ""}`}
                onClick={() => setSelected(id)}
              >
                <span className="rank">{index + 1}</span>
                <span className="garage-meta">
                  <strong>{g.garage_name}</strong>
                  <span>{g.address || "Partner garage"}</span>
                </span>
                <span className="eta">{formatDistanceText(g.distance_range)}</span>
              </button>
            );
          })}
      </div>
    </div>
  );
}
