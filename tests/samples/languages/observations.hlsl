// Exposure preview shader with resources and semantics.
cbuffer Calibration : register(b0) {
    float exposure;
    float3 tint;
};
Texture2D sky : register(t0);
SamplerState linearSampler : register(s0);
struct PixelInput { float4 position : SV_POSITION; float2 uv : TEXCOORD0; };
float4 main(PixelInput input) : SV_TARGET {
    float3 color = sky.Sample(linearSampler, input.uv).rgb;
    color = 1.0 - exp(-color * max(exposure, 0.0));
    return float4(saturate(color * tint), 1.0);
}
