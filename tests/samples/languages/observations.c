#include <stdio.h>
#define SCALE 1.5
/* Calibrate only valid observations. */
typedef struct { const char *target; double exposure; } Observation;
static double total(const Observation *items, size_t count) {
    double result = 0.0;
    for (size_t i = 0; i < count; ++i) {
        if (items[i].exposure > 0) result += items[i].exposure * SCALE;
    }
    return result;
}
int main(void) {
    const Observation items[] = {{"Vega", 12.5}, {"Rigel", 8.0}};
    printf("Total: %.2f\n", total(items, sizeof(items) / sizeof(*items)));
    return 0;
}
