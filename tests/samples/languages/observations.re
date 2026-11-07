/* Reason records, pattern matching and labelled arguments. */
type observation = {target: string, exposure: float};
let calibrate = (~scale=1.5, item) => item.exposure *. scale;
let items = [{target: "Vega", exposure: 12.5}, {target: "Rigel", exposure: 8.0}];
let total = List.fold_left((sum, item) => sum +. calibrate(item), 0.0, items);
let first = switch (items) {
| [] => "No target"
| [item, ..._] => item.target
};
Printf.printf("%s: %.2f\n", first, total);
