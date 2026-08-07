const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const BACKEND_DIR = path.resolve(__dirname, "..");
const ROOT_DIR = path.resolve(__dirname, "../..");

module.exports = {
  EXCEL_FILE_PATH: path.join(BACKEND_DIR, "data", "cars.xlsx"),
  GARAGES_EXCEL_PATH: path.join(BACKEND_DIR, "data", "garages.xlsx"),
  FRONTEND_DIST: path.join(ROOT_DIR, "frontend", "dist"),
  PORT: process.env.PORT || 8000,
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || "",
};
