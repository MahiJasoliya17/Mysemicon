"""A tiny in-memory TTL cache with one switch to clear every cached function.

    @cache.ttl(60)
    def category_tree(): ...

    cache.clear_all()        # after data was changed (admin edits, imports)
"""
import functools
import threading
import time
from typing import Any, Callable, Dict, List, Tuple

_registry: List[Callable[[], None]] = []


def ttl(seconds: float) -> Callable:
    """Cache a function's results per argument tuple for `seconds` (arguments must be hashable)."""
    def decorator(fn: Callable) -> Callable:
        store: Dict[Tuple, Tuple[float, Any]] = {}
        lock = threading.Lock()

        @functools.wraps(fn)
        def wrapper(*args: Any) -> Any:
            now = time.monotonic()
            with lock:
                hit = store.get(args)
                if hit and now - hit[0] < seconds:
                    return hit[1]
            value = fn(*args)
            with lock:
                if len(store) > 2048:
                    store.clear()
                store[args] = (now, value)
            return value

        def clear() -> None:
            with lock:
                store.clear()

        wrapper.cache_clear = clear
        _registry.append(clear)
        return wrapper
    return decorator


def clear_all() -> None:
    """Drop every cached value (this module's caches and the stored site content)."""
    for clear in _registry:
        clear()
    from backend import content  # imported here: content must not depend on cache at import time
    content.refresh()
