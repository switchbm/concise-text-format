"""Type definitions for CTF."""

from __future__ import annotations

from typing import Any, Dict, List, Literal, TypedDict, Union

# JSON value types
JsonValue = Union[None, bool, int, float, str, List[Any], Dict[str, Any]]
JsonObject = Dict[str, JsonValue]
JsonArray = List[JsonValue]


class EncodeOptions(TypedDict, total=False):
    """Options for encoding JSON to CTF."""

    indent: int  # Number of spaces for indentation (default: 2)
    delimiter: Literal[",", "|", "\t", "auto"]  # Delimiter for tabular arrays (default: "auto")
    references: Union[bool, Literal["auto"]]  # Enable reference compression (default: "auto")
    columnar: Union[bool, Literal["auto"]]  # Enable columnar encoding (default: "auto")
    schemas: bool  # Include schema definitions (default: False)
    optimize: Literal["none", "balanced", "aggressive"]  # Optimization level (default: "balanced")


class DecodeOptions(TypedDict, total=False):
    """Options for decoding CTF to JSON."""

    strict: bool  # Strict validation mode (default: True)
    validate: bool  # Validate array lengths and constraints (default: True)
    type_hints: bool  # Apply type coercion (default: True)


class CTFParseError(Exception):
    """Exception raised when CTF parsing fails."""

    def __init__(self, message: str, line_number: int = 0) -> None:
        """
        Initialize parse error.

        Args:
            message: Error message
            line_number: Line number where error occurred
        """
        super().__init__(f"Line {line_number}: {message}" if line_number > 0 else message)
        self.line_number = line_number
