export default function Loading() {
  return (
    <section aria-label="Loading page" aria-live="polite" className="page-stack">
      <span className="sr-only">Loading page...</span>
      <div aria-hidden="true" className="skeleton skeleton-title" />
      <div aria-hidden="true" className="skeleton-grid">
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </div>
    </section>
  );
}
