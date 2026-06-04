/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getAdminToken, useAuth } from "../auth/AuthContext.jsx";

const AdminDataContext = createContext(null);

const defaultState = {
  agents: [],
  applications: [],
  archivedAuditLogs: [],
  auditLogs: [],
  bikes: [],
  customers: [],
  notifications: [],
  payments: [],
  users: []
};

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

function uploadedAgentStatus(status) {
  if (status === "pending") return "pending_approval";
  if (status === "inactive") return "deactivated";
  return status || "active";
}

function backendAgentStatus(status) {
  if (status === "pending_approval") return "pending";
  if (status === "deactivated") return "inactive";
  return status || "active";
}

function isoDate(value) {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString().slice(0, 10);
}

function mapPortal(portal = {}) {
  const agents = (portal.agents || []).map((agent) => ({
    id: agent.id,
    code: agent.agentCode || agent.code || agent.id,
    name: agent.name || "",
    nationalId: agent.nationalId || "",
    phone: agent.phone || "",
    email: agent.email || "",
    role: agent.role || "field_agent",
    region: agent.region || "",
    status: uploadedAgentStatus(agent.status),
    totalCustomers: Number(agent.totalCustomers || 0),
    commissionBalance: Number(agent.commissionBalance || 0)
  }));

  const customers = (portal.customers || []).map((customer) => ({
    id: customer.id,
    name: customer.name || "",
    nationalId: customer.nationalId || "",
    phone: customer.phone || "",
    email: customer.email || "",
    dateOfBirth: customer.dateOfBirth || "",
    gender: customer.gender || "",
    location: customer.location || "",
    occupation: customer.occupation || "",
    agentId: customer.agentId || "",
    applicationStatus: customer.applicationStatus || customer.status || "active",
    repaymentStatus: customer.repaymentStatus || customer.status || "active",
    balance: Number(customer.balance || 0),
    createdAt: customer.createdAt || ""
  }));

  const bikes = (portal.products || []).map((product) => ({
    id: product.id,
    model: product.productModel || product.model || "",
    serialNumber: product.serialNumber || "",
    chassisNumber: product.chassisNumber || "",
    status: product.status || "available",
    assignedCustomerId: product.assignedCustomerId || null,
    assignedAgentId: product.assignedAgentId || null,
    createdAt: product.createdAt || ""
  }));

  const applications = (portal.applications || []).map((application) => {
    const customer = customers.find((item) => item.id === application.customerId);
    return {
      id: application.id,
      customerId: application.customerId,
      agentId: application.agentId || "",
      bikeId: application.bikeId || "",
      depositAmount: Number(application.depositAmount || 0),
      installmentPlan: application.installmentPlan || "Daily repayment",
      submittedAt: application.submittedAt || application.createdAt || "",
      reviewedAt: application.reviewedAt || "",
      reviewedBy: application.reviewedBy || "",
      customerOtpVerified: Boolean(application.customerOtpVerified),
      nextOfKinOtpVerified: Boolean(application.nextOfKinOtpVerified),
      nextOfKin: application.nextOfKin || customer?.nextOfKin || "",
      status: application.status || "pending_screening",
      screeningNotes: application.reason || application.screeningNotes || "",
      rejectionReason: application.rejectionReason || "",
      infoRequiredMessage: application.infoRequiredMessage || "",
      duplicateNationalId: Boolean(application.duplicateNationalId),
      documents: application.documents || [],
      verification: application.verification || {}
    };
  });

  const payments = (portal.payments || []).map((payment) => ({
    id: payment.id,
    receipt: payment.receipt || payment.id,
    customerId: payment.customerId || "",
    agentId: payment.agentId || "",
    amount: Number(payment.amount || 0),
    status: ["paid", "completed", "success"].includes(String(payment.status || "").toLowerCase()) ? "success" : payment.status || "pending",
    reconciliationStatus: payment.reconciliationStatus || "matched",
    paidAt: payment.paidAt || payment.date || ""
  }));

  const auditLogs = (portal.audits || []).map((audit) => ({
    id: audit.id,
    actor: audit.actorEmail || "system",
    role: "admin",
    action: audit.action || "",
    entityType: audit.targetTable || "",
    entityId: audit.targetId || "",
    createdAt: audit.createdAt || "",
    ipAddress: audit.ipAddress || "server"
  }));

  const users = (portal.financeUsers || []).map((user) => ({
    id: user.id,
    name: user.name || user.email,
    email: user.email || "",
    phone: user.phone || "",
    role: user.role || "finance_officer",
    status: user.status || "pending",
    createdAt: user.createdAt || ""
  }));

  return {
    agents,
    applications,
    archivedAuditLogs: [],
    auditLogs,
    bikes,
    customers,
    notifications: portal.notifications || [],
    payments,
    users
  };
}

