// Borrowed strings, iterator adapters and a typed struct.
#[derive(Debug)]
struct Observation<'a> { target: &'a str, exposure: f64 }
fn total(items: &[Observation<'_>]) -> f64 {
    items.iter().filter(|item| item.exposure > 0.0)
        .map(|item| item.exposure * 1.5).sum()
}
fn main() {
    let items = [Observation { target: "Vega", exposure: 12.5 },
                 Observation { target: "Rigel", exposure: 8.0 }];
    println!("{}: total {:.2}", items[0].target, total(&items));
}
