# Typed values with interpolation and collection operations.
record Observation, target : String, exposure : Float64 do
  def calibrated(scale = 1.5) : Float64
    exposure * scale
  end
end
items = [Observation.new("Vega", 12.5), Observation.new("Rigel", 8.0)]
valid = items.select { |item| item.exposure > 0 }
total = valid.sum { |item| item.calibrated }
puts "#{valid.size} observations: #{total.round(2)}"
