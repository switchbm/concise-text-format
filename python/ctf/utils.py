"""Utility functions for CTF."""

from __future__ import annotations

import re
from typing import Any


def needs_quoting(s: str) -> bool:
    """
    Check if a string needs to be quoted in CTF.

    Args:
        s: String to check

    Returns:
        True if string needs quoting
    """
    # Quote if contains special characters, spaces, or starts with digits
    return bool(re.search(r'[:|\t\n\r"\[\]{},^@ ]', s) or re.match(r"^\d", s))


def escape_string(s: str) -> str:
    """
    Escape a string for CTF.

    Args:
        s: String to escape

    Returns:
        Escaped string with quotes if needed
    """
    if not needs_quoting(s):
        return s

    # Escape quotes and backslashes
    escaped = s.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def unescape_string(s: str) -> str:
    """
    Unescape a quoted string from CTF.

    Args:
        s: String to unescape (may include quotes)

    Returns:
        Unescaped string
    """
    # Remove surrounding quotes if present
    if s.startswith('"') and s.endswith('"'):
        s = s[1:-1]
        # Unescape backslashes and quotes
        s = s.replace('\\"', '"').replace("\\\\", "\\")
    return s


def is_array(value: Any) -> bool:
    """Check if value is a list."""
    return isinstance(value, list)


def is_object(value: Any) -> bool:
    """Check if value is a dict."""
    return isinstance(value, dict)


def is_primitive(value: Any) -> bool:
    """Check if value is a primitive type."""
    return value is None or isinstance(value, (bool, int, float, str))


def get_indent_level(line: str, indent_size: int = 2) -> int:
    """
    Get the indentation level of a line.

    Args:
        line: Line to check
        indent_size: Number of spaces per indent level

    Returns:
        Indentation level (number of indent units)
    """
    spaces = len(line) - len(line.lstrip(" "))
    return spaces // indent_size


def parse_inline_array(value: str) -> list[Any]:
    """
    Parse an inline array from CTF.

    Format: [value1 value2 value3]

    Args:
        value: String representation of inline array

    Returns:
        Parsed list
    """
    if not value.startswith("[") or not value.endswith("]"):
        raise ValueError(f"Invalid inline array format: {value}")

    content = value[1:-1].strip()
    if not content:
        return []

    # Split by whitespace, handling quoted strings
    items = []
    current = ""
    in_quotes = False
    escape_next = False

    for char in content:
        if escape_next:
            current += char
            escape_next = False
        elif char == "\\":
            current += char
            escape_next = True
        elif char == '"':
            current += char
            in_quotes = not in_quotes
        elif char == " " and not in_quotes:
            if current:
                items.append(parse_value(current))
                current = ""
        else:
            current += char

    if current:
        items.append(parse_value(current))

    return items


def parse_value(value: str) -> Any:
    """
    Parse a primitive value from string representation.

    Args:
        value: String value

    Returns:
        Parsed value (str, int, float, bool, or None)
    """
    value = value.strip()

    # Handle null
    if value == "_":
        return None

    # Handle booleans
    if value == "+":
        return True
    if value == "-":
        return False

    # Handle quoted strings
    if value.startswith('"') and value.endswith('"'):
        return unescape_string(value)

    # Handle numbers
    try:
        # Try int first
        if "." not in value and "e" not in value.lower():
            return int(value)
        # Try float
        return float(value)
    except ValueError:
        # Return as string
        return value


def format_value(value: Any) -> str:
    """
    Format a value for CTF output.

    Args:
        value: Value to format

    Returns:
        Formatted string
    """
    if value is None:
        return "_"
    if isinstance(value, bool):
        return "+" if value else "-"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, str):
        return escape_string(value)
    raise TypeError(f"Cannot format value of type {type(value)}")


def count_tokens_estimate(text: str) -> int:
    """
    Estimate token count using 4 chars/token heuristic.

    Args:
        text: Text to count

    Returns:
        Estimated token count
    """
    return len(text) // 4
