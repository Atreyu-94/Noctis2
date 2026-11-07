// Destructuring, private fields, optional access and interpolation.
class Observation {
  #scale = 1.5;
  constructor(target, exposure) { Object.assign(this, { target, exposure }); }
  get calibrated() { return this.exposure * this.#scale; }
}
const items = [new Observation('Vega', 12.5), new Observation('Rigel', 8)];
const valid = items.filter(({ exposure }) => exposure > 0);
const total = valid.reduce((sum, item) => sum + item.calibrated, 0);
const label = valid[0]?.target ?? 'No target';
console.log(`${label}: total ${total.toFixed(2)}`);
