class ContextAgent:
    """In-memory context manager for sharing state across agents."""

    def __init__(self):
        self.memory = {}

    def store(self, key: str, value):
        """Save value under the given key."""
        self.memory[key] = value
        print(f"[Context] Stored: {key}")

    def get(self, key: str):
        """Return stored value, or None if key not found."""
        value = self.memory.get(key, None)
        print(f"[Context] Retrieved: {key}")
        return value
