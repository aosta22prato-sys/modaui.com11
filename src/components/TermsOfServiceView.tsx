import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { ChevronLeft } from 'lucide-react';

interface TermsOfServiceViewProps {
  onBack?: () => void;
}

export default function TermsOfServiceView({ onBack }: TermsOfServiceViewProps) {
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
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            {isChineseLanguage ? '服务条款' : 'Terms of Service'}
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
              <span className="w-1 h-6 bg-cyan-400 rounded-full"></span>
              {isChineseLanguage ? '1. 接受条款' : '1. Acceptance of Terms'}
            </h2>
            <p>
              {isChineseLanguage 
                ? '通过访问和使用 MODAUI 企业操作平台（以下简称"服务"），您同意受本服务条款的约束。如果您不同意这些条款，请不要使用本服务。'
                : 'By accessing and using the MODAUI Enterprise Operating Platform ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.'}
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-cyan-400 rounded-full"></span>
              {isChineseLanguage ? '2. 用户账户' : '2. User Accounts'}
            </h2>
            <p>
              {isChineseLanguage 
                ? '您负责维护您账户的保密性和安全性。您同意对在您账户下进行的所有活动负责。您同意：'
                : 'You are responsible for maintaining the confidentiality and security of your account. You agree to be responsible for all activities under your account. You agree to:'}
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>{isChineseLanguage ? '及时通知我们任何未授权的账户使用' : 'Notify us promptly of any unauthorized account usage'}</li>
              <li>{isChineseLanguage ? '定期更改您的密码' : 'Change your password regularly'}</li>
              <li>{isChineseLanguage ? '使用安全的登录凭据' : 'Use secure login credentials'}</li>
              <li>{isChineseLanguage ? '在完成后登出账户' : 'Log out from your account after use'}</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-cyan-400 rounded-full"></span>
              {isChineseLanguage ? '3. 可接受的使用' : '3. Acceptable Use'}
            </h2>
            <p>
              {isChineseLanguage 
                ? '您同意不使用本服务进行以下活动：'
                : 'You agree not to use the Service for:'}
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>{isChineseLanguage ? '任何非法或违反法律的活动' : 'Any illegal or unlawful activity'}</li>
              <li>{isChineseLanguage ? '骚扰、骚扰或威胁他人' : 'Harassing, harassing or threatening others'}</li>
              <li>{isChineseLanguage ? '侵犯知识产权' : 'Infringing intellectual property rights'}</li>
              <li>{isChineseLanguage ? '传播恶意软件或病毒' : 'Distributing malware or viruses'}</li>
              <li>{isChineseLanguage ? '尝试获得未授权访问权限' : 'Attempting unauthorized access'}</li>
              <li>{isChineseLanguage ? '进行任何形式的欺诈或欺骗' : 'Engaging in fraud or deception'}</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-cyan-400 rounded-full"></span>
              {isChineseLanguage ? '4. 知识产权' : '4. Intellectual Property'}
            </h2>
            <p>
              {isChineseLanguage 
                ? '本服务的所有内容、功能和特性（包括但不限于软件、文本、图形、徽标）属于 MODAUI、其许可方或内容提供者，受国际版权、商标和其他知识产权法律保护。'
                : 'All content, features, and functionality of the Service (including but not limited to software, text, graphics, logos) are owned by MODAUI, its licensors, or content providers, and are protected by international copyright, trademark, and other intellectual property laws.'}
            </p>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-cyan-400 rounded-full"></span>
              {isChineseLanguage ? '5. 用户内容' : '5. User Content'}
            </h2>
            <p>
              {isChineseLanguage 
                ? '您在本服务中发布或上传的任何内容（包括文本、图像、视频等）保持您的所有权，但您授予 MODAUI 使用该内容来改进和提供服务的权利。'
                : 'You retain all ownership of any content you post or upload on the Service (including text, images, videos, etc.), but you grant MODAUI the right to use that content to improve and provide the Service.'}
            </p>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-cyan-400 rounded-full"></span>
              {isChineseLanguage ? '6. 服务可用性' : '6. Service Availability'}
            </h2>
            <p>
              {isChineseLanguage 
                ? 'MODAUI 按"现状"提供服务，不提供任何明示或暗示的保证。我们不保证：'
                : 'MODAUI provides the Service "as is" without any express or implied warranties. We do not guarantee:'}
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>{isChineseLanguage ? '服务的不间断或无错误' : 'Uninterrupted or error-free Service'}</li>
              <li>{isChineseLanguage ? '特定的结果或性能' : 'Specific results or performance'}</li>
              <li>{isChineseLanguage ? '第三方内容的准确性' : 'Accuracy of third-party content'}</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-cyan-400 rounded-full"></span>
              {isChineseLanguage ? '7. 责任限制' : '7. Limitation of Liability'}
            </h2>
            <p>
              {isChineseLanguage 
                ? '在任何情况下，MODAUI 对您因使用或无法使用本服务而产生的任何直接、间接、偶然、特殊或后果性损害概不负责，即使 MODAUI 已被告知可能发生此类损害。'
                : 'In no event shall MODAUI be liable for any direct, indirect, incidental, special, or consequential damages arising from your use or inability to use the Service, even if MODAUI has been advised of the possibility of such damages.'}
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-cyan-400 rounded-full"></span>
              {isChineseLanguage ? '8. 支付和订阅' : '8. Payments and Subscriptions'}
            </h2>
            <p>
              {isChineseLanguage 
                ? '如果您购买任何付费功能或订阅，您同意：'
                : 'If you purchase any paid features or subscriptions, you agree to:'}
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>{isChineseLanguage ? '按照规定的价格和条款付款' : 'Pay according to the specified prices and terms'}</li>
              <li>{isChineseLanguage ? '提供准确的计费信息' : 'Provide accurate billing information'}</li>
              <li>{isChineseLanguage ? '及时更新过期的支付方式' : 'Update expired payment methods promptly'}</li>
              <li>{isChineseLanguage ? '遵守退款政策' : 'Comply with refund policy'}</li>
            </ul>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-cyan-400 rounded-full"></span>
              {isChineseLanguage ? '9. 终止' : '9. Termination'}
            </h2>
            <p>
              {isChineseLanguage 
                ? 'MODAUI 保留随时因任何原因（包括违反本条款）暂停或终止您的账户的权利。终止后，您对服务的访问权限将立即撤销。'
                : 'MODAUI reserves the right to suspend or terminate your account at any time for any reason, including violation of these terms. Upon termination, your access to the Service will be immediately revoked.'}
            </p>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-cyan-400 rounded-full"></span>
              {isChineseLanguage ? '10. 条款修改' : '10. Modification of Terms'}
            </h2>
            <p>
              {isChineseLanguage 
                ? 'MODAUI 可能会随时修改这些条款。我们将在本页面发布任何更改，并更新"最后更新"日期。继续使用本服务表示您接受修改后的条款。'
                : 'MODAUI may modify these terms at any time. We will post any changes on this page and update the "Last Updated" date. Continuing to use the Service indicates your acceptance of the modified terms.'}
            </p>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-cyan-400 rounded-full"></span>
              {isChineseLanguage ? '11. 准据法' : '11. Governing Law'}
            </h2>
            <p>
              {isChineseLanguage 
                ? '本条款受适用法律管辖。任何争议应在适当的司法管辖区的法院解决。'
                : 'These terms are governed by applicable law. Any disputes shall be resolved in the courts of the appropriate jurisdiction.'}
            </p>
          </section>

          {/* Section 12 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-cyan-400 rounded-full"></span>
              {isChineseLanguage ? '12. 联系我们' : '12. Contact Us'}
            </h2>
            <p>
              {isChineseLanguage 
                ? '如果您对本服务条款有任何问题，请通过以下方式联系我们：'
                : 'If you have any questions about these Terms of Service, please contact us at:'}
            </p>
            <div className="bg-slate-800 rounded-lg p-6 mt-4 border border-slate-700">
              <p className="mb-2">
                <strong>{isChineseLanguage ? '电子邮件：' : 'Email:'}</strong> support@modaui.com
              </p>
              <p>
                <strong>{isChineseLanguage ? '网址：' : 'Website:'}</strong> https://modaui.com
              </p>
            </div>
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
