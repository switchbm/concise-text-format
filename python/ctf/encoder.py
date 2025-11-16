"""CTF Encoder - Convert JSON to CTF."""

from __future__ import annotations

from typing import Any

from ctf.optimizer import Optimizer
from ctf.references import ReferenceManager
from ctf.types import EncodeOptions, JsonValue
from ctf.utils import format_value, is_array, is_object, is_primitive


def encode(value: JsonValue, options: EncodeOptions | None = None) -> str:
    """
    Encode JSON value to CTF.

    Args:
        value: JSON value to encode
        options: Encoding options

    Returns:
        CTF string
    """
    encoder = CTFEncoder(options or {})
    return encoder.encode(value)


class CTFEncoder:
    """Encoder for converting JSON to CTF."""

    def __init__(self, options: EncodeOptions) -> None:
        """
        Initialize encoder.

        Args:
            options: Encoding options
        """
        self.indent_size = options.get("indent", 2)
        self.delimiter_option = options.get("delimiter", "auto")
        self.references_option = options.get("references", "auto")
        self.columnar_option = options.get("columnar", "auto")
        self.schemas = options.get("schemas", False)
        self.optimize_level = options.get("optimize", "balanced")

        self.delimiter = "|"  # Will be set during optimization
        self.ref_manager: ReferenceManager | None = None

    def encode(self, value: JsonValue) -> str:
        """
        Encode value to CTF.

        Args:
            value: Value to encode

        Returns:
            CTF string
        """
        lines: list[str] = []

        # Run optimization if needed
        if self.optimize_level != "none":
            optimizer = Optimizer(value)
            recommendations = optimizer.get_recommendations()

            if self.delimiter_option == "auto":
                self.delimiter = recommendations["delimiter"]
            else:
                self.delimiter = self.delimiter_option

            # Set up references if beneficial
            use_refs = self.references_option or (
                self.references_option == "auto" and recommendations["use_references"]
            )

            if use_refs:
                self.ref_manager = ReferenceManager()
                self.ref_manager.analyze(value)
                self.ref_manager.build_references()

                # Add reference definitions
                for ref_def in self.ref_manager.get_definitions():
                    lines.append(ref_def)

                if lines:  # Add blank line after references
                    lines.append("")
        else:
            # When optimization is disabled, still set delimiter and references from options
            if self.delimiter_option != "auto":
                self.delimiter = self.delimiter_option

            if self.references_option:
                self.ref_manager = ReferenceManager()
                self.ref_manager.analyze(value)
                self.ref_manager.build_references()

                # Add reference definitions
                for ref_def in self.ref_manager.get_definitions():
                    lines.append(ref_def)

                if lines:  # Add blank line after references
                    lines.append("")

        # Encode main value
        # For top-level arrays, wrap with a default key
        if is_array(value):
            lines.extend(self._encode_value(value, "data", 0))
        else:
            lines.extend(self._encode_value(value, "", 0))

        return "\n".join(lines)

    def _encode_value(self, value: Any, key: str, indent: int) -> list[str]:
        """
        Encode a value with its key.

        Args:
            value: Value to encode
            key: Key name (empty for top-level)
            indent: Current indentation level

        Returns:
            List of CTF lines
        """
        lines: list[str] = []
        prefix = " " * (indent * self.indent_size)

        if value is None:
            lines.append(f"{prefix}{key}:_" if key else f"{prefix}_")

        elif isinstance(value, bool):
            bool_val = "+" if value else "-"
            lines.append(f"{prefix}{key}:{bool_val}" if key else f"{prefix}{bool_val}")

        elif isinstance(value, (int, float)):
            lines.append(f"{prefix}{key}:{value}" if key else f"{prefix}{value}")

        elif isinstance(value, str):
            # Check for reference
            ref = None
            if self.ref_manager:
                ref = self.ref_manager.get_reference(value)

            formatted = ref if ref else format_value(value)
            lines.append(f"{prefix}{key}:{formatted}" if key else f"{prefix}{formatted}")

        elif is_array(value):
            lines.extend(self._encode_array(value, key, indent))

        elif is_object(value):
            lines.extend(self._encode_object(value, key, indent))

        return lines

    def _encode_array(self, arr: list[Any], key: str, indent: int) -> list[str]:
        """
        Encode an array.

        Args:
            arr: Array to encode
            key: Array key name
            indent: Current indentation level

        Returns:
            List of CTF lines
        """
        lines: list[str] = []
        prefix = " " * (indent * self.indent_size)

        # Empty array
        if not arr:
            lines.append(f"{prefix}{key}@0:")
            return lines

        # Check if suitable for tabular encoding
        if self._is_tabular_array(arr):
            lines.extend(self._encode_tabular_array(arr, key, indent))
        # Check if all primitives (inline array)
        elif all(is_primitive(item) for item in arr):
            lines.extend(self._encode_inline_array(arr, key, indent))
        # List array (objects or mixed)
        else:
            lines.extend(self._encode_list_array(arr, key, indent))

        return lines

    def _is_tabular_array(self, arr: list[Any]) -> bool:
        """Check if array should use tabular encoding."""
        if len(arr) < 3:
            return False

        # All items must be objects with same keys
        if not all(isinstance(item, dict) for item in arr):
            return False

        if not arr:
            return False

        first_keys = set(arr[0].keys())
        return all(set(item.keys()) == first_keys for item in arr)

    def _encode_tabular_array(self, arr: list[dict[str, Any]], key: str, indent: int) -> list[str]:
        """
        Encode array in tabular format.

        Format: key@count|field1,field2:
                value1|value2
                value3|value4
        """
        lines: list[str] = []
        prefix = " " * (indent * self.indent_size)

        # Get fields from first object
        fields = list(arr[0].keys())
        field_str = ",".join(fields)  # Fields are ALWAYS comma-separated

        # Header line
        lines.append(f"{prefix}{key}@{len(arr)}{self.delimiter}{field_str}:")

        # Data rows
        row_prefix = " " * ((indent + 1) * self.indent_size)
        for obj in arr:
            values = []
            for field in fields:
                val = obj.get(field)
                # Check for reference
                ref = None
                if self.ref_manager and isinstance(val, str):
                    ref = self.ref_manager.get_reference(val)
                formatted = ref if ref else format_value(val)
                values.append(formatted)

            lines.append(f"{row_prefix}{self.delimiter.join(values)}")

        return lines

    def _encode_inline_array(self, arr: list[Any], key: str, indent: int) -> list[str]:
        """
        Encode array of primitives inline.

        Format: key:[val1 val2 val3]
        """
        lines: list[str] = []
        prefix = " " * (indent * self.indent_size)

        formatted_values = [format_value(item) for item in arr]
        array_str = "[" + " ".join(formatted_values) + "]"
        lines.append(f"{prefix}{key}:{array_str}")

        return lines

    def _encode_list_array(self, arr: list[Any], key: str, indent: int) -> list[str]:
        """
        Encode array as list.

        Format: key@count:
                -:
                  field:value
        """
        lines: list[str] = []
        prefix = " " * (indent * self.indent_size)

        # Header
        lines.append(f"{prefix}{key}@{len(arr)}:")

        # Items
        for item in arr:
            item_prefix = " " * ((indent + 1) * self.indent_size)
            lines.append(f"{item_prefix}-:")
            lines.extend(self._encode_value(item, "", indent + 2))

        return lines

    def _encode_object(self, obj: dict[str, Any], key: str, indent: int) -> list[str]:
        """
        Encode an object.

        Args:
            obj: Object to encode
            key: Object key name (empty for top-level)
            indent: Current indentation level

        Returns:
            List of CTF lines
        """
        lines: list[str] = []
        prefix = " " * (indent * self.indent_size)

        # If has key, add key line
        if key:
            lines.append(f"{prefix}{key}:")
            child_indent = indent + 1
        else:
            child_indent = indent

        # Encode each property
        for k, v in obj.items():
            lines.extend(self._encode_value(v, k, child_indent))

        return lines
