Imports System
Imports System.Linq
' Tuples, query operators and interpolated strings.
Module Observatory
    Sub Main()
        Const scale As Double = 1.5
        Dim items = { (Target:="Vega", Exposure:=12.5),
                      (Target:="Rigel", Exposure:=8.0) }
        Dim total = items.Where(Function(item) item.Exposure > 0).
            Sum(Function(item) item.Exposure * scale)
        Console.WriteLine($"{items.Length} observations: {total:F2}")
    End Sub
End Module
