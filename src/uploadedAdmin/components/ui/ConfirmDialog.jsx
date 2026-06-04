export function ConfirmDialog({ title, message, confirmLabel = "Confirm", tone = "primary", onCancel, onConfirm }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
        <h3 id="confirm-dialog-title">{title}</h3>
        <p>{message}</p>
        <div className="page-actions">
          <button className="button secondary" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className={`button ${tone}`} type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
