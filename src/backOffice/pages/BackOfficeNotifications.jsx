import { Bell, BellDot, MessageSquareText, Search, Send, Smartphone } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTable } from "../../uploadedAdmin/components/ui/DataTable.jsx";
import { PageHeader } from "../../uploadedAdmin/components/ui/PageHeader.jsx";
import { StatCard } from "../../uploadedAdmin/components/ui/StatCard.jsx";
import { StatusBadge } from "../../uploadedAdmin/components/ui/StatusBadge.jsx";
import { useAdminData } from "../../uploadedAdmin/features/admin/AdminDataContext.jsx";

const channelLabels = {
  in_app: "In app",
  sms: "SMS",
  email: "Email",
  whatsapp: "WhatsApp"
};

function getNotificationPriority(notification) {
  const text = `${notification.title} ${notification.message}`.toLowerCase();

  if (text.includes("duplicate") || text.includes("rejected") || text.includes("overdue")) {
    return "urgent";
  }

  if (text.includes("pending") || text.includes("info required") || text.includes("waiting")) {
    return "follow_up";
  }

  return "normal";
}

export default function BackOfficeNotifications() {
  const { notifications = [], updateNotificationStatus } = useAdminData();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [message, setMessage] = useState("");

  const unread = notifications.filter((item) => item.status === "unread").length;
  const sms = notifications.filter((item) => item.channel === "sms").length;
  const inApp = notifications.filter((item) => item.channel === "in_app").length;
  const urgent = notifications.filter((item) => getNotificationPriority(item) === "urgent").length;

  const channelOptions = useMemo(
    () => Array.from(new Set(notifications.map((notification) => notification.channel))).sort(),
    [notifications]
  );

  const visibleNotifications = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return notifications
      .filter((item) => statusFilter === "all" || item.status === statusFilter)
      .filter((item) => channelFilter === "all" || item.channel === channelFilter)
      .filter((item) => {
        if (!normalizedQuery) return true;
        return [item.title, item.message, item.channel, item.status, item.createdAt]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      });
  }, [channelFilter, notifications, query, statusFilter]);

  async function markVisibleAsRead() {
    const unreadIds = visibleNotifications.filter((item) => item.status === "unread").map((item) => item.id);
    if (!unreadIds.length) {
      setMessage("No unread notifications in this view.");
      return;
    }
    try {
      await updateNotificationStatus(unreadIds, "read");
      setMessage(`${unreadIds.length} notifications marked as read.`);
    } catch (error) {
      setMessage(error.message || "Could not update notification status.");
    }
  }

  async function toggleNotificationStatus(notification) {
    try {
      const nextStatus = notification.status === "unread" ? "read" : "unread";
      await updateNotificationStatus([notification.id], nextStatus);
      setMessage(`Notification marked ${nextStatus}.`);
    } catch (error) {
      setMessage(error.message || "Could not update notification status.");
    }
  }

  function resetFilters() {
    setQuery("");
    setStatusFilter("all");
    setChannelFilter("all");
    setMessage("");
  }

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Notifications"
        title="Screening alerts"
        description="Review notifications for customer screening, missing details, duplicates, and urgent follow-up requests."
        actions={
          <div className="page-actions">
            <button className="button primary" type="button" onClick={markVisibleAsRead}>
              <BellDot size={18} />
              Mark visible read
            </button>
            <button className="button secondary" type="button" onClick={resetFilters}>
              <Bell size={18} />
              Reset filters
            </button>
          </div>
        }
      />

      {message ? <div className="alert soft">{message}</div> : null}

      <div className="stats-grid">
        <StatCard icon={Bell} label="Total notifications" value={notifications.length} detail="All channels" />
        <StatCard icon={BellDot} label="Unread" value={unread} detail="Needs review" tone="warning" />
        <StatCard icon={Smartphone} label="In-app" value={inApp} detail="Portal alerts" />
        <StatCard icon={Send} label="SMS" value={sms} detail="Agent messages" />
        <StatCard icon={MessageSquareText} label="Priority" value={urgent} detail="Urgent flags" tone="danger" />
      </div>

      <div className="panel table-toolbar notifications-toolbar">
        <label>
          Search notifications
          <div className="input-with-icon">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, message, channel..." />
          </div>
        </label>
        <label>
          Status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All notifications</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        </label>
        <label>
          Channel
          <select value={channelFilter} onChange={(event) => setChannelFilter(event.target.value)}>
            <option value="all">All channels</option>
            {channelOptions.map((channel) => (
              <option key={channel} value={channel}>
                {channelLabels[channel] || channel}
              </option>
            ))}
          </select>
        </label>
        <div className="toolbar-count">
          <span>Visible</span>
          <strong>{visibleNotifications.length}</strong>
        </div>
      </div>

      <DataTable
        columns={[
          {
            key: "title",
            label: "Title",
            render: (row) => (
              <div className="notification-title-cell">
                <span className={`notification-dot ${row.status === "unread" ? "is-unread" : ""}`} />
                <strong>{row.title}</strong>
              </div>
            )
          },
          { key: "message", label: "Message" },
          {
            key: "channel",
            label: "Channel",
            render: (row) => <span className="channel-chip">{channelLabels[row.channel] || row.channel}</span>
          },
          {
            key: "priority",
            label: "Priority",
            render: (row) => <StatusBadge status={getNotificationPriority(row)} />
          },
          {
            key: "status",
            label: "Status",
            render: (row) => <StatusBadge status={row.status} />
          },
          { key: "createdAt", label: "Created" },
          {
            key: "actions",
            label: "Actions",
            render: (row) => (
              <div className="table-actions">
                <button type="button" onClick={() => toggleNotificationStatus(row)}>
                  {row.status === "unread" ? "Mark read" : "Mark unread"}
                </button>
              </div>
            )
          }
        ]}
        rows={visibleNotifications}
        emptyMessage="No notifications match this view."
      />
    </section>
  );
}
