export const initialAgents = [
  {
    id: "agt-001",
    code: "BUMU-AG-001",
    name: "Kevin Otieno",
    nationalId: "28844561",
    phone: "+254 712 456 900",
    email: "kevin.otieno@bumupaygo.co.ke",
    role: "field_agent",
    region: "Kisumu",
    status: "active",
    totalCustomers: 18,
    commissionBalance: 42600
  },
  {
    id: "agt-002",
    code: "BUMU-AG-002",
    name: "Faith Wanjiku",
    nationalId: "30192884",
    phone: "+254 734 209 118",
    email: "faith.wanjiku@bumupaygo.co.ke",
    role: "field_agent",
    region: "Nakuru",
    status: "pending_approval",
    totalCustomers: 0,
    commissionBalance: 0
  },
  {
    id: "agt-003",
    code: "BUMU-AG-003",
    name: "Daniel Mutua",
    nationalId: "27650219",
    phone: "+254 701 882 411",
    email: "daniel.mutua@bumupaygo.co.ke",
    role: "senior_agent",
    region: "Machakos",
    status: "suspended",
    totalCustomers: 11,
    commissionBalance: 16300
  }
];

export const initialCustomers = [
  {
    id: "cus-001",
    name: "Brian Ochieng",
    nationalId: "32457891",
    phone: "+254 722 800 111",
    dateOfBirth: "1994-08-12",
    gender: "Male",
    location: "Kisumu Central",
    occupation: "Bodaboda rider",
    agentId: "agt-001",
    applicationStatus: "pending_screening",
    repaymentStatus: "Not activated",
    balance: 142000,
    createdAt: "2026-05-24"
  },
  {
    id: "cus-002",
    name: "Mary Njeri",
    nationalId: "29883044",
    phone: "+254 733 902 644",
    dateOfBirth: "1991-11-03",
    gender: "Female",
    location: "Nakuru Town",
    occupation: "Retail trader",
    agentId: "agt-001",
    applicationStatus: "approved",
    repaymentStatus: "On track",
    balance: 89400,
    createdAt: "2026-05-18"
  },
  {
    id: "cus-003",
    name: "Peter Mwangi",
    nationalId: "32457891",
    phone: "+254 710 331 242",
    dateOfBirth: "1988-02-21",
    gender: "Male",
    location: "Thika",
    occupation: "Delivery rider",
    agentId: "agt-003",
    applicationStatus: "rejected",
    repaymentStatus: "Not activated",
    balance: 0,
    createdAt: "2026-05-20"
  }
];

export const initialBikes = [
  {
    id: "bike-001",
    model: "TVS HLX 150",
    serialNumber: "TVS-HLX-2026-001",
    chassisNumber: "MD625MF54P1A90841",
    status: "reserved",
    assignedCustomerId: "cus-001",
    assignedAgentId: "agt-001",
    createdAt: "2026-05-19"
  },
  {
    id: "bike-002",
    model: "Bajaj Boxer 150",
    serialNumber: "BJX-150-2026-014",
    chassisNumber: "MD2A18AZ9RWA11402",
    status: "assigned",
    assignedCustomerId: "cus-002",
    assignedAgentId: "agt-001",
    createdAt: "2026-05-17"
  },
  {
    id: "bike-003",
    model: "Honda Ace CB125",
    serialNumber: "HND-CB125-2026-009",
    chassisNumber: "LTMPCJLY8P1009031",
    status: "available",
    assignedCustomerId: null,
    assignedAgentId: null,
    createdAt: "2026-05-21"
  }
];

