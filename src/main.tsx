import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
 import { registerServiceWorker } from "./utils/serviceWorker";
 import { vitrineApiService } from "./services/vitrineApiService";

 // Register service worker for image caching
 registerServiceWorker();
 
 // Setup diagnostic tools (Dev only)
 vitrineApiService._setupDiagnostic?.();
 
 createRoot(document.getElementById("root")!).render(<App />);
