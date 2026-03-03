import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import ConfirmModal from "../components/ConfirmModal";
import { useNavigate } from "react-router-dom";

function badgeStyle(type) {
  if (type === "Critical") return { border: "1px solid #ff4444", color: "#ff0000", fontWeight: "bold" };
  if (type === "Warning") return { border: "1px solid #ffbb33", color: "#cc8800", fontWeight: "bold" };
  return { border: "1px solid #555", color: "#555" };
}

export default function EventsPage() {
  const nav = useNavigate();

  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");

  // “Persistent Filters” (залишаємо мінімально функціонально)
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  // Selected event (праворуч “квиток інциденту”)
  const [selected, setSelected] = useState(null);

  // Modal
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function load() {
    setError("");
    try {
      const params = {};
      if (filterType !== "All") params.type = filterType;
      if (filterStatus !== "All") params.status = filterStatus;

      const r = await api.getEvents(params);
      setEvents(r);

      // якщо selected зник через фільтр — скидаємо
      if (selected) {
        const still = r.find(x => x.id === selected.id);
        setSelected(still || null);
      }
    } catch {
      setError("Не вдалося завантажити журнал подій.");
    }
  }

  useEffect(() => {
    load();
  }, [filterType, filterStatus]);

  const selectedCanAck = useMemo(() => {
    return selected && selected.type === "Critical" && selected.status === "New";
  }, [selected]);

  async function confirmAck() {
    try {
      await api.ackEvent(selected.id);
      setConfirmOpen(false);
      await load();
    } catch {
      setError("Не вдалося підтвердити подію.");
      setConfirmOpen(false);
    }
  }

  return (
    <div className="pg-grid-3">
      {/* Header */}
      <div className="wf-zone" style={{ gridColumn: "1 / -1" }}>
        <div className="wf-content" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => nav("/")}>← Dashboard</button>
            <span className="wf-label">Журнал подій та інцидентів</span>
          </div>
          <span className="wf-label">Real-time / Audit-ready</span>
        </div>
      </div>

      {/* Left: Persistent Filters */}
      <div className="wf-zone">
        <div className="wf-content">
          <div className="wf-label" style={{ fontWeight: 700, textAlign: "left" }}>Persistent Filters</div>

          <div className="inner-zone" style={{ textAlign: "left" }}>
            <div className="small">Тип</div>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ width: "100%", height: 36 }}>
              <option value="All">All</option>
              <option value="Info">Info</option>
              <option value="Warning">Warning</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div className="inner-zone" style={{ textAlign: "left" }}>
            <div className="small">Статус</div>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ width: "100%", height: 36 }}>
              <option value="All">All</option>
              <option value="New">New</option>
              <option value="Acknowledged">Acknowledged</option>
            </select>
          </div>

          <div className="inner-zone">Таймфрейм (заглушка)</div>
          <div className="inner-zone">Регіон/Тип вузла (заглушка)</div>

          <button onClick={load} style={{ height: 40, marginTop: 6 }}>Оновити</button>

          {error ? <div style={{ color: "#b00020", marginTop: 10, fontSize: 13 }}>{error}</div> : null}
        </div>
      </div>

      {/* Center: Event list */}
      <div className="wf-zone">
        <div className="wf-content" style={{ padding: 0 }}>
          <div className="wf-label" style={{ fontWeight: 700, textAlign: "left", padding: 10 }}>
            Журнал подій
          </div>

          <div style={{ overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f6f6f6" }}>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>ID</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Час</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Тип</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Вузол</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Статус</th>
                </tr>
              </thead>
              <tbody>
                {events.map(ev => {
                  const isSel = selected?.id === ev.id;
                  return (
                    <tr
                      key={ev.id}
                      onClick={() => setSelected(ev)}
                      style={{ cursor: "pointer", background: isSel ? "#eef7ff" : "transparent" }}
                    >
                      <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{ev.id}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #eee", fontSize: 12, opacity: 0.85 }}>{ev.created_at}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                        <span style={{ ...badgeStyle(ev.type), padding: "2px 8px", borderRadius: 999, fontSize: 12 }}>
                          {ev.type}
                        </span>
                      </td>
                      <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{ev.node_id}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{ev.status}</td>
                    </tr>
                  );
                })}
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 14, textAlign: "center", opacity: 0.75 }}>
                      Подій не знайдено
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right: Incident management */}
      <div className="wf-zone">
        <div className="wf-content">
          <div className="wf-label" style={{ fontWeight: 700, textAlign: "left" }}>Управління інцидентом</div>

          {!selected ? (
            <div className="inner-zone">Оберіть подію у таблиці</div>
          ) : (
            <>
              <div className="inner-zone" style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 700 }}>{selected.id}</div>
                <div className="small">{selected.node_id} • {selected.type} • {selected.status}</div>
                <div style={{ marginTop: 6 }}>{selected.description}</div>
                <div className="small" style={{ marginTop: 8 }}>{selected.created_at}</div>
              </div>

              <button
                className="btn-action"
                disabled={!selectedCanAck}
                style={{ opacity: selectedCanAck ? 1 : 0.5 }}
                onClick={() => setConfirmOpen(true)}
              >
                Підтвердити інцидент
              </button>

              <button className="btn-action" disabled style={{ opacity: 0.5 }}>
                Призначити команду реагування
              </button>

              <button className="btn-action" disabled style={{ opacity: 0.5 }}>
                Закрити інцидент
              </button>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="wf-zone" style={{ gridColumn: "1 / -1" }}>
        <div className="wf-label">
          Пагінація / експорт (PDF/CSV) — заглушка для MVP
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Підтвердження критичної дії"
        message={`Підтвердити інцидент "${selected?.id}"?`}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmAck}
      />
    </div>
  );
}