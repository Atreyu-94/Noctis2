# Structs, keyword arguments, blocks and interpolation.
Observation = Struct.new(:target, :exposure, keyword_init: true) do
  def calibrated(scale: 1.5)
    exposure * scale
  end
end
items = [Observation.new(target: 'Vega', exposure: 12.5),
         Observation.new(target: 'Rigel', exposure: 8.0)]
valid = items.select { |item| item.exposure.positive? }
total = valid.sum(&:calibrated)
puts "#{valid.length} observations: #{format('%.2f', total)}"
