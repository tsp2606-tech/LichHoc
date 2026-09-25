import { useEffect, useState } from "react";
import { CalendarDays, ArrowUpRight } from "lucide-react";
import { Brand, Badge, Button } from "../components/AppShell";
import { loginUser, registerUser } from "../lib/api";
import { ErrorDialog } from "../components/ErrorDialog";
import { GoogleLoginButton } from "../components/GoogleLoginButton";

export function AuthPage({ mode, go }) {
  const register = mode === "register";
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorDialog, setErrorDialog] = useState(null); // { title, message, code, type }

  useEffect(() => {
    setError("");
    setErrorDialog(null);
    setForm({ name: "", email: "", password: "", confirmPassword: "" });
  }, [register]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setErrorDialog(null);

    const emailTrim = form.email.trim();
    const passwordTrim = form.password;

    if (!emailTrim || !passwordTrim) {
      const msg = "Vui lòng nhập đầy đủ Email sinh viên và Mật khẩu để tiếp tục.";
      setError(msg);
      setErrorDialog({
        title: register ? "Thiếu thông tin đăng ký" : "Thiếu thông tin đăng nhập",
        message: msg,
        code: "VALIDATION_EMPTY_FIELDS",
        type: "warning",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrim)) {
      const msg = "Địa chỉ email không đúng định dạng. Vui lòng nhập email hợp lệ (ví dụ: student@example.com hoặc student@duytan.edu.vn).";
      setError(msg);
      setErrorDialog({
        title: "Email không đúng định dạng",
        message: msg,
        code: "INVALID_EMAIL",
        type: "warning",
      });
      return;
    }

    if (register) {
      if (form.password.length < 6) {
        const msg = "Mật khẩu phải có độ dài tối thiểu từ 6 ký tự trở lên để đảm bảo an toàn cho tài khoản.";
        setError(msg);
        setErrorDialog({
          title: "Mật khẩu quá ngắn",
          message: msg,
          code: "PASSWORD_TOO_SHORT",
          type: "warning",
        });
        return;
      }

      if (form.password !== form.confirmPassword) {
        const msg = "Mật khẩu xác nhận không khớp với mật khẩu đã nhập. Vui lòng kiểm tra lại thật kỹ.";
        setError(msg);
        setErrorDialog({
          title: "Mật khẩu xác nhận không khớp",
          message: msg,
          code: "PASSWORD_MISMATCH",
          type: "warning",
        });
        return;
      }
    }

    setLoading(true);

    try {
      if (register) {
        await registerUser({
          email: emailTrim,
          password: form.password,
          name: form.name.trim(),
          is_admin: false,
        });

        const loginResult = await loginUser({
          email: emailTrim,
          password: form.password,
          remember_me: rememberMe,
        });

        if (loginResult.access_token) {
          go("calendar");
        }
      } else {
        const result = await loginUser({
          email: emailTrim,
          password: form.password,
          remember_me: rememberMe,
        });

        if (result.access_token) {
          go("calendar");
        }
      }
    } catch (err) {
      const errMsg = err.message || (register ? "Không thể hoàn tất đăng ký tài khoản." : "Email hoặc mật khẩu không chính xác.");
      setError(errMsg);
      setErrorDialog({
        title: register ? "Đăng ký không thành công" : "Đăng nhập không thành công",
        message: errMsg,
        code: err.status ? `HTTP_${err.status}` : "AUTH_FAILED",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Nếu mở từ Extension, lắng nghe và tự động chuyển hướng khi thành công
  const isExtension =
    window.location.search.includes("source=extension") ||
    window.location.hash.includes("source=extension") ||
    window.location.search.includes("ext=1") ||
    window.location.hash.includes("ext=1");

  const handleGoogleSuccess = (res) => {
    if (isExtension) {
      setTimeout(() => {
        try {
          window.close();
        } catch {
          go("calendar");
        }
      }, 500);
      return;
    }
    go("calendar");
  };

  const handleGoogleError = (errMsg, errCode) => {
    setError(errMsg);
    setErrorDialog({
      title: "Đăng nhập Google thất bại",
      message: errMsg,
      code: errCode || "GOOGLE_AUTH_FAILED",
      type: "error",
    });
  };

  if (isExtension) {
    return (
      <main className="extension-auth-layout">
        <div className="extension-auth-card">
          <div className="extension-brand-row">
            <span style={{ fontSize: "28px" }}>📅</span>
            <h2>LichHoc DTU</h2>
          </div>
          <p className="extension-auth-desc">
            Xác thực tài khoản Google để tự động đồng bộ lịch học với Tiện ích Extension.
          </p>

          {error && <div className="error-banner">{error}</div>}

          <div style={{ marginTop: "18px", marginBottom: "16px" }}>
            <GoogleLoginButton
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              text="Đăng nhập ngay bằng Google"
            />
          </div>

          <div className="extension-auth-footer">
            <small>Sau khi đăng nhập thành công, cửa sổ này sẽ tự động đóng lại.</small>
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
      </main>
    );
  }

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
              <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Ghi nhớ đăng nhập (Remember me)</span>
              </label>
          )}

          {error && <div className="error-banner">{error}</div>}

          <Button type="submit" disabled={loading}>
            {loading ? (register ? "Đang tạo tài khoản..." : "Đang đăng nhập...") : register ? "Tạo tài khoản miễn phí" : "Đăng nhập"} <ArrowUpRight size={16} />
          </Button>

          <div className="auth-divider">
            <span>hoặc</span>
          </div>

          <GoogleLoginButton
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            text={register ? "Đăng ký nhanh bằng Google" : "Đăng nhập bằng Google"}
            disabled={loading}
          />

          <div className="auth-switch">
            {register ? "Đã có tài khoản?" : "Chưa có tài khoản?"}{" "}
            <a
              href={`#/${register ? "login" : "register"}`}
              onClick={(e) => {
                e.preventDefault();
                go(register ? "login" : "register");
              }}
            >
              {register ? "Đăng nhập" : "Đăng ký miễn phí"}
            </a>
          </div>

          <div className="auth-terms">Bằng cách tiếp tục, bạn đồng ý với <a href="#terms">Điều khoản sử dụng</a> và <a href="#privacy">Chính sách bảo mật</a>.</div>
        </form>
      </section>

      <ErrorDialog
        isOpen={Boolean(errorDialog)}
        title={errorDialog?.title}
        message={errorDialog?.message}
        code={errorDialog?.code}
        type={errorDialog?.type || "error"}
        onClose={() => setErrorDialog(null)}
      />
    </main>
  );
}

export default AuthPage;

