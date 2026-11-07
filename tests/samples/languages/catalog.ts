// Telescope coordinates and a typed catalogue, with no external dependencies.
export namespace Geometry {
    export interface Point {
        readonly label: string;
        x: number;
        y: number;
        move(distance: number): number;
    }

    export enum Axis { Horizontal, Vertical }
    export type Mapper<T> = (value: T) => T;

    export class Vector implements Point {
        static readonly origin = 0;
        readonly label = "vector";
        x = 1;
        y = 2;

        move(distance: number): number {
            this.x += distance;
            return this.x;
        }

        static clamp(value: number): number {
            return Math.max(value, Vector.origin);
        }

        get magnitude(): number {
            return Math.hypot(this.x, this.y);
        }
    }

    export function mapValue<T>(value: T, transform: Mapper<T>): T {
        return transform(value);
    }

    const vector = new Vector();
    let current: Point = vector;
    const axis = Axis.Horizontal;
    const initialLabel = current.label;
    current.x = mapValue(current.x, value => value + 1);
    current.move(Vector.clamp(2));
    const length = vector.magnitude;
    const size: ReadonlyArray<number> = [length, initialLabel.length, axis];
    console.log(size, vector.label);
}

type Band = "visible" | "infrared";
type Observation = Readonly<{
    id: string;
    target: string;
    band: Band;
    exposure: number;
    notes?: string;
}>;
type Result<T> = { ok: true; value: T } | { ok: false; error: Error };

/** Index observations without losing their specific record type. */
function indexById<T extends { id: string }>(records: readonly T[]): Map<string, T> {
    return new Map(records.map(record => [record.id, record]));
}

function validate(observation: Observation): Result<Observation> {
    if (!/^OBS-\d{3}$/.test(observation.id)) {
        return { ok: false, error: new Error(`Invalid ID: ${observation.id}`) };
    }
    return observation.exposure > 0
        ? { ok: true, value: observation }
        : { ok: false, error: new RangeError("Exposure must be positive") };
}

const observations = [
    { id: "OBS-001", target: "Vega", band: "visible", exposure: 2.5 },
    { id: "OBS-002", target: "Deneb", band: "infrared", exposure: 4, notes: "Clear sky" },
] satisfies Observation[];

const catalogue = indexById(observations);
const selected = catalogue.get("OBS-002");
const note = selected?.notes ?? "No observer notes";
const exposure = observations.reduce((total, { exposure }) => total + exposure, 0);

for (const observation of catalogue.values()) {
    const result = validate(observation);
    if (result.ok) {
        console.log(`${result.value.target}: ${result.value.exposure.toFixed(1)} s`);
    } else {
        console.error(result.error.message);
    }
}
console.log({ note, exposure, count: catalogue.size });
