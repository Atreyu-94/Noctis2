import strformat, sequtils
# Object fields, procedures and generic sequence helpers.
type Observation = object
  target: string
  exposure: float
proc calibrated(item: Observation; scale = 1.5): float =
  item.exposure * scale
let items = @[Observation(target: "Vega", exposure: 12.5),
              Observation(target: "Rigel", exposure: 8.0)]
let valid = items.filterIt(it.exposure > 0)
var total = 0.0
for item in valid:
  total += item.calibrated()
echo &"{valid.len} observations: {total:.2f}"
