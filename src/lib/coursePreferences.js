import { getCurrentUser } from "./api";

const PALETTE = ["#3b82f6", "#10b981", "#f97316", "#8b5cf6", "#ec4899", "#14b8a6", "#ef4444", "#eab308"];

function getPreferenceKey(user = getCurrentUser()) {
  const identity = user?.email || user?.id || "guest";
  return `lichhoc_course_colors_${encodeURIComponent(String(identity).toLowerCase())}`;
}

export function getCoursePreferenceId(course) {
  return String(course?.classCode || course?.code || course?.id || `${course?.name || course?.subject || "course"}-${course?.day || course?.dayIndex || ""}-${course?.time || course?.startTime || ""}`).trim();
}

export function getCourseColor(course, user) {
  try {
    const saved = JSON.parse(localStorage.getItem(getPreferenceKey(user)) || "{}");
    return saved[getCoursePreferenceId(course)] || "";
  } catch {
    return "";
  }
}

export function saveCourseColor(course, color, user) {
  const key = getPreferenceKey(user);
  const saved = JSON.parse(localStorage.getItem(key) || "{}");
  const id = getCoursePreferenceId(course);
  if (color) saved[id] = color;
  else delete saved[id];
  localStorage.setItem(key, JSON.stringify(saved));
  window.dispatchEvent(new CustomEvent("lichhoc-course-colors-changed"));
}

export function getCoursePalette() {
  return PALETTE;
}

function mixWithWhite(hex, amount) {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map((start) => parseInt(value.slice(start, start + 2), 16));
  return `#${channels.map((channel) => Math.round(channel + (255 - channel) * amount).toString(16).padStart(2, "0")).join("")}`;
}

export function getCourseColorStyles(color) {
  if (!/^#[0-9a-f]{6}$/i.test(color || "")) return null;
  return {
    backgroundColor: mixWithWhite(color, 0.84),
    borderColor: mixWithWhite(color, 0.32),
    color: "#1f2937",
    accentColor: color,
  };
}
