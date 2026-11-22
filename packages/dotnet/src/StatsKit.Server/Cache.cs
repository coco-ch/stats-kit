namespace StatsKit;

/// <summary>
/// In-memory cache with a time to live; a key requested twice at the same time loads once. A load that fails is never kept, nor
/// a value refused by <c>keep</c> (an answer that reports an error): the next call reads the source again.
/// </summary>
internal sealed class Cache(Func<double> now)
{
    private readonly OrderedDictionary<string, (double At, object Value)> _entries = [];
    private readonly Dictionary<string, Task> _pending = [];
    private readonly object _gate = new();

    public Task<T> GetAsync<T>(string key, double ttlMs, Func<Task<T>> load, Func<T, bool>? keep = null)
    {
        lock (_gate)
        {
            if (_entries.TryGetValue(key, out var hit) && now() - hit.At < ttlMs) return Task.FromResult((T)hit.Value);
            if (_pending.TryGetValue(key, out var running)) return (Task<T>)running;
            var task = Run();
            if (!task.IsCompleted) _pending[key] = task;
            return task;
        }

        async Task<T> Run()
        {
            try
            {
                var value = await load().ConfigureAwait(false);
                lock (_gate)
                {
                    if (keep is not null && !keep(value)) _entries.Remove(key);
                    else
                    {
                        _entries[key] = (now(), value!);
                        if (_entries.Count > 200) _entries.RemoveAt(0); // beyond 200 entries, forget the oldest
                    }
                }
                return value;
            }
            finally
            {
                lock (_gate) _pending.Remove(key);
            }
        }
    }

    public void Clear()
    {
        lock (_gate) _entries.Clear();
    }
}
