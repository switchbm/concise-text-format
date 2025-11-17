# CTF Benchmark Results - Claude 4.5 Models

**Test Date:** 2025-11-16
**Dataset:** Config (1033 bytes JSON, 682 bytes CTF)
**Questions per format:** 10

## Results Summary

### Claude 4.5 Haiku (claude-haiku-4-5-20251001)

| Format | Accuracy | Confidence | Data Tokens | Token Reduction |
|--------|----------|------------|-------------|-----------------|
| JSON   | 100.0%   | 100.0%     | 330         | -               |
| CTF    | 100.0%   | 100.0%     | 216         | **-34.5%**      |

**Key Findings:**
- Perfect accuracy maintained across both formats
- 34.5% token reduction with CTF
- No loss in comprehension
- Excellent performance on both JSON and CTF formats

### Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

| Format | Accuracy | Confidence | Data Tokens | Token Reduction |
|--------|----------|------------|-------------|-----------------|
| JSON   | 100.0%   | 100.0%     | 330         | -               |
| CTF    | 80.0%    | 80.0%      | 216         | **-34.5%**      |

**Key Findings:**
- 100% accuracy on JSON format
- 80% accuracy on CTF format (20% drop)
- 34.5% token reduction with CTF
- Some comprehension challenges with CTF format

## Model Comparison

| Model | JSON Accuracy | CTF Accuracy | Accuracy Drop | Token Savings |
|-------|---------------|--------------|---------------|---------------|
| Claude 4.5 Haiku | 100.0% | 100.0% | **0.0%** | 34.5% |
| Claude Sonnet 4.5 | 100.0% | 80.0% | **-20.0%** | 34.5% |

## Analysis

### Token Efficiency
Both models achieved identical token reduction of **34.5%** when using CTF format:
- JSON: 330 tokens
- CTF: 216 tokens
- Savings: 114 tokens per prompt

### Comprehension Performance

**Claude 4.5 Haiku** demonstrated superior CTF comprehension:
- Perfect 100% accuracy on both formats
- No degradation in understanding CTF syntax
- Ideal model for CTF use cases

**Claude Sonnet 4.5** showed mixed results:
- Perfect on JSON (100%)
- Lower accuracy on CTF (80%)
- May require additional context or examples for CTF prompts

## Recommendations

1. **For CTF Format**: Claude 4.5 Haiku is the recommended model
   - Maintains perfect accuracy
   - Delivers full 34.5% token savings
   - No tradeoffs in comprehension

2. **For Production Use**: Consider Haiku for cost-effectiveness
   - Lower cost per token
   - Equal or better CTF performance
   - Significant token reduction maintained

3. **For Critical Applications**: If using Sonnet 4.5 with CTF
   - Add format explanation in system prompts
   - Include CTF examples
   - Monitor for comprehension issues

## Conclusion

The benchmarks demonstrate that CTF format delivers substantial token savings (34.5%) with Claude 4.5 models. Claude 4.5 Haiku shows exceptional CTF comprehension with no accuracy loss, making it the ideal model for CTF-based applications.
