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

const CARD_TEMPLATE_OPTIONS = [
  {
    id: "auto",
    kind: "auto",
    title: "Auto choose",
    description: "Uses school image cards for students and organization image cards for master scanner cards.",
    image: "/card-templates/company-executive-clear-real.png"
  },
  {
    id: "school-student-green",
    kind: "student",
    title: "School Student Classic",
    description: "Real student card image with class, stream, school location, photo area, and gate QR.",
    image: "/card-templates/school-student-green-real.png"
  },
  {
    id: "school-student-blue",
    kind: "student",
    title: "School Student Clear",
    description: "Clean school ID image for class, stream, parent link, and gate scanning.",
    image: "/card-templates/school-student-blue-real.png"
  },
  {
    id: "company-staff-classic",
    kind: "organization",
    title: "Company Staff Classic",
    description: "Realistic staff card image with logo, chip, photo area, QR, and secure ID band.",
    image: "/card-templates/company-staff-classic-real.png"
  },
  {
    id: "company-executive-clear",
    kind: "organization",
    title: "Company Executive Clear",
    description: "Premium dark-blue master scanner card image with QR and executive layout.",
    image: "/card-templates/company-executive-clear-real.png"
  },
  {
    id: "company-contractor-bold",
    kind: "organization",
    title: "Company Contractor Bold",
    description: "High-contrast real card image for contractors and fast visual checking.",
    image: "/card-templates/company-contractor-bold-real.png"
  },
  {
    id: "company-visitor-qr",
    kind: "organization",
    title: "Company Visitor QR Focus",
    description: "Visitor-first real card image with a stronger QR and verification layout.",
    image: "/card-templates/company-visitor-qr-real.png"
  }
];

const DEFAULT_TEMPLATE_BY_KIND = {
  student: "school-student-green",
  organization: "company-executive-clear"
};

