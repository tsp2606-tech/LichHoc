# Tài Liệu API Tích Hợp Frontend (API Documentation) - Dự Án LichHoc_API

Tài liệu này cung cấp đầy đủ thông tin kỹ thuật về **tất cả các routes**, **headers**, **request payload** và **response mẫu** để lập trình viên Frontend dễ dàng kết nối và hiển thị dữ liệu lịch học.

---

## 📌 1. Thông Tin Chung & Cấu Hình Kết Nối

| Dịch vụ | Công nghệ | Cổng mặc định (Port) | Base URL | Mô tả chính |
| :--- | :--- | :---: | :--- | :--- |
| **Schedule & Auth API** | Python (Flask, SQLite, JWT) | `5000` | `http://localhost:5000` | Xác thực JWT, bóc tách `outerHTML`, lưu lịch theo từng User, Admin Dashboard |
| **LichHoc CRUD API** | Node.js (Express, MongoDB) | `5001` / `5000` | `http://localhost:5001` | Quản lý CRUD thông tin môn học, Swagger UI tại `/api-docs` |

### Quy ước Headers:
- Khi gửi dữ liệu JSON: `Content-Type: application/json`
- Với các route yêu cầu đăng nhập: `Authorization: Bearer <access_token>`

---

## 🔐 2. Nhóm API Xác Thực Người Dùng (Authentication)
*Áp dụng trên Python Flask Server (`http://localhost:5000`)*

### 2.1. Đăng ký tài khoản
- **Route:** `POST /api/auth/register`
- **Yêu cầu Auth:** *Không*
- **Request Body (JSON):**
```json
{
  "email": "student@example.com",
  "password": "password123",
  "is_admin": false
}
```
- **Response (201 Created):**
```json
{
  "message": "Đăng ký thành công",
  "user": {
    "id": 1,
    "email": "student@example.com",
    "is_admin": false,
    "created_at": "2026-09-23T10:30:00.000000"
  }
}
```
- **Lỗi (400 Bad Request):**
```json
{
  "error": "Email đã tồn tại trong hệ thống"
}
```

---

### 2.2. Đăng nhập hệ thống
- **Route:** `POST /api/auth/login`
- **Yêu cầu Auth:** *Không*
- **Request Body (JSON):**
```json
{
  "email": "student@example.com",
  "password": "password123"
}
```
- **Response (200 OK):**
```json
{
  "message": "Đăng nhập thành công",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "student@example.com",
    "is_admin": false,
    "created_at": "2026-09-23T10:30:00.000000"
  }
}
```
- **Lỗi (401 Unauthorized):**
```json
{
  "error": "Email hoặc mật khẩu không chính xác"
}
```

### 2.2.1. Quy tắc bảo mật bắt buộc cho API

- Không trả về `password`, `password_hash`, `hashed_password` hoặc bất kỳ biến thể nào trong mọi response (`register`, `login`, `me`, admin users, refresh token và lỗi). Chỉ lưu mật khẩu dưới dạng hash bằng Argon2id hoặc bcrypt; tuyệt đối không tự hash bằng SHA-256/MD5.
- Giới hạn tốc độ ở backend theo IP và tài khoản/email đã chuẩn hóa. Khi vượt giới hạn, trả `429 Too Many Requests`, header `Retry-After` (giây), và không tiết lộ email có tồn tại hay không.
- Khi hệ thống quá tải, đưa request vào hàng đợi dùng chung có giới hạn. Response `429` có thể gồm metadata không nhạy cảm:

```json
{
  "error": "Hệ thống đang quá tải, vui lòng chờ",
  "queue": {
    "position": 12,
    "total": 48,
    "retry_after": 10
  }
}
```

- `position` và `total` phải là số nguyên không âm; không đưa password, token, email hoặc thông tin định danh người dùng khác vào metadata hàng đợi. Rate limit và queue phải được thực hiện ở API service, không chỉ ở frontend.

---

## 📅 3. Nhóm API Bóc Tách & Quản Lý Lịch Học (Schedule API)
*Áp dụng trên Python Flask Server (`http://localhost:5000`)*

### 3.1. Bóc tách mã outerHTML sang danh sách JSON
- **Route:** `POST /api/schedule/parse`
- **Yêu cầu Auth:** *Không* (Công khai, FE có thể gọi trực tiếp)
- **Mô tả:** Nhận toàn bộ chuỗi HTML bảng lịch của trường (ASP.NET RadScheduler) và trả về mảng danh sách các môn học đã được chuẩn hóa.
- **Request Body (JSON):**
```json
{
  "html": "<table class=\"rsContentTable\">...</table>"
}
```
- **Response (200 OK):**
```json
{
  "count": 2,
  "events": [
    {
      "class_code": "IS 301 E",
      "subject": "Cơ Sở Dữ Liệu",
      "room": "P. Online 20",
      "location": "Online",
      "start_time": "07:00",
      "end_time": "09:00",
      "day_index": 0,
      "day_name": "Thứ 2"
    },
    {
      "class_code": "CS 311 Q",
      "subject": "Lập Trình Hướng Đối Tượng",
      "room": "P. 308",
      "location": "Hòa Khánh Nam - Tòa Nhà G",
      "start_time": "07:00",
      "end_time": "09:00",
      "day_index": 1,
      "day_name": "Thứ 3"
    }
  ]
}
```
- **Lỗi (400 Bad Request):**
```json
{
  "error": "Thiếu trường 'html' trong body"
}
```

