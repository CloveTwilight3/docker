import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./eggs.ts";

createRoot(document.getElementById("root")!).render(<App />);
