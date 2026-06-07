import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  User, Shield, Mail, Lock, Key, 
  CheckCircle, AlertCircle, ArrowLeft,
  Camera, Save, Smartphone
} from 'lucide-react';
import { Button, Card, Input } from './ui';
import { apiService } from '../services/apiService';
import { useTranslation } from 'react-i18next';

interface UserSettingsViewProps {
  onBack: () => void;
}

export default function UserSettingsView({ onBack }: UserSettingsViewProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'sessions'>('profile');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Profile Form
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  // Security Form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorSecret, setTwoFactorSecret] = useState<string | null>(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const userData = await apiService.getCurrentUser();
      if (userData) {
        setUser(userData);
        setUsername(userData.username || '');
        setEmail(userData.email || '');
        setFullName(userData.profile?.fullName || '');
        setPhone(userData.profile?.phone || '');
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await apiService.updateProfile({
        username,
        email,
        profile: { fullName, phone }
      });
      if (res.success) {
        setUser(res.user);
        setMessage({ type: 'success', text: '个人资料已更新。' });
      } else {
        setMessage({ type: 'error', text: res.error || '更新失败。' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '更新请求失败。' });
    } finally {
      setSaving(false);
    }
  };

  const handleSetup2FA = async () => {
    try {
      const res = await apiService.setup2FA();
      if (res.success) {
        setTwoFactorSecret(res.secret);
      }
    } catch (error) {
      console.error('2FA setup failed:', error);
    }
  };

  const handleVerify2FA = async () => {
    if (!twoFactorCode) return;
    try {
      const res = await apiService.verify2FA(twoFactorCode);
      if (res.success) {
        setMessage({ type: 'success', text: '双重认证已启用。' });
        setTwoFactorSecret(null);
        setTwoFactorCode('');
        fetchUserData();
      } else {
        setMessage({ type: 'error', text: '验证码错误。' });
      }
    } catch (error) {
      console.error('2FA verification failed:', error);
    }
  };

  const handleVerifyEmailRequest = async () => {
    try {
      const res = await apiService.requestEmailVerification();
      if (res.success) {
        setMessage({ type: 'success', text: `验证码已发送: ${res.code}` });
      }
    } catch (error) {
      console.error('Email verification request failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1D9BF0]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 sm:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-neutral-900 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">账号设置</h1>
              <p className="text-sm text-neutral-500">管理您的个人资料、安全和偏好</p>
            </div>
          </div>
          {user?.verified ? (
            <div className="flex items-center space-x-2 text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 text-xs font-bold">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>已验证身份</span>
            </div>
          ) : (
            <button 
              onClick={handleVerifyEmailRequest}
              className="flex items-center space-x-2 text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20 text-xs font-bold hover:bg-amber-500/20 transition-colors"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>点击验证邮箱</span>
            </button>
          )}
        </div>

        {/* Message */}
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl border text-sm flex items-center space-x-3 ${
              message.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}
          >
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{message.text}</span>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="space-y-2">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'profile' ? 'bg-[#1D9BF0] text-white' : 'text-neutral-400 hover:bg-neutral-900'
              }`}
            >
              <User className="w-4 h-4" />
              <span>个人资料</span>
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'security' ? 'bg-[#1D9BF0] text-white' : 'text-neutral-400 hover:bg-neutral-900'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>安全中心</span>
            </button>
          </div>

          {/* Main Content */}
          <div className="md:col-span-3">
            <Card className="p-8 bg-neutral-950 border-neutral-800">
              {activeTab === 'profile' && (
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="flex items-center space-x-6 pb-6 border-b border-neutral-800">
                    <div className="relative group">
                      <div className="w-20 h-20 rounded-full bg-neutral-800 flex items-center justify-center overflow-hidden border-2 border-neutral-700">
                        {user?.profile?.avatar ? (
                          <img src={user.profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-10 h-10 text-neutral-600" />
                        )}
                      </div>
                      <button type="button" className="absolute bottom-0 right-0 p-1.5 bg-[#1D9BF0] rounded-full text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-3 h-3" />
                      </button>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">{username}</h3>
                      <p className="text-xs text-neutral-500 uppercase tracking-widest">{user?.role}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-mono text-neutral-500 uppercase">用户名</label>
                      <Input 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="用户名"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-mono text-neutral-500 uppercase">电子邮箱</label>
                      <Input 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="邮箱地址"
                        type="email"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-mono text-neutral-500 uppercase">真实姓名</label>
                      <Input 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="您的全名"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-mono text-neutral-500 uppercase">手机号码</label>
                      <Input 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="联系电话"
                      />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-neutral-800 flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={saving}
                      className="bg-[#1D9BF0] hover:bg-[#38BDF8]"
                    >
                      {saving ? '保存中...' : '保存更改'}
                      <Save className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </form>
              )}

              {activeTab === 'security' && (
                <div className="space-y-10">
                  {/* Password Section */}
                  <section className="space-y-6">
                    <div className="flex items-center space-x-3 text-[#1D9BF0]">
                      <Lock className="w-5 h-5" />
                      <h3 className="font-bold">修改密码</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-mono text-neutral-500 uppercase">新密码</label>
                        <Input 
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="输入新密码"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-mono text-neutral-500 uppercase">确认新密码</label>
                        <Input 
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="再次输入新密码"
                        />
                      </div>
                    </div>
                    <Button className="w-full sm:w-auto bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-white">
                      更新密码
                    </Button>
                  </section>

                  {/* 2FA Section */}
                  <section className="pt-10 border-t border-neutral-800 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 text-[#1D9BF0]">
                        <Smartphone className="w-5 h-5" />
                        <h3 className="font-bold">双重认证 (2FA)</h3>
                      </div>
                      <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                        user?.twoFactorEnabled ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-neutral-900 text-neutral-500 border border-neutral-800'
                      }`}>
                        {user?.twoFactorEnabled ? '已启用' : '未启用'}
                      </div>
                    </div>
                    
                    {!user?.twoFactorEnabled && !twoFactorSecret && (
                      <div className="bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800 space-y-4">
                        <p className="text-sm text-neutral-400">
                          为您的账号增加一层额外的安全保护。启用后，登录时需要输入由认证应用生成的验证码。
                        </p>
                        <Button onClick={handleSetup2FA} className="bg-[#1D9BF0] hover:bg-[#38BDF8]">
                          设置双重认证
                        </Button>
                      </div>
                    )}

                    {twoFactorSecret && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800 space-y-6"
                      >
                        <div className="space-y-2 text-center">
                          <p className="text-xs font-mono text-neutral-500 uppercase">您的 2FA 密钥</p>
                          <div className="text-2xl font-mono tracking-widest text-white bg-black p-4 rounded-xl border border-neutral-800">
                            {twoFactorSecret}
                          </div>
                          <p className="text-[10px] text-neutral-500">请在您的认证应用 (如 Google Authenticator) 中输入此密钥</p>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-xs font-mono text-neutral-500 uppercase">输入验证码</label>
                          <div className="flex space-x-4">
                            <Input 
                              value={twoFactorCode}
                              onChange={(e) => setTwoFactorCode(e.target.value)}
                              placeholder="000000"
                              className="text-center text-lg tracking-widest"
                              maxLength={6}
                            />
                            <Button onClick={handleVerify2FA} className="bg-white text-black hover:bg-neutral-200">
                              验证并启用
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </section>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
