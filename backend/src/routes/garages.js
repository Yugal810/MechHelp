const express = require("express");
const distanceService = require("../services/distanceService");

const router = express.Router();

// GET all registered garages with status
router.get("/", (_req, res) => {
  try {
    const garages = distanceService.getGarages();
    res.json(garages);
  } catch (err) {
    console.error("Error fetching garages:", err);
    res.status(500).json({ detail: "Failed to fetch garages" });
  }
});

// POST add a new garage and write to Excel
router.post("/", (req, res) => {
  try {
    const { garage_name, address, contact, lat, lon } = req.body;
    const newGarage = distanceService.addGarage({
      garage_name,
      address,
      contact,
      lat,
      lon,
    });
    res.status(201).json(newGarage);
  } catch (err) {
    console.error("Error adding garage:", err.message);
    res.status(400).json({ detail: err.message });
  }
});

// PATCH toggle enable/disable status for a garage
router.patch("/:id/toggle", (req, res) => {
  try {
    const { id } = req.params;
    const updatedGarage = distanceService.toggleGarage(id);
    res.json(updatedGarage);
  } catch (err) {
    console.error("Error toggling garage:", err.message);
    res.status(400).json({ detail: err.message });
  }
});

// POST geocode address to auto-fill lat/lon for new garage
router.post("/geocode", async (req, res) => {
  try {
    const { address } = req.body;
    if (!address || !String(address).trim()) {
      return res.status(422).json({ detail: "Address is required." });
    }
    const [lat, lon] = await distanceService.geocodeLocation(address);
    res.json({ lat, lon });
  } catch (err) {
    console.error("Error geocoding garage address:", err.message);
    res.status(400).json({ detail: err.message });
  }
});

module.exports = router;
