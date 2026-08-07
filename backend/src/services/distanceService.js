const fs = require("fs");
const axios = require("axios");
const XLSX = require("xlsx");
const { GARAGES_EXCEL_PATH, GOOGLE_MAPS_API_KEY } = require("../config");

function isBlank(value) {
  if (value === null || value === undefined) return true;
  const s = String(value).trim();
  return !s || ["nan", "none", "null"].includes(s.toLowerCase());
}

class DistanceService {
  constructor() {
    this.cachedGarages = [];
    this.apiKey = GOOGLE_MAPS_API_KEY || "";
    this.loadGarageData();
  }

  /**
   * Geocode address strictly using Google Maps Geocoding API
   */
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

  /**
   * Load garages from garages.xlsx
   */
  loadGarageData() {
    if (!fs.existsSync(GARAGES_EXCEL_PATH)) {
      console.error(
        `❌ Garages Excel file not found at path: ${GARAGES_EXCEL_PATH}`
      );
      this.cachedGarages = [];
      return;
    }

    try {
      const workbook = XLSX.readFile(GARAGES_EXCEL_PATH);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      this.cachedGarages = [];

      let idx = 1;
      for (const raw of rawRows) {
        const row = {};
        for (const [key, value] of Object.entries(raw)) {
          row[String(key).trim().toLowerCase()] = value;
        }

        const garageName = row["partner garage"];
        if (isBlank(garageName)) continue;

        const rawLat = row.lat;
        const rawLon = row.lon;
        if (isBlank(rawLat) || isBlank(rawLon)) continue;

        const lat = parseFloat(rawLat);
        const lon = parseFloat(rawLon);
        if (Number.isNaN(lat) || Number.isNaN(lon)) continue;

        const statusStr = String(row.status || "").trim().toLowerCase();
        const enabled =
          statusStr === "disabled" ||
          statusStr === "false" ||
          statusStr === "off"
            ? false
            : true;

        this.cachedGarages.push({
          id: idx++,
          garage_name: String(garageName).trim(),
          address: isBlank(row.address) ? "" : String(row.address).trim(),
          contact: isBlank(row["contact no."])
            ? ""
            : String(row["contact no."]).trim(),
          lat,
          lon,
          enabled,
        });
      }

      console.log(`✅ Loaded ${this.cachedGarages.length} partner garages!`);
    } catch (e) {
      console.error(`❌ Error loading garages Excel file: ${e.message}`);
    }
  }

  /**
   * Save current cached garages array back to garages.xlsx
   */
  saveGaragesToExcel() {
    try {
      const dataToSave = this.cachedGarages.map((g, idx) => ({
        "S.No.": idx + 1,
        "Partner Garage": g.garage_name,
        Address: g.address,
        "Contact No.": g.contact,
        Lat: g.lat,
        Lon: g.lon,
        Status: g.enabled ? "Enabled" : "Disabled",
      }));

      const workbook = XLSX.utils.book_new();
      const sheet = XLSX.utils.json_to_sheet(dataToSave);
      XLSX.utils.book_append_sheet(workbook, sheet, "Partner Garages");
      XLSX.writeFile(workbook, GARAGES_EXCEL_PATH);
      console.log(`✅ Saved ${this.cachedGarages.length} garages to Excel: ${GARAGES_EXCEL_PATH}`);
    } catch (e) {
      console.error(`❌ Error saving garages to Excel: ${e.message}`);
      throw new Error(`Failed to save Excel file: ${e.message}`);
    }
  }

  /**
   * Return all garages
   */
  getGarages() {
    return this.cachedGarages;
  }

  /**
   * Add a new garage and write to Excel
   */
  addGarage({ garage_name, address, contact, lat, lon }) {
    if (!garage_name || !String(garage_name).trim()) {
      throw new Error("Garage name is required.");
    }
    const numLat = parseFloat(lat);
    const numLon = parseFloat(lon);
    if (Number.isNaN(numLat) || Number.isNaN(numLon)) {
      throw new Error("Valid Latitude and Longitude coordinates are required.");
    }

    const newId = this.cachedGarages.length
      ? Math.max(...this.cachedGarages.map((g) => g.id)) + 1
      : 1;

    const newGarage = {
      id: newId,
      garage_name: String(garage_name).trim(),
      address: String(address || "").trim(),
      contact: String(contact || "").trim(),
      lat: numLat,
      lon: numLon,
      enabled: true,
    };

    this.cachedGarages.push(newGarage);
    this.saveGaragesToExcel();
    return newGarage;
  }

  /**
   * Toggle enabled/disabled status for a garage
   */
  toggleGarage(id) {
    const numId = Number(id);
    const garage = this.cachedGarages.find((g) => g.id === numId);
    if (!garage) {
      throw new Error(`Garage with ID ${id} not found.`);
    }

    garage.enabled = !garage.enabled;
    this.saveGaragesToExcel();
    return garage;
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

  /**
   * Compute nearest garages strictly using Google Maps Distance Matrix API
   * Filter OUT disabled garages!
   */
  async getNearestGarages(customerAddress) {
    const activeGarages = this.cachedGarages.filter((g) => g.enabled !== false);

    if (!activeGarages.length || !String(customerAddress || "").trim()) {
      return [];
    }

    if (!this.apiKey) {
      throw new Error(
        "Google Maps API Key is missing. Configure GOOGLE_MAPS_API_KEY in backend config."
      );
    }

    // 1. Geocode via Google Maps
    const [custLat, custLon] = await this.geocodeLocation(customerAddress);
    if (!custLat || !custLon) {
      throw new Error(
        "Could not determine coordinates from Google Maps Geocoding API."
      );
    }

    // 2. Query Google Maps Distance Matrix API ONLY for active garages
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
        ...garage,
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
