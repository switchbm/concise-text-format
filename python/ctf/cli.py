"""Command-line interface for CTF."""

import argparse
import json
import sys
from pathlib import Path

from ctf import __version__, decode, encode
from ctf.types import EncodeOptions


def main() -> None:
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="CTF (Compressed Text Format) - Data serialization for LLM prompts",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--version", action="version", version=f"ctf-format {__version__}")

    subparsers = parser.add_subparsers(dest="command", help="Command to execute")

    # Encode command
    encode_parser = subparsers.add_parser("encode", help="Encode JSON to CTF")
    encode_parser.add_argument("input", help="Input JSON file (use - for stdin)")
    encode_parser.add_argument("-o", "--output", help="Output file (default: stdout)")
    encode_parser.add_argument(
        "--delimiter",
        choices=[",", "|", "\t", "auto"],
        default="auto",
        help="Delimiter for tabular arrays (default: auto)",
    )
    encode_parser.add_argument(
        "--no-references",
        action="store_true",
        help="Disable reference compression",
    )
    encode_parser.add_argument(
        "--optimize",
        choices=["none", "balanced", "aggressive"],
        default="balanced",
        help="Optimization level (default: balanced)",
    )
    encode_parser.add_argument(
        "--stats",
        action="store_true",
        help="Show statistics",
    )

    # Decode command
    decode_parser = subparsers.add_parser("decode", help="Decode CTF to JSON format")
    decode_parser.add_argument("input", help="Input CTF file (use - for stdin)")
    decode_parser.add_argument("-o", "--output", help="Output file (default: stdout)")
    decode_parser.add_argument(
        "--pretty",
        action="store_true",
        help="Pretty-print JSON output",
    )

    # Optimize command
    optimize_parser = subparsers.add_parser(
        "optimize", help="Analyze and show optimization recommendations"
    )
    optimize_parser.add_argument("input", help="Input JSON file")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    try:
        if args.command == "encode":
            handle_encode(args)
        elif args.command == "decode":
            handle_decode(args)
        elif args.command == "optimize":
            handle_optimize(args)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


def handle_encode(args: argparse.Namespace) -> None:
    """Handle encode command."""
    # Read input
    input_data = sys.stdin.read() if args.input == "-" else Path(args.input).read_text()

    # Parse JSON
    data = json.loads(input_data)

    # Build options
    options: EncodeOptions = {
        "delimiter": args.delimiter,  # type: ignore
        "optimize": args.optimize,  # type: ignore
    }

    if args.no_references:
        options["references"] = False

    # Encode
    ctf_output = encode(data, options)

    # Show stats if requested
    if args.stats:
        json_size = len(input_data)
        ctf_size = len(ctf_output)
        savings = ((json_size - ctf_size) / json_size * 100) if json_size > 0 else 0

        print("\nStatistics:", file=sys.stderr)
        print(f"  JSON size: {json_size} bytes", file=sys.stderr)
        print(f"  CTF size:  {ctf_size} bytes", file=sys.stderr)
        print(f"  Savings:   {savings:.1f}%", file=sys.stderr)
        print(file=sys.stderr)

    # Write output
    if args.output:
        Path(args.output).write_text(ctf_output)
        print(f"Encoded to {args.output}", file=sys.stderr)
    else:
        print(ctf_output)


def handle_decode(args: argparse.Namespace) -> None:
    """Handle decode command."""
    # Read input
    input_data = sys.stdin.read() if args.input == "-" else Path(args.input).read_text()

    # Decode
    data = decode(input_data)

    # Convert to JSON
    json_output = json.dumps(data, indent=2) if args.pretty else json.dumps(data)

    # Write output
    if args.output:
        Path(args.output).write_text(json_output)
        print(f"Decoded to {args.output}", file=sys.stderr)
    else:
        print(json_output)


def handle_optimize(args: argparse.Namespace) -> None:
    """Handle optimize command."""
    from ctf.optimizer import Optimizer

    # Read input
    input_data = Path(args.input).read_text()
    data = json.loads(input_data)

    # Analyze
    optimizer = Optimizer(data)
    recommendations = optimizer.get_recommendations()

    # Print recommendations
    print("Optimization Recommendations:")
    print("=" * 50)
    print(f"Delimiter:      {recommendations['delimiter']}")
    print(f"Use references: {recommendations['use_references']}")
    print(f"Tabular arrays: {recommendations['tabular_arrays']}")
    print(f"Total arrays:   {recommendations['total_arrays']}")
    print(f"Max depth:      {recommendations['max_depth']}")
    print()

    # Show example encoding
    print("Example encoding with recommendations:")
    print("-" * 50)
    options: EncodeOptions = {
        "delimiter": recommendations["delimiter"],  # type: ignore
        "references": recommendations["use_references"],
        "optimize": "balanced",  # type: ignore
    }
    encoded = encode(data, options)
    print(encoded[:500])  # Show first 500 chars
    if len(encoded) > 500:
        print(f"\n... ({len(encoded) - 500} more characters)")


if __name__ == "__main__":
    main()
