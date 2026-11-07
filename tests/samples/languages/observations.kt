// Data classes, lambdas and string templates.
data class Observation(val target: String, val exposure: Double) {
    fun calibrated(scale: Double = 1.5) = exposure * scale
}
fun main() {
    val items = listOf(Observation("Vega", 12.5), Observation("Rigel", 8.0))
    val valid = items.filter { it.exposure > 0 }
    val total = valid.sumOf { it.calibrated() }
    val first = valid.firstOrNull()?.target ?: "No target"
    println("$first: ${valid.size} observations, total $total")
}
