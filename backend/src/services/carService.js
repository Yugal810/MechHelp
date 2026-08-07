const fs = require("fs");
const XLSX = require("xlsx");
const { EXCEL_FILE_PATH } = require("../config");

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

class CarService {
  constructor() {
    this.rows = [];
    this.loadExcelData();
  }

  loadExcelData() {
    if (!fs.existsSync(EXCEL_FILE_PATH)) {
      console.warn(`⚠️ Warning: '${EXCEL_FILE_PATH}' not found`);
      return;
    }

    try {
      const workbook = XLSX.readFile(EXCEL_FILE_PATH);
      const allRows = [];

      for (const sheetName of workbook.SheetNames) {
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

      this.rows = allRows.filter((r) => !isBlank(r.model));

      const uniqueBrands = [
        ...new Set(this.rows.map((r) => r.brand).filter(Boolean)),
      ].sort();

      console.log(
        `✅ Loaded ${this.rows.length} clean rows across ${workbook.SheetNames.length} sheet tabs!`
      );
      console.log(`📋 Brands detected: ${uniqueBrands.join(", ")}`);
    } catch (e) {
      console.error(`❌ Error loading car Excel file across sheets: ${e.message}`);
    }
  }

  _getYearVal(row) {
    for (const col of [
      "year",
      "year_mode",
      "custom_year",
      "year range",
      "year_range",
    ]) {
      if (row[col] !== undefined && !isBlank(row[col])) {
        return String(row[col]).trim();
      }
    }
    return "-";
  }

  _rowMatchesYearFilter(rowYearStr, yearMode = null, customYear = null) {
    if (!rowYearStr || rowYearStr === "-") return false;

    const foundYears = [...rowYearStr.matchAll(/\b\d{4}\b/g)].map((m) =>
      parseInt(m[0], 10)
    );

    if (customYear && String(customYear).trim()) {
      const typed = String(customYear).trim().toLowerCase();
      const typedDigits = [...typed.matchAll(/\b\d{4}\b/g)].map((m) =>
        parseInt(m[0], 10)
      );

      if (typedDigits.length && foundYears.length) {
        const targetYr = typedDigits[0];
        const minYear = Math.min(...foundYears);
        const maxYear = Math.max(...foundYears);
        return minYear <= targetYr && targetYr <= maxYear;
      }

      return rowYearStr.toLowerCase().includes(typed);
    }

    if (yearMode && foundYears.length) {
      const minYear = Math.min(...foundYears);
      const maxYear = Math.max(...foundYears);
      const mode = String(yearMode).trim().toLowerCase();
      if (mode === "after 2020") return maxYear >= 2020;
      if (mode === "before 2020") return minYear < 2020;
    }

    return true;
  }

  _findFuelCol(rowOrKeys) {
    const keys = Array.isArray(rowOrKeys)
      ? rowOrKeys
      : Object.keys(rowOrKeys || {});
    return ["fueltype", "fuel_type", "fuel"].find((c) => keys.includes(c));
  }

  searchCars({
    brand = null,
    model = null,
    year_mode = null,
    custom_year = null,
    fuelType = null,
  } = {}) {
    if (!this.rows.length) return [];

    let filtered = [...this.rows];

    if (brand && brand.trim()) {
      const q = brand.trim().toLowerCase();
      filtered = filtered.filter((r) =>
        String(r.brand || "")
          .toLowerCase()
          .includes(q)
      );
    }

    if (model && model.trim()) {
      const q = model.trim().toLowerCase();
      filtered = filtered.filter((r) =>
        String(r.model || "")
          .toLowerCase()
          .includes(q)
      );
    }

    const fuelColSample = this._findFuelCol(filtered[0] || {});
    if (fuelType && fuelType.trim() && fuelColSample) {
      const q = fuelType.trim().toLowerCase();
      filtered = filtered.filter((r) => {
        const col = this._findFuelCol(r);
        return col
          ? String(r[col] || "")
              .toLowerCase()
              .includes(q)
          : false;
      });
    }

    if (year_mode || custom_year) {
      filtered = filtered.filter((row) =>
        this._rowMatchesYearFilter(
          this._getYearVal(row),
          year_mode,
          custom_year
        )
      );
    }

    const cleanRecords = [];
    for (const r of filtered) {
      const modelVal = String(r.model || "").trim();
      if (!modelVal || modelVal === "-" || modelVal.toLowerCase() === "nan") {
        continue;
      }
      cleanRecords.push({
        ...r,
        year: this._getYearVal(r),
      });
    }

    return cleanRecords;
  }

  getOptions({
    brand = null,
    model = null,
    fuelType = null,
  } = {}) {
    if (!this.rows.length) {
      return {
        brands: [],
        models: [],
        variants: [],
        fuelTypes: [],
        yearModes: ["after 2020", "before 2020"],
      };
    }

    const brands = [
      ...new Set(
        this.rows
          .map((r) => String(r.brand || "").trim())
          .filter((b) => b && !["nan", "none", ""].includes(b.toLowerCase()))
      ),
    ].sort();

    let filtered = [...this.rows];

    if (brand && brand.trim()) {
      const q = brand.trim().toLowerCase();
      filtered = filtered.filter((r) =>
        String(r.brand || "")
          .toLowerCase()
          .includes(q)
      );
    }

    const models = [
      ...new Set(
        filtered
          .map((r) => String(r.model || "").trim())
          .filter((m) => m && !["nan", "none", ""].includes(m.toLowerCase()))
      ),
    ].sort();

    if (model && model.trim()) {
      const q = model.trim().toLowerCase();
      filtered = filtered.filter((r) =>
        String(r.model || "")
          .toLowerCase()
          .includes(q)
      );
    }

    const fuelCols = ["fueltype", "fuel_type", "fuel"];
    const fuelSet = new Set();
    for (const r of filtered) {
      const col = fuelCols.find((c) => c in r);
      if (!col) continue;
      const f = String(r[col] || "").trim();
      if (f && !["nan", "none", ""].includes(f.toLowerCase())) fuelSet.add(f);
    }
    const fuelList = [...fuelSet].sort();

    const variants = [
      ...new Set(
        filtered
          .map((r) => String(r.variant || "").trim())
          .filter((v) => v && !["nan", "none", ""].includes(v.toLowerCase()))
      ),
    ].sort();

    return {
      brands,
      models,
      variants,
      fuelTypes: fuelList,
      yearModes: ["after 2020", "before 2020"],
    };
  }
}

module.exports = new CarService();