export default function Applications() {
  const { agents, applications, bikes, customers, updateApplicationStatus } = useAdminData();
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [submittingId, setSubmittingId] = useState("");
  const [selectedCardIds, setSelectedCardIds] = useState([]);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [cardTemplateMode, setCardTemplateMode] = useState(() => {
    const saved = window.localStorage.getItem("bumu-approved-card-template");
    if (saved === "school" || saved === "school-green") return "school-student-green";
    if (saved === "school-blue") return "school-student-blue";
    if (saved === "organization" || saved === "organization-executive") return "company-executive-clear";
    if (saved === "organization-staff") return "company-staff-classic";
    return CARD_TEMPLATE_OPTIONS.some((template) => template.id === saved) ? saved : "auto";
  });

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
      if (status === "approved") {
        sendCardsToWhatsapp([makeCardRecord({ ...application, status: "approved" })], { allowMissingNumber: true });
      }
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

  function chooseCardTemplate(templateId) {
    setCardTemplateMode(templateId);
    window.localStorage.setItem("bumu-approved-card-template", templateId);
  }

  function templateForRecord(cardKind) {
    const selectedTemplate = CARD_TEMPLATE_OPTIONS.find((template) => template.id === cardTemplateMode);
    const templateId =
      !selectedTemplate || selectedTemplate.kind === "auto"
        ? DEFAULT_TEMPLATE_BY_KIND[cardKind]
        : selectedTemplate.id;
    return CARD_TEMPLATE_OPTIONS.find((template) => template.id === templateId) || CARD_TEMPLATE_OPTIONS[1];
  }

  function makeCardRecord(application) {
    const customer = findCustomer(customers, application.customerId) || {};
    const agent = findAgent(agents, application.agentId) || {};
    const bike = findBike(bikes, application.bikeId) || {};
    const studentClass = customer.className || customer.studentClass || application.className || application.studentClass || "Class not set";
    const stream = customer.stream || application.stream || "Stream not set";
    const productType = application.productType || customer.productType || bike.productType || "product";
    const detectedCardKind = isStudentCard({ customer, application, productType, studentClass, stream }) ? "student" : "organization";
    const selectedTemplate = CARD_TEMPLATE_OPTIONS.find((template) => template.id === cardTemplateMode);
    const cardKind =
      selectedTemplate?.kind === "student" || selectedTemplate?.kind === "organization"
        ? selectedTemplate.kind
        : detectedCardKind;
    const template = templateForRecord(cardKind);
    const token = [
      cardKind === "student" ? "BUMU-STUDENT" : "BUMU-MASTER",
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
      cardKind,
      productType,
      template,
      token,
      scanUrl,
      studentClass,
      stream
    };
  }

  function isStudentCard({ customer, application, productType, studentClass, stream }) {
    const text = [
      productType,
      customer.productType,
      application.productType,
      customer.occupation,
      application.installmentPlan,
      studentClass,
      stream
    ]
      .join(" ")
      .toLowerCase();

    return /\bstudent\b|\bschool\b|\bclass\b|\bgrade\b|\bstream\b/.test(text);
  }

  function formatWhatsappPhone(value) {
    const digits = String(value || "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("0")) return `254${digits.slice(1)}`;
    if (digits.startsWith("7") || digits.startsWith("1")) return `254${digits}`;
    return digits;
  }

  function recordRecipientPhone(record) {
    if (record.cardKind === "student") {
      return formatWhatsappPhone(record.application.nextOfKin?.phone || record.customer.nextOfKin?.phone || whatsappNumber);
    }

    return formatWhatsappPhone(whatsappNumber || record.customer.phone);
  }

  function recordRecipientLabel(record) {
    if (record.cardKind === "student") {
      return record.application.nextOfKin?.name || record.customer.nextOfKin?.name || "parent";
    }

    return "organization scanner";
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
        const templateImage = `${window.location.origin}${record.template?.image || "/card-templates/school-student-green-real.png"}`;
        return record.cardKind === "student"
          ? `
            <article class="card student-template">
              <section class="student-front" style="--card-bg: url('${templateImage}')">
                <div class="school-band">
                  <div class="crest">BP</div>
                  <div>
                    <span>School gate pass</span>
                    <strong>Bumu PAYGO Student</strong>
                  </div>
                  <b>ACTIVE</b>
                </div>
                <div class="student-main">
                  <div class="student-photo">${escapeHtml((record.customer.name || "S").slice(0, 1).toUpperCase())}</div>
                  <div class="student-copy">
                    <p class="label">Student / holder</p>
                    <h2>${escapeHtml(record.customer.name || "Approved student")}</h2>
                    <div class="school-grid">
                      <span><b>Class</b>${escapeHtml(record.studentClass)}</span>
                      <span><b>Stream</b>${escapeHtml(record.stream)}</span>
                      <span><b>Parent</b>${escapeHtml(recordRecipientLabel(record))}</span>
                      <span><b>Card no.</b>${escapeHtml(record.application.id)}</span>
                    </div>
                  </div>
                  <div class="student-qr">
                    <img src="${qrUrl}" alt="Student QR code" />
                    <small>Gate scan</small>
                  </div>
                </div>
                <div class="student-strip">
                  <span>${escapeHtml(record.token)}</span>
                  <em>Entry and exit notification card</em>
                </div>
              </section>
              <section class="student-back">
                <div>
                  <span class="eyebrow">Parent notification</span>
                  <h3>School gate scan instructions</h3>
                </div>
                <ol>
                  <li>Open the WhatsApp link sent to the parent.</li>
                  <li>At the gate, scan the student QR using the camera.</li>
                  <li>Select coming in or going out, then save the scan.</li>
                  <li>The record stores GPS accuracy when location is allowed.</li>
                </ol>
                <a href="${escapeHtml(record.scanUrl)}">${escapeHtml(record.scanUrl)}</a>
              </section>
            </article>
          `
          : `
            <article class="card organization-template">
              <section class="org-front" style="--card-bg: url('${templateImage}')">
                <div class="org-glass">
                  <div class="org-topline">
                    <span>MASTER ACCESS</span>
                    <b>${escapeHtml(record.application.id)}</b>
                  </div>
                  <h2>${escapeHtml(record.customer.name || "Organization account")}</h2>
                  <p>${escapeHtml(record.productType || "Organization")} scanner credential</p>
                  <div class="org-details">
                    <span><b>Scanner</b>${escapeHtml(recordRecipientLabel(record))}</span>
                    <span><b>Asset</b>${escapeHtml(record.bike.serialNumber || record.productType || "Not assigned")}</span>
                    <span><b>Phone</b>${escapeHtml(record.customer.phone || "Not captured")}</span>
                    <span><b>Status</b>Approved</span>
                  </div>
                </div>
                <div class="org-qr-panel">
                  <img src="${qrUrl}" alt="Organization master QR code" />
                  <strong>SCAN</strong>
                  <small>Opens camera scanner</small>
                </div>
              </section>
              <section class="org-back">
                <div class="org-back-code">${escapeHtml(record.token)}</div>
                <div>
                  <span class="eyebrow">Organization workflow</span>
                  <h3>Master card use</h3>
                  <p>Send this link to the scanner phone entered by admin. The user opens the link, the camera starts, then the card is scanned and saved.</p>
                </div>
                <a href="${escapeHtml(record.scanUrl)}">${escapeHtml(record.scanUrl)}</a>
              </section>
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
    body { margin: 0; padding: 24px; background: #edf4fb; color: #10201d; font-family: Arial, sans-serif; }
    .sheet { display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 26px; align-items: start; }
    .card { display: grid; gap: 12px; page-break-inside: avoid; }
    .student-front, .student-back, .org-front, .org-back { min-height: 268px; border-radius: 16px; overflow: hidden; box-shadow: 0 22px 46px rgba(15, 35, 65, .18); }
    .student-front, .org-front { background-image: var(--card-bg); background-size: cover; background-position: center; }
    .school-band { display: grid; grid-template-columns: 54px 1fr auto; gap: 12px; align-items: center; padding: 16px 18px; background: rgba(255,255,255,.92); border-bottom: 5px solid #16a34a; }
    .crest { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 50%; background: #0f4ed8; color: white; font-weight: 800; }
    .school-band span, .eyebrow { display: block; font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #0f4ed8; }
    .school-band strong { font-size: 18px; }
    .school-band b { border-radius: 999px; background: #dcfce7; color: #166534; padding: 8px 12px; font-size: 12px; }
    .student-main { display: grid; grid-template-columns: 96px 1fr 132px; gap: 14px; align-items: center; padding: 18px; background: rgba(255,255,255,.76); backdrop-filter: blur(1px); }
    .student-photo { width: 96px; height: 116px; display: grid; place-items: center; border: 4px solid #ffffff; border-radius: 12px; background: linear-gradient(135deg, #0f4ed8, #38bdf8); color: white; font-size: 42px; font-weight: 800; box-shadow: 0 12px 28px rgba(15, 78, 216, .22); }
    .label { margin: 0 0 4px; color: #64748b; font-size: 11px; font-weight: 800; text-transform: uppercase; }
    h2, h3 { margin: 0; line-height: 1.1; }
    h2 { font-size: 24px; }
    h3 { font-size: 22px; }
    .school-grid, .org-details { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }
    .school-grid span, .org-details span { display: grid; gap: 3px; border: 1px solid rgba(15, 78, 216, .16); border-radius: 10px; background: rgba(255,255,255,.78); padding: 8px; font-weight: 700; }
    .school-grid b, .org-details b { color: #64748b; font-size: 10px; text-transform: uppercase; }
    .student-qr, .org-qr-panel { display: grid; place-items: center; gap: 6px; border-radius: 14px; background: #ffffff; padding: 10px; border: 1px solid #dbe7f5; }
    .student-qr img, .org-qr-panel img { width: 112px; height: 112px; display: block; }
    .student-qr small, .org-qr-panel small { color: #64748b; font-weight: 800; text-align: center; }
    .student-strip { display: flex; justify-content: space-between; gap: 12px; padding: 12px 18px; background: #0f172a; color: white; font-size: 12px; overflow-wrap: anywhere; }
    .student-strip span { font-weight: 800; }
    .student-back { display: grid; gap: 14px; padding: 18px; background: #ffffff; border: 1px solid #cfe0fb; }
    .student-back ol { margin: 0; padding-left: 20px; display: grid; gap: 8px; line-height: 1.45; color: #334155; }
    a { color: #0f4ed8; overflow-wrap: anywhere; font-size: 12px; text-decoration: none; }
    .org-front { position: relative; display: grid; grid-template-columns: 1fr 160px; gap: 18px; align-items: stretch; padding: 20px; color: white; }
    .org-glass { display: grid; align-content: space-between; border: 1px solid rgba(255,255,255,.24); border-radius: 16px; background: rgba(255,255,255,.1); padding: 18px; backdrop-filter: blur(6px); }
    .org-topline { display: flex; justify-content: space-between; gap: 12px; color: #dbeafe; font-size: 12px; font-weight: 800; letter-spacing: .08em; }
    .org-glass h2 { font-size: 30px; margin-top: 28px; }
    .org-glass p { margin: 8px 0 0; color: #dbeafe; }
    .org-details span { border-color: rgba(255,255,255,.24); background: rgba(255,255,255,.12); color: white; }
    .org-details b { color: #dbeafe; }
    .org-qr-panel { align-self: center; min-height: 210px; color: #0f172a; }
    .org-qr-panel strong { font-size: 20px; letter-spacing: .18em; color: #0f4ed8; }
    .org-back { display: grid; grid-template-columns: 150px 1fr; gap: 18px; align-items: center; padding: 20px; background: #f8fafc; border: 1px solid #cbd5e1; }
    .org-back-code { writing-mode: vertical-rl; transform: rotate(180deg); border-radius: 14px; background: #0f172a; color: white; padding: 16px; font-size: 13px; font-weight: 800; letter-spacing: .08em; text-align: center; }
    .org-back p { color: #334155; line-height: 1.45; }
    @media print { body { background: white; padding: 0; } .sheet { gap: 12px; } .student-front, .student-back, .org-front, .org-back { box-shadow: none; } }
    @media (max-width: 520px) { body { padding: 12px; } .sheet { grid-template-columns: 1fr; } .student-main, .org-front, .org-back { grid-template-columns: 1fr; } .student-photo { width: 82px; height: 96px; } }
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

  function sendCardsToWhatsapp(records, { allowMissingNumber = false } = {}) {
    if (!records.length) {
      if (!allowMissingNumber) {
        setMessage("Select at least one approved application before sending the WhatsApp link.");
      }
      return;
    }

    const grouped = records.reduce((groups, record) => {
      const phone = recordRecipientPhone(record);
      if (!phone) return groups;
      return {
        ...groups,
        [phone]: [...(groups[phone] || []), record]
      };
    }, {});

    const phones = Object.keys(grouped);
    if (phones.length === 0) {
      if (!allowMissingNumber) {
        setMessage("Enter the organization scanner WhatsApp number. Student cards use the parent or next-of-kin phone.");
      }
      return;
    }

    phones.forEach((phone, phoneIndex) => {
      const phoneRecords = grouped[phone];
      const hasStudent = phoneRecords.some((record) => record.cardKind === "student");
      const links = phoneRecords
        .map((record, index) => `${index + 1}. ${record.customer.name || record.application.id}: ${record.scanUrl}`)
        .join("\n");
      const text = hasStudent
        ? `Bumu PAYGO student card link:\n${links}\n\nOpen the link for the school gate card. The scanner page opens the camera.`
        : `Bumu PAYGO organization master card link:\n${links}\n\nOpen the link on the scanner phone. It opens the camera for the master card scan.`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, phoneIndex === 0 ? "_blank" : `_blank${phoneIndex}`, "noopener,noreferrer");
    });

    setMessage(`${records.length} card link${records.length === 1 ? "" : "s"} prepared for WhatsApp.`);
  }

  function openWhatsappForSelectedCards() {
    sendCardsToWhatsapp(selectedApprovedApplications.map(makeCardRecord));
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
          <h3>Selected printable card files</h3>
          <span>
            Download real front/back cards. Organization cards use the scanner number below; student cards use the parent or next-of-kin phone.
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
            Card template
            <select value={cardTemplateMode} onChange={(event) => chooseCardTemplate(event.target.value)}>
              {CARD_TEMPLATE_OPTIONS.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Organization scanner WhatsApp
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
        <div className="approved-card-template-grid" aria-label="Real card template choices">
          {CARD_TEMPLATE_OPTIONS.map((template) => (
            <button
              className={`approved-card-template ${cardTemplateMode === template.id ? "is-selected" : ""}`}
              key={template.id}
              type="button"
              onClick={() => chooseCardTemplate(template.id)}
            >
              <img src={template.image} alt={`${template.title} preview`} />
              <span>
                <b>{template.title}</b>
                <small>{template.description}</small>
              </span>
            </button>
          ))}
        </div>
      </div>
      <DataTable columns={columns} rows={visibleApplications} emptyMessage="No applications match this view." />
    </section>
  );
}
