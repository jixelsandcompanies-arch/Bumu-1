import { useMemo, useState } from "react";
import { DataTable } from "../../components/ui/DataTable.jsx";
import { PageHeader } from "../../components/ui/PageHeader.jsx";
import { StatusBadge } from "../../components/ui/StatusBadge.jsx";
import { useAdminData } from "../../features/admin/AdminDataContext.jsx";
import { findAgent, findCustomer } from "../../lib/admin/lookups.js";

const emptyBike = {
  model: "",
  serialNumber: "",
  chassisNumber: ""
};

export default function Bikes() {
  const { addBike, agents, bikes, customers } = useAdminData();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyBike);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  function handleSubmit(event) {
    event.preventDefault();
    const normalizedSerial = form.serialNumber.trim().toLowerCase();
    const normalizedChassis = form.chassisNumber.trim().toLowerCase();
    const duplicateBike = bikes.find((bike) =>
      bike.serialNumber?.trim().toLowerCase() === normalizedSerial ||
      bike.chassisNumber?.trim().toLowerCase() === normalizedChassis
    );

    if (duplicateBike) {
      setMessage(`Cannot add bike. ${duplicateBike.serialNumber} already uses this serial or chassis number.`);
      return;
    }

    addBike(form);
    setMessage(`${form.model} ${form.serialNumber} saved as available stock.`);
    setForm(emptyBike);
    setShowForm(false);
  }

  const columns = [
    { key: "model", label: "Model" },
    { key: "serialNumber", label: "Serial number" },
    { key: "chassisNumber", label: "Chassis number" },
    { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
    {
      key: "customer",
      label: "Assigned customer",
      render: (row) => findCustomer(customers, row.assignedCustomerId)?.name || "Unassigned"
    },
    {
      key: "agent",
      label: "Assigned agent",
      render: (row) => findAgent(agents, row.assignedAgentId)?.name || "Unassigned"
    },
    { key: "createdAt", label: "Created" }
  ];
  const visibleBikes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return bikes.filter((bike) => {
      const customer = findCustomer(customers, bike.assignedCustomerId);
      const agent = findAgent(agents, bike.assignedAgentId);
      const searchable = [bike.model, bike.serialNumber, bike.chassisNumber, bike.status, customer?.name, agent?.name]
        .join(" ")
        .toLowerCase();
      const matchesStatus = statusFilter === "all" || bike.status === statusFilter;
      return matchesStatus && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [agents, bikes, customers, query, statusFilter]);

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Inventory"
        title="Bike management"
        description="Admin adds stock here. Agents only select available bikes during onboarding; assignment happens through approved customer applications."
        actions={
          <button className="button primary" type="button" onClick={() => setShowForm((open) => !open)}>
            {showForm ? "Close form" : "Add bike"}
          </button>
        }
      />

      {message ? <div className="alert soft">{message}</div> : null}

      {showForm ? (
        <form className="panel inventory-form" onSubmit={handleSubmit}>
          <div className="settings-card-header">
            <div>
              <p className="eyebrow">Inventory record</p>
              <h3>Add available bike</h3>
            </div>
          </div>

          <div className="settings-form">
            <label>
              Bike model
              <input
                required
                value={form.model}
                onChange={(event) => setForm({ ...form, model: event.target.value })}
                placeholder="TVS HLX 150"
              />
            </label>
            <label>
              Serial number
              <input
                required
                value={form.serialNumber}
                onChange={(event) => setForm({ ...form, serialNumber: event.target.value })}
                placeholder="TVS-HLX-2026-010"
              />
            </label>
            <label>
              Chassis number
              <input
                required
                value={form.chassisNumber}
                onChange={(event) => setForm({ ...form, chassisNumber: event.target.value })}
                placeholder="MD625MF54P1A90841"
              />
            </label>
          </div>

          <div className="page-actions">
            <button className="button primary" type="submit">Save bike</button>
            <button className="button secondary" type="button" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="panel table-toolbar">
        <label>
          Search bikes
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search model, serial, chassis..." />
        </label>
        <label>
          Status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="available">Available</option>
            <option value="reserved">Reserved</option>
            <option value="assigned">Assigned</option>
            <option value="repossessed">Repossessed</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <div className="toolbar-count">
          <span>Visible</span>
          <strong>{visibleBikes.length}</strong>
        </div>
      </div>

      <DataTable columns={columns} rows={visibleBikes} emptyMessage="No bikes match this view." />
    </section>
  );
}
