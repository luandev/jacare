/**
 * Downloads Manager
 * Fetches and displays download links from GitHub Releases API
 */

const REPO_OWNER = "luandev";
const REPO_NAME = "jacare";
const GITHUB_API = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;

// Platform detection patterns
const PLATFORM_PATTERNS = {
  windows: {
    patterns: [/\.exe$/i, /windows/i, /win/i, /nsis/i, /portable/i],
    folder: "windows"
  },
  macos: {
    patterns: [/\.dmg$/i, /\.zip$/i, /macos/i, /mac/i, /darwin/i],
    folder: "macos"
  },
  linux: {
    patterns: [/\.AppImage$/i, /\.deb$/i, /\.rpm$/i, /linux/i],
    folder: "linux"
  }
};

// File type labels
const FILE_TYPE_LABELS = {
  ".exe": "Installer",
  "portable": "Portable",
  ".dmg": "DMG",
  ".zip": "ZIP",
  ".AppImage": "AppImage",
  ".deb": "DEB",
  ".rpm": "RPM"
};

function formatFileSize(bytes) {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${Math.round(bytes / 1024)} KB`;
  return `${mb.toFixed(1)} MB`;
}

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function detectPlatform(filename) {
  for (const [platform, config] of Object.entries(PLATFORM_PATTERNS)) {
    if (config.patterns.some(pattern => pattern.test(filename))) {
      return platform;
    }
  }
  return null;
}

function getFileTypeLabel(filename) {
  for (const [type, label] of Object.entries(FILE_TYPE_LABELS)) {
    if (filename.includes(type) || (type === "portable" && filename.toLowerCase().includes("portable"))) {
      return label;
    }
  }
  return "Download";
}

function createDownloadButton(asset) {
  const platform = detectPlatform(asset.name);
  const label = getFileTypeLabel(asset.name);
  const size = formatFileSize(asset.size);
  const isPrimary = asset.name.includes("Setup") || asset.name.includes(".dmg") || asset.name.includes(".AppImage");

  return {
    platform,
    html: `
      <a href="${asset.browser_download_url}" 
         class="download-button ${isPrimary ? "" : "secondary"}" 
         target="_blank" 
         rel="noopener">
        <span>${label}</span>
        ${size ? `<span class="file-size">(${size})</span>` : ""}
      </a>
    `
  };
}

function groupDownloadsByPlatform(assets) {
  const grouped = {
    windows: [],
    macos: [],
    linux: []
  };

  assets.forEach(asset => {
    const button = createDownloadButton(asset);
    if (button.platform && grouped[button.platform]) {
      grouped[button.platform].push(button.html);
    }
  });

  return grouped;
}

function renderDownloads(release) {
  const container = document.getElementById("downloads-container");
  const loading = document.getElementById("downloads-loading");
  const error = document.getElementById("downloads-error");

  if (!release || !release.assets || release.assets.length === 0) {
    loading.style.display = "none";
    error.style.display = "block";
    return;
  }

  // Update release info
  const versionEl = document.getElementById("latest-version");
  const dateEl = document.getElementById("release-date");
  const notesEl = document.getElementById("release-notes");

  if (versionEl) {
    versionEl.textContent = `Latest Release: ${release.tag_name}`;
  }
  if (dateEl) {
    dateEl.textContent = formatDate(release.published_at);
  }
  if (notesEl) {
    const notes = release.body || "No release notes available.";
    notesEl.textContent = notes.length > 200 ? notes.substring(0, 200) + "..." : notes;
  }

  // Group downloads by platform
  const grouped = groupDownloadsByPlatform(release.assets);

  // Render platform sections
  Object.entries(grouped).forEach(([platform, buttons]) => {
    const containerId = `${platform}-downloads`;
    const container = document.getElementById(containerId);
    if (container) {
      if (buttons.length > 0) {
        container.innerHTML = buttons.join("");
      } else {
        container.innerHTML = `<p style="color: var(--muted);">No ${platform} builds available for this release.</p>`;
      }
    }
  });

  // Show container, hide loading
  loading.style.display = "none";
  error.style.display = "none";
  container.style.display = "block";
}

async function fetchLatestRelease() {
  const loading = document.getElementById("downloads-loading");
  const error = document.getElementById("downloads-error");

  try {
    const response = await fetch(GITHUB_API);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const release = await response.json();
    renderDownloads(release);
  } catch (err) {
    console.error("Failed to fetch releases:", err);
    loading.style.display = "none";
    error.style.display = "block";
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", fetchLatestRelease);
} else {
  fetchLatestRelease();
}

