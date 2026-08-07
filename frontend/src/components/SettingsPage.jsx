import { useEffect, useState } from "react";
import {
  fetchGarages,
  createGarage,
  toggleGarageStatus,
  geocodeGarageAddress,
} from "../api";

export default function SettingsPage({ onBack }) {
  const [garages, setGarages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    garage_name: "",
    address: "",
    contact: "",
    lat: "",
    lon: "",
  });
  const [geocoding, setGeocoding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadGarages();
  }, []);

  async function loadGarages() {
    try {
      setLoading(true);
      const data = await fetchGarages();
      setGarages(data || []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Could not load partner garages from Excel file.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGeocode() {
    if (!form.address.trim()) {
      setError("Please enter an address first to auto-fill coordinates.");
      return;
    }
    try {
      setGeocoding(true);
      setError(null);
      const { lat, lon } = await geocodeGarageAddress(form.address);
      setForm((prev) => ({
        ...prev,
        lat: String(lat),
        lon: String(lon),
      }));
      setMessage("Coordinates auto-filled from Google Maps!");
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to geocode address.");
    } finally {
      setGeocoding(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.garage_name.trim()) {
      setError("Garage name is required.");
      return;
    }
    if (!form.lat.trim() || !form.lon.trim()) {
      setError("Latitude and Longitude are required.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await createGarage(form);
      setMessage("Garage added successfully and saved to garages.xlsx!");
      setForm({ garage_name: "", address: "", contact: "", lat: "", lon: "" });
      await loadGarages();
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to add garage.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(id) {
    try {
      setError(null);
      await toggleGarageStatus(id);
      setGarages((prev) =>
        prev.map((g) => (g.id === id ? { ...g, enabled: !g.enabled } : g))
      );
    } catch (err) {
      console.error(err);
      setError("Failed to update garage status in Excel.");
    }
  }

  const filteredGarages = garages.filter(
    (g) =>
      g.garage_name.toLowerCase().includes(search.toLowerCase()) ||
      g.address.toLowerCase().includes(search.toLowerCase()) ||
      g.contact.includes(search)
  );

  return (
    <div className="settings-page">
      <header className="settings-header">
        <div>
          <div className="settings-title-row">
            <h2>Garage Management & Settings</h2>
            <span className="excel-badge">Excel Sync</span>
          </div>
          <p className="settings-sub">
            Add new partner garages or toggle availability. Disabled garages are
            automatically excluded from distance calculations.
          </p>
        </div>
        <button type="button" className="btn-back" onClick={onBack}>
          ← Back to Map
        </button>
      </header>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="settings-grid">
        {/* Form Card */}
        <div className="settings-card form-card">
          <h3>Add New Partner Garage</h3>
          <p className="card-desc">
            Saves directly to <code>backend/data/garages.xlsx</code>
          </p>

          <form onSubmit={handleSubmit} className="garage-form">
            <div className="form-group">
              <label htmlFor="gName">Garage Name *</label>
              <input
                id="gName"
                type="text"
                placeholder="e.g. Apex Auto Works"
                value={form.garage_name}
                onChange={(e) =>
                  setForm({ ...form, garage_name: e.target.value })
                }
                required
              />
            </div>

            <div className="form-group">
              <div className="label-with-action">
                <label htmlFor="gAddress">Address *</label>
                <button
                  type="button"
                  className="btn-link"
                  onClick={handleGeocode}
                  disabled={geocoding || !form.address.trim()}
                >
                  {geocoding ? "Locating..." : "Auto-Fill Coordinates"}
                </button>
              </div>
              <input
                id="gAddress"
                type="text"
                placeholder="e.g. Plot 45, West High Court Road, Dharampeth"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="gLat">Latitude *</label>
                <input
                  id="gLat"
                  type="text"
                  placeholder="21.1458"
                  value={form.lat}
                  onChange={(e) => setForm({ ...form, lat: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="gLon">Longitude *</label>
                <input
                  id="gLon"
                  type="text"
                  placeholder="79.0882"
                  value={form.lon}
                  onChange={(e) => setForm({ ...form, lon: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="gContact">Contact Number</label>
              <input
                id="gContact"
                type="text"
                placeholder="e.g. 9823012345"
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
              />
            </div>

            <button
              type="submit"
              className="btn-primary-block"
              disabled={submitting}
            >
              {submitting ? "Saving to Excel..." : "+ Add Garage to Excel"}
            </button>
          </form>
        </div>

        {/* List & Toggles Card */}
        <div className="settings-card list-card">
          <div className="list-header">
            <div>
              <h3>Partner Garages ({garages.length})</h3>
              <p className="card-desc">Toggle switch to enable/disable garages</p>
            </div>
            <input
              type="text"
              className="search-input"
              placeholder="Filter garages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="loading-state">Loading Excel data...</div>
          ) : (
            <div className="table-responsive">
              <table className="garage-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Garage Name</th>
                    <th>Address</th>
                    <th>Contact</th>
                    <th>Coordinates</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGarages.map((g) => {
                    const isEnabled = g.enabled !== false;
                    return (
                      <tr
                        key={g.id}
                        className={isEnabled ? "row-enabled" : "row-disabled"}
                      >
                        <td>
                          <label className="toggle-switch" title={isEnabled ? "Enabled: included in distance search" : "Disabled: excluded from distance search"}>
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={() => handleToggle(g.id)}
                            />
                            <span className="slider round" />
                          </label>
                        </td>
                        <td>
                          <strong className="garage-title-text">{g.garage_name}</strong>
                          <span
                            className={`status-pill ${
                              isEnabled ? "active" : "inactive"
                            }`}
                          >
                            {isEnabled ? "Active in Search" : "Disabled"}
                          </span>
                        </td>
                        <td className="text-muted">{g.address || "—"}</td>
                        <td className="text-muted">{g.contact || "—"}</td>
                        <td className="coords-cell">
                          <code>
                            {g.lat.toFixed(4)}, {g.lon.toFixed(4)}
                          </code>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
