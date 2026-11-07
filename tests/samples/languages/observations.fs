module Observatory
// Records, a pipeline and printf format specifiers.
type Observation = { Target: string; Exposure: float }
let scale = 1.5
let total items =
    items
    |> List.filter (fun item -> item.Exposure > 0.0)
    |> List.sumBy (fun item -> item.Exposure * scale)
let items = [ { Target = "Vega"; Exposure = 12.5 }
              { Target = "Rigel"; Exposure = 8.0 } ]
printfn "Calibrated total: %.2f" (total items)
