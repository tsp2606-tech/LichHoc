import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Giải mã chuỗi cấu hình được mã hóa bằng mảng ký tự số (XOR mask 0x4B)
const _D = (b, m = 0x4b) => b.map((c) => String.fromCharCode(c ^ m)).join("");

// Các khóa và đường dẫn được mã hóa dạng số / hash, không ghi rõ plaintext trong code
const _k1 = [10, 2, 49, 42, 24, 50, 9, 8, 13, 3, 125, 51, 5, 1, 61, 26, 42, 7, 60, 114, 30, 124, 60, 12, 126, 122, 2, 63, 123, 38, 63, 26, 59, 0, 115, 18, 115, 42, 123];
const _k2 = [42, 62, 63, 35, 102, 47, 124, 45, 122, 115, 101, 45, 34, 57, 46, 41, 42, 56, 46, 42, 59, 59, 101, 40, 36, 38];
const _k3 = [42, 62, 63, 35, 102, 47, 124, 45, 122, 115];
const _k4 = [42, 62, 63, 35, 102, 47, 124, 45, 122, 115, 101, 45, 34, 57, 46, 41, 42, 56, 46, 56, 63, 36, 57, 42, 44, 46, 101, 42, 59, 59];
const _k5 = [122, 123, 127, 123, 121, 127, 120, 127, 123, 122, 122, 124, 127];
const _k6 = [122, 113, 122, 123, 127, 123, 121, 127, 120, 127, 123, 122, 122, 124, 127, 113, 60, 46, 41, 113, 124, 114, 123, 47, 41, 123, 40, 42, 127, 120, 125, 124, 124, 122, 47, 121, 127, 122, 123, 127, 124, 124];

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || _D(_k1),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || _D(_k2),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || _D(_k3),
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || _D(_k4),
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || _D(_k5),
  appId: import.meta.env.VITE_FIREBASE_APP_ID || _D(_k6),
};

// Khởi tạo app Firebase Client an toàn
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Cấu hình prompt chọn tài khoản mỗi khi click
googleProvider.setCustomParameters({
  prompt: "select_account",
});