function makeAudit(action, entityType, entityId, actor, role) {
  return {
    id: `log-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    actor,
    role,
    action,
    entityType,
    entityId,
    createdAt: new Date().toISOString(),
    ipAddress: "client-session"
  };
}

export function AdminDataProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [state, setState] = useState(defaultState);
  const [dataStatus, setDataStatus] = useState("idle");
  const [dataError, setDataError] = useState("");

  const loadPortal = useCallback(async ({ silent = false } = {}) => {
    if (!isAuthenticated) {
      setState(defaultState);
      setDataStatus("idle");
      return;
    }

    try {
      if (!silent) setDataStatus("loading");
      const data = await apiRequest("/api/admin/portal");
      setState({ ...defaultState, ...mapPortal(data.portal) });
      setDataStatus("live");
      setDataError("");
    } catch (error) {
      setDataStatus("error");
      setDataError(error.message || "Unable to load shared admin database.");
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadPortal();
  }, [loadPortal]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const timer = window.setInterval(() => {
      loadPortal({ silent: true });
    }, 15000);
    return () => window.clearInterval(timer);
  }, [isAuthenticated, loadPortal]);

  const currentActor = user?.name || user?.email || "System user";
  const currentRole = user?.role || "system";

  const updateApplicationStatus = useCallback(async (applicationId, status, message = "") => {
    const action = status === "approved" ? "approve" : status === "rejected" ? "reject" : "request_info";
    await apiRequest(`/api/admin/applications/${encodeURIComponent(applicationId)}/review`, {
      method: "POST",
      body: { action, reason: message }
    });
    await loadPortal();
  }, [loadPortal]);

  const updateAgentStatus = useCallback(async (agentId, status) => {
    if (status === "active") {
      await apiRequest(`/api/admin/agents/${encodeURIComponent(agentId)}/approve`, { method: "POST" });
    } else {
      await apiRequest(`/api/admin/agents/${encodeURIComponent(agentId)}/status`, {
        method: "POST",
        body: { status: backendAgentStatus(status) }
      });
    }
    await loadPortal();
  }, [loadPortal]);

  const updateApplicationVerification = useCallback(async (applicationId, verification) => {
    await apiRequest(`/api/admin/applications/${encodeURIComponent(applicationId)}/details`, {
      method: "POST",
      body: { verification }
    });
    await loadPortal();
  }, [loadPortal]);

  const updateApplicationBikeAssignment = useCallback(async (applicationId, bikeId) => {
    await apiRequest(`/api/admin/applications/${encodeURIComponent(applicationId)}/details`, {
      method: "POST",
      body: { bikeId: bikeId || "" }
    });
    await loadPortal();
  }, [loadPortal]);

  const addAgent = useCallback(async (agent) => {
    await apiRequest("/api/admin/agents", {
      method: "POST",
      body: {
        fullName: agent.name,
        email: agent.email,
        phone: agent.phone,
        nationalId: agent.nationalId,
        region: agent.region
      }
    });
    await loadPortal();
  }, [loadPortal]);

  const addBike = useCallback(async (bike) => {
    await apiRequest("/api/admin/products", {
      method: "POST",
      body: {
        productType: "bike",
        productModel: bike.model,
        serialNumber: bike.serialNumber,
        chassisNumber: bike.chassisNumber,
        branch: "Main"
      }
    });
    await loadPortal();
  }, [loadPortal]);

  const addUser = useCallback(async (userRecord) => {
    const result = await apiRequest("/api/admin/finance-users", {
      method: "POST",
      body: userRecord
    });
    await loadPortal();
    return result.temporaryPassword;
  }, [loadPortal]);

  const updateUserStatus = useCallback(async (userId, status) => {
    await apiRequest(`/api/admin/finance-users/${encodeURIComponent(userId)}/status`, {
      method: "POST",
      body: { status }
    });
    await loadPortal();
  }, [loadPortal]);

  const updateUserRole = useCallback(async (userId, role) => {
    await apiRequest(`/api/admin/finance-users/${encodeURIComponent(userId)}/role`, {
      method: "POST",
      body: { role }
    });
    await loadPortal();
  }, [loadPortal]);

  const resetUserCredentials = useCallback(async (userId) => {
    const result = await apiRequest(`/api/admin/finance-users/${encodeURIComponent(userId)}/reset`, { method: "POST" });
    await loadPortal();
    return result.temporaryPassword;
  }, [loadPortal]);

  const archiveAuditLogs = useCallback((logIds) => {
    setState((current) => {
      const ids = new Set(logIds);
      const archived = current.auditLogs.filter((log) => ids.has(log.id));
      return {
        ...current,
        archivedAuditLogs: [...archived, ...current.archivedAuditLogs],
        auditLogs: current.auditLogs.filter((log) => !ids.has(log.id))
      };
    });
  }, []);

  const updateNotificationStatus = useCallback(async (notificationIds, status) => {
    await apiRequest("/api/admin/notifications/status", {
      method: "POST",
      body: { ids: notificationIds, status }
    });
    await loadPortal();
  }, [loadPortal]);

  const value = useMemo(
    () => ({
      ...state,
      addAgent,
      addBike,
      addUser,
      archiveAuditLogs,
      refresh: loadPortal,
      resetUserCredentials,
      updateAgentStatus,
      updateApplicationBikeAssignment,
      updateApplicationVerification,
      updateApplicationStatus,
      updateNotificationStatus,
      updateUserRole,
      updateUserStatus,
      dataError,
      dataStatus
    }),
    [
      state,
      addAgent,
      addBike,
      addUser,
      archiveAuditLogs,
      loadPortal,
      resetUserCredentials,
      updateAgentStatus,
      updateApplicationBikeAssignment,
      updateApplicationStatus,
      updateApplicationVerification,
      updateNotificationStatus,
      updateUserRole,
      updateUserStatus,
      dataError,
      dataStatus
    ]
  );

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
}

export function useAdminData() {
  const context = useContext(AdminDataContext);
  if (!context) {
    throw new Error("useAdminData must be used inside AdminDataProvider");
  }
  return context;
}
