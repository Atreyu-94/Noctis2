#include <iostream>
#include <string>
#include <vector>
// A small generic calibration pipeline.
struct Observation { std::string target; double exposure; };
template <typename Transform>
double total(const std::vector<Observation>& items, Transform transform) {
    double result = 0;
    for (const auto& item : items)
        if (item.exposure > 0) result += transform(item.exposure);
    return result;
}
int main() {
    const std::vector<Observation> items{{"Vega", 12.5}, {"Rigel", 8}};
    auto calibrate = [](double value) { return value * 1.5; };
    std::cout << "Total: " << total(items, calibrate) << '\n';
}
