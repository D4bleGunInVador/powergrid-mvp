import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { useNavigate } from "react-router-dom";

export default function AnalyticsPage() {
  const nav = useNavigate();
  const [nodes, setNodes] = useState([]);
  const [events, setEvents] = useState([]);
  const [commands, setCommands] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setError("");
      try {
        const [n, e, c] = await Promise.all([api.getNodes(), api.getEvents(), api.getCommands()]);
        setNodes(n);
        setEvents(e);
        setCommands(c);
      } catch {
        setError("Не вдалося завантажити дані для аналітики.");
      }
    })();
  }, []);

  const kpi = useMemo(() => {
    const totalNodes = nodes.length;
    const offline = nodes.filter(n => n.status === "Offline").length;
    const warn = nodes.filter(n => n.status === "Warning").length;
    const criticalNew = events.filter(e => e.type === "Critical" && e.status === "New").length;
    const cmds = commands.length;
    return { totalNodes, offline, warn, criticalNew, cmds };
  }, [nodes, events, commands]);

  return (
    <div style={{ height: "100vh", background: "#eef2f5", fontFamily: "Arial, sans-serif" }}>
      <div style={{
        height: 60, background: "#fff", borderBottom: "1px solid #ddd",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 14px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => nav("/")}>← Dashboard</button>
          <b>Аналітичний дашборд</b>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => nav("/events")}>Events</button>
          <button onClick={() => nav("/iam")}>IAM</button>
        </div>
      </div>

      <div style={{ padding: 14 }}>
        {error ? <div style={{ color: "#b00020", marginBottom: 10 }}>{error}</div> : null}

        {/* KPI row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 10 }}>
          {[
            ["Вузлів", kpi.totalNodes],
            ["Offline", kpi.offline],
            ["Warning", kpi.warn],
            ["Critical(New)", kpi.criticalNew],
            ["Команд", kpi.cmds],
          ].map(([label, val]) => (
            <div key={label} style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 12, opacity: 0.75 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Charts placeholders (як макет) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 10, padding: 12, minHeight: 260 }}>
            <b>Графік: Навантаження по регіонах</b>
            <div style={{ marginTop: 10, opacity: 0.75 }}>Заглушка під макет (можна замінити на chart пізніше)</div>
          </div>
          <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 10, padding: 12, minHeight: 260 }}>
            <b>Графік: Динаміка інцидентів</b>
            <div style={{ marginTop: 10, opacity: 0.75 }}>Заглушка під макет</div>
          </div>
        </div>
      </div>
    </div>
  );
}