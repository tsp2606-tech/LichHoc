import { useState, useEffect, useMemo } from "react";
import { Users, CalendarDays, Bell, Link2, GraduationCap, CheckCircle2, AlertCircle } from "lucide-react";
import { PageHeading, Badge } from "../components/AppShell";
import { getCurrentUser, setCurrentUser, updateUserProfile, getUserProfile } from "../lib/api";
import { getNotifications } from "../lib/notifications";
import { ErrorDialog } from "../components/ErrorDialog";

export function SettingsPage() {
  const [currentUser, setUserState] = useState(() => getCurrentUser());
  const [initialData, setInitialData] = useState({
    name: currentUser?.name || (currentUser?.email ? currentUser.email.split("@")[0].replace(/[._]/g, " ") : ""),
    email: currentUser?.email || "",
    password: "",
  });

  const [formData, setFormData] = useState({
    name: initialData.name,
    email: initialData.email,
    password: "",
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: string }
  const [errorDialog, setErrorDialog] = useState(null);


  // Đồng bộ thông tin mới nhất từ BE khi vào trang
  useEffect(() => {
    getUserProfile()
      .then((user) => {
        if (user) {
          setUserState(user);
          const updated = {
            name: user.name || (user.email ? user.email.split("@")[0].replace(/[._]/g, " ") : ""),
            email: user.email || "",
            password: "",
          };
          setInitialData(updated);
          setFormData(updated);
        }
      })
      .catch(() => {});
  }, []);

  // Kiểm tra dữ liệu có thực sự thay đổi so với ban đầu hay không
  const isChanged = useMemo(() => {
    const nameChanged = formData.name.trim() !== (initialData.name || "").trim();
    const emailChanged = formData.email.trim().toLowerCase() !== (initialData.email || "").trim().toLowerCase();
    const passwordChanged = formData.password.trim().length > 0;

    return (nameChanged || emailChanged || passwordChanged) && formData.email.trim().length > 0;
  }, [formData, initialData]);

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!isChanged || saving) return;

    setErrorDialog(null);
    setMessage(null);

    const emailTrim = formData.email.trim();
    const nameTrim = formData.name.trim();
    const passwordTrim = formData.password.trim();

    if (!emailTrim) {
      const msg = "Địa chỉ email không được để trống.";
      setMessage({ type: "error", text: msg });
      setErrorDialog({
        title: "Thiếu thông tin email",
        message: msg,
        code: "VALIDATION_EMPTY_EMAIL",
        type: "warning",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrim)) {
      const msg = "Địa chỉ email không đúng định dạng. Vui lòng nhập đúng email (Ví dụ: student@example.com).";
      setMessage({ type: "error", text: msg });
      setErrorDialog({
        title: "Email không hợp lệ",
        message: msg,
        code: "INVALID_EMAIL",
        type: "warning",
      });
      return;
    }

    if (passwordTrim && passwordTrim.length < 6) {
      const msg = "Mật khẩu mới phải có ít nhất 6 ký tự để đảm bảo an toàn.";
      setMessage({ type: "error", text: msg });
      setErrorDialog({
        title: "Mật khẩu quá ngắn",
        message: msg,
        code: "PASSWORD_TOO_SHORT",
        type: "warning",
      });
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: nameTrim,
        email: emailTrim,
      };
      if (passwordTrim) {
        payload.password = passwordTrim;
      }

      const res = await updateUserProfile(payload);
      const updatedUser = res.user || { ...currentUser, ...payload };

      setCurrentUser(updatedUser);
      setUserState(updatedUser);

      const nextInitial = {
        name: updatedUser.name || (updatedUser.email ? updatedUser.email.split("@")[0].replace(/[._]/g, " ") : ""),
        email: updatedUser.email || "",
        password: "",
      };

      setInitialData(nextInitial);
      setFormData(nextInitial);

      setMessage({ type: "success", text: "Cập nhật thông tin thành công vào hệ thống!" });
    } catch (err) {
      const errMsg = err.message || "Không thể cập nhật thông tin. Vui lòng thử lại.";
      setMessage({ type: "error", text: errMsg });
      setErrorDialog({
        title: "Cập nhật thông tin thất bại",
        message: errMsg,
        code: err.status ? `HTTP_${err.status}` : "UPDATE_FAILED",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const userName = currentUser?.name || (currentUser?.email ? currentUser.email.split("@")[0].replace(/[._]/g, " ") : "Người dùng");
  const avatarInitial = (userName.charAt(0) || "U").toUpperCase();
  const notifications = getNotifications().slice(0, 4);

  return (
    <>
      <PageHeading eyebrow="TÙY CHỈNH KHÔNG GIAN" title="Cài đặt & kết nối" detail="Quản lý tài khoản, tùy chọn lịch và các kết nối của bạn." />
      <div className="settings-layout">
        <nav className="settings-nav">
          <a className="chosen"><Users size={17} />Tài khoản</a>
          <a><CalendarDays size={17} />Tùy chọn lịch</a>
          <a><Bell size={17} />Thông báo</a>
          <a><Link2 size={17} />Kết nối</a>
        </nav>

        <div className="settings-content">
          <section className="panel settings-panel">
            <div className="settings-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2>Thông tin cá nhân</h2>
                <p>Cập nhật thông tin hiển thị trên hồ sơ và tài khoản của bạn.</p>
              </div>

              {/* Nút lưu thay đổi: Xám nếu chưa/không đổi, Xanh lá nếu thật sự thay đổi */}
              <button
                type="button"
                id="btnSaveSettings"
                disabled={!isChanged || saving}
                onClick={handleSave}
                style={{
                  padding: "8px 18px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "600",
                  border: "1px solid",
                  transition: "all 0.2s ease-in-out",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  ...(isChanged && !saving
                    ? {
                        backgroundColor: "#16a34a",
                        borderColor: "#15803d",
                        color: "#ffffff",
                        cursor: "pointer",
                        boxShadow: "0 2px 5px rgba(22, 163, 74, 0.3)",
                      }
                    : {
                        backgroundColor: "#94a3b8",
                        borderColor: "#94a3b8",
                        color: "#ffffff",
                        cursor: "not-allowed",
                        opacity: 0.75,
                      }),
                }}
              >
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>

            {message && (
              <div
                style={{
                  margin: "12px 0",
                  padding: "10px 14px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  backgroundColor: message.type === "success" ? "#f0fdf4" : "#fef2f2",
                  color: message.type === "success" ? "#166534" : "#991b1b",
                  border: `1px solid ${message.type === "success" ? "#bbf7d0" : "#fecaca"}`,
                }}
              >
                {message.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{message.text}</span>
              </div>
            )}

            <div className="avatar-edit" style={{ marginTop: "14px" }}>
              <span className="avatar-large">{avatarInitial}</span>
              <span>
                <b>{userName}</b>
                <small>{currentUser?.is_admin ? "Quản trị viên (Admin)" : "Sinh viên"}</small>
              </span>
            </div>

            <form onSubmit={handleSave} className="form-grid" style={{ marginTop: "16px" }}>
              <label className="field">
                <span>Họ và tên</span>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Nhập họ và tên..."
                />
              </label>

              <label className="field">
                <span>Email đăng nhập</span>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="Nhập email..."
                  required
                />
              </label>

              <label className="field">
                <span>Mật khẩu mới</span>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Để trống nếu không muốn đổi mật khẩu"
                />
              </label>

              <label className="field">
                <span>Vai trò hiện tại</span>
                <input
                  type="text"
                  value={currentUser?.is_admin ? "Quản trị viên (Admin)" : "Sinh viên"}
                  disabled
                  style={{ backgroundColor: "#f8fafc", color: "#64748b", cursor: "not-allowed" }}
                />
              </label>
            </form>
          </section>

          <section className="panel settings-panel">
            <div className="settings-title">
              <div>
                <h2>Thông báo</h2>
                <p>Các cảnh báo, ưu đãi và thay đổi bảo mật gần đây.</p>
              </div>
              <Badge tone="green">{notifications.length} tin</Badge>
            </div>

            <div className="notification-settings-list">
              {notifications.map((item) => (
                <div key={item.id} className={`notify-row ${item.kind}`}>
                  <span className="notify-dot" />
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.message}</p>
                    <small>{item.actor} • {new Date(item.createdAt).toLocaleString("vi-VN")}</small>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel settings-panel">
            <div className="settings-title">
              <div>
                <h2>Tích hợp hệ thống</h2>
                <p>Kết nối với cổng đào tạo và các dịch vụ hỗ trợ.</p>
              </div>
              <Badge tone="green">2 kết nối</Badge>
            </div>

            {[
              ["Cổng đào tạo MyDTU", "Đồng bộ thời khóa biểu tự động", "Đã kết nối", "blue"],
              ["Google Calendar", "Xuất lịch sang lịch cá nhân", "Chưa kết nối", "gray"],
            ].map(([name, desc, state, tone]) => (
              <div className="integration-row" key={name}>
                <div className={`integration-icon ${tone}`}>
                  {name.startsWith("Cổng") ? <GraduationCap size={20} /> : <CalendarDays size={20} />}
                </div>
                <span>
                  <b>{name}</b>
                  <small>{desc}</small>
                </span>
                <Badge tone={state.startsWith("Đã") ? "green" : "gray"}>{state}</Badge>
              </div>
            ))}
          </section>
        </div>
      </div>

      <ErrorDialog
        isOpen={Boolean(errorDialog)}
        title={errorDialog?.title}
        message={errorDialog?.message}
        code={errorDialog?.code}
        type={errorDialog?.type || "error"}
        onClose={() => setErrorDialog(null)}
      />
    </>
  );
}

export default SettingsPage;
