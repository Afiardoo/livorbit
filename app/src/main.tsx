import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { AppProvider, useApp } from "./state";
import { Shell } from "./components/Shell";
import { CrewView } from "./views/CrewView";
import { AstronautView } from "./views/AstronautView";
import { CheckInView } from "./views/CheckInView";
import { TwinView } from "./views/TwinView";
import { EmergencyView } from "./views/EmergencyView";
import { DataLabView } from "./views/DataLabView";
import { AboutView } from "./views/AboutView";

function Router() {
  const { view } = useApp();
  switch (view) {
    case "astronaut": return <AstronautView />;
    case "checkin": return <CheckInView />;
    case "twin": return <TwinView />;
    case "emergency": return <EmergencyView />;
    case "data": return <DataLabView />;
    case "about": return <AboutView />;
    default: return <CrewView />;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProvider>
      <Shell><Router /></Shell>
    </AppProvider>
  </StrictMode>,
);
