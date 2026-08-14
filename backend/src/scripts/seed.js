const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const connectDB = require("../db");
const Car = require("../models/Car");
const Garage = require("../models/Garage");
const { NORMAL_CARS_EXCEL_PATH, PREMIUM_CARS_EXCEL_PATH, GARAGES_EXCEL_PATH } = require("../config");

function isBlank(value) {
  if (value === null || value === undefined) return true;
  const s = String(value).trim();
  return !s || ["nan", "none", "null"].includes(s.toLowerCase());
}

function cellStr(value) {
  if (value === null || value === undefined) return "";
  const s = String(value).trim();
  if (["nan", "NaN", "None", "null"].includes(s)) return "";
  return s;
}

function loadSheetRows(filePath, label) {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ Warning: '${filePath}' not found for ${label}`);
    return [];
  }

  try {
    const workbook = XLSX.readFile(filePath);
    const allRows = [];

    const skipSheets = ["export summary", "rates"];

    for (const sheetName of workbook.SheetNames) {
      if (skipSheets.includes(sheetName.trim().toLowerCase())) {
        console.log(`ℹ️ Skipping metadata sheet '${sheetName}' in ${label}`);
        continue;
      }

      const sheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      for (const raw of rawRows) {
        const row = {};
        for (const [key, value] of Object.entries(raw)) {
          const normalized = String(key).trim().toLowerCase();
          if (!normalized || normalized.startsWith("__empty")) continue;
          row[normalized] = cellStr(value);
        }

        const hasAnyValue = Object.values(row).some((v) => !isBlank(v));
        if (!hasAnyValue) continue;

        if (isBlank(row.brand)) {
          row.brand = sheetName.trim();
        }

        allRows.push(row);
      }
    }

    const rows = allRows.filter((r) => !isBlank(r.model));
    console.log(`✅ Loaded ${rows.length} clean rows from '${filePath}' (${label})`);
    return rows;
  } catch (e) {
    console.error(`❌ Error parsing ${label} Excel file: ${e.message}`);
    return [];
  }
}

function extractYear(row) {
  for (const col of ["year", "year_mode", "custom_year", "year range", "year_range"]) {
    if (row[col] !== undefined && !isBlank(row[col])) {
      return String(row[col]).trim();
    }
  }
  return "-";
}

function extractFuel(row) {
  for (const col of ["fueltype", "fuel_type", "fuel"]) {
    if (row[col] !== undefined && !isBlank(row[col])) {
      return String(row[col]).trim();
    }
  }
  return "";
}

function extractVal(row, keys) {
  for (const k of keys) {
    if (row[k] !== undefined && !isBlank(row[k])) {
      return String(row[k]).trim();
    }
  }
  return "";
}

async function seedData() {
  try {
    console.log("🔄 Connecting to MongoDB Atlas...");
    await connectDB();

    // 1. Seed Cars
    const normalRows = loadSheetRows(NORMAL_CARS_EXCEL_PATH, "Normal Cars");
    const premiumRows = loadSheetRows(PREMIUM_CARS_EXCEL_PATH, "Premium Cars");

    console.log("🧹 Clearing old Car records from database...");
    await Car.deleteMany({});

    const carDocs = [];

    for (const r of normalRows) {
      carDocs.push({
        type: "normal",
        brand: r.brand || "Unknown",
        model: r.model || "Unknown",
        variant: r.variant || "",
        year: extractYear(r),
        fuelType: extractFuel(r),
        oilCapacity: extractVal(r, ["oil capacity (l)", "oil capacity", "oil_capacity"]),
        pricingCategory: extractVal(r, ["pricing category", "pricing_category"]),
        mechLite: extractVal(r, ["mech lite", "mech_lite"]),
        mechBasic: extractVal(r, ["mech basic", "mech_basic"]),
        mechPro: extractVal(r, ["mech pro", "mech_pro"]),
        details: r,
      });
    }

    for (const r of premiumRows) {
      carDocs.push({
        type: "premium",
        brand: r.brand || "Unknown",
        model: r.model || "Unknown",
        variant: r.variant || "",
        year: extractYear(r),
        fuelType: extractFuel(r),
        oilCapacity: extractVal(r, ["oil capacity (l)", "oil capacity", "oil_capacity"]),
        pricingCategory: extractVal(r, ["pricing category", "pricing_category"]),
        mechLite: extractVal(r, ["mech lite", "mech_lite"]),
        mechBasic: extractVal(r, ["mech basic", "mech_basic"]),
        mechPro: extractVal(r, ["mech pro", "mech_pro"]),
        details: r,
      });
    }

    if (carDocs.length > 0) {
      await Car.insertMany(carDocs);
      console.log(`🚗 Uploaded ${carDocs.length} Car records (with pricing plans) to MongoDB!`);
    }

    // 2. Seed Garages
    console.log("🧹 Clearing old Garage records from database...");
    await Garage.deleteMany({});

    let garageRows = [];
    const garagesPath = GARAGES_EXCEL_PATH || path.resolve(__dirname, "../../data/garages.xlsx");
    if (fs.existsSync(garagesPath)) {
      const workbook = XLSX.readFile(garagesPath);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawGarages = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

      garageRows = rawGarages
        .map((g) => {
          const norm = {};
          for (const [k, v] of Object.entries(g)) {
            norm[String(k).trim().toLowerCase()] = v;
          }
          return {
            garage_name: norm.garage_name || norm.name || norm["partner garage"] || "Unnamed Garage",
            address: norm.address || "",
            contact: String(norm.contact || norm["contact no."] || norm.phone || ""),
            lat: parseFloat(norm.lat || norm.latitude || 0),
            lon: parseFloat(norm.lon || norm.lng || norm.longitude || 0),
            is_enabled:
              norm.status !== undefined
                ? String(norm.status).toLowerCase() === "enabled" || norm.status === true || norm.status === 1
                : true,
          };
        })
        .filter((g) => g.garage_name && (g.lat !== 0 || g.lon !== 0 || g.address));
    }

    if (garageRows.length > 0) {
      await Garage.insertMany(garageRows);
      console.log(`🔧 Uploaded ${garageRows.length} Garage records to MongoDB!`);
    }

    console.log("🎉 Database seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seedData();
