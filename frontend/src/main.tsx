import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { Toaster } from "sonner";
import App from "./routes/App";
import { SessionProvider } from "./contexts/SessionContext";
import { PreferencesProvider } from "./contexts/PreferencesContext";
import "./assets/styles.css";
// Un seul cache React Query pour toute l’application ; les données privées sont
// explicitement purgées lorsque l’identité change dans SessionProvider.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: true, staleTime: 15000 },
  },
});
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider>
        <MotionConfig reducedMotion="user">
          <BrowserRouter>
            <SessionProvider>
              <App />
            </SessionProvider>
          </BrowserRouter>
          <Toaster richColors closeButton position="bottom-right" />
        </MotionConfig>
      </PreferencesProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
