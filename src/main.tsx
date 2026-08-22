import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import React, { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";

// Lazy load route components for better code splitting
const Landing = lazy(() => import("./pages/Landing.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const Overview = lazy(() => import("./pages/Overview.tsx"));
const Workflows = lazy(() => import("./pages/Workflows.tsx"));
const Scenarios = lazy(() => import("./pages/Scenarios.tsx"));
const Policies = lazy(() => import("./pages/Policies.tsx"));
const Catalog = lazy(() => import("./pages/Catalog.tsx"));
const Releases = lazy(() => import("./pages/Releases.tsx"));
const ReleaseDetail = lazy(() => import("./pages/ReleaseDetail.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

/** Silent error boundary — if VlyToolbar crashes it renders nothing instead of
 *  crashing the whole app (e.g. hook errors in WebContainer environment). */
class ToolbarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: Error) {
    console.warn("[VlyToolbar] Caught error, toolbar disabled:", err.message);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

// Auto-recover from chunk hash mismatches caused by fresh deployments
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const msg = event.reason?.message || String(event.reason || "");
    if (
      msg.includes("Failed to fetch dynamically imported module") ||
      msg.includes("Importing a module script failed") ||
      msg.includes("error loading dynamically imported module")
    ) {
      const lastReload = sessionStorage.getItem("chunk_reload_ts");
      const now = Date.now();
      if (!lastReload || now - Number(lastReload) > 8_000) {
        sessionStorage.setItem("chunk_reload_ts", String(now));
        window.location.reload();
      }
    }
  });
}

/** Hard guard so runtime errors never leave the preview as a blank page. */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string; stack: string }
> {
  state = { hasError: false, message: "", stack: "" };
  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message || "Unknown runtime error",
      stack: error.stack || "",
    };
  }
  componentDidCatch(err: Error) {
    console.error("[WebContainer preview] Root crash:", err);
    const isChunkError =
      err.message?.includes("Failed to fetch dynamically imported module") ||
      err.message?.includes("Importing a module script failed") ||
      err.message?.includes("error loading dynamically imported module");

    if (isChunkError) {
      const lastReload = sessionStorage.getItem("chunk_reload_ts");
      const now = Date.now();
      if (!lastReload || now - Number(lastReload) > 8_000) {
        sessionStorage.setItem("chunk_reload_ts", String(now));
        window.location.reload();
      }
    }
  }
  render() {
    if (this.state.hasError) {
      const isChunkError =
        this.state.message?.includes("Failed to fetch dynamically imported module") ||
        this.state.message?.includes("Importing a module script failed");

      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-lg text-center space-y-3">
            <p className="text-sm font-semibold">
              {isChunkError ? "App updated" : "Preview runtime error"}
            </p>
            <p className="text-xs text-muted-foreground break-words">
              {isChunkError
                ? "A new version of Proofrail has been deployed. Refreshing to load the latest code..."
                : this.state.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 transition-colors"
            >
              Refresh application
            </button>
            {import.meta.env.DEV && this.state.stack && (
              <pre className="mt-3 text-left text-[10px] leading-4 text-muted-foreground/80 max-h-40 overflow-auto rounded border border-border/60 p-2">
                {this.state.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const convexUrl = (import.meta.env.VITE_CONVEX_URL as string) || "https://placeholder.convex.cloud";
const convex = new ConvexReactClient(convexUrl);

/** Origins allowed to drive this app's navigation / receive route sync. */
function isTrustedFreebuffOrigin(origin: string): boolean {
  return (
    origin === "https://freebuff.com" ||
    origin.endsWith(".freebuff.com") ||
    origin.endsWith(".vly.sh")
  );
}

function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    // SECURITY: only honor navigation commands from Freebuff's own hosts.
    // Any other window could otherwise drive this app's history API.
    function handleMessage(event: MessageEvent) {
      if (!isTrustedFreebuffOrigin(event.origin ?? "")) return;
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <ToolbarErrorBoundary>
        <VlyToolbar />
      </ToolbarErrorBoundary>
      <ConvexAuthProvider client={convex}>
        <BrowserRouter>
          <RouteSyncer />
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route
                path="/auth"
                element={<AuthPage redirectAfterAuth="/dashboard" />}
              />
              <Route
                path="/dashboard"
                element={
                  <RequireAuth
                    title="Sign in to view your release workspace"
                    description="Your workflows, scenarios, policies, and release gates live here."
                  >
                    <Dashboard />
                  </RequireAuth>
                }
              >
                <Route index element={<Overview />} />
                <Route path="workflows" element={<Workflows />} />
                <Route path="scenarios" element={<Scenarios />} />
                <Route path="policies" element={<Policies />} />
                <Route path="catalog" element={<Catalog />} />
                <Route path="releases" element={<Releases />} />
                <Route path="releases/:releaseId" element={<ReleaseDetail />} />
                <Route path="admin" element={<Admin />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster />
      </ConvexAuthProvider>
    </RootErrorBoundary>
  </StrictMode>,
);