---

### 3.2. Lưu lịch học vào Database theo Tài Khoản
- **Route:** `POST /api/schedule`
- **Yêu cầu Auth:** **Bắt buộc** (`Authorization: Bearer <token>`)
- **Mô tả:** Lưu lịch học gắn với `user_id` của tài khoản đang đăng nhập. Hỗ trợ gửi mảng `events` (đã parse) hoặc gửi thẳng chuỗi `html` để server tự parse và lưu.
- **Cách 1: Gửi mảng `events`:**
```json
{
  "events": [
    {
      "class_code": "IS 301 E",
      "subject": "Cơ Sở Dữ Liệu",
      "room": "P. Online 20",
      "location": "Online",
      "start_time": "07:00",
      "end_time": "09:00",
      "day_index": 0,
      "day_name": "Thứ 2"
    }
  ]
}
```
- **Cách 2: Gửi trực tiếp chuỗi `html`:**
```json
{
  "html": "<table>...</table>"
}
```
- **Response (201 Created):**
```json
{
  "message": "Lưu lịch học thành công",
  "count": 1,
  "events": [
    {
      "id": 15,
      "user_id": 1,
      "class_code": "IS 301 E",
      "subject": "Cơ Sở Dữ Liệu",
      "room": "P. Online 20",
      "location": "Online",
      "start_time": "07:00",
      "end_time": "09:00",
      "day_index": 0,
      "day_name": "Thứ 2",
      "created_at": "2026-09-23T10:45:00.000000"
    }
  ]
}
```
- **Lỗi chưa đăng nhập (401 Unauthorized):**
```json
{
  "error": "Thiếu token xác thực hoặc token không hợp lệ"
}
```

---

### 3.3. Lấy danh sách lịch học của User đang đăng nhập
- **Route:** `GET /api/schedule`
- **Yêu cầu Auth:** **Bắt buộc** (`Authorization: Bearer <token>`)
- **Mô tả:** Trả về danh sách tất cả các môn học đã lưu của chính tài khoản đang đăng nhập.
- **Response (200 OK):**
```json
{
  "count": 1,
  "events": [
    {
      "id": 15,
      "user_id": 1,
      "class_code": "IS 301 E",
      "subject": "Cơ Sở Dữ Liệu",
      "room": "P. Online 20",
      "location": "Online",
      "start_time": "07:00",
      "end_time": "09:00",
      "day_index": 0,
      "day_name": "Thứ 2",
      "created_at": "2026-09-23T10:45:00.000000"
    }
  ]
}
```

---

### 3.4. Kiểm tra sức khỏe hệ thống (Health Check)
- **Route:** `GET /api/schedule/health`
- **Yêu cầu Auth:** *Không*
- **Response (200 OK):**
```json
{
  "status": "ok"
}
```

---

## 🛡️ 4. Nhóm API Quản Trị Hệ Thống (Admin Only)
*Áp dụng trên Python Flask Server (`http://localhost:5000`)*

> [!IMPORTANT]
> Các endpoint này chỉ tài khoản có `is_admin: true` mới có thể gọi. User thường truy cập sẽ nhận mã lỗi `403 Forbidden`.

### 4.1. Xem Dashboard Quản Trị
- **Route:** `GET /admin/dashboard`
- **Yêu cầu Auth:** **Bắt buộc Admin**
- **Query params (tùy chọn):** `?format=json` (nếu muốn nhận dữ liệu thô dạng JSON thay vì giao diện HTML).
- **Response (200 OK - dạng JSON):**
```json
{
  "total_users": 2,
  "total_schedules": 9,
  "users": [
    {
      "id": 1,
      "email": "student@example.com",
      "is_admin": false,
      "created_at": "2026-09-23T10:30:00.000000",
      "schedules": [
        {
          "id": 15,
          "class_code": "IS 301 E",
          "subject": "Cơ Sở Dữ Liệu",
          "day_name": "Thứ 2",
          "start_time": "07:00",
          "end_time": "09:00"
        }
      ]
    }
  ]
}
```
- **Lỗi không phải Admin (403 Forbidden):**
```json
{
  "error": "Quyền truy cập bị từ chối. Chỉ dành cho Admin."
}
```

---

### 4.2. Admin xóa 1 môn học theo ID
- **Route:** `DELETE /admin/schedule/{id}`
- **Yêu cầu Auth:** **Bắt buộc Admin**
- **Path Parameter:** `id` (ID của bản ghi lịch học)
- **Response (200 OK):**
```json
{
  "message": "Đã xóa lịch học thành công",
  "deleted_id": 15
}
```

