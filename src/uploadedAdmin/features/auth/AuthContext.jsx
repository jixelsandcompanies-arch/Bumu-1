/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);
const tokenKey = "bumu-admin-token";
const sessionTimeoutMs = 30 * 60 * 1000;

const defaultUser = {
  id: "",
  name: "",
  email: "",
  role: "super_admin",
  photoUrl: ""
};

export function getAdminToken() {
  return window.sessionStorage.getItem(tokenKey) || "";
}

function setAdminSession({ token, user }) {
  if (token) window.sessionStorage.setItem(tokenKey, token);
}

function clearAdminSession() {
  window.sessionStorage.removeItem(tokenKey);
}

async function apiRequest(path, { method = "GET", body } = {}) {
  const token = getAdminToken();
  const response = await fetch(path, {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(data.message || `Admin request failed with HTTP ${response.status}.`);
  }

  return data;
}

export function getPortalPathForRole(role) {
  if (role === "back_office_officer") return "/backoffice/overview";

  if (["super_admin", "admin"].includes(role)) {
    return "/admin/overview";
  }

  if (role === "finance_officer" || role === "finance") return "/finance";
  if (role === "agent") return "/agent";
  if (role === "customer") return "/customer";
  return "/login";
}

export const adminPermissionsByRole = {
  super_admin: [
    "overview",
    "applications",
    "agents",
    "users",
    "customers",
    "bikes",
    "finance",
    "reports",
    "notifications",
    "audit",
    "settings",
    "profile"
  ],
  admin: [
    "overview",
    "applications",
    "agents",
    "users",
    "customers",
    "bikes",
    "finance",
    "reports",
    "notifications",
    "audit",
    "settings",
    "profile"
  ],
  back_office_officer: [
    "overview",
    "applications",
    "agents",
    "customers",
    "bikes",
    "notifications",
    "audit",
    "profile"
  ],
  finance_officer: ["profile"]
};

function normalizeBackendUser(user = {}) {
  return {
    id: user.id || "",
    name: user.fullName || user.name || user.email || "",
    email: user.email || "",
    phone: user.phone || "",
    role: user.role === "admin" ? "super_admin" : user.role || "super_admin",
    photoUrl: user.photoUrl || ""
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authStatus, setAuthStatus] = useState(() => (getAdminToken() ? "loading" : "ready"));
  const [otpChallenge, setOtpChallenge] = useState(null);

  useEffect(() => {
    const token = getAdminToken();

    if (!token) {
      clearAdminSession();
      setUser(null);
      setAuthStatus("ready");
      return;
    }

    let cancelled = false;
    setAuthStatus("loading");
    apiRequest("/api/admin/auth/me")
      .then((data) => {
        if (cancelled) return;
        const normalizedUser = normalizeBackendUser(data.user);
        setAdminSession({ token, user: normalizedUser });
        setUser(normalizedUser);
      })
      .catch(() => {
        if (cancelled) return;
        clearAdminSession();
        setUser(null);
      })
      .finally(() => {
        if (!cancelled) setAuthStatus("ready");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function login(email, password) {
    if (!email || !password) {
      return { ok: false, message: "Email and password are required." };
    }

    try {
      setAuthStatus("loading");
      const data = await apiRequest("/api/admin/auth/login", {
        method: "POST",
        body: { email, password }
      });
      const normalizedUser = normalizeBackendUser(data.user);
      setAdminSession({ token: data.token, user: normalizedUser });
      setUser(normalizedUser);
      return { ok: true, user: normalizedUser };
    } catch (error) {
      clearAdminSession();
      setUser(null);
      return { ok: false, message: error.message };
    } finally {
      setAuthStatus("ready");
    }
  }

  async function logout() {
    clearAdminSession();
    setUser(null);
  }

  const logoutForTimeout = useCallback(() => {
    clearAdminSession();
    setUser(null);
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    let timeoutId;
    const resetTimeout = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(logoutForTimeout, sessionTimeoutMs);
    };
    const activityEvents = ["click", "keydown", "mousemove", "scroll", "touchstart"];

    resetTimeout();
    activityEvents.forEach((eventName) => window.addEventListener(eventName, resetTimeout, { passive: true }));

    return () => {
      window.clearTimeout(timeoutId);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, resetTimeout));
    };
  }, [logoutForTimeout, user]);

  async function updateProfile(profile) {
    try {
      const data = await apiRequest("/api/admin/auth/profile", {
        method: "PATCH",
        body: profile
      });
      const normalizedUser = normalizeBackendUser(data.user);
      setUser(normalizedUser);
      return { ok: true, user: normalizedUser, message: "Profile saved to the shared database." };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  }

  async function updatePassword({ newPassword, confirmPassword }) {
    if (!newPassword || !confirmPassword) {
      return { ok: false, message: "Enter and confirm the new password." };
    }

    if (newPassword !== confirmPassword) {
      return { ok: false, message: "New password and confirmation do not match." };
    }

    return { ok: false, message: "Admin password changes must use the shared backend password reset flow." };
  }

  async function requestPasswordReset() {
    return { ok: false, message: "Admin password reset must be handled by the shared backend owner." };
  }

  function createOtpChallenge(label = "critical action") {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const challenge = {
      code,
      expiresAt: Date.now() + 10 * 60 * 1000,
      label
    };
    setOtpChallenge(challenge);
    return challenge;
  }

  function verifyOtpChallenge(code) {
    if (!otpChallenge) {
      return { ok: false, message: "Request a new OTP code." };
    }

    if (Date.now() > otpChallenge.expiresAt) {
      setOtpChallenge(null);
      return { ok: false, message: "OTP expired. Request a new code." };
    }

    if (String(code).trim() !== otpChallenge.code) {
      return { ok: false, message: "OTP code is incorrect." };
    }

    setOtpChallenge(null);
    return { ok: true };
  }

  function canAccessAdmin(permission) {
    if (!permission) return true;
    const allowed = adminPermissionsByRole[user?.role] || [];
    return allowed.includes(permission);
  }

  const value = {
    authStatus,
    canAccessAdmin,
    createOtpChallenge,
    isAuthenticated: Boolean(user && getAdminToken()),
    login,
    logout,
    otpChallenge,
    requestPasswordReset,
    updatePassword,
    updateProfile,
    user,
    verifyOtpChallenge
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
