import { CalendarDays, ChevronDown, CircleHelp, Code2, Database, GraduationCap, Link2, Search, ShieldCheck, Bell, MoreHorizontal } from "lucide-react";

const navItems = [
  ["calendar", "Lịch của tôi", CalendarDays], ["import", "Nhập lịch HTML", Code2],
  ["manage", "Quản lý lịch học", Database], ["admin", "Quản trị viên", ShieldCheck],
  ["settings", "Cài đặt & kết nối", Link2],
];
export function Brand() { return <a className="brand" href="#/calendar"><span className="brand-mark"><CalendarDays size={21} /></span><span><b>LichHoc</b><small>Không gian học tập của bạn</small></span></a>; }

export function Sidebar({ page, go, user, onLogout }) {
  const userName = user?.email ? user.email.split("@")[0].replace(/[._]/g, " ") : "Sinh viên";
  const initial = userName.charAt(0).toUpperCase() || "S";

  return <aside className="sidebar"><Brand /><div className="side-label">KHÔNG GIAN CỦA BẠN</div><nav className="side-nav" aria-label="Điều hướng chính">{navItems.map(([id, label, Icon]) => <a key={id} href={`#/${id}`} onClick={() => go(id)} className={`nav-link ${page === id ? "active" : ""}`}><Icon size={18} /><span>{label}</span>{id === "calendar" && <span className="nav-count">6</span>}</a>)}</nav><div className="semester-card"><div className="sem-top"><span className="live-dot" /> HỌC KỲ HIỆN TẠI</div><b>Học kỳ 1 · 2025–2026</b><span>Đại học Bách khoa Hà Nội</span><div className="semester-progress"><i /></div><small>Tuần 8 trên 15</small></div><div className="sidebar-bottom"><a className="nav-link" href="#/help"><CircleHelp size={18} />Trợ giúp & hướng dẫn</a><div className="profile-mini"><span className="avatar-initial">{initial}</span><span><b>{userName}</b><small>{user?.is_admin ? "Admin toàn quyền" : "Sinh viên"}</small></span>{onLogout && <button type="button" className="logout-link" onClick={onLogout}>Đăng xuất</button>}<MoreHorizontal size={18} /></div></div></aside>
}

export function Topbar({ title, user, onLogout }) {
  const userName = user?.email ? user.email.split("@")[0].replace(/[._]/g, " ") : "Sinh viên";
  return (
    <header className="topbar">
      <div className="crumb"><GraduationCap size={18} /><span>Đại học</span><span className="crumb-slash">/</span><b>{title}</b></div>
      <div className="top-actions">
        <div className="search-box"><Search size={16} /><input aria-label="Tìm kiếm" placeholder="Tìm kiếm..." /><kbd>⌘ K</kbd></div>
        <button className="icon-button" aria-label="Thông báo"><Bell size={18} /><i /></button>
        <span className="top-divider" />
        <button className="user-chip" type="button"><span className="avatar-initial">{userName.charAt(0).toUpperCase()}</span><span>{userName}</span><ChevronDown size={15} /></button>
        {onLogout && <button type="button" className="button outline" onClick={onLogout}>Đăng xuất</button>}
      </div>
    </header>
  );
}

export function PageHeading({ eyebrow, title, detail, action }) { return <div className="page-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{detail && <p>{detail}</p>}</div>{action}</div> }
export function Button({ children, variant = "primary", icon: Icon, ...props }) { return <button className={`button ${variant}`} {...props}>{Icon && <Icon size={16} />}{children}</button> }
export function Badge({ children, tone = "blue" }) { return <span className={`badge ${tone}`}><i />{children}</span> }
