const axios = require("axios");
const Garage = require("../models/Garage");
const { GOOGLE_MAPS_API_KEY } = require("../config");

class DistanceService {
  constructor() {
    this.apiKey = GOOGLE_MAPS_API_KEY || "";
  }

  async geocodeLocation(placeName) {
    if (!placeName || !String(placeName).trim()) {
      throw new Error("Customer address is required for geocoding.");
    }

    if (!this.apiKey) {
      throw new Error(
        "Google Maps API Key is missing. Configure GOOGLE_MAPS_API_KEY in backend config."
      );
    }

    const rawClean = String(placeName)
      .replace(
        /^(near|opposite|beside|behind|in front of|next to|opposite to|near to)\s+/i,
        ""
      )
      .trim();
    const parts = rawClean.split(",").map((s) => s.trim()).filter(Boolean);

    const candidatesSet = new Set();
    candidatesSet.add(String(placeName).trim());
    if (rawClean !== String(placeName).trim()) {
      candidatesSet.add(rawClean);
    }
    if (parts.length >= 3) {
      candidatesSet.add(`${parts[0]}, ${parts[parts.length - 1]}`);
      candidatesSet.add(`${parts[1]}, ${parts[parts.length - 1]}`);
    }
    if (parts.length >= 2) {
      candidatesSet.add(`${parts[parts.length - 1]}, Nagpur`);
    }

    for (const rawQuery of candidatesSet) {
      let query = rawQuery;
      if (!query.toLowerCase().includes("nagpur")) {
        query += ", Nagpur, Maharashtra";
      }

      try {
        const res = await axios.get(
          "https://maps.googleapis.com/maps/api/geocode/json",
          {
            params: {
              address: query,
              key: this.apiKey,
            },
            timeout: 5000,
          }
        );

        if (res.data?.status === "REQUEST_DENIED") {
          throw new Error(
            `Google Maps Geocoding API failed with status: REQUEST_DENIED. ${
              res.data?.error_message || "Check billing & API key permissions."
            }`
          );
        }

        if (res.data?.status === "OK" && res.data.results?.length > 0) {
          const loc = res.data.results[0].geometry.location;
          return [loc.lat, loc.lng];
        }
      } catch (err) {
        if (err.message.includes("REQUEST_DENIED")) throw err;
      }
    }

    throw new Error(
      `Could not geocode location "${placeName}" with Google Maps API.`
    );
  }

  async getGarages() {
    const garages = await Garage.find({}).lean();
    return garages.map((g, idx) => ({
      id: g._id.toString(),
      s_no: idx + 1,
      garage_name: g.garage_name,
      address: g.address,
      contact: g.contact,
      lat: g.lat,
      lon: g.lon,
      enabled: g.is_enabled,
      is_enabled: g.is_enabled,
    }));
  }

  async addGarage({ garage_name, address, contact, lat, lon }) {
    if (!garage_name || !String(garage_name).trim()) {
      throw new Error("Garage name is required.");
    }
    const numLat = parseFloat(lat);
    const numLon = parseFloat(lon);
    if (Number.isNaN(numLat) || Number.isNaN(numLon)) {
      throw new Error("Valid Latitude and Longitude coordinates are required.");
    }

    const created = await Garage.create({
      garage_name: String(garage_name).trim(),
      address: String(address || "").trim(),
      contact: String(contact || "").trim(),
      lat: numLat,
      lon: numLon,
      is_enabled: true,
    });

    return {
      id: created._id.toString(),
      garage_name: created.garage_name,
      address: created.address,
      contact: created.contact,
      lat: created.lat,
      lon: created.lon,
      enabled: created.is_enabled,
      is_enabled: created.is_enabled,
    };
  }

  async toggleGarage(id) {
    const garage = await Garage.findById(id);
    if (!garage) {
      throw new Error(`Garage with ID ${id} not found.`);
    }

    garage.is_enabled = !garage.is_enabled;
    await garage.save();

    return {
      id: garage._id.toString(),
      garage_name: garage.garage_name,
      address: garage.address,
      contact: garage.contact,
      lat: garage.lat,
      lon: garage.lon,
      enabled: garage.is_enabled,
      is_enabled: garage.is_enabled,
    };
  }

  _formatDistanceRange(distKm, marginKm = 0.5) {
    let rangeStr;
    if (distKm <= 0.8) {
      rangeStr = "0.5 - 1.0 km";
    } else {
      const minDist = Math.max(0.1, Math.round((distKm - marginKm) * 10) / 10);
      const maxDist = Math.round((distKm + marginKm) * 10) / 10;
      const fmt = (n) =>
        Math.abs(n - Math.round(n)) < 1e-9 ? String(Math.round(n)) : String(n);
      rangeStr = `${fmt(minDist)} - ${fmt(maxDist)} km`;
    }

    return {
      distance_km: rangeStr,
      distance_range: rangeStr,
      distance: rangeStr,
      raw_km: Math.round(distKm * 100) / 100,
    };
  }

  async getNearestGarages(customerAddress) {
    const activeGarages = await Garage.find({ is_enabled: true }).lean();

    if (!activeGarages.length || !String(customerAddress || "").trim()) {
      return [];
    }

    if (!this.apiKey) {
      throw new Error(
        "Google Maps API Key is missing. Configure GOOGLE_MAPS_API_KEY in backend config."
      );
    }

    const [custLat, custLon] = await this.geocodeLocation(customerAddress);
    if (!custLat || !custLon) {
      throw new Error(
        "Could not determine coordinates from Google Maps Geocoding API."
      );
    }

    const destinationsStr = activeGarages
      .map((g) => `${g.lat},${g.lon}`)
      .join("|");

    const res = await axios.get(
      "https://maps.googleapis.com/maps/api/distancematrix/json",
      {
        params: {
          origins: `${custLat},${custLon}`,
          destinations: destinationsStr,
          mode: "driving",
          key: this.apiKey,
        },
        timeout: 5000,
      }
    );

    if (res.data?.status !== "OK") {
      throw new Error(
        `Google Maps Distance Matrix API failed with status: ${
          res.data?.status
        }. ${res.data?.error_message || ""}`
      );
    }

    const elements = res.data.rows[0]?.elements || [];

    const results = [];
    for (let i = 0; i < activeGarages.length; i++) {
      const garage = activeGarages[i];
      const elem = elements[i];

      if (!elem || elem.status !== "OK") {
        throw new Error(
          `Google Maps Distance Matrix API could not calculate route to garage: ${
            garage.garage_name
          } (status: ${elem?.status || "UNKNOWN"})`
        );
      }

      const distMeters = elem.distance.value;
      const distKm = Number(distMeters) / 1000.0;
      const rangeData = this._formatDistanceRange(distKm, 0.5);

      results.push({
        id: garage._id.toString(),
        garage_name: garage.garage_name,
        address: garage.address,
        contact: garage.contact,
        lat: garage.lat,
        lon: garage.lon,
        enabled: garage.is_enabled,
        is_enabled: garage.is_enabled,
        distance_km: rangeData.distance_km,
        distance_range: rangeData.distance_range,
        distance: rangeData.distance,
        raw_km: rangeData.raw_km,
        cust_lat: custLat,
        cust_lon: custLon,
        google_maps_url: `https://www.google.com/maps/dir/?api=1&origin=${custLat},${custLon}&destination=${garage.lat},${garage.lon}&travelmode=driving`,
      });
    }

    results.sort((a, b) => a.raw_km - b.raw_km);
    return results;
  }
}

module.exports = new DistanceService();
