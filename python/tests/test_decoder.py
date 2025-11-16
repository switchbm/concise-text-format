"""Tests for CTF decoder."""

import pytest
from ctf import decode
from ctf.types import CTFParseError


class TestDecoderPrimitives:
    """Test decoding primitive values."""

    def test_decode_string(self) -> None:
        """Test decoding simple string."""
        result = decode("name:Alice")
        assert result == {"name": "Alice"}

    def test_decode_quoted_string(self) -> None:
        """Test decoding quoted string with spaces."""
        result = decode('city:"San Francisco"')
        assert result == {"city": "San Francisco"}

    def test_decode_number(self) -> None:
        """Test decoding number."""
        result = decode("age:30")
        assert result == {"age": 30}

    def test_decode_float(self) -> None:
        """Test decoding float."""
        result = decode("price:99.99")
        assert result == {"price": 99.99}

    def test_decode_boolean_true(self) -> None:
        """Test decoding boolean true."""
        result = decode("active:+")
        assert result == {"active": True}

    def test_decode_boolean_false(self) -> None:
        """Test decoding boolean false."""
        result = decode("disabled:-")
        assert result == {"disabled": False}

    def test_decode_null(self) -> None:
        """Test decoding null."""
        result = decode("value:_")
        assert result == {"value": None}


class TestDecoderObjects:
    """Test decoding objects."""

    def test_decode_flat_object(self) -> None:
        """Test decoding flat object."""
        ctf = """name:Alice
age:30
active:+"""
        result = decode(ctf)
        assert result == {"name": "Alice", "age": 30, "active": True}

    def test_decode_nested_object(self) -> None:
        """Test decoding nested object."""
        ctf = """user:
  name:Alice
  age:30"""
        result = decode(ctf)
        assert result == {"user": {"name": "Alice", "age": 30}}

    def test_decode_deeply_nested(self) -> None:
        """Test decoding deeply nested object."""
        ctf = """level1:
  level2:
    level3:
      value:deep"""
        result = decode(ctf)
        assert result == {"level1": {"level2": {"level3": {"value": "deep"}}}}


class TestDecoderArrays:
    """Test decoding arrays."""

    def test_decode_empty_array(self) -> None:
        """Test decoding empty array."""
        result = decode("items@0:")
        assert result == {"items": []}

    def test_decode_inline_array(self) -> None:
        """Test decoding inline array."""
        result = decode("tags:[admin ops dev]")
        assert result == {"tags": ["admin", "ops", "dev"]}

    def test_decode_inline_array_numbers(self) -> None:
        """Test decoding inline array of numbers."""
        result = decode("scores:[95 87 92]")
        assert result == {"scores": [95, 87, 92]}

    def test_decode_inline_array_booleans(self) -> None:
        """Test decoding inline array of booleans."""
        result = decode("flags:[+ - +]")
        assert result == {"flags": [True, False, True]}

    def test_decode_tabular_array(self) -> None:
        """Test decoding tabular array."""
        ctf = """users@3|id,name,role:
  1|Alice|admin
  2|Bob|user
  3|Charlie|dev"""
        result = decode(ctf)
        assert result == {
            "users": [
                {"id": 1, "name": "Alice", "role": "admin"},
                {"id": 2, "name": "Bob", "role": "user"},
                {"id": 3, "name": "Charlie", "role": "dev"},
            ]
        }

    def test_decode_list_array(self) -> None:
        """Test decoding list array."""
        ctf = """items@2:
  -:
    id:1
    name:First
  -:
    id:2
    name:Second"""
        result = decode(ctf)
        assert result == {
            "items": [
                {"id": 1, "name": "First"},
                {"id": 2, "name": "Second"},
            ]
        }


class TestDecoderReferences:
    """Test decoding with references."""

    def test_decode_with_references(self) -> None:
        """Test decoding with reference compression."""
        ctf = """^1="Engineering Department"

employees@3|name,dept:
  Alice|^1
  Bob|^1
  Charlie|^1"""
        result = decode(ctf)
        assert result == {
            "employees": [
                {"name": "Alice", "dept": "Engineering Department"},
                {"name": "Bob", "dept": "Engineering Department"},
                {"name": "Charlie", "dept": "Engineering Department"},
            ]
        }


class TestDecoderEdgeCases:
    """Test edge cases and error handling."""

    def test_decode_empty_string(self) -> None:
        """Test decoding empty string."""
        result = decode("")
        assert result == {}

    def test_decode_with_blank_lines(self) -> None:
        """Test decoding with blank lines."""
        ctf = """name:Alice

age:30

active:+"""
        result = decode(ctf)
        assert result == {"name": "Alice", "age": 30, "active": True}

    def test_decode_top_level_array(self) -> None:
        """Test decoding top-level array."""
        ctf = """data@2|id,name:
  1|Alice
  2|Bob"""
        result = decode(ctf)
        # Should unwrap the 'data' key for top-level arrays
        assert result == [
            {"id": 1, "name": "Alice"},
            {"id": 2, "name": "Bob"},
        ]
