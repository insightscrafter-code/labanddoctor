import { useEffect, useState } from "react";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Treatment from "./pages/Treatment.jsx";
import LabLogin from "./pages/LabLogin.jsx";
import LabDashboard from "./pages/LabDashboard.jsx";
import { clearSession, getSession } from "./session.js";

function navigate(path, replace = false) {
  if (replace) window.history.replaceState({}, "", path);
  else window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [session, setSession] = useState(getSession());

  useEffect(() => {
    const onRoute = () => {
      setPath(window.location.pathname);
      setSession(getSession());
    };
    const onExpired = () => {
      clearSession();
      setSession(null);
      document.body.dataset.role = "";
      navigate(window.location.pathname.startsWith("/lab") ? "/lab/login" : "/", true);
    };
    window.addEventListener("popstate", onRoute);
    window.addEventListener("session:expired", onExpired);
    return () => {
      window.removeEventListener("popstate", onRoute);
      window.removeEventListener("session:expired", onExpired);
    };
  }, []);

  useEffect(() => {
    if (path.startsWith("/doctor/") && session?.role !== "DOCTOR") navigate("/", true);
    if (path.startsWith("/lab/") && path !== "/lab/login" && session?.role !== "LAB") navigate("/lab/login", true);
  }, [path, session]);

  if (path === "/lab/login") {
    if (session?.role === "LAB") return <LabDashboard session={session} onLogout={() => { clearSession(); setSession(null); document.body.dataset.role = ""; navigate("/lab/login", true); }} />;
    return <LabLogin onLogin={(nextSession) => { setSession(nextSession); navigate("/lab/dashboard", true); }} />;
  }
  if (path.startsWith("/lab/") && session?.role === "LAB") {
    return <LabDashboard session={session} onLogout={() => { clearSession(); setSession(null); document.body.dataset.role = ""; navigate("/lab/login", true); }} />;
  }

  const treatmentRoute = path.match(/^\/doctor\/treatment\/([^/]+)$/);
  if (treatmentRoute && session?.role === "DOCTOR") {
    const params = new URLSearchParams(window.location.search);
    return <Treatment nationalId={decodeURIComponent(treatmentRoute[1])} initialName={params.get("name") || ""} initialComplaint={params.get("complaint") || ""} onBack={() => navigate("/doctor/dashboard")} />;
  }
  if (path.startsWith("/doctor/") && session?.role === "DOCTOR") {
    return <Dashboard session={session} onLogout={() => { clearSession(); setSession(null); navigate("/", true); }} />;
  }
  return <Login onLogin={(nextSession) => { setSession(nextSession); navigate("/doctor/dashboard", true); }} />;
}
