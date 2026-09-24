import { useEffect, useState } from "react";
import {
  BellRing,
  X,
  Users,
  CalendarDays,
  Activity,
  Server,
  ChevronDown,
  UserCog,
  ShieldAlert,
  KeyRound,
  Ban,
  CheckCircle2,
} from "lucide-react";
import { PageHeading, Button, Badge } from "../components/AppShell";
import { Stat } from "../components/Display";
import { addNotification, getNotifications } from "../lib/notifications";

const USER_STORAGE_KEY = "lichhoc_admin_users";

const USER_ROWS = [
  {
    id: 1,
    name: "abc",
    email: "abc@student.edu.vn",
    role: "Sinh viên",
    status: "Hoạt động",
    actions: ["Đổi mật khẩu", "Thông báo", "Cấp quyền", "Khóa tài khoản"],
  },
  {
    id: 2,
    name: "nguyenan",
    email: "nguyenan@student.edu.vn",
    role: "Sinh viên",
    status: "Hoạt động",
    actions: ["Đổi mật khẩu", "Thông báo", "Khóa tài khoản"],
  },
  {
    id: 3,
    name: "minhtran",
    email: "minhtran@student.edu.vn",
    role: "Giảng viên",
    status: "Đang chờ",
    actions: ["Duyệt quyền", "Đổi mật khẩu", "Thông báo", "Cảnh báo"],
  },
  {
    id: 4,
    name: "thuyanh",
    email: "thuyanh@student.edu.vn",
    role: "Sinh viên",
    status: "Hoạt động",
    actions: ["Đổi mật khẩu", "Thông báo", "Khóa tài khoản"],
  },
  {
    id: 5,
    name: "quanghuy",
    email: "quanghuy@student.edu.vn",
    role: "Sinh viên",
    status: "Hoạt động",
    actions: ["Đổi mật khẩu", "Thông báo", "Cấp quyền"],
  },
  {
    id: 6,
    name: "lephuong",
    email: "lephuong@hust.edu.vn",
    role: "Giảng viên",
    status: "Hoạt động",
    actions: ["Đổi mật khẩu", "Thông báo", "Cảnh báo"],
  },
  {
    id: 7,
    name: "admin2",
    email: "admin2@lichhoc.local",
    role: "Quản trị viên",
    status: "Hoạt động",
    actions: ["Đổi mật khẩu", "Thông báo", "Khóa tài khoản"],
  },
];

function UserActionButton({ type, onAction }) {
  const configs = {
    "Đổi mật khẩu": { icon: KeyRound, tone: "blue" },
    "Cấp quyền": { icon: UserCog, tone: "green" },
    "Khóa tài khoản": { icon: Ban, tone: "red" },
    "Mở khóa": { icon: CheckCircle2, tone: "green" },
    "Duyệt quyền": { icon: CheckCircle2, tone: "green" },
    "Thông báo": { icon: BellRing, tone: "amber" },
    "Cảnh báo": { icon: ShieldAlert, tone: "amber" },
  };

  const { icon: Icon, tone } = configs[type] || { icon: BellRing, tone: "blue" };

  return (
    <button type="button" className={`table-action ${tone}`} onClick={onAction}>
      <Icon size={13} />
      {type}
    </button>
  );
}

function getUserActions(user) {
  const actions = ["Đổi mật khẩu", "Thông báo", "Cảnh báo"];
  actions.push(user.status === "Bị khóa" ? "Mở khóa" : "Khóa tài khoản");

  if (!/quản trị viên|quản lý/i.test(user.role)) {
    actions.push("Duyệt quyền");
  }

  return actions;
}

