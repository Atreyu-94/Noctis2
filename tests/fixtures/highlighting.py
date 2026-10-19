"""Synthetic highlighting sample using only the Python standard library."""
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