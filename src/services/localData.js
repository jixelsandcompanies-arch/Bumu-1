import { getDailyTarget, getOverdueDays, getPaymentAmount, getPaymentBalance, getPaygoAccountState, getPaygoFollowUp } from '../utils/paygo.js';
import { buildMonthlyPaygoCommissions } from '../utils/commission.js';

const LOCAL_PAYMENTS_KEY = 'bumu-local-payments';
const LOCAL_COMMISSIONS_KEY = 'bumu-local-commissions';

const seedPayments = [
  {
    id: 'PAY-1001',
    customerName: 'Amina Otieno',
    customerPhone: '+254712345001',
    agentName: 'Mary Wanjiku',
    agentId: 'BUMU-AG-001',
    bikeModel: 'Boxer BM150',
    serialNumber: 'BUMU-CH-1501',
    chassisNumber: 'BUMU-CH-1501',
    totalPayable: 185000,
    paidAmount: 94000,
    balance: 91000,
    dueDate: '2026-06-07',
    registrationStatus: 'registered',
    depositCredit: 35000,
    paygoPayment: 2800,
    dailyTarget: 2800,
    date: '2026-05-30T09:20:00',
    receipt: 'BACKEND-RC-1001',
    status: 'paid',
    sourcePortal: 'Local fallback data'
  },
  {
    id: 'PAY-1002',
    customerName: 'James Mwangi',
    customerPhone: '+254712345002',
    agentName: 'Peter Kariuki',
    agentId: 'BUMU-AG-002',
    bikeModel: 'TVS HLX 150',
    serialNumber: 'BUMU-CH-1502',
    chassisNumber: 'BUMU-CH-1502',
    totalPayable: 192000,
    paidAmount: 61000,
    balance: 131000,
    dueDate: '2026-05-25',
    registrationStatus: 'registered',
    depositCredit: 25000,
    paygoPayment: 0,
    dailyTarget: 3000,
    date: '2026-05-29T15:42:00',
    receipt: 'BACKEND-RC-1002',
    status: 'unpaid',
    sourcePortal: 'Local fallback data'
  },
  {
    id: 'PAY-1003',
    customerName: 'Brian Kiptoo',
    customerPhone: '+254712345003',
    agentName: 'Grace Atieno',
    agentId: 'BUMU-AG-003',
    bikeModel: 'Bajaj CT125',
    serialNumber: 'BUMU-CH-1503',
    chassisNumber: 'BUMU-CH-1503',
    totalPayable: 176000,
    paidAmount: 122500,
    balance: 53500,
    dueDate: '2026-06-02',
    registrationStatus: 'registered',
    depositCredit: 40000,
    paygoPayment: 3500,
    dailyTarget: 3500,
    date: '2026-05-28T11:15:00',
    receipt: 'BACKEND-RC-1003',
    status: 'paid',
    sourcePortal: 'Local fallback data'
  },
  {
    id: 'PAY-1004',
    customerName: 'Nancy Wairimu',
    customerPhone: '+254712345004',
    agentName: 'Mary Wanjiku',
    agentId: 'BUMU-AG-001',
    productType: 'phone',
    bikeModel: 'Tecno Spark PAYGO',
    serialNumber: 'IMEI-3567001004',
    imei: 'IMEI-3567001004',
    totalPayable: 24000,
    paidAmount: 8500,
    balance: 15500,
    dueDate: '2026-06-08',
    registrationStatus: 'registered',
    depositCredit: 6500,
    paygoPayment: 2000,
    dailyTarget: 500,
    date: '2026-05-31T10:05:00',
    receipt: 'PHONE-RC-1004',
    status: 'paid',
    sourcePortal: 'Local fallback phone sale'
  }
];

const seedCommissions = [
  {
    id: 'COM-1001',
    agentName: 'Mary Wanjiku',
    agentCode: 'BUMU-AG-001',
    agentPhone: '+254712111001',
    customerName: 'Amina Otieno',
    type: 'deposit_commission',
    amount: 1800,
    status: 'earned',
    earnedAt: '2026-05-30T09:20:00'
  },
  {
    id: 'COM-1002',
    agentName: 'Grace Atieno',
    agentCode: 'BUMU-AG-003',
    agentPhone: '+254712111003',
    customerName: 'Brian Kiptoo',
    type: 'paygo_collection',
    amount: 650,
    status: 'paid',
    earnedAt: '2026-05-28T11:15:00',
    paidAt: '2026-05-30T14:00:00'
  }
];

