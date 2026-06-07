import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { ChevronLeft } from 'lucide-react';

interface PrivacyPolicyViewProps {
  onBack?: () => void;
}

export default function PrivacyPolicyView({ onBack }: PrivacyPolicyViewProps) {
  const { t, i18n } = useTranslation();

  const isChineseLanguage = i18n.language?.startsWith('zh');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black text-white"
    >
      <div className="container mx-auto max-w-4xl px-4 py-16">
        {/* Header with Back Button */}
        <div className="mb-12">
          {onBack && (
            <motion.button
              onClick={onBack}
              whileHover={{ x: -4 }}
              className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6 transition-colors"
            >
              <ChevronLeft size={20} />
              <span>{isChineseLanguage ? '返回' : 'Back'}</span>
            </motion.button>
          )}
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            {isChineseLanguage ? '隐私权政策' : 'Privacy Policy'}
          </h1>
          <p className="text-gray-400">
            {isChineseLanguage 
              ? '最后更新：2026年6月7日' 
              : 'Last Updated: June 7, 2026'}
          </p>
        </div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="prose prose-invert max-w-none space-y-8 text-gray-300 leading-relaxed"
        >
          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-blue-400 rounded-full"></span>
              {isChineseLanguage ? '1. 我们收集的信息' : '1. Information We Collect'}
            </h2>
            <p>
              {isChineseLanguage 
                ? 'MODAUI 企业操作平台（"我们"或"平台"）收集以下信息：'
                : 'MODAUI Enterprise Operating Platform ("we" or "the Platform") collects the following information:'}
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <strong>{isChineseLanguage ? '账户信息' : 'Account Information'}:</strong> {isChineseLanguage 
                  ? '电子邮箱、密码哈希值、公司名称、行业分类' 
                  : 'Email, password hash, company name, industry classification'}
              </li>
              <li>
                <strong>{isChineseLanguage ? '业务数据' : 'Business Data'}:</strong> {isChineseLanguage 
                  ? '产品目录、订单信息、库存记录、客户数据' 
                  : 'Product catalogs, order information, inventory records, customer data'}
              </li>
              <li>
                <strong>{isChineseLanguage ? '使用数据' : 'Usage Data'}:</strong> {isChineseLanguage 
                  ? 'IP 地址、浏览器类型、访问时间、页面交互' 
                  : 'IP address, browser type, access time, page interactions'}
              </li>
              <li>
                <strong>{isChineseLanguage ? 'AI 训练数据' : 'AI Training Data'}:</strong> {isChineseLanguage 
                  ? '用于改进 AI 代理的匿名化业务数据' 
                  : 'Anonymized business data for improving AI agents'}
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-blue-400 rounded-full"></span>
              {isChineseLanguage ? '2. 我们如何使用您的信息' : '2. How We Use Your Information'}
            </h2>
            <p>
              {isChineseLanguage 
                ? '我们使用收集的信息用于以下目的：'
                : 'We use collected information for the following purposes:'}
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>{isChineseLanguage ? '提供和维护平台服务' : 'Provide and maintain platform services'}</li>
              <li>{isChineseLanguage ? '改进用户体验和平台功能' : 'Improve user experience and platform features'}</li>
              <li>{isChineseLanguage ? '处理交易和发送相关通知' : 'Process transactions and send related notifications'}</li>
              <li>{isChineseLanguage ? '向您发送营销和推广信息（如适用）' : 'Send marketing and promotional information (if applicable)'}</li>
              <li>{isChineseLanguage ? '防止欺诈和确保平台安全' : 'Prevent fraud and ensure platform security'}</li>
              <li>{isChineseLanguage ? '符合法律义务' : 'Comply with legal obligations'}</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-blue-400 rounded-full"></span>
              {isChineseLanguage ? '3. 信息安全' : '3. Information Security'}
            </h2>
            <p>
              {isChineseLanguage 
                ? '我们采取合理的技术和组织措施来保护您的个人信息，包括：'
                : 'We take reasonable technical and organizational measures to protect your personal information, including:'}
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>{isChineseLanguage ? '使用加密传输（SSL/TLS）' : 'Encryption in transit (SSL/TLS)'}</li>
              <li>{isChineseLanguage ? '安全的身份验证机制' : 'Secure authentication mechanisms'}</li>
              <li>{isChineseLanguage ? '定期安全审计和更新' : 'Regular security audits and updates'}</li>
              <li>{isChineseLanguage ? '访问控制和权限管理' : 'Access controls and permission management'}</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-blue-400 rounded-full"></span>
              {isChineseLanguage ? '4. 第三方共享' : '4. Third-Party Sharing'}
            </h2>
            <p>
              {isChineseLanguage 
                ? '我们不会出售您的个人信息。我们可能会与以下方共享信息：'
                : 'We do not sell your personal information. We may share information with:'}
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>{isChineseLanguage ? '提供技术支持的服务提供商' : 'Service providers offering technical support'}</li>
              <li>{isChineseLanguage ? '支付处理商' : 'Payment processors'}</li>
              <li>{isChineseLanguage ? '法律要求的政府机构' : 'Government agencies when required by law'}</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-blue-400 rounded-full"></span>
              {isChineseLanguage ? '5. 您的权利' : '5. Your Rights'}
            </h2>
            <p>
              {isChineseLanguage 
                ? '根据适用法律，您可能有权：'
                : 'Depending on applicable law, you may have the right to:'}
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>{isChineseLanguage ? '访问您的个人数据' : 'Access your personal data'}</li>
              <li>{isChineseLanguage ? '更正或删除您的数据' : 'Correct or delete your data'}</li>
              <li>{isChineseLanguage ? '限制数据处理' : 'Restrict data processing'}</li>
              <li>{isChineseLanguage ? '数据可携带权' : 'Data portability'}</li>
              <li>{isChineseLanguage ? '撤销同意' : 'Withdraw consent'}</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-blue-400 rounded-full"></span>
              {isChineseLanguage ? '6. 联系我们' : '6. Contact Us'}
            </h2>
            <p>
              {isChineseLanguage 
                ? '如果您对本隐私权政策有任何问题，请通过以下方式联系我们：'
                : 'If you have any questions about this Privacy Policy, please contact us at:'}
            </p>
            <div className="bg-slate-800 rounded-lg p-6 mt-4 border border-slate-700">
              <p className="mb-2">
                <strong>{isChineseLanguage ? '电子邮件：' : 'Email:'}</strong> privacy@modaui.com
              </p>
              <p>
                <strong>{isChineseLanguage ? '网址：' : 'Website:'}</strong> https://modaui.com
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-blue-400 rounded-full"></span>
              {isChineseLanguage ? '7. 政策更新' : '7. Policy Updates'}
            </h2>
            <p>
              {isChineseLanguage 
                ? '我们可能会不时更新本隐私权政策。我们将在此页面上发布任何更改，并更新"最后更新"日期。'
                : 'We may update this Privacy Policy from time to time. We will post any changes on this page and update the "Last Updated" date.'}
            </p>
          </section>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-16 pt-8 border-t border-slate-700 text-center text-gray-500 text-sm"
        >
          <p>
            {isChineseLanguage 
              ? '© 2024 MODAUI。保留所有权利。' 
              : '© 2024 MODAUI. All rights reserved.'}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
