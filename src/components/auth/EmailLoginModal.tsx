import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ShoppingBag, Mail, Lock, Building2, User, ShieldCheck, CheckCircle2, RefreshCw, Database, Github, Chrome, MessageCircle } from 'lucide-react';
import { Button, Card, Input, Modal } from '../ui';
import { useTranslation } from 'react-i18next';
import { apiService } from '../../services/apiService';

interface EmailLoginModalProps {
  userEmail?: string;
  onSuccess: (email: string, metadata?: { username?: string; companyName?: string }) => void;
  onCancel: () => void;
}

const SocialAuthButton = ({ icon: Icon, label, color, onClick }: any) => (
  <motion.button
    whileHover={{ scale: 1.02, y: -2 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="flex items-center justify-center gap-3 w-full h-11 bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-all group"
  >
    <Icon className={`w-5 h-5 ${color}`} />
    <span className="text-xs font-bold text-zinc-300 group-hover:text-white">{label}</span>
  </motion.button>
);

export default function EmailLoginModal({ userEmail, onSuccess, onCancel }: EmailLoginModalProps) {
  const { t } = useTranslation();
  const [typedEmail, setTypedEmail] = useState(userEmail || '');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [username, setUsername] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [authConfigs, setAuthConfigs] = useState<any[]>([]);

  useEffect(() => {
    // Fetch active auth configurations from backend
    apiService.fetchApi('/api/auth/configs')
      .then(res => {
        if (res.success) setAuthConfigs(res.configs);
      })
      .catch((err) => {
        console.error('Failed to fetch auth configs:', err);
        setErrorMsg(t('auth_config_fetch_error'));
      });
  }, [t]);

  const handleSocialLogin = (provider: string) => {
    window.location.href = `/api/auth/social/${provider}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!typedEmail || !typedEmail.includes('@')) {
      setErrorMsg(t('enter_valid_email'));
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg(t('password_length_error'));
      return;
    }

    if (authMode === 'signup') {
      if (!companyName) {
        setErrorMsg(t('company_name_required'));
        return;
      }
      if (!username) {
        setErrorMsg(t('username_required'));
        return;
      }
    }

    setIsLoading(true);

    try {
      if (authMode === 'signin') {
        const res = await apiService.login(typedEmail, password);
        if (res?.success) {
          setIsSuccess(true);
          setTimeout(() => onSuccess(typedEmail, { username: res.user?.username }), 800);
        } else {
          setErrorMsg(res?.error || t('login_failed_check_credentials'));
        }
      } else {
        // Mock registration logic using the existing initializeTenant or a dedicated register API
        const res = await apiService.register({
          email: typedEmail,
          password,
          username,
          companyName
        });
        if (res?.success) {
          setIsSuccess(true);
          setTimeout(() => onSuccess(typedEmail, { username, companyName }), 1200);
        } else {
          setErrorMsg(res?.error || t('register_failed_email_taken'));
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setErrorMsg(err.message || t('auth_operation_error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen onClose={onCancel} className="p-0 overflow-hidden bg-transparent border-none shadow-none w-full max-w-[440px]">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative bg-[#09090B] border border-zinc-800/50 rounded-[32px] overflow-hidden shadow-2xl"
      >
        {/* Top Decorative Header */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500" />
        
        <div className="p-8 sm:p-10">
          <div className="flex flex-col items-center mb-8">
            <motion.div 
              whileHover={{ rotate: 5, scale: 1.05 }}
              className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-900/20 mb-5 border border-emerald-400/20"
            >
              <ShoppingBag className="w-8 h-8 text-white" />
            </motion.div>
            
            <h2 className="text-2xl font-bold text-white tracking-tight mb-2">
              {isSuccess ? '欢迎回来' : (authMode === 'signin' ? '登录 MODAUI' : '开启企业智体时代')}
            </h2>
            <p className="text-sm text-zinc-500 font-medium text-center">
              {isSuccess 
                ? '身份验证成功，正在进入工作大盘...' 
                : (authMode === 'signin' ? '管理您的全球化数字企业资产' : '注册即刻获得 6 名专属 AI 特遣队专家')}
            </p>
          </div>

          {/* Auth Mode Toggle */}
          {!isSuccess && (
            <div className="flex p-1 bg-zinc-900/50 border border-zinc-800 rounded-2xl mb-8">
              <button
                onClick={() => setAuthMode('signin')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${authMode === 'signin' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                已有账号登录
              </button>
              <button
                onClick={() => setAuthMode('signup')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${authMode === 'signup' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                免费创建账号
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            {isSuccess ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-10 space-y-4"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <div className="h-2 w-32 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1 }}
                    className="h-full bg-emerald-500"
                  />
                </div>
              </motion.div>
            ) : (
              <motion.form 
                key={authMode}
                initial={{ opacity: 0, x: authMode === 'signin' ? -10 : 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: authMode === 'signin' ? 10 : -10 }}
                onSubmit={handleSubmit} 
                className="space-y-4"
              >
                {errorMsg && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl font-medium flex items-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                    {errorMsg}
                  </motion.div>
                )}

                {authMode === 'signup' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">真实姓名</label>
                      <div className="relative group">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
                        <Input
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="姓名"
                          className="pl-10 bg-zinc-900/50 border-zinc-800 focus:border-emerald-500/50 h-11 text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">企业名称</label>
                      <div className="relative group">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
                        <Input
                          required
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="公司名"
                          className="pl-10 bg-zinc-900/50 border-zinc-800 focus:border-emerald-500/50 h-11 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">电子邮箱地址</label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
                    <Input
                      type="email"
                      required
                      value={typedEmail}
                      onChange={(e) => setTypedEmail(e.target.value)}
                      placeholder="founder@company.com"
                      className="pl-10 bg-zinc-900/50 border-zinc-800 focus:border-emerald-500/50 h-11 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">访问密码</label>
                    {authMode === 'signin' && (
                      <button type="button" className="text-[10px] font-bold text-zinc-600 hover:text-zinc-400 transition-colors">忘记密码？</button>
                    )}
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
                    <Input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10 bg-zinc-900/50 border-zinc-800 focus:border-emerald-500/50 h-11 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button 
                    type="submit" 
                    variant="primary" 
                    disabled={isLoading} 
                    fullWidth 
                    className="h-12 bg-emerald-600 hover:bg-emerald-500 text-white border-none rounded-2xl shadow-lg shadow-emerald-900/20 font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <span>{authMode === 'signin' ? '立即验证并登录' : '创建账号并开启智能体'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {!isSuccess && (
            <div className="mt-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-px bg-zinc-800 flex-1" />
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">或使用社交账号</span>
                <div className="h-px bg-zinc-800 flex-1" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {authConfigs.find(c => c.provider === 'google') && (
                  <SocialAuthButton 
                    icon={Chrome} 
                    label="Google" 
                    color="text-red-500" 
                    onClick={() => handleSocialLogin('google')} 
                  />
                )}
                {authConfigs.find(c => c.provider === 'github') && (
                  <SocialAuthButton 
                    icon={Github} 
                    label="GitHub" 
                    color="text-white" 
                    onClick={() => handleSocialLogin('github')} 
                  />
                )}
              </div>
              
              {authConfigs.find(c => c.provider === 'wechat') && (
                <SocialAuthButton 
                  icon={MessageCircle} 
                  label="使用微信扫码登录" 
                  color="text-emerald-500" 
                  onClick={() => handleSocialLogin('wechat')} 
                />
              )}
            </div>
          )}

          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
              <div className="w-8 h-px bg-zinc-800" />
              <span>企业级加密保护</span>
              <div className="w-8 h-px bg-zinc-800" />
            </div>
            
            <button
              type="button"
              onClick={onCancel}
              className="text-xs font-bold text-zinc-500 hover:text-white transition-colors flex items-center gap-1.5 group"
            >
              <ArrowRight className="w-3.5 h-3.5 rotate-180 group-hover:-translate-x-1 transition-transform" />
              放弃并返回首页
            </button>
          </div>
        </div>

        {/* Bottom Banner */}
        <div className="bg-zinc-900/30 border-t border-zinc-800/50 p-4 flex items-center justify-center gap-6">
          <div className="flex items-center gap-1.5 opacity-40">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">SSL Secured</span>
          </div>
          <div className="flex items-center gap-1.5 opacity-40">
            <Database className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">SQLite Persistent</span>
          </div>
        </div>
      </motion.div>
    </Modal>
  );
}
