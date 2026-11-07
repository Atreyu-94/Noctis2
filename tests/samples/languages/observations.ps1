# Pure data processing; no external files or services are changed.
[CmdletBinding()]
param([double]$Scale = 1.5)
$items = @(
    [pscustomobject]@{ Target = 'Vega'; Exposure = 12.5 }
    [pscustomobject]@{ Target = 'Rigel'; Exposure = 8.0 }
)
$valid = $items | Where-Object { $_.Exposure -gt 0 }
$total = ($valid | ForEach-Object { $_.Exposure * $Scale } |
    Measure-Object -Sum).Sum
foreach ($item in $valid) {
    Write-Output ('{0}: {1:N2}s' -f $item.Target, $item.Exposure)
}
Write-Output "Calibrated total: $total"
