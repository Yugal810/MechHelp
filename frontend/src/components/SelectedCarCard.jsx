import { useState, useEffect } from "react";

function formatDateToYYYYMMDD(dateObj) {
  if (!dateObj || isNaN(dateObj.getTime())) return "";
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function SelectedCarCard({
  car,
  selectedGarage,
  note,
  setNote,
  resetKey,
}) {
  const [bookingDate, setBookingDate] = useState("");
  const [months, setMonths] = useState("");
  const [weeks, setWeeks] = useState("");
  const [days, setDays] = useState("");
  const [copied, setCopied] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  useEffect(() => {
    setSelectedPlan(null);
    setBookingDate("");
    setMonths("");
    setWeeks("");
    setDays("");
  }, [car?.id, car?.brand, car?.model, resetKey]);

  // Safely extract garage name string whether selectedGarage is an object or string
  const garageDisplayName =
    typeof selectedGarage === "object" && selectedGarage !== null
      ? selectedGarage.garage_name || selectedGarage.name || "n/a"
      : selectedGarage || "n/a";

  function handleOffsetChange(type, value) {
    const nextMonths = type === "months" ? value : months;
    const nextWeeks = type === "weeks" ? value : weeks;
    const nextDays = type === "days" ? value : days;

    if (type === "months") setMonths(value);
    if (type === "weeks") setWeeks(value);
    if (type === "days") setDays(value);

    const m = Math.max(0, parseInt(nextMonths, 10) || 0);
    const w = Math.max(0, parseInt(nextWeeks, 10) || 0);
    const d = Math.max(0, parseInt(nextDays, 10) || 0);

    if (m === 0 && w === 0 && d === 0) {
      setBookingDate("");
      return;
    }

    const target = new Date();
    if (m > 0) target.setMonth(target.getMonth() + m);
    if (w > 0) target.setDate(target.getDate() + w * 7);
    if (d > 0) target.setDate(target.getDate() + d);

    setBookingDate(formatDateToYYYYMMDD(target));
  }

  const litePrice = car?.mech_lite || car?.["mech lite"] || car?.mechLite;
  const basicPrice = car?.mech_basic || car?.["mech basic"] || car?.mechBasic;
  const proPrice = car?.mech_pro || car?.["mech pro"] || car?.mechPro;
  const hasPricing = litePrice || basicPrice || proPrice;

  function handleCopy() {
    if (!car) return;

    const brand = car.brand || "n/a";
    const model = car.model || "n/a";
    const userYearStr = car.userYear ? ` ${car.userYear}` : "";
    const fullCarHeader = `${brand} ${model}${userYearStr}`.trim();
    const fuel = car.fuelType || car.fuel || car.fueltype || "n/a";
    const oilCapacity = car.oil_capacity || car["oil capacity (l)"] || car.oilCapacity || "n/a";

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

    const planText = selectedPlan
      ? `${selectedPlan.toUpperCase()} (₹${
          selectedPlan === "Lite"
            ? litePrice
            : selectedPlan === "Basic"
            ? basicPrice
            : proPrice
        })`
      : "NIL";

    const noteText = note?.trim() || "";

    const summaryText = [
      fullCarHeader,
      `Fuel type: ${fuel}`,
      `Oil capacity: ${oilCapacity} ${oilCapacity !== "n/a" ? "L" : ""}`,
      `Garage name: ${garageDisplayName}`,
      `Reminder date: ${reminderDate || "None"}`,
      `Selected plan: ${planText}`,
      `My note: ${noteText}`,
    ]
      .filter(Boolean)
      .join("\n");

    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  return (
    <div className="selected-car-card">
      {car ? (
        <div className="selected-car-body">
          <div className="selected-car-top-bar">
            <div className="car-main-info">
              <span className="selected-car-subtitle">Selected Vehicle</span>
              <h4 className="car-title">
                {car.brand} {car.model}{car.userYear ? ` ${car.userYear}` : ""}
              </h4>
            </div>

            <div className="spec-stats inline-stats">
              <div className="spec-stat">
                <small>Fuel</small>
                <strong>{car.fuelType || car.fuel || car.fueltype || "—"}</strong>
              </div>
              <div className="spec-stat">
                <small>Oil capacity</small>
                <strong>
                  {car.oil_capacity || car["oil capacity (l)"] || car.oilCapacity || "—"}
                  {car.oil_capacity || car["oil capacity (l)"] || car.oilCapacity ? " L" : ""}
                </strong>
              </div>
            </div>
          </div>

          {hasPricing && (
            <div className="pricing-plans-section inline-pricing">
              <div className="plans-header-label">Service Plans</div>
              <div className="pricing-plans-grid">
                <div
                  className={`plan-chip plan-lite ${selectedPlan === "Lite" ? "is-selected" : ""}`}
                  onClick={() => setSelectedPlan(selectedPlan === "Lite" ? null : "Lite")}
                  role="button"
                  tabIndex={0}
                  title="Click to select Lite plan"
                >
                  <span className="plan-badge">Lite</span>
                  <span className="plan-amount">₹{litePrice}</span>
                </div>
                <div
                  className={`plan-chip plan-basic ${selectedPlan === "Basic" ? "is-selected" : ""}`}
                  onClick={() => setSelectedPlan(selectedPlan === "Basic" ? null : "Basic")}
                  role="button"
                  tabIndex={0}
                  title="Click to select Basic plan"
                >
                  <span className="plan-badge">Basic</span>
                  <span className="plan-amount">₹{basicPrice}</span>
                </div>
                <div
                  className={`plan-chip plan-pro ${selectedPlan === "Pro" ? "is-selected" : ""}`}
                  onClick={() => setSelectedPlan(selectedPlan === "Pro" ? null : "Pro")}
                  role="button"
                  tabIndex={0}
                  title="Click to select Pro plan"
                >
                  <span className="plan-badge">Pro</span>
                  <span className="plan-amount">₹{proPrice}</span>
                </div>
              </div>
            </div>
          )}

          {selectedGarage && (
            <div className="selected-garage-line">
              <span className="garage-label">Garage:</span>
              <strong className="garage-val">{garageDisplayName}</strong>
            </div>
          )}

          <div className="reminder-section">
            <span className="reminder-section-label">Set Reminder</span>
            <div className="reminder-inputs-grid">
              <div className="reminder-field" title="Months from now">
                <input
                  type="number"
                  min="0"
                  max="48"
                  placeholder="0"
                  value={months}
                  onChange={(e) => handleOffsetChange("months", e.target.value)}
                  aria-label="Months reminder"
                />
                <span>Months</span>
              </div>
              <div className="reminder-field" title="Weeks from now">
                <input
                  type="number"
                  min="0"
                  max="52"
                  placeholder="0"
                  value={weeks}
                  onChange={(e) => handleOffsetChange("weeks", e.target.value)}
                  aria-label="Weeks reminder"
                />
                <span>Weeks</span>
              </div>
              <div className="reminder-field" title="Days from now">
                <input
                  type="number"
                  min="0"
                  max="365"
                  placeholder="0"
                  value={days}
                  onChange={(e) => handleOffsetChange("days", e.target.value)}
                  aria-label="Days reminder"
                />
                <span>Days</span>
              </div>
            </div>

            <div className="reminder-date-preview">
              <span className="preview-label">Target Date</span>
              <div
                className="calendar-picker-wrap"
                title="Click to select reminder date"
                onClick={(e) => {
                  const input = e.currentTarget.querySelector("input[type='date']");
                  if (input && typeof input.showPicker === "function") {
                    try {
                      input.showPicker();
                    } catch (err) { }
                  }
                }}
              >
                <input
                  type="date"
                  className="booking-date-input"
                  value={bookingDate}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (typeof e.target.showPicker === "function") {
                      try {
                        e.target.showPicker();
                      } catch (err) { }
                    }
                  }}
                  onChange={(e) => {
                    setBookingDate(e.target.value);
                    setMonths("");
                    setWeeks("");
                    setDays("");
                  }}
                  aria-label="Booking reminder date"
                />
              </div>
            </div>
          </div>

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