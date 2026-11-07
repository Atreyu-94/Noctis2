import React from 'react';
// Component fixture: the React runtime is supplied by a host application.
export function ObservationPanel({ observations = [], title = 'Tonight' }) {
  const total = observations.reduce((sum, item) => sum + item.exposure, 0);
  return (
    <section className="observations" aria-label={title}>
      {/* Values are escaped by JSX rendering. */}
      <h1>{title} &amp; calibration</h1>
      {observations.map(({ target, exposure }) => (
        <article key={target}><strong>{target}</strong>: {exposure}s</article>
      ))}
      <output>{total.toFixed(2)}</output>
    </section>
  );
}
