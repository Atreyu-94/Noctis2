using System;
using System.Linq;
// Immutable observations with a computed summary.
public record Observation(string Target, double Exposure);
public static class Program {
    public static void Main() {
        const double scale = 1.5;
        Observation[] items = { new("Vega", 12.5), new("Rigel", 8) };
        var total = items.Where(item => item.Exposure > 0)
            .Sum(item => item.Exposure * scale);
        Console.WriteLine($"{items.Length} targets: {total:F2}");
    }
}
