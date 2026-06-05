import { useState } from "react";
import { PageHeader } from "../../uploadedAdmin/components/ui/PageHeader.jsx";
import { useAuth } from "../../uploadedAdmin/features/auth/AuthContext.jsx";

export default function BackOfficeProfile() {
  const { updateProfile, user } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    photoUrl: user?.photoUrl || ""
  });
  const [message, setMessage] = useState("");

  async function saveProfile(event) {
    event.preventDefault();
    const result = await updateProfile(form);
    setMessage(result.message || (result.ok ? "Profile saved." : "Profile could not be saved."));
  }

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Back Office account"
        title="Profile"
        description="Manage the account details used in the screening workspace."
      />
      {message ? <div className="alert soft">{message}</div> : null}
      <form className="panel form-grid" onSubmit={saveProfile}>
        <label>
          Name
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </label>
        <label>
          Phone
          <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        </label>
        <label>
          Profile photo URL
          <input value={form.photoUrl} onChange={(event) => setForm({ ...form, photoUrl: event.target.value })} />
        </label>
        <div className="page-actions">
          <button className="button primary" type="submit">Save profile</button>
        </div>
      </form>
    </section>
  );
}
