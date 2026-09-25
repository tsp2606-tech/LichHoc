import { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import { googleLoginApi } from "../lib/api";

export function GoogleLoginButton({ onSuccess, onError, text = "Đăng nhập bằng Google", disabled = false }) {
  const [loading, setLoading] = useState(false);

  const handleLoginGoogle = async () => {
    setLoading(true);
    try {
      // 1. Mở popup đăng nhập tài khoản Google (tham khảo AuthFE)
      const result = await signInWithPopup(auth, googleProvider);

      // 2. Lấy Firebase ID Token từ user đăng nhập
      const idToken = await result.user.getIdToken();

      const userInfo = {
        email: result.user.email,
        name: result.user.displayName || "",
        picture: result.user.photoURL || "",
        uid: result.user.uid,
      };

      // 3. Gửi idToken và userInfo lên Backend API
      const res = await googleLoginApi({ idToken, userInfo });

      // Nếu mở từ Chrome Extension, gửi tín hiệu đồng bộ qua window postMessage / storage
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("source") === "extension") {
        try {
          if (window.opener) {
            window.opener.postMessage(
              { type: "LICHHOC_EXTENSION_AUTH_SUCCESS", data: res },
              "*"
            );
          }
        } catch {
          // ignore cross-origin error if any
        }
      }

      if (onSuccess) {
        onSuccess(res);
      }
    } catch (error) {
      console.error("Lỗi Google Sign-In:", error);
      let errorMsg = "Đăng nhập Google thất bại. Vui lòng thử lại.";
      if (error.code === "auth/popup-blocked") {
        errorMsg = "Trình duyệt đã chặn Pop-up! Vui lòng cho phép pop-up trên thanh địa chỉ.";
      } else if (error.code === "auth/popup-closed-by-user") {
        errorMsg = "Bạn đã đóng cửa sổ đăng nhập Google.";
      } else if (error.message) {
        errorMsg = error.message;
      }

      if (onError) {
        onError(errorMsg, error.code);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLoginGoogle}
      disabled={loading || disabled}
      className="btn-google-login"
      aria-label="Đăng nhập bằng Google"
    >
      <svg width="18" height="18" viewBox="0 0 48 48" className="google-icon">
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        />
        <path
          fill="#FBBC05"
          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        />
      </svg>
      <span>{loading ? "Đang kết nối Google..." : text}</span>
    </button>
  );
}

export default GoogleLoginButton;
