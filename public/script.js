const VARIANT_NUMBER = 12;
const STORAGE_PREFIX = "sys_";

function collectSystemAndBrowserInfo() {
  const nav = navigator;
  const now = new Date();

  return {
    osPlatform: nav.platform || "unknown",
    userAgent: nav.userAgent || "unknown",
    appName: nav.appName || "unknown",
    appVersion: nav.appVersion || "unknown",
    language: nav.language || "unknown",
    languages: Array.isArray(nav.languages) ? nav.languages.join(", ") : "unknown",
    vendor: nav.vendor || "unknown",
    product: nav.product || "unknown",
    cookieEnabled: String(nav.cookieEnabled),
    onLine: String(nav.onLine),
    hardwareConcurrency: String(nav.hardwareConcurrency ?? "unknown"),
    deviceMemory: String(nav.deviceMemory ?? "unknown"),
    maxTouchPoints: String(nav.maxTouchPoints ?? "unknown"),
    screenWidth: String(window.screen.width),
    screenHeight: String(window.screen.height),
    colorDepth: String(window.screen.colorDepth),
    pixelDepth: String(window.screen.pixelDepth),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown",
    generatedAt: now.toISOString()
  };
}

function saveSystemInfoToLocalStorage() {
  const systemInfo = collectSystemAndBrowserInfo();

  Object.entries(systemInfo).forEach(([key, value]) => {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, value);
  });

  localStorage.setItem("system_info_json", JSON.stringify(systemInfo, null, 2));
}

function renderLocalStorageInFooter() {
  const storageView = document.getElementById("storage-view");
  if (!storageView) return;

  if (localStorage.length === 0) {
    storageView.innerHTML = "<p>localStorage порожній.</p>";
    return;
  }

  const items = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key) continue;

    const value = localStorage.getItem(key) ?? "";
    items.push({ key, value });
  }

  items.sort((a, b) => a.key.localeCompare(b.key, "uk"));

  const tableRows = items
    .map((item) => {
      return `<tr><td>${escapeHtml(item.key)}</td><td>${escapeHtml(item.value)}</td></tr>`;
    })
    .join("");

  storageView.innerHTML = `
    <h3>Дані localStorage</h3>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Ключ</th>
            <th>Значення</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function loadComments() {
  const commentsStatus = document.getElementById("comments-status");
  const commentsList = document.getElementById("comments-list");
  if (!commentsStatus || !commentsList) return;

  const url = `https://jsonplaceholder.typicode.com/posts/${VARIANT_NUMBER}/comments`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const comments = await response.json();
    commentsStatus.textContent = `Завантажено коментарів: ${comments.length}`;

    comments.forEach((comment) => {
      const li = document.createElement("li");
      li.className = "comment-item";
      li.innerHTML = `
        <p><strong>${escapeHtml(comment.name)}</strong></p>
        <p><em>${escapeHtml(comment.email)}</em></p>
        <p>${escapeHtml(comment.body)}</p>
      `;
      commentsList.appendChild(li);
    });
  } catch (error) {
    commentsStatus.textContent = `Не вдалося завантажити коментарі (${error.message}).`;
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);

  const toggleBtn = document.getElementById("theme-toggle");
  if (toggleBtn) {
    toggleBtn.textContent = theme === "dark" ? "Денна тема" : "Нічна тема";
  }
}

function getAutoTheme() {
  const hour = new Date().getHours();
  return hour >= 7 && hour < 21 ? "light" : "dark";
}

function setupThemeToggle() {
  const toggleBtn = document.getElementById("theme-toggle");
  if (!toggleBtn) return;

  const savedTheme = localStorage.getItem("theme_mode");
  const initialTheme = savedTheme || getAutoTheme();
  applyTheme(initialTheme);

  toggleBtn.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
    const nextTheme = currentTheme === "light" ? "dark" : "light";
    applyTheme(nextTheme);
    localStorage.setItem("theme_mode", nextTheme);
    renderLocalStorageInFooter();
  });
}

function setupFeedbackModal() {
  const modal = document.getElementById("feedback-modal");
  const closeBtn = document.getElementById("modal-close");
  if (!modal || !closeBtn) return;

  const openModal = () => {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  };

  const closeModal = () => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  };

  setTimeout(openModal, 60000);

  closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function setupContactForm() {
  const form = document.getElementById("feedback-form");
  const statusEl = document.getElementById("feedback-status");
  if (!form || !statusEl) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      subject: String(formData.get("subject") || "").trim(),
      message: String(formData.get("message") || "").trim()
    };

    if (!payload.name || !payload.email || !payload.subject || !payload.message) {
      statusEl.textContent = "Будь ласка, заповніть усі поля форми.";
      return;
    }

    if (!isValidEmail(payload.email)) {
      statusEl.textContent = "Введіть коректний email.";
      return;
    }

    statusEl.textContent = "Надсилання...";

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Не вдалося надіслати повідомлення.");
      }

      statusEl.textContent = result.message || "Повідомлення успішно надіслано!";
      form.reset();
    } catch (error) {
      statusEl.textContent = error.message || "Помилка під час надсилання повідомлення.";
    }
  });
}

function init() {
  saveSystemInfoToLocalStorage();
  renderLocalStorageInFooter();
  setupThemeToggle();
  loadComments();
  setupFeedbackModal();
  setupContactForm();
}

document.addEventListener("DOMContentLoaded", init);
