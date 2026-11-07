#set heading(numbering: "1.")
#set page(paper: "a4", margin: 2cm)
#set text(size: 11pt)
#set math.equation(numbering: "(1)")
#let twice(x) = x * 2
#let enabled = true
#let message = "hello"
= Notation <intro>
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

= Observatory measurements <measurements>

The examples in @intro establish the notation used in this observing log.
We compare three targets after correcting for exposure time.

#let observations = (
  (target: "Vega", exposure: 2.5, signal: 13.2),
  (target: "Deneb", exposure: 4.0, signal: 9.0),
  (target: "Altair", exposure: 1.5, signal: 16.5),
)
#let rate(record) = record.signal / record.exposure

#figure(
  table(
    columns: (auto, auto, auto),
    align: (left, right, right),
    table.header([*Target*], [*Exposure (s)*], [*Rate*]),
    ..observations.map(record => (
      [#record.target], [#record.exposure], [#calc.round(rate(record), digits: 2)],
    )).flatten(),
  ),
  caption: [Normalized signals from a fictional observing session.],
) <results>

== Signal model

For background $b$, exposure $t$, and samples $s_i$, the normalized rate is

$ r = frac(1, n t) sum_(i=1)^n (s_i - b) $ <rate-equation>

#for record in observations [
  - *#record.target*: #if rate(record) > 5 [bright signal] else [faint signal].
]

See @results and @rate-equation. No external images, packages or data files are
required to compile this report.

#context [Current page: #counter(page).display()]
