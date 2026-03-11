import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { useNavigate } from "react-router-dom";
import NetworkMap from "../components/NetworkMap";

function statusColor(status) {
  if (status === "Online") return "#2e7d32";
  if (status === "Warning") return "#cc8800";
  return "#b00020";
}

export default function DashboardPage({ me }) {
  const [nodes, setNodes] = useState([]);
  const [events, setEvents] = useState([]);
  const [flows, setFlows] = useState([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [selectedRegions, setSelectedRegions] = useState([]);
  
  const [error, setError] = useState("");
  const nav = useNavigate();

  async function loadAll() {
    setError("");
    setMapLoading(true);
    try {
      const [n, e, f] = await Promise.all([
        api.getNodes(), 
        api.getEvents(), 
        api.getFlows()
      ]);
      setNodes(n);
      setEvents(e);
      setFlows(f);
    } catch {
      setError("Не вдалося завантажити дані Dashboard.");
    } finally {
      setMapLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function toggleRegion(name) {
    setSelectedRegions(prev =>
      prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]
    );
  }

  // “Активні інциденти” з точки зору подій (Warning/Critical зі статусом New)
  const activeIncidents = useMemo(() => {
    return events.filter(ev => ev.status === "New" && (ev.type === "Warning" || ev.type === "Critical")).length;
  }, [events]);

  const topAlerts = useMemo(() => {
    // показуємо перші 3 події
    return events.slice(0, 3);
  }, [events]);

  return (
    <div className="pg-grid-3">
      {/* Header */}
      <div className="wf-zone" style={{ gridColumn: "1 / -1" }}>
        <div className="wf-content" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <img
                src="/logo.png"
                alt="PowerGrid"
                style={{
                  height: 55,
                  width: "auto",
                  objectFit: "contain",
                  display: "block"
                }}
              />
              <span style={{ fontWeight: 700 }}>PowerGrid</span> 
            </div>
            <button onClick={() => nav("/events")}>Події</button>
            <button onClick={() => nav("/operations")}>Операції</button>
            <button onClick={() => nav("/analytics")}>Аналітика</button>
            <button onClick={() => nav("/iam")}>IAM</button>
          </div>

          <div className="wf-label" style={{ fontWeight: 700 }}>
            Наскрізний статус-бар: Активних інцидентів - [ {activeIncidents} ]
          </div>

          <div className="wf-label">
            Профіль: {me?.role || "—"}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="wf-zone">
        <div className="wf-content" style={{ overflow: "auto" }}>
          <div className="wf-label" style={{ fontWeight: 700, textAlign: "left" }}>
            Управління шарами карти
          </div>

          <div className="inner-zone">Фільтр: Регіон (Збережено)</div>
          <div className="inner-zone">Перемикач: Підстанції</div>
          <div className="inner-zone">Перемикач: Лінії електропередач</div>
          <div className="inner-zone">Легенда станів мережі</div>

          <div className="wf-label" style={{ fontWeight: 700, textAlign: "left", marginTop: 6 }}>
            Вузли мережі
          </div>

          {error ? <div style={{ color: "#b00020", fontSize: 13, marginBottom: 10 }}>{error}</div> : null}

          {nodes.map(n => (
            <button
              key={n.id}
              onClick={() => nav(`/nodes/${n.id}`)}
              style={{
                width: "100%",
                textAlign: "left",
                marginBottom: 8,
                padding: 10,
                borderRadius: 6,
                border: "1px solid #ddd",
                background: "#fff",
                cursor: "pointer"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{n.name}</div>
                  <div className="small">{n.id} • {n.region}</div>
                </div>
                <div style={{ color: statusColor(n.status), fontWeight: 700 }}>
                  {n.status}
                </div>
              </div>
              <div className="small" style={{ marginTop: 6 }}>
                updated: {n.updated_at}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Map zone */}
      <div className="wf-zone" style={{ padding: 0 }}>
        <NetworkMap
          nodes={nodes}
          flows={flows}
          selectedRegions={selectedRegions}
          onToggleRegion={toggleRegion}
          loading={mapLoading}
        />
      </div>

      {/* Alerts */}
      <div className="wf-zone">
        <div className="wf-content">
          <div className="wf-label" style={{ fontWeight: 700, textAlign: "left" }}>
            Стрічка сповіщень та інцидентів
          </div>

          {topAlerts.length === 0 ? (
            <>
              <div className="inner-zone alert-critical">КРИТИЧНА АВАРІЯ (Потребує підтвердження)</div>
              <div className="inner-zone alert-warning">Попередження: Перевантаження вузла</div>
              <div className="inner-zone">Інформація: Планові роботи</div>
            </>
          ) : (
            topAlerts.map(ev => {
              const cls =
                ev.type === "Critical" ? "inner-zone alert-critical" :
                ev.type === "Warning" ? "inner-zone alert-warning" :
                "inner-zone";

              return (
                <div key={ev.id} className={cls} style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 700 }}>{ev.type} • {ev.status}</div>
                  <div style={{ marginTop: 4 }}>{ev.description}</div>
                  <div className="small" style={{ marginTop: 6 }}>{ev.id} • {ev.node_id} • {ev.created_at}</div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="wf-zone" style={{ gridColumn: "1 / -1" }}>
        <div className="wf-label">
          Зв&apos;язок зі SCADA: Активний | Затримка: 2мс | Відповідність ISO 27001
        </div>
      </div>
    </div>
  );
}