import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { RelayDemo } from "./relay-demo";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RelayDemo />
  </StrictMode>
);
