const express = require("express");
const carService = require("../services/carService");
const distanceService = require("../services/distanceService");

const router = express.Router();

router.get("/options", async (req, res) => {
  try {
    const { type, brand, model, year_mode, custom_year, fuelType } = req.query;
    const options = await carService.getOptions({
      type,
      brand,
      model,
      year_mode,
      custom_year,
      fuelType,
    });
    res.json(options);
  } catch (err) {
    console.error("Error fetching options:", err.message);
    res.status(500).json({ detail: "Failed to fetch car options" });
  }
});

router.get("/search", async (req, res) => {
  try {
    const { type, brand, model, year_mode, custom_year, fuelType, query } = req.query;
    const cars = await carService.searchCars({
      type,
      brand,
      model,
      year_mode,
      custom_year,
      fuelType,
      query,
    });
    res.json(cars);
  } catch (err) {
    console.error("Error searching cars:", err.message);
    res.status(500).json({ detail: "Failed to search cars" });
  }
});

router.get("/nearest-garages", async (req, res) => {
  const customerAddress = req.query.customer_address;
  if (!customerAddress || !String(customerAddress).trim()) {
    return res
      .status(422)
      .json({ detail: "customer_address is required (min length 1)" });
  }

  try {
    const results = await distanceService.getNearestGarages(customerAddress);
    res.json(results);
  } catch (e) {
    console.error("nearest-garages error:", e.message);
    res.status(500).json({ detail: "Failed to compute nearest garages" });
  }
});

module.exports = router;
