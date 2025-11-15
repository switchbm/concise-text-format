# Compressed Text Format (CTF) Specification v1.0

**Status:** Final
**Date:** January 2025
**Authors:** CTF Format Team

## Table of Contents

1. [Introduction](#introduction)
2. [Design Goals](#design-goals)
3. [Core Syntax](#core-syntax)
4. [Data Types](#data-types)
5. [Arrays](#arrays)
6. [Reference Compression](#reference-compression)
7. [Grammar](#grammar)
8. [Examples](#examples)
9. [Implementation Notes](#implementation-notes)

## Introduction

Compressed Text Format (CTF) is a data serialization format optimized for Large Language Model (LLM) prompts. It achieves 30-50% token reduction compared to JSON while maintaining high LLM comprehension.

### Design Principles

1. **Token Efficiency** - Minimize token count for LLM APIs
2. **LLM Comprehension** - Maintain clear, parseable structure
3. **Compactness** - Reduce redundancy without sacrificing clarity
4. **Deterministic** - Same input always produces same output
5. **Round-trip Safe** - Decode(Encode(x)) === x

## Design Goals

### Primary Goals

- Reduce token count by 30-50% vs JSON for typical data structures
- Maintain >90% LLM accuracy for data retrieval tasks
- Support all JSON data types
- Enable efficient encoding of tabular data

### Non-Goals

- Human editability (use JSON for authoring)
- Schema validation (use JSON Schema or similar)
- Comments or annotations
- Arbitrary precision numbers

## Core Syntax

### Basic Structure

CTF uses a **key:value** format with indentation-based nesting:

```
key:value
nested:
  subkey:value
```

### Primitives

| Type | JSON | CTF | Token Savings |
|------|------|-----|---------------|
| Null | `null` | `_` | 75% |
| True | `true` | `+` | 80% |
| False | `false` | `-` | 83% |
| Number | `42` | `42` | 0% |
| String | `"text"` | `text` or `"text"` | 0-40% |

### String Quoting Rules

Strings must be quoted if they contain:
- Colons (`:`)
- Pipes (`|`)
- Commas (`,`)
- Tabs (`\t`)
- Newlines (`\n`, `\r`)
- Quotes (`"`)
- Braces (`{`, `}`)
- Brackets (`[`, `]`)
- Caret (`^`)
- At sign (`@`)
- Start with a digit
- Contain multiple consecutive spaces

Examples:
```
# Unquoted
name:Alice
city:NYC
status:active

# Quoted
text:"Contains: special chars"
path:"C:\\Users\\Alice"
spaced:"San Francisco"
```

## Data Types

### Null

Represented by underscore:

```
value:_
```

### Booleans

Represented by symbols for compactness:

```
active:+         # true
disabled:-       # false
```

**Rationale:** Saves 3-4 tokens per boolean (80%+ reduction)

### Numbers

Integers and floats use standard notation:

```
age:32
price:99.99
negative:-42
scientific:1.5e10
```

### Strings

```
# Simple (unquoted)
name:Alice
role:admin

# Complex (quoted)
description:"Multi-word description"
path:"C:\\Program Files"
```

### Objects

Flat objects:

```
id:123
name:Alice
active:+
```

Nested objects use indentation:

```
user:
  id:123
  profile:
    name:Alice
    email:alice@example.com
```

## Arrays

CTF provides multiple array representations optimized for different use cases.

### Empty Arrays

```
items@0:
```

### Inline Arrays

For primitive arrays (numbers, booleans, strings):

```
tags:[admin ops dev]
scores:[95 87 92]
flags:[+ - +]
```

### Tabular Arrays

For **3 or more** uniform objects with primitive values:

```
users@3|id,name,role:
1|Alice|admin
2|Bob|user
3|Charlie|dev
```

**Format:** `key@count|field1,field2,...:`

**Delimiters:** `|` (pipe), `,` (comma), or `\t` (tab)

**Requirements:**
1. Array has ≥3 elements
2. All elements are objects
3. All objects have same keys
4. All values are primitives (string, number, boolean, null)

**Token Savings:** 40-60% vs JSON for typical tables

### Columnar Arrays

For very large arrays (1000+ rows) with high repetition:

```
employees@5000||id,name,dept:
|id:[1..5000]
|name:[...array of names...]
|dept:["Engineering"=3500,"Sales"=1000,"Marketing"=500]
```

**Format:** `key@count||field1,field2,...:`

**Column Encoding:**

1. **Range notation:** `[start..end]`
   - For sequential integers
   - Example: `[1..1000]` → integers 1 through 1000

2. **Run-length encoding:** `["value"=count,...]`
   - For high-repetition data
   - Example: `["Engineering"=3500,"Sales"=1500]`

3. **Array notation:** `[val1,val2,...]`
   - For low-repetition data

**Token Savings:** 60-80% vs row-based for high-repetition columns

### List Arrays

For non-uniform arrays or arrays with <3 elements:

```
items@2:
  -:
    id:1
    name:Alice
  -:
    id:2
    email:bob@example.com
```

## Reference Compression

References eliminate repetition of long strings.

### Syntax

```
^id=value     # Definition
^id           # Use
```

### Example

```
^1="Engineering Department"
^2="alice@company.com"

employees@3|name,dept,email:
Alice|^1|^2
Bob|^1|bob@company.com
Charlie|^1|charlie@company.com
```

### Rules

1. References are defined at the beginning of the document
2. Reference IDs are positive integers (1, 2, 3, ...)
3. References must be defined before use
4. Reference values can be any string

### Token Savings Calculation

For a string appearing **N times** with length **L**:

**Without references:** N × L tokens
**With references:** (N × 2) + L + 3 tokens

**Savings:** (N - 1) × L - (N × 2) - 3 tokens

**Break-even:** N ≥ 3 and L ≥ 5 (approximate)

**Example:**
- String: "Engineering Department" (23 chars)
- Occurrences: 1000
- Without: 23,000 tokens
- With: 2,000 + 23 + 3 = 2,026 tokens
- **Savings: 91.2%**

## Grammar

Formal grammar in EBNF notation:

```ebnf
document       = ( reference | assignment )* ;
reference      = "^" digit+ "=" value ;
assignment     = key ":" value ;

key            = identifier ( "." identifier )* ;
identifier     = letter ( letter | digit | "_" | "-" )* ;

value          = primitive | array | object ;
primitive      = null | boolean | number | string | ref_use ;

null           = "_" ;
boolean        = "+" | "-" ;
number         = "-"? digit+ ( "." digit+ )? ( ("e"|"E") ("-"|"+")? digit+ )? ;
string         = unquoted_string | quoted_string ;
unquoted_string= ( letter | digit | "-" | "_" )+ ;
quoted_string  = "\"" ( escape | [^"\\] )* "\"" ;
escape         = "\\" ( "\"" | "\\" | "n" | "r" | "t" ) ;

ref_use        = "^" digit+ ;

array          = inline_array | tabular_array | columnar_array | list_array ;

inline_array   = "[" ( value ( " " value )* )? "]" ;

tabular_array  = "@" count delimiter field_list ":" newline
                 ( row newline )* ;
delimiter      = "|" | "," | "\t" ;
field_list     = identifier ( "," identifier )* ;
row            = value ( delimiter value )* ;

columnar_array = "@" count "||" field_list ":" newline
                 ( "|" identifier ":" column_value newline )* ;
column_value   = range | rle | inline_array ;
range          = "[" number ".." number "]" ;
rle            = "[" rle_entry ( "," rle_entry )* "]" ;
rle_entry      = string "=" count ;

list_array     = "@" count ":" newline
                 ( "-" ":" newline object )* ;

object         = ( assignment newline )* ;

count          = digit+ ;
letter         = [a-zA-Z] ;
digit          = [0-9] ;
newline        = "\n" ;
```

## Examples

### Example 1: Simple User Data

**JSON (138 bytes):**
```json
{
  "users": [
    { "id": 1, "name": "Alice", "role": "admin" },
    { "id": 2, "name": "Bob", "role": "user" },
    { "id": 3, "name": "Charlie", "role": "dev" }
  ]
}
```

**CTF (62 bytes, 55% savings):**
```
users@3|id,name,role:
1|Alice|admin
2|Bob|user
3|Charlie|dev
```

### Example 2: Nested Configuration

**JSON (210 bytes):**
```json
{
  "app": {
    "name": "MyApp",
    "version": "1.0.0",
    "debug": false
  },
  "database": {
    "host": "localhost",
    "port": 5432,
    "ssl": true
  }
}
```

**CTF (98 bytes, 53% savings):**
```
app:
  name:MyApp
  version:1.0.0
  debug:-
database:
  host:localhost
  port:5432
  ssl:+
```

### Example 3: With References

**JSON (285 bytes):**
```json
{
  "employees": [
    { "name": "Alice", "dept": "Engineering Department" },
    { "name": "Bob", "dept": "Engineering Department" },
    { "name": "Charlie", "dept": "Engineering Department" }
  ]
}
```

**CTF (109 bytes, 62% savings):**
```
^1="Engineering Department"

employees@3|name,dept:
Alice|^1
Bob|^1
Charlie|^1
```

## Implementation Notes

### Encoder Optimization

Implementations should:

1. **Auto-detect array format:**
   - Use tabular for ≥3 uniform objects with primitives
   - Use columnar for ≥1000 rows with >30% repetition
   - Use inline for primitive arrays
   - Use list for everything else

2. **Auto-detect references:**
   - Count string occurrences
   - Create reference if: occurrences ≥ 3 AND length > 5
   - Only create if net token savings > 10

3. **Choose optimal delimiter:**
   - Analyze data for occurrence of `|`, `,`, `\t`
   - Choose least-used delimiter
   - Prefer `|` for token efficiency when equal

### Decoder Validation

In strict mode, decoders should validate:

- Array lengths match declared count
- Delimiter consistency within arrays
- All references defined before use
- Proper indentation structure

### Error Handling

Decoders should provide clear error messages with line numbers:

```
Error: Expected 3 values, got 2 (line 5)
Error: Undefined reference: ^5 (line 12)
Error: Invalid array count (line 8)
```

## Changelog

### v1.0 (January 2025)
- Initial specification release
- Core syntax defined
- Tabular arrays
- Reference compression
- Columnar arrays
- Grammar formalized

---

**Specification maintained by:** CTF Format Team
**License:** MIT
