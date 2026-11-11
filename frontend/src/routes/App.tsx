import { lazy, Suspense } from "react";
import {
  Navigate,
  Route,
  Routes,
  useParams,
  useLocation,
} from "react-router-dom";
import { useSession } from "../contexts/SessionContext";
import LoadingTruckAnimation from "../components/animations/LoadingTruckAnimation";
import AppLayout from "../layouts/AppLayout";
import AuthReturn from "../pages/AuthReturn";
import Login from "../pages/Login";
import Onboarding from "../pages/Onboarding";
const Dashboard = lazy(() => import("../pages/Dashboard"));
const Records = lazy(() => import("../pages/ResourcePage"));
const Settings = lazy(() => import("../pages/Settings"));
const Notifications = lazy(() => import("../pages/Notifications"));
function ResourceRoute() {
  const { resource } = useParams();
  return <Records key={resource} resource={resource} />;
}
export default function App() {
  const { session, loading } = useSession();
  const { pathname } = useLocation();
  if (pathname === "/auth/callback")
    return <AuthReturn key="google" recovery={false} />;
  if (pathname === "/auth/reset-password")
    return <AuthReturn key="recovery" recovery />;
  if (loading) return <LoadingTruckAnimation />;
  if (!session) return <Login />;
  if (!session.company || !session.role) return <Onboarding />;
  const finances = ["admin", "manager"].includes(session.role);
  return (
    <Suspense key={session.user.id} fallback={<LoadingTruckAnimation />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route
            path="/"
            element={
              finances ? (
                <Dashboard />
              ) : (
                <Navigate to="/records/trips" replace />
              )
            }
          />
          <Route path="/records/:resource" element={<ResourceRoute />} />
          <Route
            path="/reports"
            element={
              finances ? (
                <Dashboard reportMode />
              ) : (
                <Navigate to="/records/trips" replace />
              )
            }
          />
          <Route
            path="/shifts"
            element={
              finances ? (
                <Dashboard shiftsMode />
              ) : (
                <Navigate to="/records/trips" replace />
              )
            }
          />
          <Route path="/settings" element={<Settings />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route
            path="/audit"
            element={
              finances ? <Notifications audit /> : <Navigate to="/" replace />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