function AdminPage() {
  const [userList, setUserList] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(USER_STORAGE_KEY) || "null");
      if (!Array.isArray(saved) || !saved.length) return USER_ROWS;
      return USER_ROWS.map((defaultUser) => saved.find((user) => user.id === defaultUser.id) || defaultUser);
    } catch {
      return USER_ROWS;
    }
  });
  const [modal, setModal] = useState(null);
  const [formValue, setFormValue] = useState("");
  const [toast, setToast] = useState(null);
  const [userQuery, setUserQuery] = useState("");

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3500);
  };

  const saveUsers = (nextUsers) => {
    setUserList(nextUsers);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUsers));
  };

  const openAction = (user, action) => {
    setFormValue("");
    setModal({ user, action });
  };

  const submitAction = () => {
    if (!modal) return;
    const { user, action } = modal;
    if (["Đổi mật khẩu", "Thông báo", "Cảnh báo", "Khóa tài khoản"].includes(action) && !formValue.trim()) return;

    const actionMap = {
      "Đổi mật khẩu": {
        title: "Đổi mật khẩu",
        message: `Admin đã thay đổi mật khẩu cho tài khoản ${user.email}.`,
        kind: "security",
      },
      "Cấp quyền": {
        title: "Cấp quyền",
        message: `${user.name} vừa được cấp quyền quản lý lịch học mới.`,
        kind: "success",
      },
      "Khóa tài khoản": {
        title: "Khóa tài khoản",
        message: `Tài khoản ${user.email} đã bị khóa. Lý do: ${formValue.trim()}`,
        kind: "alert",
      },
      "Mở khóa": {
        title: "Mở khóa tài khoản",
        message: `Tài khoản ${user.email} đã được mở khóa bởi quản trị viên.`,
        kind: "success",
      },
      "Thông báo": {
        title: "Thông báo từ quản trị viên",
        message: formValue.trim(),
        kind: "warning",
      },
      "Duyệt quyền": {
        title: "Duyệt quyền",
        message: `${user.name} đã được phê duyệt quyền truy cập tài nguyên hệ thống.`,
        kind: "success",
      },
      "Cảnh báo": {
        title: "Cảnh báo tài khoản",
        message: formValue.trim(),
        kind: "warning",
      },
    };

    const payload = actionMap[action];
    if (!payload) return;

    addNotification({
      title: payload.title,
      message: payload.message,
      kind: payload.kind,
      actor: "Admin",
      recipient: user.email,
    });

    const now = new Date().toISOString();
    const nextUsers = userList.map((entry) => {
        if (entry.id !== user.id) return entry;
        if (action === "Khóa tài khoản") {
          return { ...entry, status: "Bị khóa", lockReason: formValue.trim(), lockedAt: now, actions: entry.actions.map((item) => item === "Khóa tài khoản" ? "Mở khóa" : item) };
        }
        if (action === "Mở khóa") {
          return { ...entry, status: "Hoạt động", lockReason: "", lockedAt: "", actions: entry.actions.map((item) => item === "Mở khóa" ? "Khóa tài khoản" : item) };
        }
        if (action === "Duyệt quyền") {
          return { ...entry, status: "Hoạt động", role: "Quản trị viên" };
        }
        if (action === "Đổi mật khẩu") {
          return { ...entry, passwordChangedAt: now };
        }
        return entry;
      });
    saveUsers(nextUsers);
    setModal(null);
    showToast(`${action} thành công cho ${user.email}`);
  };

  const [recentNotifications, setRecentNotifications] = useState(() => getNotifications().slice(0, 4));

  useEffect(() => {
    const refreshNotifications = () => setRecentNotifications(getNotifications().slice(0, 4));
    window.addEventListener("lichhoc:notificationsChanged", refreshNotifications);
    return () => window.removeEventListener("lichhoc:notificationsChanged", refreshNotifications);
  }, []);

  const filteredUsers = userList.filter((user) => {
    const query = userQuery.trim().toLowerCase();
    if (!query) return true;
    return [user.name, user.email, user.role, user.status].some((value) => value.toLowerCase().includes(query));
  });

  return (
    <>
      <PageHeading
        eyebrow="TỔNG QUAN HỆ THỐNG"
        title="Bảng điều khiển quản trị"
        detail="Theo dõi hoạt động và tình trạng hệ thống LichHoc."
        action={<Button variant="outline">24 giờ qua <ChevronDown size={15} /></Button>}
      />

      <div className="stat-grid">
        <Stat label="Tổng người dùng" value="2,486" note="↑ 12.8% so với tháng trước" icon={Users} tone="stat-blue" />
        <Stat label="Lịch học được tạo" value="18,392" note="↑ 8.2% so với tháng trước" icon={CalendarDays} tone="stat-green" />
        <Stat label="Lượt đồng bộ hôm nay" value="1,204" note="↑ 4.6% so với hôm qua" icon={Activity} tone="stat-amber" />
        <Stat label="Tình trạng hệ thống" value="99.9%" note="Tất cả dịch vụ đang hoạt động" icon={Server} tone="stat-purple" />
      </div>

      <div className="admin-grid">
        <section className="panel chart-panel">
          <div className="panel-head">
            <div>
              <h2>Hoạt động người dùng</h2>
              <p>Lượt truy cập trong 7 ngày gần nhất</p>
            </div>
            <Badge tone="green">+12.8%</Badge>
          </div>

          <div className="chart-legend">
            <i /> Lượt truy cập <i className="legend-secondary" /> Người dùng mới
          </div>

          <div className="chart">
            <div className="chart-y">
              <span>2.000</span>
              <span>1.500</span>
              <span>1.000</span>
              <span>500</span>
              <span>0</span>
            </div>

            <div className="chart-bars">
              {[42, 55, 48, 74, 61, 88, 68].map((h, i) => (
                <div className="bar-pair" key={i}>
                  <i style={{ height: `${h}%` }} />
                  <b style={{ height: `${Math.max(h - 18, 14)}%` }} />
                  <small>{["T2", "T3", "T4", "T5", "T6", "T7", "CN"][i]}</small>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="panel service-panel">
          <div className="panel-head">
            <div>
              <h2>Dịch vụ hệ thống</h2>
              <p>Trạng thái hiện tại</p>
            </div>
            <Badge tone="green">Hoạt động</Badge>
          </div>

          {[
            ["API Flask", "Xử lý và phân tích lịch", "24 ms"],
            ["Express API", "Quản lý dữ liệu lịch học", "18 ms"],
            ["MongoDB", "Cơ sở dữ liệu", "12 ms"],
            ["Đồng bộ thời khóa biểu", "Tác vụ nhập lịch", "Đang chạy"],
          ].map(([name, sub, val]) => (
            <div className="service-row" key={name}>
              <span className="service-dot" />
              <span>
                <b>{name}</b>
                <small>{sub}</small>
              </span>
              <strong>{val}</strong>
            </div>
          ))}
        </section>
      </div>

      <section className="panel admin-activity-panel">
        <div className="panel-head">
          <div>
            <h2>Quản lý người dùng</h2>
            <p>Chọn tài khoản để nâng quyền, khóa, hoặc gửi cảnh báo</p>
          </div>
          <label className="user-search">
            <Users size={15} />
            <input
              aria-label="Tìm kiếm người dùng"
              value={userQuery}
              onChange={(event) => setUserQuery(event.target.value)}
              placeholder="Tìm theo tên hoặc email..."
            />
          </label>
        </div>

        <div className="user-admin-table">
          <div className="user-admin-row header">
            <span>Người dùng</span>
            <span>Vai trò</span>
            <span>Trạng thái</span>
            <span>Hành động</span>
          </div>

          {filteredUsers.map((user) => (
            <div key={user.id} className="user-admin-row">
              <div className="user-cell">
                <span className="user-pill">{user.name.charAt(0).toUpperCase()}</span>
                <div>
                  <strong>{user.name}</strong>
                  <small>{user.email}</small>
                </div>
              </div>

              <span>{user.role}</span>

              <span
                className={`status-tag ${
                  user.status === "Bị khóa"
                    ? "blocked"
                    : user.status === "Đang chờ"
                      ? "waiting"
                      : "active"
                }`}
              >
                {user.status}
              </span>

              {user.status === "Bị khóa" && (
                <small className="lock-meta">
                  {user.lockReason} · {new Date(user.lockedAt).toLocaleString("vi-VN")}
                </small>
              )}

              <div className="action-stack">
                {getUserActions(user).map((action) => (
                  <UserActionButton
                    key={`${user.id}-${action}`}
                    type={action}
                    onAction={() => openAction(user, action)}
                  />
                ))}
              </div>
            </div>
          ))}
          {!filteredUsers.length && <div className="user-empty-state">Không tìm thấy người dùng phù hợp.</div>}
        </div>
      </section>

      <section className="panel admin-activity-panel">
        <div className="panel-head">
          <div>
            <h2>Thông báo gần đây</h2>
            <p>Các tác vụ admin mới nhất</p>
          </div>
          <Badge tone="green">Live</Badge>
        </div>

        <div className="notification-stack">
          {recentNotifications.map((item) => (
            <div key={item.id} className={`mini-notify ${item.kind}`}>
              <div className="mini-icon"><BellRing size={14} /></div>
              <div>
                <strong>{item.title}</strong>
                <p>{item.message}</p>
                <small>{item.actor} • {new Date(item.createdAt).toLocaleString("vi-VN")}</small>
              </div>
            </div>
          ))}
        </div>
      </section>

      {modal && (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setModal(null)}>
          <section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-modal-title">
            <div className="admin-modal-header">
              <div>
                <span className="eyebrow">QUẢN LÝ TÀI KHOẢN</span>
                <h2 id="admin-modal-title">{modal.action} · {modal.user.name}</h2>
                <p>{modal.user.email}</p>
              </div>
              <button type="button" className="modal-close" aria-label="Đóng" onClick={() => setModal(null)}><X size={18} /></button>
            </div>

            {modal.action === "Đổi mật khẩu" && (
              <label className="modal-field">
                <span>Mật khẩu mới</span>
                <input autoFocus type="password" value={formValue} onChange={(event) => setFormValue(event.target.value)} placeholder="Nhập mật khẩu mới" />
              </label>
            )}

            {["Thông báo", "Cảnh báo", "Khóa tài khoản"].includes(modal.action) && (
              <label className="modal-field">
                <span>{modal.action === "Khóa tài khoản" ? "Lý do khóa tài khoản" : "Nội dung gửi tới user"}</span>
                <textarea autoFocus value={formValue} onChange={(event) => setFormValue(event.target.value)} placeholder={modal.action === "Khóa tài khoản" ? "Ví dụ: Vi phạm quy định sử dụng..." : "Nhập nội dung thông báo..."} rows={4} />
              </label>
            )}

            {["Cấp quyền", "Duyệt quyền", "Mở khóa"].includes(modal.action) && (
              <div className="modal-confirm-copy">Xác nhận thực hiện thao tác <strong>{modal.action.toLowerCase()}</strong> cho tài khoản này?</div>
            )}

            <div className="admin-modal-actions">
              <Button variant="outline" onClick={() => setModal(null)}>Hủy</Button>
              <Button onClick={submitAction}>{modal.action === "Thông báo" || modal.action === "Cảnh báo" ? "Thông báo tới user" : "Xác nhận"}</Button>
            </div>
          </section>
        </div>
      )}

      {toast && (
        <div className="admin-success-toast" role="status">
          <CheckCircle2 size={18} />
          <div><strong>Thành công</strong><span>{toast}</span></div>
          <button type="button" aria-label="Đóng thông báo" onClick={() => setToast(null)}><X size={15} /></button>
        </div>
      )}
    </>
  );
}

export default AdminPage;
