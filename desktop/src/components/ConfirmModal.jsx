export default function ConfirmModal({ open, title, message, onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
    }}>
      <div style={{
        width: 520, background: "#fff", borderRadius: 10,
        boxShadow: "0 8px 24px rgba(0,0,0,0.2)", padding: 18,
        border: "2px solid #ff4444"
      }}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>{title || "Підтвердження дії"}</div>
        <div style={{ marginBottom: 10, lineHeight: 1.4 }}>{message}</div>

        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 16 }}>
          Примітка: дія буде зафіксована в Audit Log (контроль та відповідність вимогам безпеки).
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onCancel} style={{ height: 40, padding: "0 14px" }}>
            Скасувати
          </button>
          <button onClick={onConfirm} style={{ height: 40, padding: "0 14px", fontWeight: 800 }}>
            Підтвердити
          </button>
        </div>
      </div>
    </div>
  );
}