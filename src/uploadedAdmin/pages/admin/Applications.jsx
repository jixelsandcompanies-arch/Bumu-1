import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Send } from "lucide-react";
import { DataTable } from "../../components/ui/DataTable.jsx";
import { OtpActionButton } from "../../components/ui/OtpActionButton.jsx";
import { PageHeader } from "../../components/ui/PageHeader.jsx";
import { StatusBadge } from "../../components/ui/StatusBadge.jsx";
import { useAdminData } from "../../features/admin/AdminDataContext.jsx";
import { getApplicationApprovalBlockers } from "../../lib/admin/applicationChecks.js";
import { findAgent, findBike, findCustomer } from "../../lib/admin/lookups.js";
import { formatKes } from "../../lib/formatting/currency.js";

export default function Applications() {
  const { agents, applications, bikes, customers, updateApplicationStatus } = useAdminData();
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [submittingId, setSubmittingId] = useState("");
  const [selectedCardIds, setSelectedCardIds] = useState([]);
  const [whatsappNumber, setWhatsappNumber] = useState("");

  const visibleApplications = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return applications.filter((application) => {
      const customer = findCustomer(customers, application.customerId);
      const agent = findAgent(agents, application.agentId);
      const bike = findBike(bikes, application.bikeId);
      const searchable = [
        application.id,
        application.status,
        application.installmentPlan,
        customer?.name,
        customer?.nationalId,
        customer?.phone,
        agent?.name,
        bike?.serialNumber
      ]
        .join(" ")
        .toLowerCase();
      const matchesStatus = statusFilter === "all" || application.status === statusFilter;
      return matchesStatus && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [agents, applications, bikes, customers, query, statusFilter]);

  async function quickDecision(application, status) {
    if (status === "approved") {
      const blockers = getApplicationApprovalBlockers(application);
      if (blockers.length > 0) {
        setMessage(`Cannot approve ${application.id}: ${blockers[0]}`);
        return;
      }
    }

    const notes = {
      approved: "Approved from screening queue quick action.",
      info_required: "More information requested from screening queue.",
      rejected: "Rejected from screening queue quick action."
    };
    setSubmittingId(application.id);
    try {
      await updateApplicationStatus(application.id, status, notes[status]);
      setMessage(`Application ${application.id} ${status.replaceAll("_", " ")}.`);
    } catch (error) {
      setMessage(error.message || `Could not update application ${application.id}.`);
    } finally {
      setSubmittingId("");
    }
  }

  const visibleApprovedApplications = visibleApplications.filter((application) => application.status === "approved");
  const selectedApprovedApplications = visibleApprovedApplications.filter((application) => selectedCardIds.includes(application.id));
  const allVisibleApprovedSelected =
    visibleApprovedApplications.length > 0 &&
    visibleApprovedApplications.every((application) => selectedCardIds.includes(application.id));

  function toggleSelectedCard(applicationId) {
    setSelectedCardIds((current) =>
      current.includes(applicationId)
        ? current.filter((id) => id !== applicationId)
        : [...current, applicationId]
    );
  }

  function toggleAllVisibleApproved() {
    setSelectedCardIds((current) => {
      const visibleIds = visibleApprovedApplications.map((application) => application.id);
      if (visibleIds.every((id) => current.includes(id))) {
        return current.filter((id) => !visibleIds.includes(id));
      }

      return Array.from(new Set([...current, ...visibleIds]));
    });
  }

  function makeCardRecord(application) {
    const customer = findCustomer(customers, application.customerId) || {};
    const agent = findAgent(agents, application.agentId) || {};
    const bike = findBike(bikes, application.bikeId) || {};
    const studentClass = customer.className || customer.studentClass || application.className || application.studentClass || "Class not set";
    const stream = customer.stream || application.stream || "Stream not set";
    const token = [
      "BUMU",
      application.id,
      customer.nationalId || customer.id || application.customerId
    ]
      .filter(Boolean)
      .join("-");
    const scanUrl = `${window.location.origin}/school-scan?token=${encodeURIComponent(token)}&class=${encodeURIComponent(studentClass)}&stream=${encodeURIComponent(stream)}&schoolLocation=${encodeURIComponent("School Location")}&scanPoint=${encodeURIComponent("Main Gate")}`;

    return {
      application,
      customer,
      agent,
      bike,
      token,
      scanUrl,
      studentClass,
      stream
    };
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function buildCardsHtml(records) {
    const cards = records
      .map((record) => {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(record.scanUrl)}`;
        return `
          <article class="card">
            <div class="card-top">
              <div>
                <span class="eyebrow">Bumu PAYGO approved card</span>
                <h2>${escapeHtml(record.customer.name || "Approved customer")}</h2>
              </div>
              <strong>${escapeHtml(record.application.id)}</strong>
            </div>
            <div class="card-body">
              <div class="details">
                <p><span>National ID</span>${escapeHtml(record.customer.nationalId || "Not captured")}</p>
                <p><span>Phone</span>${escapeHtml(record.customer.phone || "Not captured")}</p>
                <p><span>Class</span>${escapeHtml(record.studentClass)}</p>
                <p><span>Stream</span>${escapeHtml(record.stream)}</p>
                <p><span>Agent</span>${escapeHtml(record.agent.name || "Not assigned")}</p>
                <p><span>Bike</span>${escapeHtml(record.bike.serialNumber || "Not assigned")}</p>
              </div>
              <div class="qr-box">
                <img src="${qrUrl}" alt="QR code for ${escapeHtml(record.customer.name || record.application.id)}" />
                <small>Scan at school gate</small>
              </div>
            </div>
            <footer>
              <span>${escapeHtml(record.token)}</span>
              <a href="${escapeHtml(record.scanUrl)}">${escapeHtml(record.scanUrl)}</a>
            </footer>
          </article>
        `;
      })
      .join("");

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Bumu PAYGO approved cards</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px; background: #eef6ff; color: #10201d; font-family: Arial, sans-serif; }
    .sheet { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 18px; }
    .card { min-height: 245px; border: 1px solid #b9cff5; border-radius: 12px; background: white; padding: 18px; display: grid; gap: 14px; box-shadow: 0 18px 40px rgba(15, 59, 143, .12); page-break-inside: avoid; }
    .card-top { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; border-bottom: 1px solid #dbe7f5; padding-bottom: 12px; }
    .eyebrow { display: block; color: #0f4ed8; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
    h2 { margin: 5px 0 0; font-size: 22px; line-height: 1.1; }
    .card-top strong { color: #0f4ed8; white-space: nowrap; }
    .card-body { display: grid; grid-template-columns: 1fr 132px; gap: 14px; align-items: center; }
    .details { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    p { margin: 0; border: 1px solid #dbe7f5; border-radius: 8px; padding: 8px; min-height: 52px; font-weight: 700; }
    p span { display: block; margin-bottom: 4px; color: #66736f; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .qr-box { display: grid; place-items: center; gap: 6px; border: 1px solid #dbe7f5; border-radius: 10px; padding: 8px; background: #f8fbff; }
    .qr-box img { width: 112px; height: 112px; display: block; }
    .qr-box small { color: #66736f; font-weight: 700; }
    footer { display: grid; gap: 5px; border-top: 1px solid #dbe7f5; padding-top: 10px; font-size: 12px; overflow-wrap: anywhere; }
    footer span { font-weight: 700; color: #0f4ed8; }
    footer a { color: #334155; text-decoration: none; }
    @media print { body { background: white; padding: 0; } .sheet { gap: 10px; } .card { box-shadow: none; } }
  </style>
</head>
<body>
  <main class="sheet">${cards}</main>
</body>
</html>`;
  }

  function downloadSelectedCards() {
    if (selectedApprovedApplications.length === 0) {
      setMessage("Select at least one approved application before downloading cards.");
      return;
    }

    const records = selectedApprovedApplications.map(makeCardRecord);
    const blob = new Blob([buildCardsHtml(records)], { type: "text/html;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `bumu-approved-cards-${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
    setMessage(`${records.length} approved card${records.length === 1 ? "" : "s"} downloaded as a printable file.`);
  }

  function openWhatsappForSelectedCards() {
    if (selectedApprovedApplications.length === 0) {
      setMessage("Select at least one approved application before sending the WhatsApp link.");
      return;
    }

    const phone = whatsappNumber.replace(/\D/g, "");
    if (!phone) {
      setMessage("Enter the WhatsApp phone number that should receive the scan link.");
      return;
    }

    const records = selectedApprovedApplications.map(makeCardRecord);
    const links = records
      .map((record, index) => `${index + 1}. ${record.customer.name || record.application.id}: ${record.scanUrl}`)
      .join("\n");
    const text = `Bumu PAYGO approved card scan link${records.length === 1 ? "" : "s"}:\n${links}\n\nOpen the link on the scanner phone. It opens the camera for the master/card scan.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  const columns = [
    {
      key: "select",
      label: "Card",
      render: (row) =>
        row.status === "approved" ? (
          <input
            aria-label={`Select approved card ${row.id}`}
            type="checkbox"
            checked={selectedCardIds.includes(row.id)}
            onChange={() => toggleSelectedCard(row.id)}
          />
        ) : (
          <span className="muted-text">Approval needed</span>
        )
    },
    { key: "id", label: "Application ID" },
    {
      key: "customer",
      label: "Customer",
      render: (row) => findCustomer(customers, row.customerId)?.name
    },
    {
      key: "nationalId",
      label: "National ID",
      render: (row) => findCustomer(customers, row.customerId)?.nationalId
    },
    {
      key: "agent",
      label: "Agent",
      render: (row) => findAgent(agents, row.agentId)?.name
    },
    {
      key: "bike",
      label: "Bike serial",
      render: (row) => findBike(bikes, row.bikeId)?.serialNumber || "Not assigned"
    },
    {
      key: "depositAmount",
      label: "Deposit",
      render: (row) => formatKes(row.depositAmount)
    },
    { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
    {
      key: "open",
      label: "Actions",
      render: (row) => (
        <div className="table-actions">
          <Link to={`/admin/applications/${row.id}`}>Open</Link>
          {["pending_screening", "info_required"].includes(row.status) ? (
            <>
              <OtpActionButton className="button secondary" disabled={Boolean(submittingId)} label={`approve ${row.id}`} onVerified={() => quickDecision(row, "approved")}>
                {submittingId === row.id ? "Working..." : "Approve"}
              </OtpActionButton>
              <button type="button" disabled={Boolean(submittingId)} onClick={() => quickDecision(row, "info_required")}>
                Info
              </button>
              <button type="button" disabled={Boolean(submittingId)} onClick={() => quickDecision(row, "rejected")}>
                Reject
              </button>
            </>
          ) : null}
        </div>
      )
    }
  ];

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Screening and approval"
        title="Customer applications"
        description="Review submitted customer KYC records, bike assignment, OTP status, and duplicate ID flags."
      />
      {message ? <div className="alert soft">{message}</div> : null}
      <div className="panel table-toolbar">
        <label>
          Search applications
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customer, ID, agent, bike..." />
        </label>
        <label>
          Status
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
          <strong>{visibleApplications.length}</strong>
        </div>
      </div>
      <div className="panel approved-card-toolbar">
        <div>
          <p className="eyebrow">Approved card download</p>
          <h3>Selected real card files</h3>
          <span>
            Select approved applications, download printable cards, or send their scan link to WhatsApp.
          </span>
        </div>
        <div className="approved-card-actions">
          <label className="check-row">
            <input
              type="checkbox"
              checked={allVisibleApprovedSelected}
              disabled={visibleApprovedApplications.length === 0}
              onChange={toggleAllVisibleApproved}
            />
            Select approved visible
          </label>
          <label>
            WhatsApp number
            <input
              value={whatsappNumber}
              onChange={(event) => setWhatsappNumber(event.target.value)}
              placeholder="2547..."
              inputMode="tel"
            />
          </label>
          <button className="button secondary" type="button" onClick={downloadSelectedCards}>
            <Download size={18} />
            Download cards
          </button>
          <button className="button primary" type="button" onClick={openWhatsappForSelectedCards}>
            <Send size={18} />
            Send link
          </button>
          <strong>{selectedApprovedApplications.length} selected</strong>
        </div>
      </div>
      <DataTable columns={columns} rows={visibleApplications} emptyMessage="No applications match this view." />
    </section>
  );
}
