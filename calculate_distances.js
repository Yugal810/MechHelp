const fs = require("fs");
const path = require("path");

let axios, XLSX;
try {
  axios = require("axios");
  XLSX = require("xlsx");
} catch (e) {
  axios = require(path.join(__dirname, "backend", "node_modules", "axios"));
  XLSX = require(path.join(__dirname, "backend", "node_modules", "xlsx"));
}

// Google Maps API Key from Environment variable or backend config
const backendConfig = require(path.join(__dirname, "backend", "src", "config.js"));
const API_KEY = process.env.GOOGLE_MAPS_API_KEY || backendConfig.GOOGLE_MAPS_API_KEY || "";
const GARAGES_FILE = path.join(__dirname, "backend", "data", "garages.xlsx");

/**
 * 1. Read Garages Coordinates from garages.xlsx
 */
function loadGaragesFromExcel(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });

  const garages = [];
  for (const rawRow of rows) {
    const row = {};
    for (const [k, v] of Object.entries(rawRow)) {
      row[String(k).trim().toLowerCase()] = v;
    }

    const name = row["partner garage"] || row["name"];
    const lat = parseFloat(row.lat);
    const lon = parseFloat(row.lon) || parseFloat(row.lng);
    const address = row.address || "";
    const contact = row["contact no."] || "";

    if (name && !isNaN(lat) && !isNaN(lon)) {
      garages.push({
        garageName: String(name).trim(),
        address: String(address).trim(),
        contact: String(contact).trim(),
        lat,
        lon,
      });
    }
  }

  return garages;
}

/**
 * 2. Geocode Input Address strictly using Google Maps Geocoding API
 */
async function geocodeAddress(addressText) {
  if (!API_KEY) {
    throw new Error("GOOGLE_MAPS_API_KEY is missing! Please set process.env.GOOGLE_MAPS_API_KEY.");
  }

  console.log(`\n🔍 Geocoding address with Google Maps API: "${addressText}"...`);

  const rawClean = addressText.replace(/^(near|opposite|beside|behind|in front of|next to|opposite to|near to)\s+/i, "").trim();
  const parts = rawClean.split(",").map(s => s.trim()).filter(Boolean);

  const candidatesSet = new Set();
  candidatesSet.add(addressText.trim());
  if (rawClean !== addressText.trim()) {
    candidatesSet.add(rawClean);
  }
  if (parts.length >= 3) {
    candidatesSet.add(`${parts[0]}, ${parts[parts.length - 1]}`);
    candidatesSet.add(`${parts[1]}, ${parts[parts.length - 1]}`);
  }
  if (parts.length >= 2) {
    candidatesSet.add(`${parts[parts.length - 1]}, Nagpur`);
  }

  const candidates = Array.from(candidatesSet);

  for (const rawQuery of candidates) {
    let query = rawQuery;
    if (!query.toLowerCase().includes("nagpur")) {
      query += ", Nagpur, Maharashtra";
    }

    const response = await axios.get("https://maps.googleapis.com/maps/api/geocode/json", {
      params: { address: query, key: API_KEY },
      timeout: 5000,
    });

    if (response.data.status === "OK" && response.data.results.length > 0) {
      const loc = response.data.results[0].geometry.location;
      console.log(`✅ [Google Maps API] Matched: "${response.data.results[0].formatted_address}"`);
      console.log(`📍 Coordinates: (${loc.lat}, ${loc.lng})`);
      return { lat: loc.lat, lng: loc.lng };
    } else if (response.data.status && response.data.status !== "ZERO_RESULTS") {
      throw new Error(`Google Maps Geocoding API Error: Status [${response.data.status}]. ${response.data.error_message || ""}`);
    }
  }

  throw new Error(`Google Maps Geocoding API could not find location for "${addressText}".`);
}

/**
 * 3. Compute Driving Distance strictly using Google Maps Distance Matrix API
 */
async function calculateDistances(origin, garages) {
  if (!API_KEY) {
    throw new Error("GOOGLE_MAPS_API_KEY is missing! Please set process.env.GOOGLE_MAPS_API_KEY.");
  }

  console.log(`\n🚗 Computing driving distances using Google Maps Distance Matrix API for ${garages.length} garages...`);

  const destinationsStr = garages.map((g) => `${g.lat},${g.lon}`).join("|");
  const response = await axios.get("https://maps.googleapis.com/maps/api/distancematrix/json", {
    params: {
      origins: `${origin.lat},${origin.lng}`,
      destinations: destinationsStr,
      mode: "driving",
      key: API_KEY,
    },
    timeout: 5000,
  });

  if (response.data.status !== "OK") {
    throw new Error(`Google Maps Distance Matrix API Error: Status [${response.data.status}]. ${response.data.error_message || ""}`);
  }

  const elements = response.data.rows[0].elements;

  const results = garages.map((garage, idx) => {
    const elem = elements[idx];
    if (!elem || elem.status !== "OK") {
      throw new Error(`Google Maps Distance Matrix API route error for ${garage.garageName}: [${elem?.status || "UNKNOWN"}]`);
    }

    const meters = elem.distance.value;
    const distanceKm = Math.round((meters / 1000.0) * 100) / 100;
    const durationText = elem.duration.text;

    return {
      garageName: garage.garageName,
      address: garage.address,
      contact: garage.contact,
      lat: garage.lat,
      lon: garage.lon,
      distanceKm,
      duration: durationText,
      googleMapsUrl: `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${garage.lat},${garage.lon}&travelmode=driving`,
    };
  });

  results.sort((a, b) => a.distanceKm - b.distanceKm);
  return results;
}

/**
 * Main function
 */
async function main() {
  const inputAddress = process.argv[2] || "Dharampeth, Nagpur";

  try {
    const garages = loadGaragesFromExcel(GARAGES_FILE);
    console.log(`✅ Loaded ${garages.length} garages from "${path.relative(process.cwd(), GARAGES_FILE)}".`);

    const origin = await geocodeAddress(inputAddress);
    const results = await calculateDistances(origin, garages);

    console.log(`\n📊 Garages Sorted by Proximity to "${inputAddress}":\n`);
    console.table(
      results.map((r, i) => ({
        Rank: i + 1,
        "Garage Name": r.garageName,
        "Distance (km)": `${r.distanceKm} km`,
        "Est. Driving Time": r.duration,
        Address: r.address,
      }))
    );
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
  }
}

main();
