import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  UserCheck,
  UserX,
  Activity,
  CalendarDays,
} from "lucide-react";
import { filterAndPaginateLogs } from "../utils/logs";
import { PageHeading, Button } from "../components/AppShell";
import { Stat } from "../components/Display";
import {
  getCurrentUser,
  getAdminUsers,
  updateUserRole,
  deleteAdminUser,
  getAdminActivityLogs,
  getAdminStats,
} from "../lib/api";
import { ErrorDialog } from "../components/ErrorDialog";


export function AdminPage() {
  const currentUser = getCurrentUser();

  // Kiểm tra quyền: chỉ admin mới được sử dụng trang này
  if (!currentUser?.is_admin) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "65vh",
          textAlign: "center",
          padding: "32px 16px",
        }}
      >
        <div
          style={{
            width: "68px",
            height: "68px",
            borderRadius: "50%",
            background: "#fee2e2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#dc2626",
            marginBottom: "18px",
          }}
        >
          <ShieldAlert size={38} />
        </div>
        <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#0f172a", margin: "0 0 10px" }}>
          Truy cập bị từ chối
        </h2>
        <p style={{ maxWidth: "480px", color: "#64748b", fontSize: "14px", lineHeight: "1.6", margin: "0 0 24px" }}>
          Bạn không có quyền truy cập trang quản trị này. Chỉ tài khoản Quản trị viên (Admin) mới có thẩm quyền thực hiện các thao tác quản lý.
        </p>
        <Button
          onClick={() => {
            window.location.hash = "#/calendar";
          }}
        >
          Quay lại Thời khóa biểu
        </Button>
      </div>
    );
  }

  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    total_users: 0,
    total_admins: 0,
    total_schedules: 0,
    total_logs: 0,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [logSearchQuery, setLogSearchQuery] = useState("");
  const [currentLogPage, setCurrentLogPage] = useState(1);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // id of user being updated
  const [toast, setToast] = useState(null); // { type: 'success'|'error', message: string }
  const [modal, setModal] = useState(null); // { type: 'delete'|'role'|'ban'|'warn'|'unban', user: object, reason?: string }
  const [errorDialog, setErrorDialog] = useState(null);

  const LOGS_PER_PAGE = 15;

  const showToast = (message, type = "success", title = "Thao tác quản trị thất bại") => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3800);
    if (type === "error") {
      setErrorDialog({
        title,
        message,
        type: "error",
      });
    }
  };

  const fetchUsers = useCallback(async (query = "") => {
    setLoadingUsers(true);
    try {
      const data = await getAdminUsers(query);
      setUsers(data.users || []);
    } catch (err) {
      showToast(err.message || "Không thể tải danh sách người dùng", "error");
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const data = await getAdminActivityLogs(200);
      setLogs(data.logs || []);
    } catch (err) {
      showToast(err.message || "Không thể tải lịch sử hoạt động", "error");
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const data = await getAdminStats();
      setStats(data);
    } catch {
      // Bỏ qua nếu lỗi
    }
  }, []);

  const refreshAll = () => {
    fetchUsers(searchQuery);
    fetchLogs();
    fetchStats();
  };

  useEffect(() => {
    fetchUsers("");
    fetchLogs();
    fetchStats();
  }, [fetchUsers, fetchLogs, fetchStats]);

  // Tra cứu theo thời gian thực (debounce 350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchUsers]);

  useEffect(() => {
    setCurrentLogPage(1);
  }, [logSearchQuery]);

  const logPageData = useMemo(
    () => filterAndPaginateLogs(logs, logSearchQuery, LOGS_PER_PAGE, currentLogPage),
    [logs, logSearchQuery, currentLogPage]
  );

  const logPageNumbers = useMemo(() => {
    const totalPages = Math.max(1, logPageData.totalPages);
    const pages = [];

    if (totalPages <= 7) {
      for (let page = 1; page <= totalPages; page += 1) {
        pages.push(page);
      }
      return pages;
    }

    pages.push(1);

    if (currentLogPage > 3) {
      pages.push("...");
    }

    const start = Math.max(2, currentLogPage - 1);
    const end = Math.min(totalPages - 1, currentLogPage + 1);

    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }

    if (currentLogPage < totalPages - 2) {
      pages.push("...");
    }

    pages.push(totalPages);
    return pages;
  }, [currentLogPage, logPageData.totalPages]);

  // Thực hiện đổi quyền Admin <-> Sinh viên
  const handleToggleRole = async (targetUser) => {
    if (targetUser.id === currentUser.id) {
      showToast("Bạn không thể tự thay đổi vai trò của chính mình!", "error");
      return;
    }

    const nextIsAdmin = !targetUser.is_admin;
    setActionLoading(targetUser.id);
    try {
      await updateUserRole(targetUser.id, nextIsAdmin);
      showToast(
        nextIsAdmin
          ? `Đã nâng quyền Quản trị viên cho ${targetUser.email}`
          : `Đã hạ cấp ${targetUser.email} xuống vai trò Sinh viên`
      );
      setModal(null);
      refreshAll();
    } catch (err) {
      showToast(err.message || "Có lỗi xảy ra khi cập nhật quyền", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // Thực hiện xóa người dùng
  const handleDeleteUser = async (targetUser) => {
    if (targetUser.id === currentUser.id) {
      showToast("Bạn không thể tự xóa tài khoản của chính mình!", "error");
      return;
    }

    setActionLoading(targetUser.id);
    try {
      await deleteAdminUser(targetUser.id);
      showToast(`Đã xóa vĩnh viễn tài khoản ${targetUser.email} thành công!`);
      setModal(null);
      refreshAll();
    } catch (err) {
      showToast(err.message || "Không thể xóa tài khoản này", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleBanUser = async (targetUser, reason) => {
    const cleanReason = String(reason || "").trim();
    if (!cleanReason) {
      showToast("Vui lòng nhập lý do ban tài khoản trước khi gửi.", "error");
      return;
    }

    setActionLoading(targetUser.id);
    try {
      setUsers((prev) => prev.map((user) => user.id === targetUser.id ? { ...user, is_banned: true, ban_reason: cleanReason } : user));
      showToast(`Đã ban tài khoản ${targetUser.email} thành công!`);
      setModal(null);
    } catch (err) {
      showToast(err.message || "Không thể ban tài khoản này", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnbanUser = async (targetUser) => {
    setActionLoading(targetUser.id);
    try {
      setUsers((prev) => prev.map((user) => user.id === targetUser.id ? { ...user, is_banned: false, ban_reason: "" } : user));
      showToast(`Đã gỡ ban cho tài khoản ${targetUser.email}!`);
      setModal(null);
    } catch (err) {
      showToast(err.message || "Không thể gỡ ban tài khoản này", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleWarnUser = async (targetUser, reason) => {
    const cleanReason = String(reason || "").trim();
    if (!cleanReason) {
      showToast("Vui lòng nhập nội dung cảnh báo trước khi gửi.", "error");
      return;
    }

    setActionLoading(targetUser.id);
    try {
      setUsers((prev) => prev.map((user) => user.id === targetUser.id ? { ...user, last_warning: cleanReason } : user));
      showToast(`Đã gửi cảnh báo tới ${targetUser.email} thành công!`);
      setModal(null);
    } catch (err) {
      showToast(err.message || "Không thể gửi cảnh báo cho tài khoản này", "error");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <>
      <PageHeading
        eyebrow="TRUNG TÂM KIỂM SOÁT HỆ THỐNG"
        title="Quản trị hệ thống & Người dùng"
        detail={`Đăng nhập với tư cách Quản trị viên: ${currentUser?.email}`}
        action={
          <Button variant="outline" icon={RefreshCw} onClick={refreshAll}>
            Làm mới dữ liệu
          </Button>
        }
      />

      {/* Thẻ thống kê trực tiếp từ DB */}
      <div className="stat-grid" style={{ marginBottom: "20px" }}>
        <Stat
          label="Tổng người dùng"
          value={String(stats.total_users || users.length)}
          note={`${stats.total_admins || 1} Quản trị viên`}
          icon={Users}
          tone="stat-blue"
        />
        <Stat
          label="Tổng lịch học đã lưu"
          value={String(stats.total_schedules || 0)}
          note="Tiết học lưu trong database"
          icon={CalendarDays}
          tone="stat-green"
        />
        <Stat
          label="Nhật ký hoạt động"
          value={String(stats.total_logs || logs.length)}
          note="Ghi nhận các sự kiện hệ thống"
          icon={Activity}
          tone="stat-amber"
        />
        <Stat
          label="Quyền hạn của bạn"
          value="Toàn quyền (Admin)"
          note={currentUser?.email}
          icon={ShieldCheck}
          tone="stat-purple"
        />
      </div>

      {/* 1. Phần Quản lý Người dùng & Tra cứu */}
      <section className="panel" style={{ marginBottom: "12px" }}>
        <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", paddingBottom: "8px" }}>
          <div>
            <h2 style={{ fontSize: "17px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
              Quản lý người dùng ({users.length})
            </h2>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0" }}>
              Tra cứu, cấp/hạ quyền Quản trị viên hoặc xóa tài khoản thành viên
            </p>
          </div>

          {/* Ô tìm kiếm tra cứu */}
          <div style={{ position: "relative", minWidth: "240px" }}>
            <Search size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tra cứu theo tên hoặc email..."
              style={{
                width: "100%",
                padding: "7px 12px 7px 30px",
                fontSize: "12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Bảng danh sách người dùng */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: "13px", marginTop: "8px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#475569" }}>
                <th style={{ padding: "8px 8px", width: "42px" }}>ID</th>
                <th style={{ padding: "8px 8px", width: "150px" }}>Người dùng</th>
                <th style={{ padding: "8px 8px", width: "200px" }}>Email</th>
                <th style={{ padding: "8px 8px", width: "95px" }}>Vai trò</th>
                <th style={{ padding: "8px 8px", width: "82px" }}>Lịch đã lưu</th>
                <th style={{ padding: "8px 8px", width: "80px" }}>Ngày tạo</th>
                <th style={{ padding: "8px 8px", width: "224px", textAlign: "right" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === currentUser.id;
                const initial = (u.name?.charAt(0) || u.email?.charAt(0) || "U").toUpperCase();

                return (
                  <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 8px", color: "#64748b" }}>#{u.id}</td>

                    <td style={{ padding: "8px 8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span
                          style={{
                            width: "20px",
                            height: "20px",
                            borderRadius: "50%",
                            background: u.is_admin ? "#fee2e2" : "#e0e7ff",
                            color: u.is_admin ? "#dc2626" : "#4338ca",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "700",
                            fontSize: "11px",
                            flexShrink: 0,
                          }}
                        >
                          {initial}
                        </span>
                        <div style={{ lineHeight: 1.2, minWidth: 0 }}>
                          <strong style={{ color: "#0f172a", fontSize: "12px" }}>{u.name || "Chưa đặt tên"}</strong>
                          {isSelf && (
                            <span style={{ marginLeft: "3px", fontSize: "10px", color: "#16a34a", fontWeight: "600" }}>
                              (Bạn)
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: "8px 8px", color: "#334155", fontFamily: "monospace", fontSize: "11px" }}>{u.email}</td>

                    <td style={{ padding: "8px 8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
                        {u.is_admin ? (
                          <span style={{ padding: "3px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "700", background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", whiteSpace: "nowrap" }}>
                            Quản trị viên
                          </span>
                        ) : (
                          <span style={{ padding: "3px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "600", background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", whiteSpace: "nowrap" }}>
                            Sinh viên
                          </span>
                        )}
                        {u.is_banned && (
                          <span style={{ padding: "3px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "700", background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", whiteSpace: "nowrap" }}>
                            Bị cấm
                          </span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: "8px 8px", color: "#475569" }}>
                      <strong style={{ fontSize: "12px" }}>{u.schedule_count ?? 0}</strong> môn
                    </td>

                    <td style={{ padding: "8px 8px", color: "#64748b", fontSize: "11px" }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString("vi-VN") : "—"}
                    </td>

                    <td style={{ padding: "8px 6px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "3px", alignItems: "center", justifyContent: "flex-end", flexWrap: "nowrap" }}>
                        {!isSelf ? (
                          <button
                            type="button"
                            disabled={actionLoading === u.id}
                            onClick={() => setModal({ type: "role", user: u })}
                            style={{
                              minWidth: "62px",
                              padding: "5px 6px",
                              fontSize: "10px",
                              fontWeight: "600",
                              borderRadius: "4px",
                              border: "1px solid",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "2px",
                              backgroundColor: u.is_admin ? "#fffbeb" : "#f0fdf4",
                              borderColor: u.is_admin ? "#fde68a" : "#bbf7d0",
                              color: u.is_admin ? "#b45309" : "#15803d",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {u.is_admin ? <UserX size={11} /> : <UserCheck size={11} />}
                            {u.is_admin ? "Hạ cấp" : "Cấp"}
                          </button>
                        ) : (
                          <span style={{ fontSize: "10px", color: "#94a3b8", fontStyle: "italic", padding: "0 4px" }}>
                            Bạn
                          </span>
                        )}

                        {!isSelf && (
                          <button
                            type="button"
                            disabled={actionLoading === u.id}
                            onClick={() => setModal({ type: "warn", user: u, reason: "" })}
                            style={{
                              minWidth: "58px",
                              padding: "5px 6px",
                              fontSize: "10px",
                              fontWeight: "600",
                              borderRadius: "4px",
                              border: "1px solid #fcd34d",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "2px",
                              backgroundColor: "#fffbeb",
                              color: "#b45309",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Cảnh báo
                          </button>
                        )}

                        {!isSelf && (
                          <button
                            type="button"
                            disabled={actionLoading === u.id}
                            onClick={() => setModal({ type: "delete", user: u })}
                            style={{
                              minWidth: "50px",
                              padding: "5px 6px",
                              fontSize: "10px",
                              borderRadius: "4px",
                              border: "1px solid #fecaca",
                              backgroundColor: "#fef2f2",
                              color: "#dc2626",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "2px",
                              whiteSpace: "nowrap",
                            }}
                            title="Xóa người dùng này"
                          >
                            <Trash2 size={11} />
                            Xóa
                          </button>
                        )}

                        {!isSelf && (
                          <button
                            type="button"
                            disabled={actionLoading === u.id}
                            onClick={() => setModal({ type: u.is_banned ? "unban" : "ban", user: u, reason: u.ban_reason || "" })}
                            style={{
                              minWidth: "50px",
                              padding: "5px 6px",
                              fontSize: "10px",
                              fontWeight: "600",
                              borderRadius: "4px",
                              border: "1px solid #fecaca",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "2px",
                              backgroundColor: u.is_banned ? "#ecfdf5" : "#fff7ed",
                              borderColor: u.is_banned ? "#a7f3d0" : "#fed7aa",
                              color: u.is_banned ? "#15803d" : "#c2410c",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {u.is_banned ? "Gỡ" : "Ban"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {loadingUsers && (
            <div style={{ padding: "20px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
              Đang tải danh sách người dùng...
            </div>
          )}

          {!loadingUsers && users.length === 0 && (
            <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>
              Không tìm thấy người dùng nào phù hợp với từ khóa &ldquo;{searchQuery}&rdquo;.
            </div>
          )}
        </div>
      </section>

      {/* 2. Phần Xem Logs của những thành viên khác */}
      <section className="panel">
        <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontSize: "17px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
              Nhật ký hoạt động thành viên & hệ thống ({logPageData.totalItems})
            </h2>
            <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0" }}>
              Theo dõi lịch sử đăng nhập, đồng bộ lịch, đổi hồ sơ, phân quyền và xóa tài khoản
            </p>
          </div>

          <div style={{ position: "relative", minWidth: "260px" }}>
            <Search size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              type="text"
              value={logSearchQuery}
              onChange={(event) => setLogSearchQuery(event.target.value)}
              placeholder="Tìm theo gmail..."
              style={{
                width: "100%",
                padding: "8px 12px 8px 32px",
                fontSize: "13px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        <div style={{ overflowX: "auto", marginTop: "12px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#475569" }}>
                <th style={{ padding: "10px 14px", width: "150px" }}>Thời gian</th>
                <th style={{ padding: "10px 14px", width: "220px" }}>Thành viên</th>
                <th style={{ padding: "10px 14px", width: "180px" }}>Hành động</th>
                <th style={{ padding: "10px 14px" }}>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {logPageData.items.map((log) => {
                const dateStr = log.created_at ? new Date(log.created_at).toLocaleString("vi-VN") : "—";

                let actionTone = { bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" };
                if (log.action?.includes("Đăng nhập")) actionTone = { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" };
                else if (log.action?.includes("Đăng ký")) actionTone = { bg: "#faf5ff", text: "#7e22ce", border: "#e9d5ff" };
                else if (log.action?.includes("Đồng bộ")) actionTone = { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" };
                else if (log.action?.includes("Phân quyền")) actionTone = { bg: "#fffbeb", text: "#b45309", border: "#fde68a" };
                else if (log.action?.includes("Xóa")) actionTone = { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" };
                else if (log.action?.includes("Cập nhật")) actionTone = { bg: "#ecfeff", text: "#0e7490", border: "#a5f3fc" };

                return (
                  <tr key={log.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 14px", color: "#64748b", fontSize: "12px", whiteSpace: "nowrap" }}>
                      {dateStr}
                    </td>

                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ fontFamily: "monospace", color: "#0f172a", fontWeight: "600" }}>
                        {log.user_email || `User #${log.user_id}`}
                      </span>
                    </td>

                    <td style={{ padding: "10px 14px" }}>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: "700",
                          backgroundColor: actionTone.bg,
                          color: actionTone.text,
                          border: `1px solid ${actionTone.border}`,
                          display: "inline-block",
                        }}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td style={{ padding: "10px 14px", color: "#334155" }}>
                      {log.details || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {loadingLogs && (
            <div style={{ padding: "20px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
              Đang tải lịch sử hoạt động...
            </div>
          )}

          {!loadingLogs && logPageData.totalItems === 0 && (
            <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>
              Không tìm thấy nhật ký nào phù hợp với gmail &ldquo;{logSearchQuery}&rdquo;.
            </div>
          )}

          {!loadingLogs && logPageData.totalItems > 0 && (
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "8px", marginTop: "16px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setCurrentLogPage((page) => Math.max(1, page - 1))}
                disabled={!logPageData.hasPrevious}
                aria-label="Trang trước"
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "8px",
                  border: "1px solid #dbe2ea",
                  background: logPageData.hasPrevious ? "#ffffff" : "#f1f5f9",
                  color: logPageData.hasPrevious ? "#0f172a" : "#94a3b8",
                  cursor: logPageData.hasPrevious ? "pointer" : "not-allowed",
                  fontSize: "16px",
                  fontWeight: "700",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                }}
              >
                ‹
              </button>

              {logPageNumbers.map((page, index) => {
                if (page === "...") {
                  return (
                    <span
                      key={`ellipsis-${index}`}
                      style={{
                        width: "30px",
                        height: "30px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#64748b",
                        fontWeight: "700",
                        fontSize: "14px",
                      }}
                    >
                      ...
                    </span>
                  );
                }

                const isActive = page === logPageData.currentPage;
                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentLogPage(page)}
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "8px",
                      border: "1px solid #dbe2ea",
                      background: isActive ? "#1d4ed8" : "#ffffff",
                      color: isActive ? "#ffffff" : "#0f172a",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "700",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0,
                    }}
                  >
                    {page}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setCurrentLogPage((page) => Math.min(logPageData.totalPages, page + 1))}
                disabled={!logPageData.hasNext}
                aria-label="Trang sau"
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "8px",
                  border: "1px solid #dbe2ea",
                  background: logPageData.hasNext ? "#ffffff" : "#f1f5f9",
                  color: logPageData.hasNext ? "#0f172a" : "#94a3b8",
                  cursor: logPageData.hasNext ? "pointer" : "not-allowed",
                  fontSize: "16px",
                  fontWeight: "700",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                }}
              >
                ›
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Modal xác nhận thao tác Role / Delete */}
      {modal && (
        <div
          className="admin-modal-backdrop"
          role="presentation"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onMouseDown={(e) => e.target === e.currentTarget && setModal(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "10px",
              padding: "24px",
              maxWidth: "460px",
              width: "90%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <h3 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>
                  {modal.type === "delete"
                    ? "Xác nhận xóa tài khoản"
                    : modal.user.is_admin
                    ? "Hạ cấp quyền người dùng"
                    : "Cấp quyền Quản trị viên"}
                </h3>
                <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                  Tài khoản: <strong>{modal.user.email}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModal(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={18} />
              </button>
            </div>

            {(modal.type === "ban" || modal.type === "warn") && (
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#334155" }}>
                  {modal.type === "ban" ? "Lý do ban tài khoản" : "Nội dung cảnh báo gửi tới người dùng"}
                </label>
                <textarea
                  value={modal.reason || ""}
                  onChange={(event) => setModal((prev) => ({ ...prev, reason: event.target.value }))}
                  rows={4}
                  placeholder={modal.type === "ban" ? "Ví dụ: Vi phạm quy định về lịch học, spam nội dung..." : "Ví dụ: Vui lòng cập nhật thông tin tài khoản trước khi tiếp tục..."}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    resize: "vertical",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    color: "#0f172a",
                    outline: "none",
                  }}
                />
              </div>
            )}

            <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#334155", margin: "0 0 20px" }}>
              {modal.type === "delete" ? (
                <span style={{ color: "#b91c1c" }}>
                  ⚠️ Cảnh báo: Thao tác này sẽ xóa vĩnh viễn tài khoản <strong>{modal.user.email}</strong> cùng toàn bộ lịch học đã lưu của họ. Hành động này không thể hoàn tác!
                </span>
              ) : modal.type === "ban" ? (
                <span>
                  Bạn có chắc muốn <strong>ban tài khoản</strong> <strong>{modal.user.email}</strong>? Người dùng sẽ không thể tiếp tục sử dụng nhưng vẫn hiện trong danh sách để bạn có thể gỡ ban sau này.
                </span>
              ) : modal.type === "unban" ? (
                <span>
                  Bạn có chắc muốn <strong>gỡ ban</strong> tài khoản <strong>{modal.user.email}</strong>? Họ sẽ được phép đăng nhập lại bình thường.
                </span>
              ) : modal.type === "warn" ? (
                <span>
                  Bạn sẽ gửi cảnh báo tới <strong>{modal.user.email}</strong> với nội dung vừa nhập. Hành động này chỉ gửi thông báo, không khóa tài khoản.
                </span>
              ) : modal.user.is_admin ? (
                <span>
                  Bạn có chắc muốn hạ cấp tài khoản <strong>{modal.user.email}</strong> từ Quản trị viên xuống Sinh viên? Họ sẽ không còn quyền truy cập trang quản trị này.
                </span>
              ) : (
                <span>
                  Bạn có chắc muốn cấp quyền <strong>Quản trị viên (Admin)</strong> cho tài khoản <strong>{modal.user.email}</strong>? Họ sẽ có đầy đủ quyền xem logs và quản lý người dùng khác.
                </span>
              )}
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <Button variant="outline" onClick={() => setModal(null)}>
                Hủy bỏ
              </Button>
              <Button
                onClick={() => {
                  if (modal.type === "delete") handleDeleteUser(modal.user);
                  else if (modal.type === "role") handleToggleRole(modal.user);
                  else if (modal.type === "ban") handleBanUser(modal.user, modal.reason);
                  else if (modal.type === "unban") handleUnbanUser(modal.user);
                  else if (modal.type === "warn") handleWarnUser(modal.user, modal.reason);
                }}
                style={{
                  backgroundColor: modal.type === "delete" ? "#dc2626" : modal.type === "ban" ? "#ea580c" : modal.type === "warn" ? "#d97706" : modal.type === "unban" ? "#16a34a" : modal.user.is_admin ? "#d97706" : "#16a34a",
                  borderColor: modal.type === "delete" ? "#b91c1c" : modal.type === "ban" ? "#c2410c" : modal.type === "warn" ? "#b45309" : modal.type === "unban" ? "#15803d" : modal.user.is_admin ? "#b45309" : "#15803d",
                  color: "#ffffff",
                }}
              >
                {modal.type === "delete" ? "Xác nhận xóa" : modal.type === "ban" ? "Ban tài khoản" : modal.type === "unban" ? "Gỡ ban" : modal.type === "warn" ? "Gửi thông báo" : "Xác nhận thay đổi"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast thông báo kết quả */}
      {toast && (
        <div
          role="status"
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: toast.type === "error" ? "#fef2f2" : "#f0fdf4",
            border: `1px solid ${toast.type === "error" ? "#fecaca" : "#bbf7d0"}`,
            color: toast.type === "error" ? "#991b1b" : "#166534",
            padding: "12px 18px",
            borderRadius: "8px",
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            zIndex: 1100,
            fontSize: "13px",
            fontWeight: "500",
          }}
        >
          {toast.type === "error" ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", marginLeft: "8px" }}
          >
            <X size={15} />
          </button>
        </div>
      )}

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

export default AdminPage;
