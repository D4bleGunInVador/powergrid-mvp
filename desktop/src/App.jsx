import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import NodeDetailsPage from "./pages/NodeDetailsPage";
import EventsPage from "./pages/EventsPage";
import OperationsPage from "./pages/OperationsPage";
import IamAdminPage from "./pages/IamAdminPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import { api, clearToken, getToken } from "./api";
import "./styles/wireframe.css";

function RequireAuth({ isAuthed, children }) {
  if (!isAuthed) return <Navigate to="/login" replace />;
  return children;
}

function AppInner() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const nav = useNavigate();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    api.me()
      .then((u) => {
        setIsAuthed(true);
        setMe(u);
      })
      .catch(() => {
        clearToken();
        setIsAuthed(false);
        setMe(null);
      })
      .finally(() => setLoading(false));
  }, []);

  function onLoginSuccess() {
    api.me()
      .then((u) => {
        setIsAuthed(true);
        setMe(u);
        nav("/", { replace: true });
      })
      .catch(() => {
        clearToken();
        setIsAuthed(false);
        setMe(null);
      });
  }

  async function logout() {
    try {
      await api.logout();
    } catch {}
    clearToken();
    setIsAuthed(false);
    setMe(null);
    nav("/login", { replace: true });
  }

  if (loading) return <div style={{ padding: 16 }}>Loading...</div>;

  return (
    <Routes>
      <Route path="/login" element={<LoginPage onLoginSuccess={onLoginSuccess} />} />

      <Route
        path="/"
        element={
          <RequireAuth isAuthed={isAuthed}>
            <div>
              <div style={{ padding: 12, borderBottom: "1px solid #ddd" }}>
                <span style={{ marginRight: 12, fontWeight: 700 }}>
                  {me ? `${me.username} (${me.role})` : ""}
                </span>
                <button onClick={logout}>Вийти</button>
              </div>
              <DashboardPage me={me} />
            </div>
          </RequireAuth>
        }
      />

      <Route
        path="/nodes/:id"
        element={
          <RequireAuth isAuthed={isAuthed}>
            <NodeDetailsPage />
          </RequireAuth>
        }
      />

      <Route
        path="/events"
        element={
          <RequireAuth isAuthed={isAuthed}>
            <EventsPage />
          </RequireAuth>
        }
      />

      <Route
        path="/operations"
        element={
          <RequireAuth isAuthed={isAuthed}>
            <OperationsPage />
          </RequireAuth>
        }
      />

      <Route
        path="/iam"
        element={
          <RequireAuth isAuthed={isAuthed}>
            <IamAdminPage />
          </RequireAuth>
        }
      />

      <Route
        path="/analytics"
        element={
          <RequireAuth isAuthed={isAuthed}>
            <AnalyticsPage />
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}