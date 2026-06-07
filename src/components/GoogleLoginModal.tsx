import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, Chrome, ShoppingBag
} from 'lucide-react';
import { auth, db, doc, setDoc } from '../services/firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  FacebookAuthProvider,
  OAuthProvider,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { serverTimestamp } from 'firebase/firestore';
import { Button, Card, Input, Modal } from './ui';
import { useTranslation } from 'react-i18next';

interface GoogleLoginModalProps {
  userEmail?: string;
  onSuccess: (email: string) => void;
  onCancel: () => void;
}

export default function GoogleLoginModal({ userEmail = 'guest@gmail.com', onSuccess, onCancel }: GoogleLoginModalProps) {
  const { t } = useTranslation();
  const [typedEmail, setTypedEmail] = useState(userEmail === 'guest@gmail.com' || userEmail === 'founder@gmail.com' ? '' : userEmail);
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [authProviders, setAuthProviders] = useState<Array<{id:string; label:string; enabled:boolean; configured:boolean}>>([]);

  // Write connection audits for security logging in Firestore
  const logAuditEntry = async (userId: string, email: string, actionType: string, role: string) => {
    try {
      const logId = 'auth_log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const auditRef = doc(db, 'audit_logs', logId);
      await setDoc(auditRef, {
        id: logId,
        uid: userId,
        email: email,
        action: actionType,
        role: role,
        system: 'MODAUI SaaS Portal',
        clientIp: 'Gateway Node',
        timestamp: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.error("Failed to write audit login logs: ", err);
    }
  };

  // 1. Real Google Auth Sign In
  const handleSignInWithProvider = async (providerName: 'google' | 'facebook' | 'apple' | 'wechat') => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      let provider;
      if (providerName === 'google') {
        provider = new GoogleAuthProvider();
      } else if (providerName === 'facebook') {
        provider = new FacebookAuthProvider();
      } else if (providerName === 'apple') {
        provider = new OAuthProvider('apple.com');
        provider.addScope('email');
        provider.addScope('name');
      } else if (providerName === 'wechat') {
        setErrorMsg('WeChat login is not currently supported in this client.');
        setIsLoading(false);
        return;
      } else {
        throw new Error('Unsupported provider');
      }
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        const userDocRef = doc(db, 'users', result.user.uid);
        const tenantId = result.user.email ? result.user.email.replace(/[^a-zA-Z0-9]/g, '_') : 'default_tenant';
        const providerId = result.user.providerData?.[0]?.providerId || `${providerName}.com`;
        await setDoc(userDocRef, {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName || 'MODAUI Enterprise Owner',
          photoURL: result.user.photoURL || '',
          providerId,
          createdAt: serverTimestamp(),
          role: 'founder',
          tenantId: tenantId
        }, { merge: true });

        await logAuditEntry(result.user.uid, result.user.email || '', `login_success_${providerName}`, 'founder');
        onSuccess(result.user.email || '');
      }
    } catch (error: any) {
      console.error("Google Auth Error:", error);
      let errMsg = error?.message || t('google_login_failed');
      if (
        error?.code?.includes('unauthorized-domain') || 
        error?.message?.includes('auth/unauthorized-domain')
      ) {
        errMsg = t('unauthorized_domain', { hostname: window.location.hostname });
      }
      setErrorMsg(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    const loadProviders = async () => {
      try {
        const resp = await fetch('/api/auth/providers');
        const payload = await resp.json();
        if (payload.success) {
          setAuthProviders(payload.providers || []);
        }
      } catch (err) {
        console.warn('Unable to load auth provider configuration', err);
      }
    };
    loadProviders();
  }, []);

  // 2. Real Email and password auth submit
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedEmail) {
      setErrorMsg(t('enter_email'));
      return;
    }

    // Step 1: Check if password input is already shown. If not, show it first
    if (!showPasswordInput) {
      setShowPasswordInput(true);
      setErrorMsg(null);
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg(t('password_min_length'));
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (authMode === 'signup') {
        const result = await createUserWithEmailAndPassword(auth, typedEmail, password);
        if (result.user) {
          const userDocRef = doc(db, 'users', result.user.uid);
          const tenantId = result.user.email ? result.user.email.replace(/[^a-zA-Z0-9]/g, '_') : 'default_tenant';
          await setDoc(userDocRef, {
            uid: result.user.uid,
            email: result.user.email,
            displayName: typedEmail.split('@')[0],
            createdAt: serverTimestamp(),
            role: 'founder',
            tenantId: tenantId
          }, { merge: true });

          await logAuditEntry(result.user.uid, result.user.email || '', 'signup_success_email', 'founder');
          setSuccessMsg(t('signup_success'));
          setTimeout(() => {
            onSuccess(result.user.email || '');
          }, 1200);
        }
      } else {
        const result = await signInWithEmailAndPassword(auth, typedEmail, password);
        if (result.user) {
          const userDocRef = doc(db, 'users', result.user.uid);
          const tenantId = result.user.email ? result.user.email.replace(/[^a-zA-Z0-9]/g, '_') : 'default_tenant';
          await setDoc(userDocRef, {
            tenantId: tenantId
          }, { merge: true });

          await logAuditEntry(result.user.uid, result.user.email || '', 'login_success_email', 'founder');
          onSuccess(result.user.email || '');
        }
      }
      } catch (error: any) {
      console.error("Email Authentication Error:", error);
      let friendlyError = error?.message || t('auth_service_error');
      if (error?.code === 'auth/invalid-credential' || error?.code === 'auth/wrong-password') {
        friendlyError = t('wrong_password');
      } else if (error?.code === 'auth/email-already-in-use') {
        friendlyError = t('email_in_use');
      } else if (error?.code === 'auth/user-not-found') {
        friendlyError = t('user_not_found');
      }
      setErrorMsg(friendlyError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal open onClose={onCancel} className="w-full max-w-md">
      <div className="w-full flex flex-col items-center">
        
        {/* LOGO (Bright Green Shopify-style Bag with 'M' logo) */}
        <div className="mb-6 flex flex-col items-center text-center space-y-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 bg-[#008060] rounded-2xl flex items-center justify-center shadow-lg shadow-[#008060]/20 border border-[#00a880]/30"
          >
            <ShoppingBag className="w-9 h-9 text-white" />
          </motion.div>
          
          <div className="space-y-1.5">
            <h1 className="text-3.5xl font-black tracking-tight text-white font-sans sm:text-3xl">
              {t('start_free_trial')}
            </h1>
            <p className="text-xs font-semibold text-zinc-400">
              {t('free_trial_offer')}
            </p>
          </div>
        </div>

        {/* WHITE CARD (Shopify Theme Style Card) */}
        <Card className="space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 font-semibold leading-relaxed">
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200 font-bold leading-relaxed">
              ✓ {successMsg}
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* Primary Email form always shown. */}
              <motion.div key="email_form" className="space-y-5">
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-605 block uppercase tracking-wider">{t('email_label')}</label>
                    <div className="relative">
                      <Input
                        type="email"
                        required
                        value={typedEmail}
                        onChange={(e) => {
                          setTypedEmail(e.target.value);
                          if (errorMsg) setErrorMsg(null);
                        }}
                        placeholder="name@example.com"
                        className="text-xs font-medium"
                      />
                    </div>
                  </div>

                  <AnimatePresence>
                    {showPasswordInput && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-1.5 pt-1 overflow-hidden"
                      >
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-zinc-600 block uppercase tracking-wider">密码</label>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                            className="text-[10px] font-bold text-sky-650 hover:underline px-0 py-0 min-w-0"
                          >
                            {authMode === 'signin' ? t('no_account_register') : t('have_account_login')}
                          </Button>
                        </div>
                        <div className="relative">
                          <Input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t('password_placeholder')}
                            className="text-xs font-mono"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Button type="submit" variant="primary" disabled={isLoading} fullWidth className="justify-center gap-2">
                    <span>{showPasswordInput ? (authMode === 'signup' ? t('create_account_now_free') : t('verify_and_signin')) : t('continue_with_email')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </form>

                {/* Social Multi-Provider Separator */}
                <div className="relative py-2 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-zinc-200"></div>
                  </div>
                  <span className="relative px-3 bg-white text-xs text-zinc-500 font-bold">{t('or')}</span>
                </div>

                {/* Social Service Buttons - Clean Shopify-style styling */}
                <div className="space-y-2.5">
                  {authProviders.length > 0 ? authProviders.map((provider) => (
                    <Button
                      key={provider.id}
                      type="button"
                      variant="outline"
                      fullWidth
                      disabled={isLoading || !provider.enabled}
                      onClick={() => handleSignInWithProvider(provider.id as any)}
                      className="justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <Chrome className="w-4 h-4 text-red-500" />
                        <span>{t('continue_with', { provider: provider.label })}</span>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {provider.configured ? (provider.enabled ? t('enabled') : t('disabled')) : t('not_configured')}
                      </span>
                    </Button>
                  )) : (
                    <div className="text-xs text-zinc-500">{t('loading_auth_options')}</div>
                  )}
                </div>
              {/* Demo Bypass Button */}
                <div className="pt-4 border-t border-zinc-100 flex flex-col items-center gap-2">
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">测试环境专用</p>
                  <Button 
                    variant="ghost" 
                    fullWidth 
                    className="border border-amber-500/20 bg-amber-500/5 text-amber-600 hover:bg-amber-500/10 font-black text-[11px]"
                    onClick={() => {
                      onSuccess('demo_founder@modaui.com');
                    }}
                  >
                    一键免密进入 (Demo Founder)
                  </Button>
                </div>
              </motion.div>
          </AnimatePresence>
        </Card>

        {/* Footer info bar and close trigger */}
        <div className="mt-5 flex items-center justify-between w-full px-4 text-[11px] text-zinc-500 font-medium">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="hover:text-white transition-colors px-0 py-0 min-w-0"
          >
            {t('cancel_and_back_home')}
          </Button>
          <span>MODAUI Secure Guard • SSL Link</span>
        </div>

      </div>
    </Modal>
  );
}
