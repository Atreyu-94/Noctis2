const std = @import("std");
// Struct literals, slices and a compile-time format string.
const Observation = struct { target: []const u8, exposure: f64 };
fn total(items: []const Observation) f64 {
    var result: f64 = 0;
    for (items) |item| {
        if (item.exposure > 0) result += item.exposure * 1.5;
    }
    return result;
}
pub fn main() void {
    const items = [_]Observation{
        .{ .target = "Vega", .exposure = 12.5 },
        .{ .target = "Rigel", .exposure = 8.0 },
    };
    std.debug.print("Total: {d:.2}\n", .{total(&items)});
}
