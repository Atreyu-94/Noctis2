# Observatory field notes

Plain text with **strong**, *emphasis*, and ***both***.
Also **_nested_** and _**reverse**_.

[Example link](https://example.org) and `inline code`.

> A quoted paragraph.

- First item
- Second item

1. Numbered item

## Embedded Python

```python
class Example:
    def double(self, value: int) -> int:
        return value * 2
```

## Embedded JSON

```json
{"enabled": true, "count": 42, "name": "sample"}
```

---

## Nightly checklist

- [x] Calibrate the detector before sunset.
- [x] Record the reference exposure.
- [ ] Compare the infrared observations tomorrow.

| Target | Exposure (s) | Condition |
| :--- | ---: | :---: |
| Vega | 2.5 | Clear |
| Deneb | 4.0 | Thin cloud |
| Altair | 1.5 | Clear |

### Interpretation

The **brightest normalized signal** belongs to Altair. A longer exposure does
not necessarily produce a better measurement: compare the signal *per second*.

> **Observer note:** Keep the raw readings.
>
> Reprocessing should change the analysis, not the original measurements.

The previous ~~uncalibrated estimate~~ has been replaced. Literal punctuation
can be escaped: \*asterisks\*, \[brackets\], and a backslash \\.

<details>
<summary>Calibration details</summary>

Subtract the background before averaging. Avoid rounding intermediate values.

</details>

## Follow-up

1. Compare the [catalogue specification][catalogue].
2. Review the `exposure` and `readings` fields.
   - Preserve missing values as `null`.
   - Keep timestamps in UTC.
3. Write the scientific report.

[catalogue]: https://example.org/observatory/catalogue "Example catalogue documentation"
