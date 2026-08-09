function toQuery(params) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      qs.append(key, String(value).trim());
    }
  });
  return qs.toString();
}

export async function fetchOptions({ type = "normal", brand = "", model = "" } = {}) {
  const query = toQuery({ type, brand, model });
  const res = await fetch(`/api/cars/options?${query}`);
  if (!res.ok) throw new Error("Failed to load options");
  return res.json();
}

export async function searchCars(filters = {}, type = "normal") {
  const query = toQuery({
    type,
    brand: filters.brand,
    model: filters.model,
    fuelType: filters.fuelType,
    year_mode: filters.yearMode,
    custom_year: filters.customYear,
  });
  const res = await fetch(`/api/cars/search?${query}`);
  if (!res.ok) throw new Error("Failed to search cars");
  return res.json();
}

export async function fetchNearestGarages(customerAddress) {
  const query = toQuery({ customer_address: customerAddress });
  const res = await fetch(`/api/cars/nearest-garages?${query}`);
  if (!res.ok) throw new Error("Failed to find garages");
  return res.json();
}

export async function fetchGarages() {
  const res = await fetch("/api/garages");
  if (!res.ok) throw new Error("Failed to fetch garages");
  return res.json();
}

export async function createGarage(data) {
  const res = await fetch("/api/garages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.detail || "Failed to add garage");
  return body;
}

export async function toggleGarageStatus(id) {
  const res = await fetch(`/api/garages/${id}/toggle`, {
    method: "PATCH",
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.detail || "Failed to toggle garage status");
  return body;
}

export async function geocodeGarageAddress(address) {
  const res = await fetch("/api/garages/geocode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.detail || "Failed to geocode address");
  return body;
}
