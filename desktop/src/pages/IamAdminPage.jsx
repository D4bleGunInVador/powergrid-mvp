import { useEffect, useState } from "react";
import { api } from "../api";
import { useNavigate } from "react-router-dom";

const MENU = [
  { key: "users", label: "Users / Roles" },
  { key: "nodes", label: "Objects / Nodes" },  
  { key: "triggers", label: "Triggers" },
  { key: "integrations", label: "Integrations" },
  { key: "audit", label: "Audit Log" },
];

export default function IamAdminPage() {
  const nav = useNavigate();
  const [active, setActive] = useState("users");

  // ----- Audit -----
  const [audit, setAudit] = useState([]);
  const [auditErr, setAuditErr] = useState("");

  async function loadAudit() {
    setAuditErr("");
    try {
      const r = await api.getAudit({ limit: 200 });
      setAudit(r);
    } catch {
      setAuditErr("Не вдалося завантажити Audit Log (потрібна роль ADMIN).");
    }
  }

  // ----- Nodes (FR-09) -----
  const [nodes, setNodes] = useState([]);
  const [nodesErr, setNodesErr] = useState("");
  const [nodesMsg, setNodesMsg] = useState("");

  const [newNode, setNewNode] = useState({ id: "", name: "", region: "", status: "Online" });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", region: "", status: "Online" });

  async function loadNodes() {
    setNodesErr("");
    setNodesMsg("");
    try {
      const r = await api.getNodes();
      setNodes(r);
    } catch {
      setNodesErr("Не вдалося завантажити вузли.");
    }
  }

  async function createNode() {
    setNodesErr("");
    setNodesMsg("");
    try {
      if (!newNode.id.trim() || !newNode.name.trim() || !newNode.region.trim()) {
        setNodesErr("Заповни ID, Name та Region.");
        return;
      }
      await api.createNode({
        id: newNode.id.trim(),
        name: newNode.name.trim(),
        region: newNode.region.trim(),
        status: newNode.status,
      });
      setNewNode({ id: "", name: "", region: "", status: "Online" });
      setNodesMsg("Вузол створено.");
      await loadNodes();
    } catch (e) {
      setNodesErr(`Не вдалося створити вузол. ${e?.message || ""}`);
    }
  }

  function startEdit(n) {
    setEditingId(n.id);
    setEditForm({ name: n.name, region: n.region, status: n.status });
    setNodesMsg("");
    setNodesErr("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({ name: "", region: "", status: "Online" });
  }

  async function saveEdit(id) {
    setNodesErr("");
    setNodesMsg("");
    try {
      await api.updateNode(id, {
        name: editForm.name,
        region: editForm.region,
        status: editForm.status,
      });
      setNodesMsg("Зміни збережено.");
      cancelEdit();
      await loadNodes();
    } catch (e) {
      setNodesErr(`Не вдалося оновити вузол. ${e?.message || ""}`);
    }
  }

  async function removeNode(id) {
    setNodesErr("");
    setNodesMsg("");
    if (!confirm(`Видалити вузол ${id}?`)) return;

    try {
      await api.deleteNode(id);
      setNodesMsg("Вузол видалено.");
      await loadNodes();
    } catch (e) {
      setNodesErr(`Не вдалося видалити вузол. ${e?.message || ""}`);
    }
  }

  // ----- MVP-заглушка Users -----
  const users = [
    { id: "U-001", username: "admin@powergrid.local", role: "ADMIN", status: "Active" },
    { id: "U-002", username: "dispatcher@powergrid.local", role: "DISPATCHER", status: "Active" },
  ];

  // ----- автозавантаження вкладок -----
  useEffect(() => {
    if (active === "audit") loadAudit();
    if (active === "nodes") loadNodes();
  }, [active]);

  return (
    <div style={{ height: "100vh", background: "#eef2f5", fontFamily: "Arial, sans-serif" }}>
      {/* Header */}
      <div style={{
        height: 60, background: "#fff", borderBottom: "1px solid #ddd",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 14px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => nav("/")}>← Dashboard</button>
          <b>IAM / Admin Settings</b>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => nav("/events")}>Events</button>
          <button onClick={() => nav("/analytics")}>Analytics</button>
        </div>
      </div>

      {/* Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", height: "calc(100vh - 60px)" }}>
        {/* Sidebar */}
        <div style={{ background: "#fff", borderRight: "1px solid #ddd", padding: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Меню</div>
          {MENU.map(m => (
            <button
              key={m.key}
              onClick={() => setActive(m.key)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "10px 12px",
                marginBottom: 8,
                borderRadius: 8,
                border: "1px solid #ddd",
                background: active === m.key ? "#eef7ff" : "#fff",
                cursor: "pointer",
                fontWeight: active === m.key ? 800 : 400
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: 14, overflow: "auto" }}>
          {/* USERS */}
          {active === "users" && (
            <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ margin: 0 }}>Users & Roles</h2>
                <button style={{ fontWeight: 800 }}>+ Додати користувача</button>
              </div>

              <div style={{ marginTop: 12, border: "1px solid #ddd", borderRadius: 10, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f6f6f6" }}>
                      <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>ID</th>
                      <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>User</th>
                      <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Role</th>
                      <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{u.id}</td>
                        <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{u.username}</td>
                        <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{u.role}</td>
                        <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{u.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
                Примітка: CRUD користувачів/ролей — заглушка для MVP.
              </div>
            </div>
          )}

          {/* NODES (FR-09) */}
          {active === "nodes" && (
            <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ margin: 0 }}>Objects / Nodes</h2>
                <button onClick={loadNodes}>Оновити</button>
              </div>

              {nodesErr ? <div style={{ color: "#b00020", marginTop: 10 }}>{nodesErr}</div> : null}
              {nodesMsg ? <div style={{ color: "#2e7d32", marginTop: 10 }}>{nodesMsg}</div> : null}

              {/* Create form */}
              <div style={{ marginTop: 12, border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
                <div style={{ fontWeight: 800, marginBottom: 10 }}>Додати вузол</div>
                <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr 140px 120px", gap: 10 }}>
                  <input
                    placeholder="ID (N-04)"
                    value={newNode.id}
                    onChange={(e) => setNewNode({ ...newNode, id: e.target.value })}
                    style={{ height: 36, padding: "0 10px" }}
                  />
                  <input
                    placeholder="Name"
                    value={newNode.name}
                    onChange={(e) => setNewNode({ ...newNode, name: e.target.value })}
                    style={{ height: 36, padding: "0 10px" }}
                  />
                  <input
                    placeholder="Region"
                    value={newNode.region}
                    onChange={(e) => setNewNode({ ...newNode, region: e.target.value })}
                    style={{ height: 36, padding: "0 10px" }}
                  />
                  <select
                    value={newNode.status}
                    onChange={(e) => setNewNode({ ...newNode, status: e.target.value })}
                    style={{ height: 36 }}
                  >
                    <option value="Online">Online</option>
                    <option value="Warning">Warning</option>
                    <option value="Offline">Offline</option>
                  </select>
                  <button onClick={createNode} style={{ height: 36, fontWeight: 800 }}>
                    Створити
                  </button>
                </div>
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                  Доступно лише для ролі ADMIN (backend поверне 403 для DISPATCHER).
                </div>
              </div>

              {/* Nodes table */}
              <div style={{ marginTop: 12, border: "1px solid #ddd", borderRadius: 10, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f6f6f6" }}>
                      <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>ID</th>
                      <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Name</th>
                      <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Region</th>
                      <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Status</th>
                      <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nodes.map(n => (
                      <tr key={n.id}>
                        <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{n.id}</td>

                        <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                          {editingId === n.id ? (
                            <input
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              style={{ height: 32, padding: "0 8px", width: "100%" }}
                            />
                          ) : n.name}
                        </td>

                        <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                          {editingId === n.id ? (
                            <input
                              value={editForm.region}
                              onChange={(e) => setEditForm({ ...editForm, region: e.target.value })}
                              style={{ height: 32, padding: "0 8px", width: "100%" }}
                            />
                          ) : n.region}
                        </td>

                        <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                          {editingId === n.id ? (
                            <select
                              value={editForm.status}
                              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                              style={{ height: 32 }}
                            >
                              <option value="Online">Online</option>
                              <option value="Warning">Warning</option>
                              <option value="Offline">Offline</option>
                            </select>
                          ) : n.status}
                        </td>

                        <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                          {editingId === n.id ? (
                            <>
                              <button onClick={() => saveEdit(n.id)} style={{ marginRight: 8, fontWeight: 800 }}>
                                Save
                              </button>
                              <button onClick={cancelEdit}>Cancel</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEdit(n)} style={{ marginRight: 8 }}>
                                Edit
                              </button>
                              <button onClick={() => removeNode(n.id)} style={{ color: "#b00020" }}>
                                Delete
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                    {nodes.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: 14, textAlign: "center", opacity: 0.75 }}>
                          Вузлів немає
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TRIGGERS */}
          {active === "triggers" && (
            <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
              <h2 style={{ marginTop: 0 }}>Triggers</h2>
              <div style={{ opacity: 0.75 }}>
                Заглушка: правила/сповіщення (email/SMS/інтеграції).
              </div>
            </div>
          )}

          {/* INTEGRATIONS */}
          {active === "integrations" && (
            <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
              <h2 style={{ marginTop: 0 }}>Integrations</h2>
              <div style={{ opacity: 0.75 }}>
                Заглушка: інтеграції SCADA / SIEM / месенджери.
              </div>
            </div>
          )}

          {/* AUDIT */}
          {active === "audit" && (
            <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ margin: 0 }}>Audit Log</h2>
                <button onClick={loadAudit}>Оновити</button>
              </div>

              {auditErr ? <div style={{ color: "#b00020", marginTop: 10 }}>{auditErr}</div> : null}

              <div style={{ marginTop: 12, border: "1px solid #ddd", borderRadius: 10, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f6f6f6" }}>
                      <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Time</th>
                      <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>User</th>
                      <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Action</th>
                      <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Entity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.map(a => (
                      <tr key={a.id}>
                        <td style={{ padding: 10, borderBottom: "1px solid #eee", fontSize: 12, opacity: 0.85 }}>
                          {a.timestamp}
                        </td>
                        <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                          {a.username} ({a.role})
                        </td>
                        <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                          <b>{a.action}</b>
                        </td>
                        <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                          {(a.entity_type || "-")} / {(a.entity_id || "-")}
                        </td>
                      </tr>
                    ))}
                    {audit.length === 0 && !auditErr ? (
                      <tr><td colSpan={4} style={{ padding: 14, textAlign: "center", opacity: 0.75 }}>Записів немає</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}