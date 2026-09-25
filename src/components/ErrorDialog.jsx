import { AlertCircle, AlertTriangle, X } from "lucide-react";

function sanitizeErrorMessage(msg) {
  if (!msg || typeof msg !== "string") return "Lỗi API. Vui lòng thử lại sau.";
  let clean = msg;
  // Xóa mọi URL và tên miền
  clean = clean.replace(/https?:\/\/[^\s\)\],]+/gi, "máy chủ API");
  clean = clean.replace(/localhost(:\d+)?/gi, "máy chủ API");
  clean = clean.replace(/127\.0\.0\.1(:\d+)?/gi, "máy chủ API");
  clean = clean.replace(/mydtu\.duytan\.edu\.vn[^\s\)\],]*/gi, "cổng đào tạo");
  if (clean.includes("Traceback") || clean.includes("Internal Server Error")) {
    return "Lỗi máy chủ API. Vui lòng kiểm tra lại dịch vụ Backend.";
  }
  return clean.trim();
}

export function ErrorDialog({
  isOpen,
  title = "Đã xảy ra lỗi",
  message = "Vui lòng kiểm tra lại thông tin và thử lại.",
  code = "",
  type = "error", // "error" | "warning"
  confirmText = "Đã hiểu & thử lại",
  onConfirm,
  onClose,
}) {
  if (!isOpen) return null;

  const displayMessage = sanitizeErrorMessage(message);

  return (
    <div
      className="error-dialog-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "grid",
        placeItems: "center",
        padding: "16px",
        backgroundColor: "rgba(15, 23, 42, 0.5)",
        backdropFilter: "blur(4px)",
        animation: "errorDialogFadeIn 0.2s ease-out",
      }}
    >
      <div
        className="error-dialog-card"
        style={{
          width: "min(440px, 100%)",
          background: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(239, 68, 68, 0.15)",
          overflow: "hidden",
          animation: "errorDialogScaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "14px",
            padding: "18px 20px",
            borderBottom: type === "warning" ? "1px solid #fef3c7" : "1px solid #fee2e2",
            background: type === "warning" ? "#fffbeb" : "#fef2f2",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: type === "warning" ? "#fef3c7" : "#fee2e2",
              color: type === "warning" ? "#d97706" : "#dc2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {type === "warning" ? <AlertTriangle size={24} /> : <AlertCircle size={24} />}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#1e293b" }}>
                {title}
              </h3>
              {code && (
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 7px",
                    background: type === "warning" ? "#fde68a" : "#fecaca",
                    color: type === "warning" ? "#92400e" : "#991b1b",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontFamily: "monospace",
                    fontWeight: "600",
                  }}
                >
                  {code}
                </span>
              )}
            </div>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748b" }}>
              Chi tiết nguyên nhân lỗi được thông báo rõ ràng bên dưới:
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              border: 0,
              background: "transparent",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "color 0.15s ease",
            }}
            aria-label="Đóng dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: "20px", fontSize: "13.5px", lineHeight: "1.6", color: "#334155" }}>
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "14px 16px",
              whiteSpace: "pre-line",
              wordBreak: "break-word",
              color: "#1e293b",
            }}
          >
            {displayMessage}
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: "12px 20px 16px",
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            borderTop: "1px solid #f1f5f9",
            background: "#fafafa",
          }}
        >
          <button
            type="button"
            onClick={() => {
              if (onConfirm) onConfirm();
              onClose?.();
            }}
            style={{
              padding: "8px 20px",
              borderRadius: "8px",
              fontWeight: "600",
              fontSize: "13px",
              color: "#ffffff",
              backgroundColor: type === "warning" ? "#d97706" : "#dc2626",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              transition: "opacity 0.15s ease",
            }}
          >
            {confirmText || "Đã hiểu & thử lại"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ErrorDialog;
