defmodule Observatory do
  @moduledoc "Calibrate positive exposures."
  @scale 1.5
  def total(items) do
    items
    |> Enum.filter(fn %{exposure: value} -> value > 0 end)
    |> Enum.map(&(&1.exposure * @scale))
    |> Enum.sum()
  end
end
# Maps, atoms, captures and string interpolation.
items = [%{target: "Vega", exposure: 12.5}, %{target: "Rigel", exposure: 8}]
IO.puts("Total: #{Observatory.total(items)}")
