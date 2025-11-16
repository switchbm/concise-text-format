"""
CTF (Compressed Text Format) - Ultra-efficient data serialization for LLM prompts.

Achieves 30-50% token reduction compared to JSON while maintaining LLM comprehension.
"""

from ctf.decoder import decode
from ctf.encoder import encode
from ctf.types import DecodeOptions, EncodeOptions, JsonValue

__version__ = "1.0.0"
__all__ = ["DecodeOptions", "EncodeOptions", "JsonValue", "decode", "encode"]
