import { handleError, json, methodNotAllowed } from '../_lib/respond.js';
import { getSupabase, requireFinanceUser } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  try {
    await requireFinanceUser(req);
    const payment = req.body ?? {};
    const totalPayable = Number(payment.totalPayable ?? 0);
    const depositCredit = Number(payment.depositCredit ?? 0);
    const paygoPayment = Number(payment.paygoPayment ?? 0);

    if (!payment.customerName || !payment.customerPhone || !payment.agentName) {
      throw new Error('Customer name, phone, and agent name are required.');
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('payments')
      .insert({
        id: payment.id,
        customer_name: payment.customerName,
        customer_phone: payment.customerPhone,
        agent_name: payment.agentName,
        agent_id: payment.agentId,
        bike_model: payment.bikeModel,
        serial_number: payment.serialNumber,
        total_payable: totalPayable,
        paid_amount: Number(payment.paidAmount ?? 0),
        balance: Number(payment.balance ?? Math.max(totalPayable - depositCredit - paygoPayment, 0)),
        due_date: payment.dueDate,
        registration_status: payment.registrationStatus ?? 'manual',
        deposit_credit: depositCredit,
        paygo_payment: paygoPayment,
        date: payment.date,
        receipt: payment.receipt,
        method: 'manual',
        status: payment.status ?? 'paid',
        source_portal: payment.sourcePortal ?? 'Manual payment',
        synced_to_backend: true
      })
      .select()
      .single();

    if (error) throw error;

    json(res, 201, data);
  } catch (error) {
    handleError(res, error);
  }
}
