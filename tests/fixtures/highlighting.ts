// Synthetic semantic-highlighting fixture; no application dependencies.
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