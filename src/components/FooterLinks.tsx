import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Heart, Mail, ExternalLink } from 'lucide-react';

interface FooterLinksProps {
  onNavigateToPrivacy?: () => void;
  onNavigateToTerms?: () => void;
}

export default function FooterLinks({ onNavigateToPrivacy, onNavigateToTerms }: FooterLinksProps) {
  const { t, i18n } = useTranslation();
  const isChineseLanguage = i18n.language?.startsWith('zh');

  return (
    <motion.footer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="border-t border-slate-800 bg-gradient-to-t from-black/50 to-transparent backdrop-blur-md py-12"
    >
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand Section */}
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full"></span>
              MODAUI
            </h3>
            <p className="text-sm text-gray-400">
              {isChineseLanguage 
                ? '企业操作平台 — 让 AI 为您的业务服务' 
                : 'Enterprise Operating Platform — AI Running Your Business'}
            </p>
          </div>

          {/* Product Links */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-white">
              {isChineseLanguage ? '产品' : 'Product'}
            </h4>
            <ul className="space-y-1.5 text-sm">
              <li>
                <a href="/" className="text-gray-400 hover:text-blue-400 transition-colors">
                  {isChineseLanguage ? '主页' : 'Home'}
                </a>
              </li>
              <li>
                <a href="/shop" className="text-gray-400 hover:text-blue-400 transition-colors">
                  {isChineseLanguage ? '商城' : 'Shop'}
                </a>
              </li>
              <li>
                <a href="/admin" className="text-gray-400 hover:text-blue-400 transition-colors">
                  {isChineseLanguage ? '后台' : 'Dashboard'}
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-white">
              {isChineseLanguage ? '法律' : 'Legal'}
            </h4>
            <ul className="space-y-1.5 text-sm">
              <li>
                <motion.button
                  whileHover={{ x: 2 }}
                  onClick={onNavigateToPrivacy}
                  className="text-gray-400 hover:text-blue-400 transition-colors flex items-center gap-1 group"
                >
                  <span>{isChineseLanguage ? '隐私权政策' : 'Privacy Policy'}</span>
                  <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.button>
              </li>
              <li>
                <motion.button
                  whileHover={{ x: 2 }}
                  onClick={onNavigateToTerms}
                  className="text-gray-400 hover:text-blue-400 transition-colors flex items-center gap-1 group"
                >
                  <span>{isChineseLanguage ? '服务条款' : 'Terms of Service'}</span>
                  <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.button>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-800/50 py-6 space-y-4">
          {/* Contact Info */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Mail size={16} className="text-blue-400" />
              <a href="mailto:support@modaui.com" className="hover:text-blue-400 transition-colors">
                support@modaui.com
              </a>
            </div>

            {/* Social/Links */}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>{isChineseLanguage ? '跟随我们：' : 'Follow us:'}</span>
              <a href="https://twitter.com/modaui" className="hover:text-blue-400 transition-colors">Twitter</a>
              <a href="https://github.com/modaui" className="hover:text-blue-400 transition-colors">GitHub</a>
            </div>
          </div>

          {/* Copyright */}
          <div className="text-xs text-gray-600 flex items-center gap-1">
            <span>{isChineseLanguage ? '© 2024 MODAUI。通过' : '© 2024 MODAUI. Made with'}</span>
            <Heart size={12} className="text-red-500 fill-red-500" />
            <span>{isChineseLanguage ? '打造。' : 'Worldwide.'}</span>
          </div>
        </div>
      </div>
    </motion.footer>
  );
}
