import { getCurrentUser } from "./api";

function preferenceKey(user = getCurrentUser()) {
  const identity = user?.email || user?.id || "guest";
  return `lichhoc_class_reminders_${encodeURIComponent(String(identity).toLowerCase())}`;
}

export function getClassReminderPreferences(user) {
  const defaults = { enabled: false, minutesBefore: 15 };
  try {
    const saved = JSON.parse(localStorage.getItem(preferenceKey(user)) || "null");
    return {
      enabled: saved?.enabled === true,
      minutesBefore: Number(saved?.minutesBefore) === 30 ? 30 : defaults.minutesBefore,
    };
  } catch {
    return defaults;
  }
}

export function saveClassReminderPreferences(preferences, user) {
  const next = {
    enabled: Boolean(preferences.enabled),
    minutesBefore: Number(preferences.minutesBefore) === 30 ? 30 : 15,
  };
  localStorage.setItem(preferenceKey(user), JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("lichhoc:classReminderPreferencesChanged"));
  return next;
}

export function getReminderDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
