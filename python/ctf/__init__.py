"""
CTF (Compressed Text Format) - Ultra-efficient data serialization for LLM prompts.

Achieves 30-50% token reduction compared to JSON while maintaining LLM comprehension.
"""

from ctf.encoder import encode
from ctf.decoder import decode
from ctf.types import EncodeOptions, DecodeOptions, JsonValue

__version__ = "1.0.0"
__all__ = ["encode", "decode", "EncodeOptions", "DecodeOptions", "JsonValue"]
