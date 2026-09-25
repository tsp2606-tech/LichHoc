import { useEffect, useState } from "react";
import { Sidebar, Topbar } from "./components/AppShell";
import CalendarPage from "./pages/CalendarPage";
import ImportPage from "./pages/ImportPage";
import ManagePage from "./pages/ManagePage";
import AdminPage from "./pages/AdminPage";
import SettingsPage from "./pages/SettingsPage";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import { clearAuth, getAuthToken, getCurrentUser } from "./lib/api";

const protectedPages = new Set(["calendar", "import", "manage", "admin", "settings"]);

function App() {
  const readPage = () => {
    const raw = location.hash.replace(/^#\/?/, "");
    const pageName = raw.split("?")[0].replace(/^\//, "");
    return pageName || "calendar";
  };
  const [page, setPage] = useState(readPage);
  const [user, setUser] = useState(getCurrentUser());

  useEffect(() => {
    const onHashChange = () => {
      const nextPage = readPage();
      setPage(nextPage);
    };

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    const current = readPage();

    if (!token && protectedPages.has(current)) {
      location.hash = "#/login";
      setPage("login");
      return;
    }

    setUser(getCurrentUser());
  }, [page]);

  const go = (nextPage) => {
    location.hash = "#/" + nextPage;
    setPage(nextPage);
  };

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    location.hash = "#/login";
    setPage("login");
  };

  if (page === "home") return <LandingPage go={go} />;
  if (page === "login" || page === "register") return <AuthPage mode={page} go={go} />;

  const titles = { calendar: "Lịch của tôi", import: "Nhập lịch HTML", manage: "Quản lý lịch học", admin: "Quản trị viên", settings: "Cài đặt & kết nối" };
  const pages = { calendar: <CalendarPage />, import: <ImportPage />, manage: <ManagePage />, admin: <AdminPage />, settings: <SettingsPage /> };

  return (
    <div className="app-shell">
      <Sidebar page={page} go={go} user={user} onLogout={handleLogout} />
      <div className="main-column">
        <Topbar title={titles[page] || titles.calendar} user={user} onLogout={handleLogout} />
        <main className="page-content">
          {pages[page] || pages.calendar}
          <footer className="app-footer">
            <span>© 2025 LichHoc</span>
            <span>Học tập có kế hoạch. Sống trọn từng ngày.</span>
            <a href="#/help">Trung tâm trợ giúp</a>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default App;
