module ThemeExample
export twice
abstract type AbstractSample end
struct Sample{T} <: AbstractSample
    value::T
end
const SCALE = 2
"""Double a value. See `twice(x)`."""
twice(x::T) where {T<:Number} = SCALE * x
function describe(sample::Sample)
    text = "value=$(sample.value)"
    @info text
    return :ready
end
values = [twice(x) for x in 1:3]
result = twice.(values)
flag = true

"""Remove the background signal and report summary statistics."""
function calibrate(readings::AbstractVector{T}; background::Real = 0.5) where {T<:Real}
    isempty(readings) && throw(ArgumentError("readings cannot be empty"))
    corrected = max.(readings .- background, zero(T))
    average = sum(corrected) / length(corrected)
    return (; corrected, average, peak = maximum(corrected))
end

function nightly_report()
    # Each column represents one telescope exposure.
    readings = [1.0 2.0 3.0; 2.5 3.5 4.5; 4.0 5.0 6.0]
    targets = (:vega, :deneb, :altair)
    summaries = Dict(
        target => calibrate(readings[:, index])
        for (index, target) in enumerate(targets)
    )

    for target in targets
        summary = summaries[target]
        quality = summary.average > 3 ? "bright" : "faint"
        @info "Observation" target quality peak=summary.peak
    end

    selected = filter(pair -> pair.second.average >= 3, summaries)
    wavelengths = range(400.0, 700.0; length = 5)
    response = @. exp(-((wavelengths - 550) / 80)^2)
    @assert all(0 .<= response .<= 1)
    @assert length(selected) == 2
    return (; summaries, wavelengths, response)
end

#= Block comments can explain units without hiding the surrounding code.
   Wavelength is measured in nanometres; response is dimensionless. =#
report = nightly_report()
describe(Sample(report.response[3]))
end
