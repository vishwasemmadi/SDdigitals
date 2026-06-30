// ── SD Digitals CRM — Frontend Auth ──────────────────────────
// Token key used by login.html
const AUTH_TOKEN_KEY = 'crt_token';
const AUTH_USER_KEY  = 'crt_user';

// Intercept all fetch requests to automatically inject the Bearer token
const originalFetch = window.fetch;
window.fetch = async function () {
  let [resource, config] = arguments;

  if (!config) {
    config = {};
  }

  if (!config.headers) {
    config.headers = {};
  }

  const token = localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    if (config.headers instanceof Headers) {
      if (!config.headers.has('Authorization')) {
        config.headers.append('Authorization', `Bearer ${token}`);
      }
    } else {
      if (!config.headers['Authorization']) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
  }

  try {
    const response = await originalFetch(resource, config);
    // If response is 401 and we are not trying to log in, clear token and redirect to login
    if (response.status === 401 && !resource.toString().includes('/api/auth/login')) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
      sessionStorage.removeItem(AUTH_USER_KEY);
      window.location.href = 'login.html?next=' + encodeURIComponent(window.location.pathname + window.location.search);
    }
    return response;
  } catch (err) {
    throw err;
  }
};


function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY);
}

function getUser() {
  try {
    const u = localStorage.getItem(AUTH_USER_KEY) || sessionStorage.getItem(AUTH_USER_KEY);
    return u ? JSON.parse(u) : null;
  } catch { return null; }
}

function logout() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
  window.location.href = 'login.html';
}

// Guard: redirect to login if not authenticated
function requireAuth() {
  if (!getToken()) {
    window.location.href = 'login.html?next=' + encodeURIComponent(window.location.pathname + window.location.search);
    return false;
  }
  return true;
}

// Populate sidebar user info from stored user object
function populateSidebarUser() {
  const user = getUser();
  if (!user) return;
  const nameEl = document.querySelector('.user-name');
  const roleEl = document.querySelector('.user-role');
  const avatarEl = document.querySelector('.user-avatar');
  if (nameEl) nameEl.textContent = user.username || 'Admin';
  if (roleEl) roleEl.textContent = user.role || 'Staff';
  if (avatarEl) avatarEl.textContent = (user.username || 'SD').substring(0, 2).toUpperCase();
}

// Auto-run on every protected page
(function init() {
  if (requireAuth()) {
    populateSidebarUser();
  }
})();
