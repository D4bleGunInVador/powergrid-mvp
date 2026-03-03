import { useEffect, useState } from "react";
import { api } from "../api";
import { useNavigate } from "react-router-dom";

export default function OperationsPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const nav = useNavigate();

  async function load() {
    setError("");
    try {
      const r = await api.getCommands();
      setItems(r);
    } catch {
      setError("Не вдалося завантажити історію команд.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: 16, fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => nav("/")}>← На Dashboard</button>
        <h2 style={{ margin: 0 }}>Історія операцій</h2>
        <button onClick={load} style={{ marginLeft: "auto" }}>Оновити</button>
      </div>

      {error ? <div style={{ color: "#b00020", marginTop: 12 }}>{error}</div> : null}

      <div style={{ marginTop: 12, border: "1px solid #ddd", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f6f6f6" }}>
              <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Час</th>
              <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Користувач</th>
              <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Вузол</th>
              <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Команда</th>
              <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Результат</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td style={{ padding: 10, borderBottom: "1px solid #eee", fontSize: 12 }}>
                  {c.created_at}
                </td>
                <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                  {c.created_by}
                </td>
                <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                  {c.node_id}
                </td>
                <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                  {c.command_type}
                </td>
                <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                  <b>{c.result_status}</b> — {c.result_message}
                </td>
              </tr>
            ))}

            {items.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 14, textAlign: "center", opacity: 0.75 }}>
                  Команд немає
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}