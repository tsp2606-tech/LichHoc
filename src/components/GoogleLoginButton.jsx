import { useEffect, useState } from "react";
import { getRedirectResult, signInWithPopup, signInWithRedirect } from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import { googleLoginApi } from "../lib/api";

let redirectResultHandled = false;

export function GoogleLoginButton({ onSuccess, onError, text = "Đăng nhập bằng Google", disabled = false }) {
  const [loading, setLoading] = useState(false);

  const completeGoogleLogin = async (user) => {
    const idToken = await user.getIdToken();
    const userInfo = {
      email: user.email,
      name: user.displayName || "",
      picture: user.photoURL || "",
      uid: user.uid,
    };
    const res = await googleLoginApi({ idToken, userInfo });

    const isExtensionFlow =
      new URLSearchParams(window.location.search).get("source") === "extension" ||
      new URLSearchParams(window.location.hash.slice(1)).get("source") === "extension";
    if (isExtensionFlow && window.opener) {
      window.opener.postMessage(
        { type: "LICHHOC_EXTENSION_AUTH_SUCCESS", data: res },
        "*"
      );
    }

    onSuccess?.(res);
  };

  const reportGoogleError = (error) => {
    console.error("Lỗi Google Sign-In:", error);
    let errorMsg = "Đăng nhập Google thất bại. Vui lòng thử lại.";
    if (error.code === "auth/popup-blocked") {
      errorMsg = "Trình duyệt đã chặn cửa sổ đăng nhập. Hãy thử mở trang bằng Chrome hoặc Safari.";
    } else if (error.code === "auth/popup-closed-by-user") {
      errorMsg = "Cửa sổ đăng nhập Google đã đóng trước khi hoàn tất. Hãy thử lại.";
    } else if (error.message) {
      errorMsg = error.message;
    }

    onError?.(errorMsg, error.code);
  };

  useEffect(() => {
    let active = true;

    getRedirectResult(auth)
      .then(async (result) => {
        if (!active || !result || redirectResultHandled) return;
        redirectResultHandled = true;
        setLoading(true);
        await completeGoogleLogin(result.user);
      })
      .catch((error) => {
        if (active) reportGoogleError(error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleLoginGoogle = async () => {
    setLoading(true);
    try {
      const isExtensionFlow =
        new URLSearchParams(window.location.search).get("source") === "extension" ||
        new URLSearchParams(window.location.hash.slice(1)).get("source") === "extension";
      const isMobileBrowser = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

      if (isMobileBrowser && !isExtensionFlow) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }

      const result = await signInWithPopup(auth, googleProvider);
      await completeGoogleLogin(result.user);
    } catch (error) {
      reportGoogleError(error);
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
