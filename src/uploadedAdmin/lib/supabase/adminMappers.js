const columnMaps = {
  agents: {
    nationalId: "national_id",
    totalCustomers: "total_customers",
    commissionBalance: "commission_balance"
  },
  applications: {
    customerId: "customer_id",
    agentId: "agent_id",
    bikeId: "bike_id",
    depositAmount: "deposit_amount",
    installmentPlan: "installment_plan",
    submittedAt: "submitted_at",
    reviewedAt: "reviewed_at",
    reviewedBy: "reviewed_by",
    customerOtpVerified: "customer_otp_verified",
    nextOfKinOtpVerified: "next_of_kin_otp_verified",
    nextOfKin: "next_of_kin",
    screeningNotes: "screening_notes",
    rejectionReason: "rejection_reason",
    infoRequiredMessage: "info_required_message",
    duplicateNationalId: "duplicate_national_id"
  },
  auditLogs: {
    entityType: "entity_type",
    entityId: "entity_id",
    ipAddress: "ip_address",
    createdAt: "created_at"
  },
  bikes: {
    serialNumber: "serial_number",
    chassisNumber: "chassis_number",
    assignedCustomerId: "assigned_customer_id",
    assignedAgentId: "assigned_agent_id",
    createdAt: "created_at"
  },
  customers: {
    nationalId: "national_id",
    dateOfBirth: "date_of_birth",
    agentId: "agent_id",
    applicationStatus: "application_status",
    repaymentStatus: "repayment_status",
    createdAt: "created_at"
  },
  notifications: {
    createdAt: "created_at"
  },
  payments: {
    customerId: "customer_id",
    agentId: "agent_id",
    reconciliationStatus: "reconciliation_status",
    paidAt: "paid_at"
  },
  users: {}
};

function invertMap(map) {
  return Object.fromEntries(Object.entries(map).map(([appKey, dbKey]) => [dbKey, appKey]));
}

function mapObjectKeys(record, map) {
  return Object.fromEntries(
    Object.entries(record || {}).map(([key, value]) => [map[key] || key, value])
  );
}

export function mapSupabaseRows(tableKey, rows) {
  const map = invertMap(columnMaps[tableKey] || {});
  return (rows || []).map((row) => mapObjectKeys(row, map));
}

export function mapSupabasePayload(tableKey, payload) {
  return mapObjectKeys(payload, columnMaps[tableKey] || {});
}
