import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { useNavigate, useParams } from "react-router-dom";
import ConfirmModal from "../components/ConfirmModal";
import Toast from "../components/Toast";

export default function NodeDetailsPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const didLoadOnceRef = useRef(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  // FR-07: керуюча команда
  const [cmdType, setCmdType] = useState("SwitchOff");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cmdResult, setCmdResult] = useState(null);

  const [toastOpen, setToastOpen] = useState(false);

  async function load() {
    setError("");
    try {
      const r = await api.getNode(id);
      setData(r);
      didLoadOnceRef.current = true;
    } catch {
      // якщо це вже не перше завантаження — показуємо toast, а не ламаємо сторінку
      if (didLoadOnceRef.current) {
        setToastOpen(true);
      } else {
        setError("Не вдалося завантажити дані вузла.");
      }
    }
  }

  async function sendCommand() {
    setError("");
    try {
      const r = await api.sendCommand(id, cmdType);
      setCmdResult(r);
    } catch {
      setError("Не вдалося відправити команду керування.");
    } finally {
      setConfirmOpen(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 10000); // автооновлення (FR-04)
    return () => clearInterval(t);
  }, [id]);

  return (
    <div style={{ padding: 16, fontFamily: "Arial, sans-serif" }}>
      <button onClick={() => nav("/")} style={{ marginBottom: 12 }}>← Назад</button>

      <h2>Деталі вузла: {id}</h2>

      {error ? <div style={{ color: "#b00020", marginBottom: 10 }}>{error}</div> : null}

      {!data ? (
        <div>Loading...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 900 }}>
          {/* Info */}
          <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
            <div style={{ fontWeight: 700 }}>{data.name}</div>
            <div>Region: {data.region}</div>
            <div>Status: {data.status}</div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>updated: {data.updated_at}</div>
          </div>

          {/* Telemetry */}
          <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
            <div style={{ fontWeight: 700 }}>Telemetry</div>
            <div>Voltage: {data.telemetry.voltage}</div>
            <div>Current: {data.telemetry.current}</div>
            <div>Power: {data.telemetry.power}</div>
            <div>Temperature: {data.telemetry.temperature}</div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>ts: {data.telemetry.timestamp}</div>
          </div>

          {/* Control (FR-07) */}
          <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, gridColumn: "1 / -1" }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Керування</div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <select value={cmdType} onChange={(e) => setCmdType(e.target.value)} style={{ height: 36 }}>
                <option value="SwitchOn">SwitchOn</option>
                <option value="SwitchOff">SwitchOff</option>
              </select>

              <button onClick={() => setConfirmOpen(true)} style={{ height: 36, fontWeight: 800 }}>
                Відправити
              </button>

              <button onClick={() => nav("/operations")} style={{ height: 36 }}>
                Історія операцій
              </button>
            </div>

            {cmdResult ? (
              <div style={{ marginTop: 10, fontSize: 13 }}>
                Result: <b>{cmdResult.result_status}</b> — {cmdResult.result_message}
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  {cmdResult.id} • {cmdResult.node_id} • {cmdResult.created_at}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmOpen}
        title="Підтвердження критичної дії"
        message={`Відправити команду "${cmdType}" для вузла ${id}?`}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={sendCommand}
      />
      <Toast
        open={toastOpen}
        text="Втрачено зв’язок з телеметрією. Спроба повторного підключення…"
        onClose={() => setToastOpen(false)}
      />
    </div>
  );
}