"""Track telescope positions and summarize a deterministic observing session."""
from dataclasses import dataclass
from enum import Enum
from typing import ClassVar, Final, TypeVar

T = TypeVar("T")
SCALE: Final = 2

@dataclass
class Point:
    label: str
    x: float
    origin: ClassVar[float] = 0.0

    def moved(self, distance: float) -> float:
        """Return a translated coordinate."""
        return self.x + distance

    @staticmethod
    def clamp(value: float) -> float:
        return max(value, Point.origin)

class Axis(Enum):
    HORIZONTAL = 0
    VERTICAL = 1

def identity(value: T) -> T:
    return value

point = Point("sample", 1.5)
axis = Axis.HORIZONTAL
coordinate = identity(point.moved(SCALE))
message = f"{point.label}: {coordinate}"
values = [Point.clamp(value) for value in range(3)]
enabled = True
missing = None
# Comments and string interpolation retain their TextMate styling.
print(message, len(values), enabled, missing, axis)


class ObservationError(ValueError):
    """An observation cannot be included in the nightly report."""


@dataclass(frozen=True)
class Observation:
    target: str
    exposure: float
    readings: tuple[float, ...]

    @property
    def average(self) -> float:
        if not self.readings:
            raise ObservationError(f"No readings for {self.target!r}")
        return sum(self.readings) / len(self.readings)


def summarize(observations: list[Observation]) -> dict[str, float]:
    """Normalize positive signals by exposure time, measured in seconds."""
    result: dict[str, float] = {}
    for observation in observations:
        try:
            if observation.exposure <= 0:
                raise ObservationError("Exposure must be positive")
            result[observation.target] = observation.average / observation.exposure
        except ObservationError as error:
            print(f"Skipped: {error}")
    return result


def main() -> None:
    # Reproducible readings; no network, hardware or file access.
    session = [
        Observation("Vega", 2.5, (12.0, 13.5, 14.0)),
        Observation("Deneb", 4.0, (8.0, 9.0, 10.0)),
        Observation("Altair", 1.5, (15.0, 16.5, 18.0)),
    ]
    scores = summarize(session)
    brightest = max(scores, key=lambda target: scores[target])
    ordered = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    report = "\n".join(f"{name:<8}\t{score:.2f}" for name, score in ordered)
    assert brightest == "Altair"
    assert all(score > 0 for score in scores.values())
    print(f"Nightly signal report\n{report}\nBest target: {brightest}")


if __name__ == "__main__":
    main()
