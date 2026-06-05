import { useState } from "react";
import { Link } from "react-router-dom";
import { LockKeyhole, UserRound } from "lucide-react";
import { PageHeader } from "../../uploadedAdmin/components/ui/PageHeader.jsx";
import { useAuth } from "../../uploadedAdmin/features/auth/AuthContext.jsx";

export default function BackOfficeProfile() {
  const { updateProfile, user } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    photoUrl: user?.photoUrl || ""
  });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    const result = await updateProfile(form);
    setSaving(false);
    setMessage(result.message || (result.ok ? "Profile saved successfully." : "Profile could not be saved."));
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((current) => ({ ...current, photoUrl: String(reader.result || "") }));
    reader.readAsDataURL(file);
  }

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Account"
        title="Profile"
        description="Manage your Back Office account details, access information, and security preferences."
      />
      {message ? <div className="alert soft">{message}</div> : null}

      <div className="detail-grid">
        <article className="panel">
          <div className="settings-card-header">
            <div>
              <p className="eyebrow">Profile</p>
              <h3>Account details</h3>
            </div>
            <UserRound size={22} />
          </div>

          <div className="profile-photo-row">
            <div className="profile-photo-preview">
              {form.photoUrl ? <img src={form.photoUrl} alt="Profile preview" /> : <UserRound size={36} />}
            </div>
            <label className="upload-control">
              Profile photo
              <input type="file" accept="image/png,image/jpeg,image/jpg" onChange={handlePhotoChange} />
              <span>Upload JPG or PNG</span>
            </label>
          </div>

          <div className="settings-form">
            <label>
              Full name
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>
            <label>
              Email
              <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </label>
            <label>
              Phone
              <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            </label>
            <label>
              Role
              <input value={user?.role?.replaceAll("_", " ") || ""} readOnly />
            </label>
          </div>
        </article>

        <article className="panel">
          <div className="settings-card-header">
            <div>
              <p className="eyebrow">Security</p>
              <h3>Password and access</h3>
            </div>
            <LockKeyhole size={22} />
          </div>

          <div className="settings-form">
            <p className="text-muted">Password changes are handled through the reset flow for security. If you need a new password, request a reset link.</p>
            <Link className="button secondary" to="/backoffice/reset-password">
              Request password reset
            </Link>
          </div>
        </article>
      </div>

      <div className="page-actions">
        <button className="button primary" type="button" onClick={saveProfile} disabled={saving}>
          {saving ? "Saving..." : "Save profile"}
        </button>
      </div>
    </section>
  );
}
