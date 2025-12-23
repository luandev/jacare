/**
 * Theme Toggle
 * Manages light/dark theme switching
 */

function getStoredTheme() {
  return localStorage.getItem("theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  
  const icon = document.querySelector(".theme-icon");
  if (icon) {
    icon.textContent = theme === "dark" ? "☀️" : "🌙";
  }
}

function initTheme() {
  const theme = getStoredTheme();
  setTheme(theme);

  const toggle = document.getElementById("theme-toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      const newTheme = currentTheme === "dark" ? "light" : "dark";
      setTheme(newTheme);
    });
  }
}

// Initialize on load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTheme);
} else {
  initTheme();
}

