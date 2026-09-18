export function SaveStatus({ saveStatus, errorMessage }) {
  if (saveStatus === 'error') {
    return <span className="save-status error">{errorMessage || 'Error'}</span>;
  }

  if (saveStatus === 'saving') {
    return <span className="save-status saving">Saving…</span>;
  }

  if (saveStatus === 'unsaved') {
    return <span className="save-status unsaved">Unsaved changes</span>;
  }

  return <span className="save-status saved">✓ Saved</span>;
}
