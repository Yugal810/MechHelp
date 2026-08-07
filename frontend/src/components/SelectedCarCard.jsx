import { useState } from "react";

export default function SelectedCarCard({
  car,
  selectedGarage,
  note,
  setNote,
}) {
  const [bookingDate, setBookingDate] = useState("");
  const [copied, setCopied] = useState(false);

  // Safely extract garage name string whether selectedGarage is an object or string
  const garageDisplayName =
    typeof selectedGarage === "object" && selectedGarage !== null
      ? selectedGarage.garage_name || selectedGarage.name || "n/a"
      : selectedGarage || "n/a";

  function handleCopy() {
    if (!car) return;

    const brand = car.brand || "n/a";
    const model = car.model || "n/a";
    const fuel = car.fuel || car.fueltype || "n/a";
    const oilCapacity = car["oil capacity (l)"] || car.oil_capacity || "n/a";

    let reminderDate = "";
    if (bookingDate) {
      try {
        reminderDate = new Date(bookingDate + "T00:00:00").toLocaleDateString(
          undefined,
          {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
          }
        );
      } catch {
        reminderDate = bookingDate;
      }
    }

    const noteText = note?.trim() || "";

    const summaryText = [
      `Brand: ${brand}`,
      `Model Name: ${model}`,
      `Fuel type: ${fuel}`,
      `Oil capacity: ${oilCapacity}`,
      `Garage name: ${garageDisplayName}`,
      `Reminder date: ${reminderDate}`,
      `My note: ${noteText}`,
    ].join("\n");

    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  return (
    <div className="selected-car-card">
      <div className="selected-car-header">
        <h3>Selected Vehicle</h3>
        {car && (
          <div className="calendar-picker-wrap" title="Set booking reminder date">
            <input
              type="date"
              className="booking-date-input"
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
              aria-label="Booking reminder date"
            />
          </div>
        )}
      </div>

      {car ? (
        <div className="selected-car-body">
          <div className="car-main-info">
            <h4 className="car-title">
              {car.brand} {car.model}
            </h4>
          </div>

          {selectedGarage && (
            <div className="selected-garage-line">
              <span className="garage-label">Garage:</span>
              <strong className="garage-val">{garageDisplayName}</strong>
            </div>
          )}

          <div className="note-section">
            <label htmlFor="userNoteInput">Service Notes</label>
            <textarea
              id="userNoteInput"
              rows={3}
              value={note || ""}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <button
            type="button"
            className={`btn-copy-info ${copied ? "is-copied" : ""}`}
            onClick={handleCopy}
          >
            {copied ? "Copied to Clipboard!" : "Copy Vehicle Info & Notes"}
          </button>
        </div>
      ) : (
        <div className="selected-car-empty">
          <p>No vehicle selected yet.</p>
          <small>
            Filter vehicles below and click on the top matched car to select it here.
          </small>
        </div>
      )}
    </div>
  );
}