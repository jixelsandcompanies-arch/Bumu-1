import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { DataTable } from "../../components/ui/DataTable.jsx";
import { PageHeader } from "../../components/ui/PageHeader.jsx";
import { StatCard } from "../../components/ui/StatCard.jsx";
import { StatusBadge } from "../../components/ui/StatusBadge.jsx";
import { useAdminData } from "../../features/admin/AdminDataContext.jsx";
import { findAgent } from "../../lib/admin/lookups.js";
import { formatKes } from "../../lib/formatting/currency.js";
import { Bike, UserRoundCheck, Users, WalletCards } from "lucide-react";

export default function Customers() {
  const { agents, bikes, customers } = useAdminData();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const approvedCustomers = customers.filter((customer) => customer.applicationStatus === "approved").length;
  const totalBalance = customers.reduce((sum, customer) => sum + customer.balance, 0);
  const assignedBikes = bikes.filter((bike) => bike.assignedCustomerId).length;

  const columns = [
    { key: "name", label: "Customer" },
    { key: "nationalId", label: "National ID" },
    { key: "phone", label: "Phone" },
    { key: "location", label: "Location" },
    { key: "agent", label: "Agent", render: (row) => findAgent(agents, row.agentId)?.name },
    {
      key: "bike",
      label: "Bike",
      render: (row) => bikes.find((bike) => bike.assignedCustomerId === row.id)?.model || "Unassigned"
    },
    {
      key: "accountStatus",
      label: "Account",
      render: (row) => <StatusBadge status={row.applicationStatus} />
    },
    { key: "repaymentStatus", label: "Repayment" },
    { key: "balance", label: "Balance", render: (row) => formatKes(row.balance) },
    { key: "open", label: "Open", render: (row) => <Link to={`/admin/customers/${row.id}`}>View</Link> }
  ];
  const visibleCustomers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return customers.filter((customer) => {
      const agent = findAgent(agents, customer.agentId);
      const bike = bikes.find((item) => item.assignedCustomerId === customer.id);
      const searchable = [customer.name, customer.nationalId, customer.phone, customer.location, customer.applicationStatus, customer.repaymentStatus, agent?.name, bike?.model]
        .join(" ")
        .toLowerCase();
      const matchesStatus = statusFilter === "all" || customer.applicationStatus === statusFilter;
      return matchesStatus && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [agents, bikes, customers, query, statusFilter]);

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Customer accounts"
        title="Customer records"
        description="View customer profile, assigned agent, bike account, repayment status, and balance information."
      />

      <div className="stat-grid compact">
        <StatCard icon={Users} label="Total customers" value={customers.length} detail="All customer records" />
        <StatCard icon={UserRoundCheck} label="Approved accounts" value={approvedCustomers} detail="Activated or ready" />
        <StatCard icon={Bike} label="Assigned bikes" value={assignedBikes} detail="Linked customer bikes" />
        <StatCard icon={WalletCards} label="Customer balances" value={formatKes(totalBalance)} detail="Total outstanding" />
      </div>

      <div className="panel table-toolbar">
        <label>
          Search customers
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, ID, phone, agent..." />
        </label>
        <label>
          Application status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="pending_screening">Pending screening</option>
            <option value="info_required">Info required</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        <div className="toolbar-count">
          <span>Visible</span>
          <strong>{visibleCustomers.length}</strong>
        </div>
      </div>

      <DataTable columns={columns} rows={visibleCustomers} emptyMessage="No customers match this view." />
    </section>
  );
}
