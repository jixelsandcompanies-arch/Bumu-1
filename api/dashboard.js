import { handleError, json, methodNotAllowed } from './_lib/respond.js';
import { getSupabase, requireFinanceUser } from './_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET']);
    return;
  }

  try {
    await requireFinanceUser(req);
    const supabase = getSupabase();
    const [paymentsResult, customersResult, commissionsResult] = await Promise.all([
      supabase.from('payments').select('status, deposit_credit, paygo_payment, date'),
      supabase.from('customers').select('status, balance, total_payable'),
      supabase.from('commissions').select('status')
    ]);

    if (paymentsResult.error) throw paymentsResult.error;
    if (customersResult.error) throw customersResult.error;
    if (commissionsResult.error) throw commissionsResult.error;

    const payments = paymentsResult.data ?? [];
    const customers = customersResult.data ?? [];
    const commissions = commissionsResult.data ?? [];
    const today = new Date().toISOString().slice(0, 10);
    const paymentAmount = (payment) => Number(payment.deposit_credit ?? 0) + Number(payment.paygo_payment ?? 0);
    const totalsByDay = payments.reduce((totals, payment) => {
      const date = String(payment.date || '').slice(0, 10);
      if (!date) return totals;

      totals[date] = (totals[date] ?? 0) + paymentAmount(payment);
      return totals;
    }, {});

    const trend = Object.entries(totalsByDay)
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(-7)
      .map(([date, amount]) => ({ date, amount }));

    json(res, 200, {
      summary: {
        totalCollected: payments.reduce((total, payment) => total + paymentAmount(payment), 0),
        expectedAmount: customers.reduce((total, customer) => total + Number(customer.total_payable ?? 0), 0),
        overdueAmount: customers
          .filter((customer) => customer.status === 'defaulted')
          .reduce((total, customer) => total + Number(customer.balance ?? 0), 0),
        activeAccounts: customers.filter((customer) => customer.status !== 'paid').length,
        todayCollections: payments
          .filter((payment) => String(payment.date || '').slice(0, 10) === today)
          .reduce((total, payment) => total + paymentAmount(payment), 0),
        unpaidPayments: payments.filter((payment) => payment.status === 'unpaid').length,
        pendingCommissions: commissions.filter((commission) => commission.status === 'earned').length
      },
      trend
    });
  } catch (error) {
    handleError(res, error);
  }
}
