"""Reference compression for CTF format."""

from typing import Dict, Any, Optional
from ctf.utils import escape_string


class ReferenceManager:
    """Manages reference compression for repeated string values."""

    def __init__(self, min_length: int = 10, min_occurrences: int = 3) -> None:
        """
        Initialize reference manager.

        Args:
            min_length: Minimum string length to consider for references
            min_occurrences: Minimum occurrences to create a reference
        """
        self.min_length = min_length
        self.min_occurrences = min_occurrences
        self.value_counts: Dict[str, int] = {}
        self.references: Dict[str, str] = {}  # value -> ^N
        self.reverse_references: Dict[str, str] = {}  # ^N -> value
        self.next_ref_id = 1

    def analyze(self, value: Any) -> None:
        """
        Analyze value tree to count string occurrences.

        Args:
            value: Value to analyze (recursive)
        """
        if isinstance(value, str) and len(value) >= self.min_length:
            self.value_counts[value] = self.value_counts.get(value, 0) + 1
        elif isinstance(value, dict):
            for v in value.values():
                self.analyze(v)
        elif isinstance(value, list):
            for item in value:
                self.analyze(item)

    def build_references(self) -> None:
        """Build reference mappings for strings that meet criteria."""
        # Sort by savings potential (length * occurrences)
        candidates = [
            (value, count)
            for value, count in self.value_counts.items()
            if count >= self.min_occurrences
        ]
        candidates.sort(key=lambda x: len(x[0]) * x[1], reverse=True)

        # Create references
        for value, _ in candidates:
            ref = f"^{self.next_ref_id}"
            self.references[value] = ref
            self.reverse_references[ref] = value
            self.next_ref_id += 1

    def get_reference(self, value: str) -> Optional[str]:
        """
        Get reference for a value if it exists.

        Args:
            value: String value

        Returns:
            Reference (^N) or None
        """
        return self.references.get(value)

    def get_definitions(self) -> list[str]:
        """
        Get reference definitions as CTF lines.

        Returns:
            List of definition lines (^N="value")
        """
        definitions = []
        for ref, value in sorted(self.reverse_references.items(), key=lambda x: int(x[0][1:])):
            escaped = escape_string(value)
            definitions.append(f"{ref}={escaped}")
        return definitions

    def resolve_reference(self, ref: str) -> Optional[str]:
        """
        Resolve a reference to its value.

        Args:
            ref: Reference (^N)

        Returns:
            Original value or None if not found
        """
        return self.reverse_references.get(ref)

    def calculate_savings(self, value: str, count: int) -> int:
        """
        Calculate token savings for using a reference.

        Args:
            value: String value
            count: Number of occurrences

        Returns:
            Estimated token savings
        """
        # Original: count * len(value)
        # With ref: count * 2 (^N) + len(value) (definition)
        original = count * len(value)
        with_ref = count * 2 + len(value)
        return original - with_ref

    def is_reference(self, value: str) -> bool:
        """
        Check if a value is a reference.

        Args:
            value: Value to check

        Returns:
            True if value is a reference (^N)
        """
        return value.startswith("^") and value[1:].isdigit()
