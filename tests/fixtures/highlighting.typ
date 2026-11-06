#set heading(numbering: "1.")
#let twice(x) = x * 2
#let enabled = true
#let message = "hello"
= Heading <intro>
Plain text, *strong*, _emphasis_, and *_both_*.
See @intro and https://example.org.
Inline `raw code` and escaped \*.
- List item
+ Numbered item
/ Term: Definition
#message and #twice(3).
$ x^2 + frac(1, 2) = alpha $
// Comment
#show strong: it => it
```typst
#let value = 2
```

// Math and emphasis regression samples.
_*reverse*_
*$ x_1^2 / alpha $*
_*Sequence $frac(1, 2)$*_
$ mat(1, 2; 3, 4) + vec(x, y) $
$ #(1 + 2) + "where" $
#strong[function strong] #emph[function emph]
$
  sum_(i=1)^n x_i = integral_0^1 f(x) dif x
$