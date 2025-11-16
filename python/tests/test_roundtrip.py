"""Round-trip tests for CTF format."""

import pytest
from ctf import encode, decode


class TestRoundTrip:
    """Test round-trip encoding and decoding."""

    def test_roundtrip_primitives(self) -> None:
        """Test round-trip with primitives."""
        original = {
            "string": "Hello",
            "number": 42,
            "float": 3.14,
            "bool_true": True,
            "bool_false": False,
            "null": None,
        }
        encoded = encode(original)
        decoded = decode(encoded)
        assert decoded == original

    def test_roundtrip_nested_object(self) -> None:
        """Test round-trip with nested object."""
        original = {
            "user": {
                "name": "Alice",
                "age": 30,
                "address": {
                    "city": "San Francisco",
                    "zip": "94102",
                },
            }
        }
        encoded = encode(original)
        decoded = decode(encoded)
        assert decoded == original

    def test_roundtrip_inline_arrays(self) -> None:
        """Test round-trip with inline arrays."""
        original = {
            "tags": ["admin", "user", "dev"],
            "scores": [95, 87, 92],
            "flags": [True, False, True],
        }
        encoded = encode(original)
        decoded = decode(encoded)
        assert decoded == original

    def test_roundtrip_tabular_array(self) -> None:
        """Test round-trip with tabular array."""
        original = {
            "users": [
                {"id": 1, "name": "Alice", "role": "admin"},
                {"id": 2, "name": "Bob", "role": "user"},
                {"id": 3, "name": "Charlie", "role": "dev"},
            ]
        }
        encoded = encode(original, {"optimize": "none", "delimiter": "|"})
        decoded = decode(encoded)
        assert decoded == original

    def test_roundtrip_top_level_array(self) -> None:
        """Test round-trip with top-level array."""
        original = [
            {"id": 1, "name": "Alice"},
            {"id": 2, "name": "Bob"},
            {"id": 3, "name": "Charlie"},
        ]
        encoded = encode(original, {"optimize": "none", "delimiter": "|"})
        decoded = decode(encoded)
        assert decoded == original

    def test_roundtrip_complex_structure(self) -> None:
        """Test round-trip with complex structure."""
        original = {
            "application": {
                "name": "MyApp",
                "version": "1.0.0",
                "features": ["auth", "api", "ui"],
            },
            "database": {
                "host": "localhost",
                "port": 5432,
                "ssl": True,
            },
            "servers": [
                {"name": "web1", "ip": "192.168.1.1", "active": True},
                {"name": "web2", "ip": "192.168.1.2", "active": True},
                {"name": "web3", "ip": "192.168.1.3", "active": False},
            ],
        }
        encoded = encode(original, {"optimize": "none", "delimiter": "|"})
        decoded = decode(encoded)
        assert decoded == original

    def test_roundtrip_with_references(self) -> None:
        """Test round-trip with reference compression."""
        original = {
            "employees": [
                {"name": "Alice", "dept": "Engineering Department"},
                {"name": "Bob", "dept": "Engineering Department"},
                {"name": "Charlie", "dept": "Engineering Department"},
            ]
        }
        encoded = encode(original, {"references": True, "delimiter": "|", "optimize": "none"})
        decoded = decode(encoded)
        assert decoded == original

    def test_roundtrip_empty_structures(self) -> None:
        """Test round-trip with empty structures."""
        original = {
            "empty_array": [],
            "nested": {"also_empty": []},
        }
        encoded = encode(original)
        decoded = decode(encoded)
        assert decoded == original

    def test_roundtrip_special_strings(self) -> None:
        """Test round-trip with special strings."""
        original = {
            "with_space": "Hello World",
            "with_colon": "key:value",
            "with_quotes": 'He said "Hi"',
            "with_delimiter": "a|b|c",
        }
        encoded = encode(original)
        decoded = decode(encoded)
        assert decoded == original
