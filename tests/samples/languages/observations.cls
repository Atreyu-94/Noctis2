// Summarize observations without database access.
public class Observatory {
    public static final Decimal SCALE = 1.5;
    public class Observation {
        public String target;
        public Decimal exposure;
        public Observation(String target, Decimal exposure) {
            this.target = target;
            this.exposure = exposure;
        }
    }
    public static Decimal total(List<Observation> observations) {
        Decimal result = 0;
        for (Observation item : observations) {
            if (item.exposure > 0) result += item.exposure * SCALE;
        }
        System.debug('Calibrated exposure: ' + result);
        return result;
    }
}
