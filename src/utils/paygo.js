const DAY_MS = 86400000;
const DEFAULT_DAILY_TARGET = 3000;

export function getPaymentAmount(payment) {
  return Number(payment.depositCredit || 0) + Number(payment.paygoPayment || 0);
}

export function getDailyTarget(payment) {
  const value = Number(
    payment.dailyTarget ??
    payment.daily_target ??
    payment.dailyPaygoAmount ??
    payment.daily_paygo_amount ??
    payment.expectedDailyPayment ??
    payment.expected_daily_payment ??
    payment.paygoPayment
  );

  return Number.isFinite(value) && value > 0 ? value : DEFAULT_DAILY_TARGET;
}

export function getPaymentBalance(payment) {
  const balance = Number(payment.balance);

  if (Number.isFinite(balance) && balance >= 0) {
    return balance;
  }

  return Math.max(Number(payment.totalPayable || 0) - getPaymentAmount(payment), 0);
}

export function getOverdueDays(payment, now = new Date()) {
  const dueDate = payment.dueDate || payment.due_date || payment.date;
  const dueDateOnly = dueDate?.slice(0, 10);

  if (!dueDateOnly) return 0;

  return Math.max(
    Math.floor((new Date(`${now.toISOString().slice(0, 10)}T12:00:00`) - new Date(`${dueDateOnly}T12:00:00`)) / DAY_MS),
    0
  );
}

export function getPaygoAccountState(payment, now = new Date()) {
  const balance = getPaymentBalance(payment);
  const overdueDays = getOverdueDays(payment, now);

  if (balance <= 0) {
    return 'complete';
  }

  if (payment.status === 'paid') {
    return 'active';
  }

  if (overdueDays >= 3) {
    return 'locked';
  }

  return 'follow_up';
}

export function getPaygoFollowUp(payment, now = new Date()) {
  const state = getPaygoAccountState(payment, now);

  if (state === 'complete') return 'Account complete';
  if (state === 'active') return 'Keep daily Paygo collection active';
  if (state === 'locked') return 'Escalate account and recover overdue payment';
  return 'Follow up customer before account is locked';
}
