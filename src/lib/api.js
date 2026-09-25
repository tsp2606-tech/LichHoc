const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
const AUTH_KEY = "lichhoc_access_token";
const REFRESH_KEY = "lichhoc_refresh_token";
const USER_KEY = "lichhoc_user";

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

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY) || "";
}

export function setRefreshToken(token) {
  if (token) {
    localStorage.setItem(REFRESH_KEY, token);
    return;
  }
  localStorage.removeItem(REFRESH_KEY);
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
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

// Cơ chế tự động làm mới access token
let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(newToken) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

export async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      clearAuth();
      return null;
    }

    const data = await res.json();
    if (data.access_token) {
      setAuthToken(data.access_token);
      if (data.user) {
        setCurrentUser(data.user);
      }
      return data.access_token;
    }

    clearAuth();
    return null;
  } catch {
    clearAuth();
    return null;
  }
}

async function apiRequest(path, options = {}) {
  let token = getAuthToken();
  const headers = { ...(options.headers || {}) };

  if (!(options.body instanceof FormData) && !headers["Content-Type"] && options.body) {
    headers["Content-Type"] = "application/json";
  }

  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (netErr) {
    const error = new Error("Lỗi kết nối API. Vui lòng kiểm tra lại dịch vụ máy chủ.");
    error.status = 0;
    error.code = "API_ERROR";
    throw error;
  }

  // Nếu gặp lỗi 401 (Token hết hạn), tự động dùng refresh_token lấy token mới và retry
  if (response.status === 401 && !path.startsWith("/api/auth/login") && !path.startsWith("/api/auth/refresh")) {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      if (!isRefreshing) {
        isRefreshing = true;
        const newToken = await refreshAccessToken();
        isRefreshing = false;

        if (newToken) {
          onTokenRefreshed(newToken);
          const retryHeaders = { ...(options.headers || {}), Authorization: `Bearer ${newToken}` };
          if (!(options.body instanceof FormData) && !retryHeaders["Content-Type"] && options.body) {
            retryHeaders["Content-Type"] = "application/json";
          }
          response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers: retryHeaders,
          });
        }
      } else {
        // Chờ token mới khi một tiến trình khác đang refresh
        const newToken = await new Promise((resolve) => subscribeTokenRefresh(resolve));
        if (newToken) {
          const retryHeaders = { ...(options.headers || {}), Authorization: `Bearer ${newToken}` };
          if (!(options.body instanceof FormData) && !retryHeaders["Content-Type"] && options.body) {
            retryHeaders["Content-Type"] = "application/json";
          }
          response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers: retryHeaders,
          });
        }
      }
    }

    if (response.status === 401) {
      clearAuth();
    }
  }

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
    const error = new Error(data.error || data.message || `Lỗi máy chủ phản hồi mã ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export async function registerUser({ email, password, name = "", is_admin = false }) {
  return apiRequest("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name, is_admin }),
  });
}

export async function loginUser({ email, password, remember_me = false }) {
  const data = await apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, remember_me }),
  });

  if (data.access_token) {
    setAuthToken(data.access_token);
    setCurrentUser(data.user || null);

    // Lưu refresh_token nếu có
    if (data.refresh_token) {
      setRefreshToken(data.refresh_token);
    }
  }

  return data;
}

export async function googleLoginApi({ idToken, userInfo }) {
  const data = await apiRequest("/api/auth/google-login", {
    method: "POST",
    body: JSON.stringify({ idToken, userInfo }),
  });

  if (data.access_token) {
    setAuthToken(data.access_token);
    setCurrentUser(data.user || null);

    if (data.refresh_token) {
      setRefreshToken(data.refresh_token);
    }
  }

  return data;
}

export async function updateUserProfile({ name, email, password }) {
  const data = await apiRequest("/api/auth/profile", {
    method: "PUT",
    body: JSON.stringify({ name, email, password }),
  });

  if (data.user) {
    setCurrentUser(data.user);
  }

  return data;
}

export async function getUserProfile() {
  const data = await apiRequest("/api/auth/me", { method: "GET" });
  if (data.user) {
    setCurrentUser(data.user);
  }
  return data.user;
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
  const weekRange = (source.week_range || source.weekRange || "").trim();

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
    weekRange,
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
    week_range: (event.weekRange || event.week_range || "").trim(),
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
  return apiRequest(`/api/admin/users/${userId}`, { method: "DELETE" });
}

export async function deleteAdminUser(userId) {
  return apiRequest(`/api/admin/users/${userId}`, { method: "DELETE" });
}

export async function getAdminUsers(searchQuery = "") {
  const q = searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : "";
  return apiRequest(`/api/admin/users${q}`, { method: "GET" });
}

export async function updateUserRole(userId, isAdmin) {
  return apiRequest(`/api/admin/users/${userId}/role`, {
    method: "PUT",
    body: JSON.stringify({ is_admin: isAdmin }),
  });
}

export async function getAdminActivityLogs(limit = 100) {
  return apiRequest(`/api/admin/logs?limit=${limit}`, { method: "GET" });
}

export async function getAdminStats() {
  return apiRequest("/api/admin/stats", { method: "GET" });
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
  const weekRange = (event.weekRange || event.week_range || "").trim();
  return {
    id: event.id,
    day: dayText,
    dayIndex: Number(event.dayIndex ?? 0),
    dayName: dayText,
    startTime: event.startTime || "07:00",
    endTime: event.endTime || "09:00",
    date: weekRange ? `Tuần ${weekRange}` : `Tuần ${index + 1}`,
    weekRange,
    time: `${event.startTime || "07:00"} – ${event.endTime || "09:00"}`,
    name: event.subject || "Lịch học",
    subject: event.subject || "Lịch học",
    code: event.classCode || `LS${index + 1}`,
    classCode: event.classCode || `LS${index + 1}`,
    room: event.room || (event.isOnline ? "Online" : "Phòng học"),
    location: event.location || "",
    teacher: event.location || "Đã đồng bộ từ API",
    isOnline: Boolean(event.isOnline),
    tone: event.isOnline ? "mint" : "blue",
    status: "Đã đồng bộ",
  };
}
