<?php
declare(strict_types=1);
// Typed properties, closures and interpolation.
final class Observation {
    public function __construct(public string $target, public float $exposure) {}
    public function calibrated(float $scale = 1.5): float {
        return $this->exposure * $scale;
    }
}
$items = [new Observation('Vega', 12.5), new Observation('Rigel', 8.0)];
$valid = array_filter($items, fn(Observation $item) => $item->exposure > 0);
$total = array_reduce($valid, fn(float $sum, Observation $item) => $sum + $item->calibrated(), 0.0);
echo "Calibrated total: {$total}\n";
