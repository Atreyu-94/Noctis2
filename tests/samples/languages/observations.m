#import <Foundation/Foundation.h>
// Objective-C literals, messaging and boxed numbers.
int main(int argc, const char *argv[]) {
    @autoreleasepool {
        NSArray<NSDictionary *> *items = @[
            @{ @"target": @"Vega", @"exposure": @12.5 },
            @{ @"target": @"Rigel", @"exposure": @8.0 }
        ];
        double total = 0.0;
        for (NSDictionary *item in items) {
            total += [item[@"exposure"] doubleValue] * 1.5;
        }
        NSLog(@"%lu observations: %.2f", (unsigned long)items.count, total);
    }
    return 0;
}
