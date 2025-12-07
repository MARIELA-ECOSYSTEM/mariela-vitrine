import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./utils/serviceWorker";

// Register service worker for image caching
registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
