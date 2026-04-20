#!/usr/bin/env python3
"""Test script to verify streaming endpoint functionality."""
import asyncio
import json
import sys
from pathlib import Path

# Add the project root to path
sys.path.insert(0, str(Path(__file__).parent))

from app import app
from fastapi.testclient import TestClient

def test_streaming_updates():
    """Test that the streaming endpoint sends updates for each agent."""
    client = TestClient(app)
    
    # Create a minimal PDF for testing
    test_pdf = Path(__file__).parent / "data" / "sample.pdf"
    
    if not test_pdf.exists():
        print(f"❌ Test PDF not found at {test_pdf}")
        print("   Please ensure a sample PDF exists in the data folder")
        return False
    
    with open(test_pdf, "rb") as f:
        files = {"file": ("sample.pdf", f, "application/pdf")}
        
        print("🔄 Starting streaming test...")
        print("Sending request to /analyze-stream/ endpoint\n")
        
        response = client.post("/analyze-stream/", files=files)
        
        if response.status_code != 200:
            print(f"❌ Request failed with status {response.status_code}")
            print(f"   Response: {response.text}")
            return False
        
        print("✅ Connection established")
        print("📡 Receiving updates:\n")
        
        updates_received = {
            "tool": False,
            "planner": False,
            "executor": False,
            "validator": False,
            "done": False,
        }
        
        # Parse streaming response
        for line in response.iter_lines():
            if line.startswith(b"data: "):
                try:
                    data = json.loads(line[6:].decode())
                    
                    if "pipeline_status" in data:
                        status = data["pipeline_status"]
                        step = data.get("step", "unknown")
                        print(f"   ✓ {step.upper()}: ", end="")
                        for agent, state in status.items():
                            print(f"{agent}={state} ", end="")
                        print()
                        updates_received[step] = True
                    
                    if data.get("done"):
                        updates_received["done"] = True
                        print("\n✅ Stream completed")
                        
                except json.JSONDecodeError as e:
                    print(f"   ⚠️  Could not parse JSON: {e}")
        
        print("\n📊 Summary of updates received:")
        all_received = all(updates_received.values())
        for agent, received in updates_received.items():
            status = "✅" if received else "❌"
            print(f"   {status} {agent}")
        
        if all_received:
            print("\n✅ All agent updates received in streaming format!")
            return True
        else:
            print("\n❌ Some agent updates were missing from the stream")
            return False

if __name__ == "__main__":
    success = test_streaming_updates()
    sys.exit(0 if success else 1)
