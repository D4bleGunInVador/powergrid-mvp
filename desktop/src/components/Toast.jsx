import { useEffect } from "react";

export default function Toast({ open, text, onClose, durationMs = 3500 }) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => onClose?.(), durationMs);
    return () => clearTimeout(t);
  }, [open, durationMs, onClose]);

  if (!open) return null;

  return (
    <div style={{
      position: "fixed",
      right: 16,
      bottom: 16,
      background: "#fff",
      border: "2px solid #ff4444",
      borderRadius: 10,
      padding: "12px 14px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
      zIndex: 9999,
      minWidth: 320
    }}>
      <div style={{ fontWeight: 800, marginBottom: 6, color: "#b00020" }}>
        Помилка оновлення даних
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.35 }}>
        {text}
      </div>
    </div>
  );
}