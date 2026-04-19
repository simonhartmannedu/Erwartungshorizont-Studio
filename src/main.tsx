import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const query = new URLSearchParams(window.location.search);
if (query.get("desktop-shell") === "flatpak") {
  document.documentElement.dataset.desktopShell = "flatpak";
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
