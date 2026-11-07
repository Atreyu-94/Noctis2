package main
import "fmt"
// Summarize a slice of typed measurements.
type Observation struct { Target string; Exposure float64 }
func total(items []Observation) float64 {
    result := 0.0
    for _, item := range items {
        if item.Exposure > 0 { result += item.Exposure * 1.5 }
    }
    return result
}
func main() {
    items := []Observation{{"Vega", 12.5}, {"Rigel", 8}}
    fmt.Printf("Total: %.2f\n", total(items))
}
