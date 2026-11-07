// Null-safe model and a collection pipeline.
class Observation {
  final String target;
  final double exposure;
  const Observation(this.target, this.exposure);
  double calibrated({double scale = 1.5}) => exposure * scale;
}
void main() {
  const items = [Observation('Vega', 12.5), Observation('Rigel', 8)];
  final total = items.where((item) => item.exposure > 0)
      .fold<double>(0, (sum, item) => sum + item.calibrated());
  print('${items.length} observations: ${total.toStringAsFixed(2)}');
}
