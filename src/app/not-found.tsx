import Link from "next/link";

export default function NotFound() {
  return (
    <section className="narrow-page">
      <article className="card empty-state">
        <p className="eyebrow">Not found</p>
        <h1>This page is unavailable</h1>
        <p className="muted">The link may be invalid, private, or no longer active.</p>
        <Link className="button" href="/" prefetch={false}>
          Return home
        </Link>
      </article>
    </section>
  );
}
