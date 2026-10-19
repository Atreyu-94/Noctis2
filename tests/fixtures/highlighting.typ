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
