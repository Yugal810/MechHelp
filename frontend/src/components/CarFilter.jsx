import { useCallback, useEffect, useRef, useState } from "react";
import { fetchOptions, searchCars } from "../api";

const EMPTY_FILTERS = {
  brand: "",
  model: "",
  fuelType: "",
  customYear: "",
  yearMode: "",
};

export default function CarFilter({
  carMode = "normal",
  selectedCar,
  onSelectCar,
  isCollapsed,
  onToggleCollapse,
  onResetAll,
}) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [options, setOptions] = useState({
    brands: [],
    models: [],
    fuelTypes: [],
  });
  const [car, setCar] = useState(null);
  const [status, setStatus] = useState("Loading specs...");
  const [isLoading, setIsLoading] = useState(true);
  const isBrandAutoFilled = useRef(false);
  const onSelectCarRef = useRef(onSelectCar);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    onSelectCarRef.current = onSelectCar;
  }, [onSelectCar]);

  const loadOptions = useCallback(
    async (brand, model, mode) => {
      try {
        const data = await fetchOptions({
          brand,
          model,
          type: mode || carMode,
        });
        setOptions({
          brands: data.brands || [],
          models: data.models || [],
          fuelTypes: data.fuelTypes || [],
        });
      } catch (err) {
        console.error("Error fetching options:", err);
      }
    },
    [carMode]
  );

  const runSearch = useCallback(
    async (nextFilters, mode) => {
      setIsLoading(true);
      try {
        const activeMode = mode || carMode;
        let cars = await searchCars(nextFilters, activeMode);

        if (cars.length === 0 && isBrandAutoFilled.current) {
          isBrandAutoFilled.current = false;
          const fallback = { ...nextFilters, brand: "" };
          setFilters(fallback);
          cars = await searchCars(fallback, activeMode);
        }

        if (!cars?.length) {
          setCar(null);
          setStatus("No vehicle found. Please check details.");
          if (onSelectCarRef.current) {
            onSelectCarRef.current(null);
          }
          return;
        }

        // Display strictly 1 top matched car
        const userYear = nextFilters.customYear || nextFilters.yearMode || "";
        const top = { ...cars[0], userYear };
        const uniqueBrands = [
          ...new Set(cars.map((c) => c.brand).filter((b) => b && b !== "-")),
        ];

        if (nextFilters.model && uniqueBrands.length === 1) {
          isBrandAutoFilled.current = true;
          setFilters((prev) =>
            prev.brand === uniqueBrands[0]
              ? prev
              : { ...prev, brand: uniqueBrands[0] }
          );
        } else if (!nextFilters.model) {
          isBrandAutoFilled.current = false;
        }

        setCar(top);

        // Auto-select on initial load or mode change
        if ((isInitialLoad.current || mode) && onSelectCarRef.current) {
          onSelectCarRef.current(top);
          isInitialLoad.current = false;
        }

        setStatus("");
      } catch (err) {
        console.error("Error searching cars:", err);
        setCar(null);
        setStatus("Could not load vehicle specs.");
      } finally {
        setIsLoading(false);
      }
    },
    [carMode]
  );

  // When carMode changes, reset filters and reload options & search
  useEffect(() => {
    isBrandAutoFilled.current = false;
    setFilters(EMPTY_FILTERS);
    loadOptions("", "", carMode);
    runSearch(EMPTY_FILTERS, carMode);
  }, [carMode, loadOptions, runSearch]);

  function updateFilter(
    key,
    value,
    { clearYearMode = false, clearCustomYear = false } = {}
  ) {
    setFilters((prev) => {
      const next = {
        ...prev,
        [key]: value,
        ...(clearYearMode ? { yearMode: "" } : {}),
        ...(clearCustomYear ? { customYear: "" } : {}),
      };

      // If brand is cut, cleared, or changed, reset model as well
      if (key === "brand") {
        if (!value.trim() || value.trim() !== prev.brand.trim()) {
          next.model = "";
          isBrandAutoFilled.current = false;
        }
      }

      loadOptions(next.brand, next.model, carMode);
      runSearch(next, carMode);
      return next;
    });
  }

  function clearField(key) {
    setFilters((prev) => {
      const next = { ...prev, [key]: "" };

      // Clearing brand also resets model
      if (key === "brand") {
        next.model = "";
        isBrandAutoFilled.current = false;
      }

      if (key === "model" && isBrandAutoFilled.current) {
        next.brand = "";
        isBrandAutoFilled.current = false;
      }

      loadOptions(next.brand, next.model, carMode);
      runSearch(next, carMode);
      return next;
    });
  }

  function resetAll() {
    isBrandAutoFilled.current = false;
    setFilters(EMPTY_FILTERS);
    loadOptions("", "", carMode);
    runSearch(EMPTY_FILTERS, carMode);
    if (onResetAll) {
      onResetAll();
    }
  }

  function handleSelectTopCar() {
    if (car && onSelectCar) {
      const currentUserYear = filters.customYear || filters.yearMode || "";
      onSelectCar({ ...car, userYear: currentUserYear });
    }
  }

  const isSelected =
    car &&
    selectedCar &&
    selectedCar.brand === car.brand &&
    selectedCar.model === car.model;

  return (
    <section className={`specs ${isCollapsed ? "is-collapsed" : ""}`} id="specs">
      <div className="specs-collapse-toggle-wrap">
        <button
          type="button"
          className="btn-specs-toggle"
          onClick={onToggleCollapse}
          title={isCollapsed ? "Show Vehicle Specs" : "Hide Vehicle Specs"}
          aria-label={isCollapsed ? "Show Vehicle Specs" : "Hide Vehicle Specs"}
        >
          <span className="toggle-icon">{isCollapsed ? "▲" : "▼"}</span>
          <span>{isCollapsed ? "Show Vehicle Specs" : "Hide Vehicle Specs"}</span>
        </button>
      </div>

      <div className="specs-inner">
        <div className="specs-head">
          <div className="specs-title-group">
            <h2>Vehicle specs</h2>
          </div>
          <button type="button" className="btn-reset" onClick={resetAll}>
            Reset filters
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(filters);
          }}
        >
          <div className="filter-grid">
            <div className="field">
              <label htmlFor="brandInput">Brand</label>
              <div className="field-control">
                <input
                  id="brandInput"
                  list="brandOptions"
                  placeholder="BMW, Audi..."
                  value={filters.brand}
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => e.target.select()}
                  onChange={(e) => updateFilter("brand", e.target.value)}
                />
                <button
                  type="button"
                  className="clear-x"
                  aria-label="Clear brand"
                  onClick={() => clearField("brand")}
                >
                  ×
                </button>
              </div>
              <datalist id="brandOptions">
                {options.brands.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>

            <div className="field">
              <label htmlFor="modelInput">Model</label>
              <div className="field-control">
                <input
                  id="modelInput"
                  list="modelOptions"
                  placeholder="320d..."
                  value={filters.model}
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => e.target.select()}
                  onChange={(e) => updateFilter("model", e.target.value)}
                />
                <button
                  type="button"
                  className="clear-x"
                  aria-label="Clear model"
                  onClick={() => clearField("model")}
                >
                  ×
                </button>
              </div>
              <datalist id="modelOptions">
                {options.models.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>

            <div className="field">
              <label htmlFor="fuelInput">Fuel</label>
              <div className="field-control">
                <select
                  id="fuelInput"
                  value={filters.fuelType}
                  onChange={(e) => updateFilter("fuelType", e.target.value)}
                >
                  <option value="">Any Fuel</option>
                  {options.fuelTypes.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                {filters.fuelType && (
                  <button
                    type="button"
                    className="clear-x"
                    aria-label="Clear fuel"
                    onClick={() => clearField("fuelType")}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            <div className="field">
              <label htmlFor="customYearInput">Year</label>
              <div className="field-control">
                <input
                  id="customYearInput"
                  placeholder="2018"
                  value={filters.customYear}
                  onChange={(e) =>
                    updateFilter("customYear", e.target.value, {
                      clearYearMode: e.target.value.trim() !== "",
                    })
                  }
                />
                <select
                  id="yearModeSelect"
                  value={filters.yearMode}
                  onChange={(e) =>
                    updateFilter("yearMode", e.target.value, {
                      clearCustomYear: e.target.value !== "",
                    })
                  }
                  aria-label="Year mode"
                >
                  <option value="">Any</option>
                  <option value="after 2020">After 2020</option>
                  <option value="before 2020">Before 2020</option>
                </select>
              </div>
            </div>
          </div>
        </form>

        {car ? (
          <div
            className={`result-panel ${isSelected ? "is-selected" : ""}`}
            onClick={handleSelectTopCar}
            role="button"
            tabIndex={0}
            title="Click to select this vehicle for the right panel"
          >
            <div className="result-top">
              <div className="title-with-badge">
                <h3>
                  {car.brand} {car.model}{car.userYear ? ` ${car.userYear}` : ""}
                </h3>
                {isSelected ? (
                  <span className="selected-tag">Selected</span>
                ) : (
                  <span className="select-hint">Click to select</span>
                )}
              </div>
              <span className="year-tag">{car.year || "Year n/a"}</span>
            </div>

            <div className="spec-stats">
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
        ) : !isLoading && status ? (
          <div className="result-panel empty-match-panel">
            <div className="no-match-box">
              <span className="no-match-icon">⚠️</span>
              <div className="no-match-text">
                <strong>No matching vehicle found</strong>
                <p>Please check details (Brand, Model, Fuel, or Year) and try again.</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
