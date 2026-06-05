import { AlertTriangle, CheckCircle2, ClipboardList, FileWarning, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { DataTable } from "../../uploadedAdmin/components/ui/DataTable.jsx";
import { PageHeader } from "../../uploadedAdmin/components/ui/PageHeader.jsx";
import { StatCard } from "../../uploadedAdmin/components/ui/StatCard.jsx";
import { StatusBadge } from "../../uploadedAdmin/components/ui/StatusBadge.jsx";
import { useAdminData } from "../../uploadedAdmin/features/admin/AdminDataContext.jsx";
import { activeScreeningStatuses, completedScreeningStatuses, getScreeningRows } from "./backOfficeHelpers.js";

export default function BackOfficeOverview() {
  const { agents, applications, bikes, customers } = useAdminData();
  const activeRows = getScreeningRows({ agents, applications, bikes, customers, statuses: activeScreeningStatuses });
  const completedRows = getScreeningRows({ agents, applications, bikes, customers, statuses: completedScreeningStatuses });
  const infoRequired = activeRows.filter((row) => row.status === "info_required").length;
  const pendingKyc = activeRows.filter((row) => row.status === "next_of_kin_pending").length;
  const duplicateFlags = activeRows.filter((row) => row.duplicateNationalId).length;

  const columns = [
    { key: "id", label: "Case ID" },
    { key: "customer", label: "Customer", render: (row) => row.customer?.name || "Customer record" },
    { key: "agent", label: "Agent", render: (row) => row.agent?.name || "Agent record" },
    { key: "status", label: "Screening state", render: (row) => <StatusBadge status={row.status} /> },
    { key: "open", label: "Action", render: (row) => <Link to={`/backoffice/applications/${row.id}`}>Continue</Link> }
  ];

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Back Office overview"
        title="Screening workload"
        description="Track the screening queue, resolve requests for information, and keep approvals moving through the workflow."
      />

      <div className="stats-grid">
        <StatCard icon={ClipboardList} label="Open screening" value={activeRows.length} detail="Cases awaiting review" tone="warning" to="/backoffice/screening" />
        <StatCard icon={FileWarning} label="Info requested" value={infoRequired} detail="Waiting on more details" to="/backoffice/screening" />
        <StatCard icon={AlertTriangle} label="Pending KYC" value={pendingKyc} detail="Next-of-kin or identity checks" tone="danger" to="/backoffice/screening" />
        <StatCard icon={CheckCircle2} label="Completed" value={completedRows.length} detail="Processed cases" tone="success" to="/backoffice/completed" />
        <StatCard icon={Users} label="Total cases" value={applications.length} detail="All screened cases" />
      </div>

      <div className="detail-grid">
        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Queue snapshot</p>
              <h3>Latest screening cases</h3>
            </div>
            <Link to="/backoffice/screening">View queue</Link>
          </div>
          <DataTable columns={columns} rows={activeRows.slice(0, 6)} emptyMessage="No active screening cases are waiting right now." />
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Team workload</p>
              <h3>Screening activity</h3>
            </div>
            <Link to="/backoffice/notifications">View notifications</Link>
          </div>
          <div className="panel-block">
            <p className="text-muted">Use this page to stay on top of cases, duplicate flags, and info requests.</p>
            <ul className="bullet-list">
              <li>{pendingKyc} case(s) require identity or next-of-kin verification.</li>
              <li>{infoRequired} case(s) are awaiting additional customer information.</li>
              <li>{duplicateFlags} case(s) have duplicate national ID alerts.</li>
            </ul>
          </div>
        </article>
      </div>
    </section>
  );
}