---

### 4.3. Admin xóa người dùng theo ID
- **Route:** `DELETE /admin/user/{id}`
- **Yêu cầu Auth:** **Bắt buộc Admin**
- **Path Parameter:** `id` (ID của tài khoản người dùng)
- **Mô tả:** Tự động xóa tài khoản và toàn bộ lịch học liên quan của người dùng đó.
- **Response (200 OK):**
```json
{
  "message": "Đã xóa người dùng thành công",
  "deleted_user_id": 1
}
```

---

## 🗄️ 5. Nhóm API CRUD Lịch Học MongoDB (Node.js Express Server)
*Áp dụng trên Node.js Server (`http://localhost:5001` hoặc `5000`)*

### 5.1. Lấy tất cả lịch học
- **Route:** `GET /api/lich-hoc`
- **Response (200 OK):**
```json
[
  {
    "_id": "66b437c9ce982033cd76a63",
    "monHoc": "Lập trình Web",
    "giangVien": "ThS. Nguyễn Văn A",
    "phongHoc": "A101",
    "thu": "Thứ Hai",
    "tietBatDau": 1,
    "tietKetThuc": 3,
    "thoiGian": "07:00 - 09:30",
    "ghiChu": "Mang theo laptop",
    "createdAt": "2026-09-23T10:00:00.000Z",
    "updatedAt": "2026-09-23T10:00:00.000Z"
  }
]
```

### 5.2. Thêm lịch học mới
- **Route:** `POST /api/lich-hoc`
- **Request Body (JSON):**
```json
{
  "monHoc": "Lập trình Web",
  "giangVien": "ThS. Nguyễn Văn A",
  "phongHoc": "A101",
  "thu": "Thứ Hai",
  "tietBatDau": 1,
  "tietKetThuc": 3,
  "thoiGian": "07:00 - 09:30",
  "ghiChu": "Mang theo laptop"
}
```
- **Response (201 Created):**
```json
{
  "message": "Thành công",
  "data": {
    "_id": "66b437c9ce982033cd76a63",
    "monHoc": "Lập trình Web",
    "giangVien": "ThS. Nguyễn Văn A",
    "phongHoc": "A101",
    "thu": "Thứ Hai",
    "tietBatDau": 1,
    "tietKetThuc": 3,
    "thoiGian": "07:00 - 09:30",
    "ghiChu": "Mang theo laptop",
    "createdAt": "2026-09-23T10:00:00.000Z",
    "updatedAt": "2026-09-23T10:00:00.000Z"
  }
}
```

### 5.3. Xem chi tiết lịch học theo ID
- **Route:** `GET /api/lich-hoc/{id}`
- **Response (200 OK):** Trả về đối tượng chi tiết tương tự mục 5.2.

### 5.4. Sửa thông tin lịch học theo ID
- **Route:** `PUT /api/lich-hoc/{id}`
- **Request Body (JSON):** Truyền các trường cần cập nhật (ví dụ: `monHoc`, `phongHoc`, v.v.).
- **Response (200 OK):** Trả về đối tượng sau khi đã sửa đổi.

### 5.5. Xóa lịch học theo ID
- **Route:** `DELETE /api/lich-hoc/{id}`
- **Response (200 OK):** `{"message": "Đã xóa"}`

---

## 💻 6. Hướng Dẫn Tích Hợp Vào Frontend (Code Mẫu React / JavaScript)

Dưới đây là module gọi API mẫu sử dụng `fetch` hoặc `axios` để lập trình viên Frontend sao chép và dùng ngay:

```javascript
// src/services/scheduleApi.js
const BASE_URL = "http://localhost:5000";

// 1. Lưu token vào localStorage
export const setAuthToken = (token) => {
  localStorage.setItem("access_token", token);
};

export const getAuthToken = () => {
  return localStorage.getItem("access_token");
};

// 2. Đăng ký
export async function register(email, password) {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

// 3. Đăng nhập
export async function login(email, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data.access_token) {
    setAuthToken(data.access_token);
  }
  return data;
}

// 4. Parse outerHTML trực tiếp từ server
export async function parseScheduleHtml(htmlString) {
  const res = await fetch(`${BASE_URL}/api/schedule/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html: htmlString }),
  });
  return res.json();
}

// 5. Lưu lịch học kèm Token người dùng
export async function saveSchedule(eventsOrHtml) {
  const token = getAuthToken();
  const body = typeof eventsOrHtml === "string" 
    ? { html: eventsOrHtml } 
    : { events: eventsOrHtml };

  const res = await fetch(`${BASE_URL}/api/schedule`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

// 6. Lấy danh sách lịch học của người dùng hiện tại
export async function getMySchedule() {
  const token = getAuthToken();
  const res = await fetch(`${BASE_URL}/api/schedule`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.json();
}
```
