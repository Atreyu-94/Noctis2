# Calibrate measurements and retain their target labels.
class Observation
  constructor: (@target, @exposure = 0) ->
  calibrated: (scale = 1.5) -> @exposure * scale

items = [new Observation('Vega', 12.5), new Observation('Rigel', 8)]
valid = (item for item in items when item.exposure > 0)
total = valid.reduce ((sum, item) -> sum + item.calibrated()), 0
labels = (item.target for item in valid).join ', '
console.log "Targets: #{labels}; total: #{total.toFixed 2}"