function readStoredPayments() {
  const raw = window.localStorage.getItem(LOCAL_PAYMENTS_KEY);
  if (!raw) return [];

  try {
    const records = JSON.parse(raw);
    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
}

function writeStoredPayments(payments) {
  window.localStorage.setItem(LOCAL_PAYMENTS_KEY, JSON.stringify(payments));
}

function getPaymentRecordKey(payment) {
  const receipt = payment.receipt || payment.receiptNumber || payment.receipt_number;
  return String(receipt || payment.id || '').trim().toLowerCase();
}

function mergePayments(storedPayments) {
  const storedKeys = new Set(storedPayments.map(getPaymentRecordKey).filter(Boolean));
  const seedOnly = seedPayments.filter((payment) => {
    const key = getPaymentRecordKey(payment);
    return !key || !storedKeys.has(key);
  });

  return [...storedPayments, ...seedOnly];
}

function readStoredCommissions() {
  const raw = window.localStorage.getItem(LOCAL_COMMISSIONS_KEY);
  if (!raw) return [];

  try {
    const records = JSON.parse(raw);
    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
}

function writeStoredCommissions(commissions) {
  window.localStorage.setItem(LOCAL_COMMISSIONS_KEY, JSON.stringify(commissions));
}

function buildMonthlyPaymentCommissions(payments) {
  return buildMonthlyPaygoCommissions(payments);
}

export function listLocalPayments() {
  return mergePayments(readStoredPayments());
}

export function saveLocalPayment(payment) {
  const existingPayments = readStoredPayments();
  const existingRecordKey = getPaymentRecordKey(payment);

  if (existingRecordKey) {
    const existing = mergePayments(existingPayments).find(
      (record) => getPaymentRecordKey(record) === existingRecordKey
    );

    if (existing) {
      return existing;
    }
  }

  const record = {
    ...payment,
    id: payment.id || `MAN-${Date.now()}`,
    paidAmount: Number(payment.depositCredit || 0) + Number(payment.paygoPayment || 0),
    dailyTarget: getDailyTarget(payment),
    balance: Math.max(
      Number(payment.totalPayable || 0) -
        Number(payment.depositCredit || 0) -
        Number(payment.paygoPayment || 0),
      0
    ),
    bikeModel: payment.bikeModel || 'Manual entry',
    productType: payment.productType || 'product',
    productModel: payment.productModel || payment.bikeModel || 'Manual entry',
    serialNumber: payment.serialNumber || payment.imei || payment.chassisNumber || 'Manual entry',
    chassisNumber: payment.chassisNumber || '',
    imei: payment.imei || '',
    agentId: payment.agentId || '',
    sourcePortal: payment.sourcePortal || 'Manual local entry',
    savedLocally: true
  };

  writeStoredPayments([record, ...existingPayments]);
  return record;
}

function buildLocalCustomers(payments) {
  return payments.map((payment) => {
    const dueDate = payment.dueDate || payment.date;
    const overdueDays = getOverdueDays(payment);

    return {
      id: payment.id,
      customerName: payment.customerName,
      customerPhone: payment.customerPhone,
      agentName: payment.agentName,
      agentId: payment.agentId,
      productType: payment.productType || 'product',
      productModel: payment.productModel || payment.bikeModel,
      bikeModel: payment.bikeModel,
      serialNumber: payment.serialNumber,
      chassisNumber: payment.chassisNumber,
      imei: payment.imei,
      totalPayable: payment.totalPayable,
      paidAmount: payment.paidAmount ?? getPaymentAmount(payment),
      balance: getPaymentBalance(payment),
      dailyTarget: getDailyTarget(payment),
      dueDate,
      lastPaymentDate: payment.date,
      status: payment.status,
      overdueDays,
      paygoState: getPaygoAccountState(payment),
      followUp: getPaygoFollowUp(payment),
      registrationStatus: payment.registrationStatus || 'registered'
    };
  });
}

export function listLocalCustomers() {
  return buildLocalCustomers(listLocalPayments());
}

export function listLocalCommissions() {
  const storedCommissions = readStoredCommissions();
  const storedById = new Map(storedCommissions.map((commission) => [commission.id, commission]));
  const paymentCommissions = buildMonthlyPaymentCommissions(listLocalPayments());
  const generatedCommissions = paymentCommissions;
  const mergedSeeds = generatedCommissions.map((commission) => ({
    ...commission,
    ...storedById.get(commission.id)
  }));
  const storedOnly = storedCommissions.filter((commission) =>
    !generatedCommissions.some((seed) => seed.id === commission.id) &&
    !['deposit_commission', 'paygo_collection', 'sale_activation_commission'].includes(commission.type)
  );

  return [...storedOnly, ...mergedSeeds];
}

export function updateLocalCommission(commissionId, changes) {
  const existing = listLocalCommissions().find((commission) => commission.id === commissionId);

  if (!existing) {
    throw new Error('Commission not found.');
  }

  const updated = {
    ...existing,
    ...changes,
    updatedAt: new Date().toISOString()
  };
  const remainingStored = readStoredCommissions().filter((commission) => commission.id !== commissionId);

  writeStoredCommissions([updated, ...remainingStored]);
  return updated;
}

export function markLocalAgentCommissionsPaid(agentKey) {
  const requestedAt = new Date().toISOString();
  const matched = listLocalCommissions()
    .filter((commission) => [commission.agentCode, commission.agentName].includes(agentKey))
    .map((commission) => ({
      ...commission,
      status: commission.status === 'paid' ? 'paid' : 'processing',
      approvedAt: requestedAt,
      payoutStatus: commission.status === 'paid' ? 'paid' : 'queued',
      payoutRequestedAt: commission.status === 'paid' ? commission.payoutRequestedAt : requestedAt,
      approvalReference: commission.approvalReference || `FIN-AGENT-${Date.now()}`,
      updatedAt: requestedAt
    }));
  const matchedIds = new Set(matched.map((commission) => commission.id));
  const remainingStored = readStoredCommissions().filter((commission) => !matchedIds.has(commission.id));

  writeStoredCommissions([...matched, ...remainingStored]);
  return matched;
}

export function getLocalDashboard() {
  const payments = listLocalPayments();
  const customers = buildLocalCustomers(payments);
  const commissions = listLocalCommissions();
  const today = new Date().toISOString().slice(0, 10);
  const trendByDate = payments.reduce((items, payment) => {
    const date = payment.date?.slice(0, 10) || 'No date';
    const amount = Number(payment.depositCredit || 0) + Number(payment.paygoPayment || 0);

    items.set(date, (items.get(date) || 0) + amount);
    return items;
  }, new Map());
  const totalCollected = payments.reduce(
    (total, payment) => total + Number(payment.depositCredit || 0) + Number(payment.paygoPayment || 0),
    0
  );
  const expectedAmount = payments.reduce((total, payment) => total + Number(payment.totalPayable || 0), 0);
  const overdueAmount = customers
    .filter((customer) => customer.overdueDays > 0)
    .reduce((total, customer) => total + Number(customer.balance || 0), 0);
  const pendingPayments = customers
    .filter((customer) => customer.status === 'unpaid')
    .reduce((total, customer) => total + Number(customer.balance || 0), 0);
  const unpaidCommissions = commissions
    .filter((commission) => commission.status !== 'paid')
    .reduce((total, commission) => total + Number(commission.amount || 0), 0);
  const reconciliationFlags = getLocalReconciliation()
    .filter((record) => record.status !== 'matched').length;

  return {
    summary: {
      totalCollected,
      expectedAmount,
      expectedCollection: expectedAmount,
      pendingPayments,
      overdueAmount,
      reconciliationFlags,
      unpaidCommissions,
      activeAccounts: customers.length,
      todayCollections: payments.filter((payment) => payment.date?.startsWith(today)).length,
      unpaidPayments: payments.filter((payment) => payment.status === 'unpaid').length,
      pendingCommissions: commissions.filter((commission) => commission.status === 'earned').length
    },
    trend: [...trendByDate.entries()]
      .sort(([firstDate], [secondDate]) => firstDate.localeCompare(secondDate))
      .map(([date, amount]) => ({ date, amount }))
  };
}

export function getLocalReconciliation() {
  return listLocalPayments().map((payment) => {
    const amount = Number(payment.depositCredit || 0) + Number(payment.paygoPayment || 0);

    return {
      id: `REC-${payment.id}`,
      receipt: payment.receipt,
      customerName: payment.customerName,
      nationalId: 'No data yet',
      providerAmount: amount,
      systemAmount: payment.status === 'paid' ? amount : null,
      date: payment.date,
      status: payment.status === 'paid' ? 'matched' : 'missing'
    };
  });
}
