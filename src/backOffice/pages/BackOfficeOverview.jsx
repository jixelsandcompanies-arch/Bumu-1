import { AlertTriangle, CheckCircle2, ClipboardList, FileWarning } from "lucide-react";
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
  const duplicateFlags = activeRows.filter((row) => row.duplicateNationalId).length;

  const columns = [
    { key: "id", label: "Case ID" },
    { key: "customer", label: "Customer", render: (row) => row.customer?.name || "Customer record" },
    { key: "agent", label: "Agent", render: (row) => row.agent?.name || "Agent record" },
    { key: "status", label: "Screening state", render: (row) => <StatusBadge status={row.status} /> },
    { key: "open", label: "Open", render: (row) => <Link to={`/backoffice/applications/${row.id}`}>Continue</Link> }
  ];

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Screening workspace"
        title="Back Office overview"
        description="Work through customer screening cases, review KYC details, request more information, and complete decisions."
      />

      <div className="stats-grid">
        <StatCard icon={ClipboardList} label="Open screening" value={activeRows.length} detail="Needs review" tone="warning" to="/backoffice/screening" />
        <StatCard icon={FileWarning} label="Info requested" value={infoRequired} detail="Waiting on updates" to="/backoffice/screening" />
        <StatCard icon={AlertTriangle} label="Duplicate flags" value={duplicateFlags} detail="Review carefully" tone="danger" to="/backoffice/screening" />
        <StatCard icon={CheckCircle2} label="Completed" value={completedRows.length} detail="Approved or rejected" tone="success" to="/backoffice/completed" />
      </div>

      <article className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Current work</p>
            <h3>Screening queue</h3>
          </div>
          <Link to="/backoffice/screening">View all</Link>
        </div>
        <DataTable columns={columns} rows={activeRows.slice(0, 6)} emptyMessage="No screening cases are waiting right now." />
      </article>
    </section>
  );
}
