"""Tests for CTF encoder."""

import pytest
from ctf import encode


class TestEncoderPrimitives:
    """Test encoding primitive values."""

    def test_encode_string(self) -> None:
        """Test encoding simple string."""
        result = encode({"name": "Alice"})
        assert result == "name:Alice"

    def test_encode_string_with_space(self) -> None:
        """Test encoding string with space."""
        result = encode({"city": "San Francisco"})
        assert result == 'city:"San Francisco"'

    def test_encode_number(self) -> None:
        """Test encoding number."""
        result = encode({"age": 30})
        assert result == "age:30"

    def test_encode_float(self) -> None:
        """Test encoding float."""
        result = encode({"price": 99.99})
        assert result == "price:99.99"

    def test_encode_boolean_true(self) -> None:
        """Test encoding boolean true."""
        result = encode({"active": True})
        assert result == "active:+"

    def test_encode_boolean_false(self) -> None:
        """Test encoding boolean false."""
        result = encode({"disabled": False})
        assert result == "disabled:-"

    def test_encode_null(self) -> None:
        """Test encoding null."""
        result = encode({"value": None})
        assert result == "value:_"


class TestEncoderObjects:
    """Test encoding objects."""

    def test_encode_flat_object(self) -> None:
        """Test encoding flat object."""
        result = encode({"name": "Alice", "age": 30, "active": True})
        expected = """name:Alice
age:30
active:+"""
        assert result == expected

    def test_encode_nested_object(self) -> None:
        """Test encoding nested object."""
        result = encode({"user": {"name": "Alice", "age": 30}})
        expected = """user:
  name:Alice
  age:30"""
        assert result == expected

    def test_encode_deeply_nested(self) -> None:
        """Test encoding deeply nested object."""
        result = encode({"level1": {"level2": {"level3": {"value": "deep"}}}})
        expected = """level1:
  level2:
    level3:
      value:deep"""
        assert result == expected


class TestEncoderArrays:
    """Test encoding arrays."""

    def test_encode_empty_array(self) -> None:
        """Test encoding empty array."""
        result = encode({"items": []})
        assert result == "items@0:"

    def test_encode_inline_array_strings(self) -> None:
        """Test encoding inline array of strings."""
        result = encode({"tags": ["admin", "ops", "dev"]})
        assert result == "tags:[admin ops dev]"

    def test_encode_inline_array_numbers(self) -> None:
        """Test encoding inline array of numbers."""
        result = encode({"scores": [95, 87, 92]})
        assert result == "scores:[95 87 92]"

    def test_encode_inline_array_booleans(self) -> None:
        """Test encoding inline array of booleans."""
        result = encode({"flags": [True, False, True]})
        assert result == "flags:[+ - +]"

    def test_encode_tabular_array(self) -> None:
        """Test encoding tabular array."""
        data = {
            "users": [
                {"id": 1, "name": "Alice", "role": "admin"},
                {"id": 2, "name": "Bob", "role": "user"},
                {"id": 3, "name": "Charlie", "role": "dev"},
            ]
        }
        result = encode(data, {"optimize": "none", "delimiter": "|"})
        lines = result.split("\n")
        assert lines[0] == "users@3|id,name,role:"
        assert "1|Alice|admin" in result
        assert "2|Bob|user" in result
        assert "3|Charlie|dev" in result

    def test_encode_top_level_array(self) -> None:
        """Test encoding top-level array."""
        data = [
            {"id": 1, "name": "Alice"},
            {"id": 2, "name": "Bob"},
            {"id": 3, "name": "Charlie"},
        ]
        result = encode(data, {"optimize": "none", "delimiter": "|"})
        lines = result.split("\n")
        # Should wrap in "data" key and use tabular format (3+ items)
        assert lines[0] == "data@3|id,name:"


class TestEncoderOptions:
    """Test encoding options."""

    def test_encode_with_custom_delimiter(self) -> None:
        """Test encoding with custom delimiter."""
        data = {
            "items": [
                {"a": 1, "b": 2},
                {"a": 3, "b": 4},
                {"a": 5, "b": 6},
            ]
        }
        result = encode(data, {"delimiter": ",", "optimize": "none"})
        assert "items@3,a,b:" in result
        assert "1,2" in result

    def test_encode_with_tab_delimiter(self) -> None:
        """Test encoding with tab delimiter."""
        data = {
            "items": [
                {"a": 1, "b": 2},
                {"a": 3, "b": 4},
                {"a": 5, "b": 6},
            ]
        }
        result = encode(data, {"delimiter": "\t", "optimize": "none"})
        assert "items@3\ta,b:" in result

    def test_encode_with_references(self) -> None:
        """Test encoding with reference compression."""
        data = {
            "employees": [
                {"name": "Alice", "dept": "Engineering Department"},
                {"name": "Bob", "dept": "Engineering Department"},
                {"name": "Charlie", "dept": "Engineering Department"},
            ]
        }
        result = encode(data, {"references": True, "delimiter": "|", "optimize": "none"})
        # Should have reference definition
        assert "^1=" in result
        # Should use reference in data
        assert "^1" in result.split("\n")[-1] or "^1" in result.split("\n")[-2]


class TestEncoderEdgeCases:
    """Test edge cases."""

    def test_encode_empty_object(self) -> None:
        """Test encoding empty object."""
        result = encode({})
        assert result == ""

    def test_encode_string_with_special_chars(self) -> None:
        """Test encoding string with special characters."""
        result = encode({"text": "Hello: World"})
        assert result == 'text:"Hello: World"'

    def test_encode_string_with_quotes(self) -> None:
        """Test encoding string with quotes."""
        result = encode({"text": 'He said "Hello"'})
        assert result == 'text:"He said \\"Hello\\""'
