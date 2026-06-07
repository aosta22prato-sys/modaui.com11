import React from 'react';

export default function StoreCountCard() {
  const [count, setCount] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(false);

  const fetchCount = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stores/count');
      const j = await res.json();
      if (j && j.success) setCount(Number(j.count || 0));
    } catch (e) {
      console.error('fetchCount', e);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchCount();
    const id = setInterval(fetchCount, 30_000); // refresh every 30s
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mt-4">
      <div className="text-4xl font-extrabold">{loading ? '加载中…' : (count === null ? '—' : count)}</div>
      <div className="mt-2 text-sm text-neutral-400">系统内商户总数</div>
    </div>
  );
}
