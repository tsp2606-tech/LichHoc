import { useEffect, useState } from "react";
import { CalendarDays, ArrowUpRight } from "lucide-react";
import { Brand, Badge, Button } from "../components/AppShell";
import { demoAdminCredentials, loginUser, registerUser } from "../lib/api";

export function AuthPage({ mode, go }) {
  const register = mode === "register";
  const [form, setForm] = useState({ name: "", email: demoAdminCredentials.email, password: demoAdminCredentials.password, confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!register) {
      setForm((prev) => ({ ...prev, email: demoAdminCredentials.email, password: demoAdminCredentials.password }));
    }
  }, [register]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.email || !form.password) {
      setError("Vui lòng nhập email và mật khẩu.");
      return;
    }

    if (register && form.password !== form.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setLoading(true);

    try {
      if (register) {
        await registerUser({
          email: form.email,
          password: form.password,
          is_admin: false,
        });

        const loginResult = await loginUser({
          email: form.email,
          password: form.password,
        });

        if (loginResult.access_token) {
          go("calendar");
        }
      } else {
        const result = await loginUser({
          email: form.email,
          password: form.password,
        });

        if (result.access_token) {
          go("calendar");
        }
      }
    } catch (err) {
      setError(err.message || "Không thể kết nối tới API.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-layout">
      <section className="auth-art">
        <Brand />
        <div className="auth-message">
          <Badge tone="blue">✦ HỌC TẬP CHỦ ĐỘNG</Badge>
          <h1>Mỗi tuần học,<br />một nhịp điệu <em>của riêng bạn.</em></h1>
          <p>Sắp xếp thời gian thông minh. Tận hưởng hành trình đại học trọn vẹn hơn.</p>
          <div className="auth-preview"><div><CalendarDays size={18} /><b>Thứ Hai, 20 tháng 10</b></div><span>08:00　Cấu trúc dữ liệu</span><span>13:00　Toán rời rạc</span></div>
        </div>
        <small className="auth-copyright">© 2025 LichHoc · Đồng hành cùng bạn trên giảng đường.</small>
      </section>
      <section className="auth-form-side">
        <a className="back-home" href="#/home">← Trang chủ</a>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="eyebrow">{register ? "BẮT ĐẦU HÀNH TRÌNH" : "CHÀO MỪNG TRỞ LẠI"}</div>
          <h2>{register ? "Tạo tài khoản" : "Đăng nhập"}</h2>
          <p>{register ? "Tạo không gian học tập của riêng bạn." : "Đăng nhập để xem lịch học của bạn."}</p>

          {register && (
            <label className="field">
              <span>Họ và tên</span>
              <input name="name" value={form.name} onChange={handleChange} placeholder="Nguyễn Văn A" />
            </label>
          )}

          <label className="field">
            <span>Email sinh viên</span>
            <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="student@example.com" />
          </label>

          <label className="field">
            <span>Mật khẩu</span>
            <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="Nhập mật khẩu" />
          </label>

          {register && (
            <label className="field">
              <span>Nhập lại mật khẩu</span>
              <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} placeholder="Nhập lại mật khẩu" />
            </label>
          )}

          {!register && (
            <div className="auth-options">
              <label><input type="checkbox" /> Ghi nhớ đăng nhập</label>
              <a href="#/login">Quên mật khẩu?</a>
            </div>
          )}

          {error && <div className="error-banner">{error}</div>}

          <Button type="submit" disabled={loading}>
            {loading ? (register ? "Đang tạo tài khoản..." : "Đang đăng nhập...") : register ? "Tạo tài khoản miễn phí" : "Đăng nhập"} <ArrowUpRight size={16} />
          </Button>

          {!register && (
            <div className="demo-user-box">
              <strong>Tài khoản demo admin:</strong>
              <span>{demoAdminCredentials.email} / {demoAdminCredentials.password}</span>
            </div>
          )}

          <div className="auth-switch">
            {register ? "Đã có tài khoản?" : "Chưa có tài khoản?"} <a href={`#/${register ? "login" : "register"}`} onClick={() => go(register ? "login" : "register")}>{register ? "Đăng nhập" : "Đăng ký miễn phí"}</a>
          </div>

          <div className="auth-terms">Bằng cách tiếp tục, bạn đồng ý với <a href="#terms">Điều khoản sử dụng</a> và <a href="#privacy">Chính sách bảo mật</a>.</div>
        </form>
      </section>
    </main>
  );
}

export default AuthPage;
