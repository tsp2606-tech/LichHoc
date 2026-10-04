function getStorageKey(user) {
  const identity = user?.email || user?.id || "guest";
  return `lichhoc_background_${encodeURIComponent(String(identity).toLowerCase())}`;
}

export function getSavedBackground(user) {
  try {
    return localStorage.getItem(getStorageKey(user)) || "";
  } catch {
    return "";
  }
}

export function applyBackgroundPreference(user) {
  const root = document.documentElement;
  const savedBackground = getSavedBackground(user);
  if (savedBackground) {
    root.style.setProperty("--lichhoc-artwork", `url("${savedBackground}")`);
  } else {
    root.style.removeProperty("--lichhoc-artwork");
  }
}

export function saveBackgroundPreference(user, dataUrl) {
  localStorage.setItem(getStorageKey(user), dataUrl);
  applyBackgroundPreference(user);
}

export function resetBackgroundPreference(user) {
  localStorage.removeItem(getStorageKey(user));
  applyBackgroundPreference(user);
}
