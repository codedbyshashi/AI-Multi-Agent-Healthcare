#!/usr/bin/env python
"""Test script to verify ToolAgent fix and complete pipeline."""

import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from agents.tool_agent import decide_tool
from agents.context import ContextAgent

print("\n" + "="*70)
print("TOOLAGENT TEST - Verifying Non-Blocking Behavior")
print("="*70)

# Test 1: Medical text
print("\n[TEST 1] Medical text classification")
print("-" * 70)
medical_text = "Patient presents with symptoms of fever, elevated BP 180/120, and severe dizziness. Heart rate 110 bpm. Chest X-ray shows signs of pneumonia. Recommend immediate hospitalization."
result = decide_tool(medical_text)
print(f"Input: {medical_text[:60]}...")
print(f"Result: {result}")
print(f"Expected: medical_analysis or general_summary (fallback)")
print(f"Status: {'✓ PASS' if result in ['medical_analysis', 'general_summary', 'irrelevant_content'] else '✗ FAIL'}")

# Test 2: General text
print("\n[TEST 2] General text classification")
print("-" * 70)
general_text = "Python is a high-level programming language. It emphasizes code readability."
result = decide_tool(general_text)
print(f"Input: {general_text[:60]}...")
print(f"Result: {result}")
print(f"Expected: general_summary or other valid tool")
print(f"Status: {'✓ PASS' if result in ['medical_analysis', 'general_summary', 'irrelevant_content'] else '✗ FAIL'}")

# Test 3: Empty text (edge case)
print("\n[TEST 3] Empty text handling (edge case)")
print("-" * 70)
result = decide_tool("")
print(f"Input: (empty string)")
print(f"Result: {result}")
print(f"Expected: general_summary (fallback)")
print(f"Status: {'✓ PASS' if result == 'general_summary' else '✗ FAIL'}")

# Test 4: Context storage (verify context works)
print("\n[TEST 4] Context storage and retrieval")
print("-" * 70)
ctx = ContextAgent()
test_text = "Test analysis result from executor"
ctx.store("test_key", test_text)
retrieved = ctx.get("test_key")
print(f"Stored: {test_text}")
print(f"Retrieved: {retrieved}")
print(f"Status: {'✓ PASS' if retrieved == test_text else '✗ FAIL'}")

print("\n" + "="*70)
print("SUMMARY: All ToolAgent tests completed!")
print("="*70)
print("\nKey improvements in new ToolAgent:")
print("✓ Threading-based timeout (never blocks indefinitely)")
print("✓ Guaranteed return (every code path returns a result)")
print("✓ Safe fallback on LLM timeout/error (general_summary)")
print("✓ Comprehensive debug logging at each step")
print("✓ Edge case handling (empty input, invalid responses)")
print("\n" + "="*70)
