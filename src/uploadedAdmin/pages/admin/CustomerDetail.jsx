import { Link, useParams } from "react-router-dom";
import { DataTable } from "../../components/ui/DataTable.jsx";
import { PageHeader } from "../../components/ui/PageHeader.jsx";
import { StatusBadge } from "../../components/ui/StatusBadge.jsx";
import { useAdminData } from "../../features/admin/AdminDataContext.jsx";
import { findAgent, findCustomer } from "../../lib/admin/lookups.js";
import { formatKes } from "../../lib/formatting/currency.js";

export default function CustomerDetail() {
  const { customerId } = useParams();
  const { agents, applications, bikes, customers, payments = [] } = useAdminData();
  const customer = findCustomer(customers, customerId);

  if (!customer) {
    return (
      <section className="page-stack">
        <PageHeader title="Customer not found" />
        <Link to="/admin/customers">Back to customers</Link>
      </section>
    );
  }

  const agent = findAgent(agents, customer.agentId);
  const application = applications.find((item) => item.customerId === customer.id);
  const bike = bikes.find((item) => item.assignedCustomerId === customer.id);
  const customerPayments = payments.filter((payment) => payment.customerId === customer.id);

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow={customer.nationalId}
        title={customer.name}
        description={`${customer.phone} - ${customer.location}`}
        actions={
          <div className="page-actions">
            <Link className="button secondary" to="/admin/customers">Back to customers</Link>
            <StatusBadge status={customer.applicationStatus} />
          </div>
        }
      />

      <div className="detail-grid">
        <article className="panel">
          <h3>Customer profile</h3>
          <dl className="detail-list">
            <div><dt>Phone</dt><dd>{customer.phone}</dd></div>
            <div><dt>Location</dt><dd>{customer.location}</dd></div>
            <div><dt>Occupation</dt><dd>{customer.occupation}</dd></div>
            <div><dt>Date of birth</dt><dd>{customer.dateOfBirth}</dd></div>
            <div><dt>Gender</dt><dd>{customer.gender}</dd></div>
            <div><dt>Agent</dt><dd>{agent?.name || "Unassigned"}</dd></div>
          </dl>
        </article>

        <article className="panel">
          <h3>Bike account</h3>
          <dl className="detail-list">
            <div><dt>Bike model</dt><dd>{bike?.model || "No bike assigned"}</dd></div>
            <div><dt>Serial number</dt><dd>{bike?.serialNumber || "No serial assigned"}</dd></div>
            <div><dt>Chassis number</dt><dd>{bike?.chassisNumber || "No chassis assigned"}</dd></div>
            <div><dt>Repayment status</dt><dd>{customer.repaymentStatus}</dd></div>
            <div><dt>Current balance</dt><dd>{formatKes(customer.balance)}</dd></div>
          </dl>
        </article>
      </div>

      <div className="detail-grid">
        <article className="panel">
          <h3>Next of kin</h3>
          <dl className="detail-list">
            <div><dt>Name</dt><dd>{application?.nextOfKin?.name || "Not captured"}</dd></div>
            <div><dt>Phone</dt><dd>{application?.nextOfKin?.phone || "Not captured"}</dd></div>
            <div><dt>Relationship</dt><dd>{application?.nextOfKin?.relationship || "Not captured"}</dd></div>
            <div>
              <dt>Verification</dt>
              <dd><StatusBadge status={application?.nextOfKinOtpVerified ? "verified" : "not_verified"} /></dd>
            </div>
          </dl>
        </article>

        <article className="panel">
          <h3>KYC record</h3>
          <dl className="detail-list">
            <div><dt>Application ref</dt><dd>{application?.id || "No application"}</dd></div>
            <div><dt>Deposit</dt><dd>{formatKes(application?.depositAmount || 0)}</dd></div>
            <div><dt>Installment plan</dt><dd>{application?.installmentPlan || "No plan selected"}</dd></div>
            <div>
              <dt>Customer OTP</dt>
              <dd><StatusBadge status={application?.customerOtpVerified ? "verified" : "not_verified"} /></dd>
            </div>
          </dl>
        </article>
      </div>

      <article className="panel">
        <h3>Payment history</h3>
        <DataTable
          columns={[
            { key: "receipt", label: "Receipt" },
            { key: "amount", label: "Amount", render: (row) => formatKes(row.amount) },
            { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
            { key: "paidAt", label: "Date" }
          ]}
          rows={customerPayments}
          emptyMessage="No payment records for this customer yet."
        />
      </article>
    </section>
  );
}
