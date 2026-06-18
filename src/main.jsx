import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// Persistence shim: the component uses window.storage (from its original
// environment). Back it with localStorage so data survives reloads.
if (!window.storage) {
  window.storage = {
    get: async (key) => ({ value: localStorage.getItem(key) }),
    set: async (key, value) => { localStorage.setItem(key, value); },
  };
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
