import { createRoot, hydrateRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
 import { registerServiceWorker } from "./utils/serviceWorker";
 import { vitrineApiService } from "./services/vitrineApiService";

 // Register service worker for image caching
 registerServiceWorker();
 
 // Setup diagnostic tools (Dev only)
 vitrineApiService._setupDiagnostic?.();
 
const container = document.getElementById("root")!;
const app = (
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

if (container.hasChildNodes()) {
  hydrateRoot(container, app);
} else {
  createRoot(container).render(app);
}
