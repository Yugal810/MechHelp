import { useState } from "react";
import MapView from "./components/MapView.jsx";
import GarageSheet from "./components/GarageSheet.jsx";
import CarFilter from "./components/CarFilter.jsx";
import SelectedCarCard from "./components/SelectedCarCard.jsx";
import SettingsPage from "./components/SettingsPage.jsx";

export default function App() {
  const [page, setPage] = useState("dashboard"); // "dashboard" or "settings"
  const [address, setAddress] = useState("");
  const [garages, setGarages] = useState(null);
  const [selected, setSelected] = useState(null);
  const [origin, setOrigin] = useState(null);
  const [selectedCar, setSelectedCar] = useState(null);
  const [userNote, setUserNote] = useState("");

  const selectedGarageObject =
    garages?.find((g) => `${g.garage_name}-${g.lat}` === selected) || null;

  if (page === "settings") {
    return (
      <div className="app app-settings-view">
        <SettingsPage onBack={() => setPage("dashboard")} />
      </div>
    );
  }

  return (
    <div className="app">
      <section className="hero">
        <MapView
          origin={origin}
          garages={garages || []}
          activeId={selected}
        />
        <div className="map-veil" />

        <div className="hero-ui">
          <header className="brand-bar">
            <h1 className="brand">
              Mech<span>Help</span>
            </h1>
            <button
              type="button"
              className="btn-settings-header"
              onClick={() => setPage("settings")}
              title="Open Garage Management Settings"
            >
              Settings
            </button>
          </header>

          <div className="hero-columns">
            <div className="sheet-wrap">
              <GarageSheet
                address={address}
                setAddress={setAddress}
                garages={garages}
                setGarages={setGarages}
                selected={selected}
                setSelected={setSelected}
                onResults={(nextOrigin, nextGarages) => {
                  setOrigin(nextOrigin);
                  if (nextGarages?.length) setGarages(nextGarages);
                }}
              />
            </div>

            <div className="selected-car-wrap">
              <SelectedCarCard
                car={selectedCar}
                selectedGarage={selectedGarageObject}
                note={userNote}
                setNote={setUserNote}
              />
            </div>
          </div>
        </div>
      </section>

      <CarFilter
        selectedCar={selectedCar}
        onSelectCar={(car) => setSelectedCar(car)}
      />
    </div>
  );
}
