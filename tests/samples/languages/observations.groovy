// Closures and property access over maps.
def observations = [[target: 'Vega', exposure: 12.5],
                    [target: 'Rigel', exposure: 8.0]]
def calibrate = { value -> value * 1.5 }
def valid = observations.findAll { it.exposure > 0 }
def total = valid.collect { calibrate(it.exposure) }.sum()
assert total > 0
valid.eachWithIndex { item, index ->
    println "${index + 1}: ${item.target} (${item.exposure}s)"
}
println "Total: $total"
