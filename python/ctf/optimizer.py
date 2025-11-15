"""Auto-optimization for CTF format."""

from typing import Any, Literal, Dict
from ctf.types import JsonValue


class Optimizer:
    """Analyzes data to select optimal encoding strategy."""

    def __init__(self, data: JsonValue) -> None:
        """
        Initialize optimizer with data.

        Args:
            data: JSON value to analyze
        """
        self.data = data
        self.stats = {
            "total_arrays": 0,
            "tabular_arrays": 0,
            "total_strings": 0,
            "repeated_strings": 0,
            "max_depth": 0,
            "total_objects": 0,
        }
        self._analyze(data, depth=0)

    def _analyze(self, value: Any, depth: int = 0) -> None:
        """
        Recursively analyze data structure.

        Args:
            value: Value to analyze
            depth: Current nesting depth
        """
        self.stats["max_depth"] = max(self.stats["max_depth"], depth)

        if isinstance(value, dict):
            self.stats["total_objects"] += 1
            for v in value.values():
                self._analyze(v, depth + 1)

        elif isinstance(value, list):
            self.stats["total_arrays"] += 1
            if self._is_tabular_array(value):
                self.stats["tabular_arrays"] += 1
            for item in value:
                self._analyze(item, depth + 1)

        elif isinstance(value, str):
            self.stats["total_strings"] += 1

    def _is_tabular_array(self, arr: list[Any]) -> bool:
        """
        Check if array is suitable for tabular encoding.

        Args:
            arr: Array to check

        Returns:
            True if array should use tabular encoding
        """
        if len(arr) < 3:
            return False

        # Check if all items are objects with same keys
        if not all(isinstance(item, dict) for item in arr):
            return False

        if not arr:
            return False

        first_keys = set(arr[0].keys())
        return all(set(item.keys()) == first_keys for item in arr)

    def select_delimiter(self, data: Any) -> Literal[",", "|", "\t"]:
        """
        Select optimal delimiter for tabular arrays.

        Args:
            data: Data to analyze

        Returns:
            Best delimiter character
        """
        # Count occurrences of potential delimiters in string values
        delimiter_counts = {"|": 0, ",": 0, "\t": 0}

        def count_in_strings(value: Any) -> None:
            if isinstance(value, str):
                delimiter_counts["|"] += value.count("|")
                delimiter_counts[","] += value.count(",")
                delimiter_counts["\t"] += value.count("\t")
            elif isinstance(value, dict):
                for v in value.values():
                    count_in_strings(v)
            elif isinstance(value, list):
                for item in value:
                    count_in_strings(item)

        count_in_strings(data)

        # Choose delimiter that appears least in data
        return min(delimiter_counts.items(), key=lambda x: x[1])[0]

    def should_use_references(self) -> bool:
        """
        Determine if reference compression should be used.

        Returns:
            True if references would be beneficial
        """
        # Use references if there are repeated strings and decent depth
        return self.stats["total_strings"] > 10 and self.stats["max_depth"] > 2

    def should_use_columnar(self, array_length: int) -> bool:
        """
        Determine if columnar encoding should be used for an array.

        Args:
            array_length: Length of the array

        Returns:
            True if columnar encoding would be beneficial
        """
        # Use columnar for very large arrays (1000+ rows)
        return array_length >= 1000

    def get_recommendations(self) -> Dict[str, Any]:
        """
        Get optimization recommendations.

        Returns:
            Dictionary of recommendations
        """
        return {
            "delimiter": self.select_delimiter(self.data),
            "use_references": self.should_use_references(),
            "tabular_arrays": self.stats["tabular_arrays"],
            "total_arrays": self.stats["total_arrays"],
            "max_depth": self.stats["max_depth"],
        }
