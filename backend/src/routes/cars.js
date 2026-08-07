const express = require("express");
const carService = require("../services/carService");
const distanceService = require("../services/distanceService");

const router = express.Router();

router.get("/options", (req, res) => {
  const { brand, model, year_mode, custom_year, fuelType } = req.query;
  res.json(
    carService.getOptions({
      brand,
      model,
      year_mode,
      custom_year,
      fuelType,
    })
  );
});

router.get("/search", (req, res) => {
  const { brand, model, year_mode, custom_year, fuelType, query } = req.query;
  res.json(
    carService.searchCars({
      brand,
      model,
      year_mode,
      custom_year,
      fuelType,
      query,
    })
  );
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
