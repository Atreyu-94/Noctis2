// GObject properties, constructors and formatted strings.
class Observation : Object {
    public string target { get; construct; }
    public double exposure { get; construct; }
    public Observation(string target, double exposure) {
        Object(target: target, exposure: exposure);
    }
    public double calibrated(double scale = 1.5) { return exposure * scale; }
}
int main(string[] args) {
    var item = new Observation("Vega", 12.5);
    stdout.printf("%s: %.2f seconds\n", item.target, item.calibrated());
    return 0;
}
