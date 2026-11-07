// Structs, default arguments and key-path mapping.
struct Observation {
    let target: String
    let exposure: Double
    func calibrated(scale: Double = 1.5) -> Double { exposure * scale }
}
let items = [Observation(target: "Vega", exposure: 12.5),
             Observation(target: "Rigel", exposure: 8.0)]
let valid = items.filter { $0.exposure > 0 }
let total = valid.map { $0.calibrated() }.reduce(0, +)
let labels = valid.map(\.target).joined(separator: ", ")
print("\(labels): \(total) seconds")
