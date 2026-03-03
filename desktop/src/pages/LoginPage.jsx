import { useEffect, useState } from "react";
import { api, setToken } from "../api";

export default function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [conn, setConn] = useState("...");
  const [error, setError] = useState("");

  useEffect(() => {
    api.health()
      .then(() => setConn("Online"))
      .catch(() => setConn("Offline"));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      const r = await api.login(username.trim(), password);
      setToken(r.token);
      onLoginSuccess?.(r);
    } catch (err) {
      setError("Помилка авторизації. Перевірте ID/Email і пароль.");
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#eef2f5", fontFamily: "Arial, sans-serif"
    }}>
      <form onSubmit={handleSubmit} style={{
        width: 400, padding: 40, background: "#fff",
        borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        display: "flex", flexDirection: "column", gap: 16
      }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>PowerGrid</div>

        <input
          placeholder="ID/Email користувача"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ height: 44, padding: "0 12px" }}
        />

        <input
          placeholder="Пароль"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ height: 44, padding: "0 12px" }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
          <a href="#" onClick={(e) => e.preventDefault()}>Допомога</a>
          <a href="#" onClick={(e) => e.preventDefault()}>Відновлення доступу</a>
        </div>

        {error ? <div style={{ color: "#b00020", fontSize: 13 }}>{error}</div> : null}

        <button type="submit" style={{ height: 48, fontWeight: 700 }}>
          УВІЙТИ
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.8 }}>
          <span>UA</span>
          <span>Статус з’єднання: {conn}</span>
        </div>

        <div style={{ fontSize: 12, opacity: 0.75 }}>
          Тестові облікові записи (MVP): dispatcher@powergrid.local / Dispatcher123! та admin@powergrid.local / Admin123!
        </div>
      </form>
    </div>
  );
}