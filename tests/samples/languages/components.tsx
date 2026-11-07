/** @jsx element */
// A tiny JSX renderer keeps this sample independent of React and the DOM.
type View = { tag: string; props: Record<string, unknown>; children: unknown[] };

declare namespace JSX {
    type Element = View;
    interface IntrinsicElements {
        section: { className?: string; children?: unknown };
        h1: { children?: unknown };
        p: { children?: unknown };
        ul: { children?: unknown };
        li: { key: string; title?: string; children?: unknown };
        strong: { children?: unknown };
        span: { children?: unknown };
    }
}

function element(
    tag: string,
    props: Record<string, unknown> | null,
    ...children: unknown[]
): View {
    return { tag, props: props ?? {}, children };
}

interface Target {
    readonly id: string;
    name: string;
    exposure: number;
    visible: boolean;
}

/** Render an observing queue as a portable tree of plain objects. */
function ObservationPanel({ targets }: { targets: readonly Target[] }): View {
    const visible = targets.filter(target => target.visible);
    const total = visible.reduce((seconds, target) => seconds + target.exposure, 0);

    return (
        <section className="observations">
            {/* JSX comments, attributes, tags and embedded expressions. */}
            <h1>Tonight&apos;s targets</h1>
            <p>Visible targets: <strong>{visible.length}</strong></p>
            <ul>
                {visible.map(({ id, name, exposure }) => (
                    <li key={id} title={`Exposure: ${exposure} seconds`}>
                        <strong>{name}</strong>: <span>{exposure.toFixed(1)} s</span>
                    </li>
                ))}
            </ul>
            {visible.length === 0 ? <p>No targets available.</p> : <p>Ready to observe.</p>}
            <p>Total exposure: {total} s &amp; clear skies.</p>
        </section>
    );
}

const targets: readonly Target[] = [
    { id: "vega", name: "Vega", exposure: 2.5, visible: true },
    { id: "deneb", name: "Deneb", exposure: 4.0, visible: false },
    { id: "altair", name: "Altair", exposure: 1.5, visible: true },
];

const panel = ObservationPanel({ targets });
console.log(JSON.stringify(panel, null, 2));
