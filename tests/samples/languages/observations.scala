// Case classes, collection methods and formatted interpolation.
object Observatory {
  case class Observation(target: String, exposure: Double) {
    def calibrated(scale: Double = 1.5): Double = exposure * scale
  }
  def main(args: Array[String]): Unit = {
    val items = List(Observation("Vega", 12.5), Observation("Rigel", 8.0))
    val valid = items.filter(_.exposure > 0)
    val total = valid.map(_.calibrated()).sum
    println(f"${valid.size} observations: $total%.2f")
  }
}
