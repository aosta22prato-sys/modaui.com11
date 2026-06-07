import React from 'react';

interface AuthPanelProps {
  onAuthSuccess?: (sessionId: string) => void;
  onLogout?: () => void;
}

export default function AuthPanel({ onAuthSuccess, onLogout }: AuthPanelProps) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [session, setSession] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);

  const register = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('请输入管理员邮箱和密码以创建管理员账号。');
      return;
    }

    try {
      const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, role: 'Platform Admin' }) });
      const contentType = res.headers.get('content-type') || '';
      const j = contentType.includes('application/json') ? await res.json() : { success: false, error: `Server returned ${res.status}: ${await res.text()}` };
      if (j.success) {
        setSession(j.sessionId);
        localStorage.setItem('sessionId', j.sessionId);
        if (onAuthSuccess) {
          onAuthSuccess(j.sessionId);
        } else {
          window.location.reload();
        }
      } else {
        setError(j.error || '管理员注册失败，请检查邮箱和密码。');
      }
    } catch (e: any) {
      setError(e?.message || '管理员注册请求失败，请重试。');
    }
  };

  const login = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('请输入管理员邮箱和密码进行登录。');
      return;
    }

    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const contentType = res.headers.get('content-type') || '';
      const j = contentType.includes('application/json') ? await res.json() : { success: false, error: `Server returned ${res.status}: ${await res.text()}` };
      if (j.success) {
        setSession(j.sessionId);
        localStorage.setItem('sessionId', j.sessionId);
        if (onAuthSuccess) {
          onAuthSuccess(j.sessionId);
        } else {
          window.location.reload();
        }
      } else {
        setError(j.error || '登录失败，请检查账号和密码。');
      }
    } catch (e: any) {
      setError(e?.message || '登录请求失败，请重试。');
    }
  };

  const logout = async () => {
    try {
      const sid = localStorage.getItem('sessionId');
      await fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: sid }) });
      localStorage.removeItem('sessionId');
      setSession(null);
      if (onLogout) {
        onLogout();
      } else {
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
    }
  };

  React.useEffect(() => {
    const sid = localStorage.getItem('sessionId');
    if (sid) setSession(sid);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr] gap-3">
        <input placeholder="管理员邮箱" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-lg px-3 py-3 bg-neutral-900 text-sm text-white border border-zinc-800 focus:border-sky-500 outline-none" />
        <input placeholder="管理员密码" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-lg px-3 py-3 bg-neutral-900 text-sm text-white border border-zinc-800 focus:border-sky-500 outline-none" />
      </div>
      {error && (
        <div className="rounded-xl border border-rose-600/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        {!session && (
          <>
            <button onClick={login} className="rounded-xl bg-cyan-500 px-4 py-3 text-black text-sm font-semibold hover:bg-cyan-400 transition">
              登录
            </button>
            <button onClick={register} className="rounded-xl bg-emerald-500 px-4 py-3 text-black text-sm font-semibold hover:bg-emerald-400 transition">
              注册管理员
            </button>
          </>
        )}
        {session && (
          <>
            <div className="rounded-xl bg-zinc-950 px-4 py-3 text-sm text-zinc-300">已登录，会话ID 已保存在本地。</div>
            <button onClick={logout} className="rounded-xl bg-rose-500 px-4 py-3 text-black text-sm font-semibold hover:bg-rose-400 transition">
              退出登录
            </button>
          </>
        )}
      </div>
    </div>
  );
}