export const initialApplications = [
  {
    id: "APP-2026-001",
    customerId: "cus-001",
    agentId: "agt-001",
    bikeId: "bike-001",
    depositAmount: 18000,
    installmentPlan: "Daily KES 350 / 18 months",
    status: "pending_screening",
    submittedAt: "2026-05-29 09:24",
    customerOtpVerified: true,
    nextOfKinOtpVerified: true,
    nextOfKin: {
      name: "Sarah Achieng",
      phone: "+254 711 500 221",
      relationship: "Sister"
    },
    documents: [
      { type: "Passport photo", status: "uploaded" },
      { type: "National ID front", status: "uploaded" },
      { type: "National ID back", status: "uploaded" }
    ],
    screeningNotes: "Confirm national ID duplicate warning before approval.",
    duplicateNationalId: true
  },
  {
    id: "APP-2026-002",
    customerId: "cus-002",
    agentId: "agt-001",
    bikeId: "bike-002",
    depositAmount: 22000,
    installmentPlan: "Weekly KES 2500 / 16 months",
    status: "approved",
    submittedAt: "2026-05-25 14:10",
    reviewedAt: "2026-05-26 10:35",
    reviewedBy: "Amina Hassan",
    customerOtpVerified: true,
    nextOfKinOtpVerified: true,
    nextOfKin: {
      name: "Joseph Njoroge",
      phone: "+254 701 990 332",
      relationship: "Brother"
    },
    documents: [
      { type: "Passport photo", status: "verified" },
      { type: "National ID front", status: "verified" },
      { type: "National ID back", status: "verified" }
    ],
    screeningNotes: "Approved after document verification.",
    duplicateNationalId: false
  },
  {
    id: "APP-2026-003",
    customerId: "cus-003",
    agentId: "agt-003",
    bikeId: null,
    depositAmount: 10000,
    installmentPlan: "Daily KES 300 / 20 months",
    status: "rejected",
    submittedAt: "2026-05-27 16:50",
    reviewedAt: "2026-05-28 08:15",
    reviewedBy: "Amina Hassan",
    customerOtpVerified: true,
    nextOfKinOtpVerified: false,
    nextOfKin: {
      name: "Lucy Wambui",
      phone: "+254 720 400 450",
      relationship: "Spouse"
    },
    documents: [
      { type: "Passport photo", status: "uploaded" },
      { type: "National ID front", status: "unclear" },
      { type: "National ID back", status: "uploaded" }
    ],
    screeningNotes: "Rejected due duplicate ID and unclear ID front image.",
    rejectionReason: "Duplicate national ID and unclear KYC document.",
    duplicateNationalId: true
  }
];

export const initialAuditLogs = [
  {
    id: "log-001",
    actor: "Amina Hassan",
    role: "back_office_officer",
    action: "Approved application",
    entityType: "customer_application",
    entityId: "APP-2026-002",
    createdAt: "2026-05-26 10:35",
    ipAddress: "102.218.92.14"
  },
  {
    id: "log-002",
    actor: "System",
    role: "system",
    action: "Flagged duplicate national ID",
    entityType: "customer_application",
    entityId: "APP-2026-001",
    createdAt: "2026-05-29 09:25",
    ipAddress: "internal"
  },
  {
    id: "log-003",
    actor: "Amina Hassan",
    role: "back_office_officer",
    action: "Rejected application",
    entityType: "customer_application",
    entityId: "APP-2026-003",
    createdAt: "2026-05-28 08:15",
    ipAddress: "102.218.92.14"
  }
];

export const initialUsers = [
  {
    id: "usr-001",
    name: "Amina Hassan",
    email: "admin@bumupaygo.co.ke",
    phone: "+254 700 100 200",
    role: "super_admin",
    status: "active"
  },
  {
    id: "usr-002",
    name: "James Kariuki",
    email: "backoffice@bumupaygo.co.ke",
    phone: "+254 700 100 201",
    role: "back_office_officer",
    status: "active"
  },
  {
    id: "usr-003",
    name: "Mercy Adhiambo",
    email: "finance@bumupaygo.co.ke",
    phone: "+254 700 100 202",
    role: "finance_officer",
    status: "active"
  },
  {
    id: "usr-004",
    name: "Faith Wanjiku",
    email: "faith.wanjiku@bumupaygo.co.ke",
    phone: "+254 734 209 118",
    role: "agent",
    status: "pending_approval"
  }
];

export const initialPayments = [
  {
    id: "pay-001",
    customerId: "cus-002",
    agentId: "agt-001",
    amount: 2500,
    receipt: "RFE72Q9M3",
    status: "success",
    reconciliationStatus: "matched",
    paidAt: "2026-05-26 13:40"
  },
  {
    id: "pay-002",
    customerId: "cus-002",
    agentId: "agt-001",
    amount: 2500,
    receipt: "RFE91L0K4",
    status: "pending",
    reconciliationStatus: "unmatched",
    paidAt: "2026-05-29 17:08"
  },
  {
    id: "pay-003",
    customerId: "cus-001",
    agentId: "agt-001",
    amount: 18000,
    receipt: "DEP-APP-001",
    status: "success",
    reconciliationStatus: "manual_review",
    paidAt: "2026-05-29 09:20"
  }
];

export const initialNotifications = [
  {
    id: "not-001",
    title: "Application submitted",
    message: "Brian Ochieng application entered screening queue.",
    channel: "in_app",
    status: "unread",
    createdAt: "2026-05-29 09:25"
  },
  {
    id: "not-002",
    title: "Duplicate ID flag",
    message: "National ID 32457891 appears on more than one customer record.",
    channel: "in_app",
    status: "unread",
    createdAt: "2026-05-29 09:26"
  },
  {
    id: "not-003",
    title: "Agent approval pending",
    message: "Faith Wanjiku is waiting for admin approval.",
    channel: "sms",
    status: "read",
    createdAt: "2026-05-28 11:42"
  }
];
