import { ArrowLeft, ArrowRight, Bell, Settings2, UserRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../uploadedAdmin/features/auth/AuthContext.jsx";

export function BackOfficeTopbar({ onToggleSidebar }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <header className="topbar">
      <div className="topbar-title">
        <button
          className="icon-button"
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar navigation"
          title="Toggle sidebar"
        >
          <span />
          <span />
          <span />
        </button>
        <div>
          <p className="eyebrow">Back Office</p>
          <h1>Screening workspace</h1>
        </div>
      </div>
      <div className="topbar-actions">
        <div className="history-controls" aria-label="Page navigation controls">
          <button className="icon-button compact" type="button" onClick={() => navigate(-1)} aria-label="Go back" title="Back">
            <ArrowLeft size={18} strokeWidth={2.6} />
          </button>
          <button className="icon-button compact" type="button" onClick={() => navigate(1)} aria-label="Go forward" title="Forward">
            <ArrowRight size={18} strokeWidth={2.6} />
          </button>
          <button
            className="icon-button compact"
            type="button"
            onClick={() => navigate("/backoffice/notifications")}
            aria-label="Open notifications"
            title="Notifications"
          >
            <Bell size={18} strokeWidth={2.6} />
          </button>
          <button
            className="icon-button compact"
            type="button"
            onClick={() => navigate("/backoffice/settings")}
            aria-label="Open settings"
            title="Settings"
          >
            <Settings2 size={18} strokeWidth={2.6} />
          </button>
        </div>
        <Link className="user-chip" to="/backoffice/profile">
          <span className="user-chip-photo">
            {user?.photoUrl ? <img src={user.photoUrl} alt="" /> : <UserRound size={18} />}
          </span>
          <span className="user-chip-text">
            <span>{user?.name}</span>
            <small>{user?.role?.replaceAll("_", " ")}</small>
          </span>
        </Link>
      </div>
    </header>
  );
}
