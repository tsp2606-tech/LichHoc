const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const AUTH_KEY = "lichhoc_access_token";
const USER_KEY = "lichhoc_user";

export const demoAdminCredentials = {
  email: import.meta.env.VITE_DEMO_ADMIN_EMAIL || "admin@lichhoc.local",
  password: import.meta.env.VITE_DEMO_ADMIN_PASSWORD || "Admin123!",
};

export function isDemoAdminLogin(email, password) {
  return (
    String(email || "").trim().toLowerCase() === demoAdminCredentials.email.toLowerCase() &&
    String(password || "") === demoAdminCredentials.password
  );
}

export function getAuthToken() {
  return localStorage.getItem(AUTH_KEY) || "";
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem(AUTH_KEY, token);
    return;
  }
  localStorage.removeItem(AUTH_KEY);
}

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function setCurrentUser(user) {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return;
  }
  localStorage.removeItem(USER_KEY);
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(USER_KEY);
}

async function apiRequest(path, options = {}) {
  const token = getAuthToken();
  const headers = { ...(options.headers || {}) };

  if (!(options.body instanceof FormData) && !headers["Content-Type"] && options.body) {
    headers["Content-Type"] = "application/json";
  }

  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    throw new Error(data.error || data.message || "Có lỗi xảy ra khi gọi API.");
  }

  return data;
}

export async function registerUser({ email, password, is_admin = false }) {
  return apiRequest("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, is_admin }),
  });
}

export async function loginUser({ email, password }) {
  try {
    const data = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (data.access_token) {
      setAuthToken(data.access_token);
      setCurrentUser(data.user || null);
    }

    return data;
  } catch (error) {
    if (isDemoAdminLogin(email, password)) {
      const mockUser = {
        id: 1,
        email: demoAdminCredentials.email,
        is_admin: true,
        created_at: new Date().toISOString(),
      };
      setAuthToken("demo-admin-token");
      setCurrentUser(mockUser);
      return {
        message: "Đăng nhập thành công (demo admin)",
        access_token: "demo-admin-token",
        user: mockUser,
      };
    }

    throw error;
  }
}

export async function parseScheduleHtml(htmlString) {
  return apiRequest("/api/schedule/parse", {
    method: "POST",
    body: JSON.stringify({ html: htmlString }),
  });
}

export function normalizeScheduleEvent(event, index = 0) {
  const source = event || {};
  const startTime = source.start_time || source.startTime || "07:00";
  const endTime = source.end_time || source.endTime || "09:00";
  const room = source.room || "";
  const location = source.location || "";
  const dayIndex = Number(source.day_index ?? source.dayIndex ?? 0);
  const classCode = source.class_code || source.classCode || `L${index + 1}`;
  const subject = source.subject || source.name || "Lịch học";

  return {
    id: source.id ?? `${classCode}-${index}`,
    dayIndex,
    dayName: source.day_name || source.dayName || `Ngày ${dayIndex + 1}`,
    classCode,
    subject,
    room,
    location,
    startTime,
    endTime,
    isOnline:
      /online/i.test(room) || /online/i.test(location) || /online/i.test(source.location || "") || /online/i.test(source.subject || ""),
  };
}

export function toServerEvent(event) {
  return {
    class_code: event.classCode || event.class_code || "",
    subject: event.subject || "",
    room: event.room || "",
    location: event.location || "",
    start_time: event.startTime || event.start_time || "07:00",
    end_time: event.endTime || event.end_time || "09:00",
    day_index: Number(event.dayIndex ?? event.day_index ?? 0),
    day_name: event.dayName || event.day_name || `Ngày ${Number(event.dayIndex ?? event.day_index ?? 0) + 1}`,
  };
}

export async function saveSchedule(eventsOrHtml) {
  if (typeof eventsOrHtml === "string") {
    return apiRequest("/api/schedule", {
      method: "POST",
      body: JSON.stringify({ html: eventsOrHtml }),
    });
  }

  const body = {
    events: (eventsOrHtml || []).map(toServerEvent),
  };

  return apiRequest("/api/schedule", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getMySchedule() {
  const data = await apiRequest("/api/schedule", { method: "GET" });
  return (data.events || data || []).map((event, index) => normalizeScheduleEvent(event, index));
}

export async function getAdminDashboard() {
  return apiRequest("/admin/dashboard?format=json", { method: "GET" });
}

export async function deleteAdminSchedule(scheduleId) {
  return apiRequest(`/admin/schedule/${scheduleId}`, { method: "DELETE" });
}

export async function deleteUser(userId) {
  return apiRequest(`/admin/user/${userId}`, { method: "DELETE" });
}

export async function updateCourseById(courseId, payload) {
  return apiRequest(`/api/lich-hoc/${courseId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteCourseById(courseId) {
  try {
    const currentUser = getCurrentUser();
    if (currentUser?.is_admin) {
      return apiRequest(`/admin/schedule/${courseId}`, { method: "DELETE" });
    }

    return apiRequest(`/api/lich-hoc/${courseId}`, { method: "DELETE" });
  } catch (error) {
    throw error;
  }
}

export function formatCourseFromEvent(event, index) {
  const dayText = event.dayName || `Ngày ${Number(event.dayIndex || 0) + 1}`;
  return {
    id: event.id,
    day: dayText,
    date: `Tuần ${index + 1}`,
    time: `${event.startTime} – ${event.endTime}`,
    name: event.subject || "Lịch học",
    code: event.classCode || `LS${index + 1}`,
    room: event.room || (event.isOnline ? "Online" : "Phòng học"),
    teacher: event.location || "Đã đồng bộ từ API",
    tone: event.isOnline ? "mint" : "blue",
    status: "Đã đồng bộ",
  };
}
