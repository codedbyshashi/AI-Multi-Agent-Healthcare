from agents.context import ContextAgent

ctx = ContextAgent()

print("\n--- STORE TEST ---")
ctx.store("text", "sample patient data")

print("\n--- RETRIEVE TEST ---")
value = ctx.get("text")
print("Retrieved Value:", value)

print("\n--- MISSING KEY TEST ---")
print(ctx.get("missing"))