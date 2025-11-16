"""CTF Decoder - Convert CTF to JSON."""

from __future__ import annotations

import re
from typing import Any

from ctf.references import ReferenceManager
from ctf.types import CTFParseError, DecodeOptions, JsonValue
from ctf.utils import get_indent_level, parse_inline_array, parse_value, unescape_string


def decode(input_str: str, options: DecodeOptions | None = None) -> JsonValue:
    """
    Decode CTF to JSON value.

    Args:
        input_str: CTF string
        options: Decoding options

    Returns:
        Decoded JSON value

    Raises:
        CTFParseError: If input is invalid
    """
    decoder = CTFDecoder(options or {})
    return decoder.decode(input_str)


class ParseContext:
    """Context for parsing CTF."""

    def __init__(self, lines: list[str]) -> None:
        """Initialize parse context."""
        self.lines = lines
        self.current_line = 0


class CTFDecoder:
    """Decoder for converting CTF to JSON."""

    def __init__(self, options: DecodeOptions) -> None:
        """
        Initialize decoder.

        Args:
            options: Decoding options
        """
        self.strict = options.get("strict", True)
        self.validate = options.get("validate", True)
        self.type_hints = options.get("type_hints", True)
        self.ref_manager = ReferenceManager()

    def decode(self, input_str: str) -> JsonValue:
        """
        Decode CTF string to JSON value.

        Args:
            input_str: CTF string

        Returns:
            Decoded JSON value
        """
        lines = input_str.split("\n")
        context = ParseContext(lines)

        # Parse reference definitions
        while context.current_line < len(context.lines):
            line = context.lines[context.current_line]

            # Skip empty lines
            if not line.strip():
                context.current_line += 1
                continue

            # Check for reference definition
            ref_match = re.match(r"^(\^(\d+))=(.+)$", line.strip())
            if ref_match:
                ref_id = ref_match.group(1)
                value = unescape_string(ref_match.group(3))
                self.ref_manager.reverse_references[ref_id] = value
                context.current_line += 1
            else:
                break

        # Parse main value
        result = self._parse_value(context, 0)

        # If result is a single-key object with "data" key, unwrap the array
        if isinstance(result, dict) and len(result) == 1 and "data" in result:
            unwrapped: JsonValue = result["data"]
            return unwrapped

        return result

    def _parse_value(self, context: ParseContext, min_indent: int) -> JsonValue:
        """
        Parse a value (object or nested structure).

        Args:
            context: Parse context
            min_indent: Minimum indentation level

        Returns:
            Parsed value
        """
        result: dict[str, Any] = {}
        expected_indent: int | None = None

        while context.current_line < len(context.lines):
            line = context.lines[context.current_line]

            # Skip empty lines
            if not line.strip():
                context.current_line += 1
                continue

            indent = get_indent_level(line)

            # Stop if indentation is less than minimum
            if indent < min_indent:
                break

            # Set expected indent from first line
            if expected_indent is None:
                expected_indent = indent

            # Only process lines at expected indent level
            if indent != expected_indent:
                break

            # Parse the line
            trimmed = line.strip()

            # Check for array header (key@count|fields: or key@count:)
            array_match = re.match(r"^(.+?)@(\d+)(?:([|,\t])(.*))?:?$", trimmed)
            if array_match:
                key = array_match.group(1)
                count = int(array_match.group(2))
                delimiter = array_match.group(3)
                fields_str = array_match.group(4)

                context.current_line += 1

                if count == 0:
                    result[key] = []
                elif delimiter and fields_str:
                    # Tabular array
                    # Remove trailing colon if present
                    fields_str = fields_str.rstrip(":")
                    fields = fields_str.split(",")  # Fields are ALWAYS comma-separated
                    result[key] = self._parse_tabular_array(
                        context, count, fields, delimiter, indent
                    )
                else:
                    # List array
                    result[key] = self._parse_list_array(context, count, indent)

                continue

            # Check for object or nested structure (key:)
            if ":" in trimmed:
                key_part, value_part = trimmed.split(":", 1)
                key = key_part.strip()

                # Empty value part means nested object
                if not value_part.strip():
                    context.current_line += 1
                    result[key] = self._parse_value(context, indent + 1)
                else:
                    # Inline value
                    parsed = self._parse_inline_value(value_part.strip())
                    result[key] = parsed
                    context.current_line += 1

                continue

            # Shouldn't reach here
            raise CTFParseError(
                f"Unexpected line format: {trimmed}",
                context.current_line + 1
            )

        return result

    def _parse_inline_value(self, value: str) -> Any:
        """Parse an inline value."""
        # Check for inline array
        if value.startswith("[") and value.endswith("]"):
            return parse_inline_array(value)

        # Check for reference
        if value.startswith("^") and value[1:].split("=")[0].isdigit():
            ref_value = self.ref_manager.resolve_reference(value)
            if ref_value is not None:
                return ref_value

        # Parse as primitive
        return parse_value(value)

    def _parse_tabular_array(
        self,
        context: ParseContext,
        count: int,
        fields: list[str],
        delimiter: str,
        base_indent: int
    ) -> list[dict[str, Any]]:
        """
        Parse a tabular array.

        Args:
            context: Parse context
            count: Number of items expected
            fields: Field names
            delimiter: Delimiter character
            base_indent: Base indentation level

        Returns:
            List of parsed objects
        """
        result: list[dict[str, Any]] = []

        for _ in range(count):
            # Skip empty lines
            while context.current_line < len(context.lines):
                line = context.lines[context.current_line]
                if line.strip():
                    break
                context.current_line += 1

            if context.current_line >= len(context.lines):
                raise CTFParseError("Unexpected end of tabular array", context.current_line)

            line = context.lines[context.current_line]
            trimmed = line.strip()

            # Split by delimiter
            values = trimmed.split(delimiter)

            if len(values) != len(fields):
                raise CTFParseError(
                    f"Field count mismatch. Expected {len(fields)}, got {len(values)}",
                    context.current_line + 1
                )

            # Build object
            obj: dict[str, Any] = {}
            for i, field in enumerate(fields):
                value = self._parse_inline_value(values[i].strip())
                obj[field] = value

            result.append(obj)
            context.current_line += 1

        return result

    def _parse_list_array(self, context: ParseContext, count: int, base_indent: int) -> list[Any]:
        """
        Parse a list array.

        Args:
            context: Parse context
            count: Number of items expected
            base_indent: Base indentation level

        Returns:
            List of parsed values
        """
        result: list[Any] = []

        for _ in range(count):
            # Skip empty lines
            while context.current_line < len(context.lines):
                line = context.lines[context.current_line]
                if line.strip():
                    break
                context.current_line += 1

            if context.current_line >= len(context.lines):
                raise CTFParseError("Unexpected end of list array", context.current_line)

            line = context.lines[context.current_line]
            trimmed = line.strip()

            if not trimmed.startswith("-:"):
                raise CTFParseError(
                    f"Expected list item marker '-:', got: {trimmed}",
                    context.current_line + 1
                )

            context.current_line += 1

            # Parse item value
            item_value = self._parse_value(context, get_indent_level(line) + 1)
            result.append(item_value)

        return result
