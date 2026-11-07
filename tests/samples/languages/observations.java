import java.util.List;
// Records and streams keep the calibration immutable.
class Observatory {
    record Observation(String target, double exposure) {}
    static double total(List<Observation> items) {
        return items.stream().filter(item -> item.exposure() > 0)
            .mapToDouble(item -> item.exposure() * 1.5).sum();
    }
    public static void main(String[] args) {
        var items = List.of(new Observation("Vega", 12.5), new Observation("Rigel", 8));
        System.out.printf("Total: %.2f%n", total(items));
    }
}
