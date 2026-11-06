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
end
