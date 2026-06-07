import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc, collection, onSnapshot, query, where, orderBy, limit, addDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { 
  Building2, Users, Flame, Send, Star, Zap, ShoppingCart, 
  CheckCircle, ArrowLeft, TrendingUp, AlertCircle, Sparkles, Terminal, ShieldAlert,
  Sliders, Cpu, Globe, Database, Key, RefreshCw, Layers, Activity, Server, Save, 
  ChevronDown, BookOpen, Package, Eye, LayoutGrid, Award, MessageSquare, LineChart, Settings, PlayCircle,
  Mic, Image, Volume2, X, Upload, FileImage, Check, Copy, ChevronRight, Search, Plus,
  Cloud, CloudUpload, CloudDownload, Briefcase, CreditCard, History, Landmark, User
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart as ReLineChart,
  Line,
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Legend as ReLegend,
  Cell
} from 'recharts';
import { IndustryData, OperatingStrategy, TeamMember, TaskLog, ChatMessage } from '../types';
import { MOCK_LOGS_POOL } from '../data';
import { apiService } from '../services/apiService';
import DiscountsView from './DiscountsView';
import ContentView from './ContentView';
import ChannelsView from './ChannelsView';
import StorefrontView from './StorefrontView';
import AppStoreView from './AppStoreView';
import DeveloperConsoleView from './DeveloperConsoleView';
import MerchantSettingsView from './MerchantSettingsView';
import PaymentGatewayView from '../modules/payment/PaymentGatewayView';
import FinanceHubView from '../modules/finance/FinanceHubView';
import ProductCenterView from '../modules/product-center';
import InventoryCenterView from '../modules/inventory-center';
import { POSCenterView } from '../modules/pos-center';
import { SupplierCenterView } from '../modules/supplier-center';
import { PurchaseCenterView } from '../modules/purchase-center';
import { SalesCenterView } from '../modules/sales-center';
import { ReportCenterView } from '../modules/report-center';
import { CustomerCenterView } from '../modules/customer-center';
import RoleManagementPanel from './RoleManagementPanel';
import D3FinancialStreamChart from './D3FinancialStreamChart';
import { UserRole } from '../services/rbac';

interface MerchantDashboardProps {
  industry: IndustryData;
  strategy: OperatingStrategy;
  userEmail: string;
  onExit: () => void;
  userRole?: 'founder' | 'admin' | 'manager' | 'staff' | 'customer';
  onUpdateRole?: (newRole: 'founder' | 'admin' | 'manager' | 'staff' | 'customer') => void;
  onNavigate?: (action: any) => void;
}

interface Manager {
  roleId: string;
  role: string;
  emoji: string;
  name: string;
  desc: string;
  welcome: string;
  specialty: string;
}

// 4 distinct managers mapping exactly to tabs
const getManagers = (industryId: string): Manager[] => {
  if (industryId === 'catering') {
    return [
      {
        roleId: 'designer',
        role: 'AI设计师',
        emoji: '🍽️',
        name: '视觉陈列师 Kai',
        desc: '负责门脸品牌设计、线上美团/点评菜单视觉编排和一句话生成高还原度海报。主要负责：店铺 70%、产品 30%。',
        welcome: '我是您的 AI设计师Kai。我负责店铺首页设计、Banner海报排布、视觉美化与一站式宣传图生成。主要对接「店铺页面」！',
        specialty: '海报设计及排版、线上菜单视觉呈现、品牌形象VI'
      },
      {
        roleId: 'product_mgr',
        role: 'AI商品经理',
        emoji: '🍜',
        name: '菜品研发官 Ren',
        desc: '负责菜品新品开发、外卖菜单打样、物料扣率精算与零售定价。主要负责：产品 100%。',
        welcome: '我是您的 AI商品经理Ren。我负责菜品新品研发、SKU属性与录单维护、毛利与采购成本定价。主要对接「产品页面」！',
        specialty: '新品概念配置、零售菜谱溢价评估、采购供应链核算'
      },
      {
        roleId: 'ops_mgr',
        role: 'AI运营经理',
        emoji: '📈',
        name: '门店运营官 Lulu',
        desc: '负责线上接单调度、即时客诉与秒级异常退款拦截、资金合规对账。主要负责：订单、客户与销量/财务分析。',
        welcome: '我是您的 AI运营经理Lulu。我负责全网订单接单调度、客诉拦截与退款处理、进销存异常告警及每晚财务结账复盘。主要对接「订单、客户、分析」页面！',
        specialty: '极客订单履约、多退款拦截安抚、流水一键审计'
      },
      {
        roleId: 'marketing_mgr',
        role: 'AI营销经理',
        emoji: '📣',
        name: '餐饮营销官 Soren',
        desc: '精算营销代金券、霸王餐引流案、探店KOL宣发文案内容撰写。主要负责：营销 100%。',
        welcome: '我是您的 AI营销经理Soren。我负责全网引流活动策划、满减代金券计算投放、探店KOL宣发文案。主要对接「营销页面」！',
        specialty: '满减精算折扣、活动策划与KOL内容、美团大众推广投放'
      },
      {
        roleId: 'finance_mgr',
        role: 'AI财务经理',
        emoji: '💰',
        name: '财务主管 刘会计',
        desc: '负责公司全盘账务审计、利润分析、现金流预测及税务合规建议。主要负责：财务中心 100%。',
        welcome: '我是您的 AI财务经理刘会计。我负责公司收入、支出、利润的实时审计，并为您提供经营决策建议。主要对接「财务中心」！',
        specialty: '实时损益审计、现金流健康评估、成本精算优化'
      }
    ];
  } else if (industryId === 'retail') {
    return [
      {
        roleId: 'designer',
        role: 'AI设计师',
        emoji: '🏪',
        name: '店铺设计师 Dax',
        desc: '负责百货门脸平面设计、网店视觉海报排布和橱窗创意陈列。主要负责：店铺 70%、产品 30%。',
        welcome: '我是您的 AI设计师Dax。我负责百货门脸平面设计、网站Banner排版、橱窗视觉呈现创意渲染。主要对接「店铺页面」！',
        specialty: '线上橱窗陈列、配色方案制定、店头氛围美化二创'
      },
      {
        roleId: 'product_mgr',
        role: 'AI商品经理',
        emoji: '📦',
        name: '选品好手 Barton',
        desc: '精研新型百货分类、新品SPU自动建档、毛利预算核定与零售溢价。主要负责：产品 100%。',
        welcome: '我是您的 AI商品经理Barton。我负责百货商品开发与科学选品定价、SKU多规格管理、上架SPU录单、进销存监控。主要对接「产品页面」！',
        specialty: '百货新品研发、快反库存配比、商品录单与价格打法'
      },
      {
        roleId: 'ops_mgr',
        role: 'AI运营经理',
        emoji: '📈',
        name: '运营专家 Cyrus',
        desc: '主导网店订单发货、顺丰快递官方揽收通知对接、精细CRM客户关怀与销量财务报表。主要负责：订单、客户与销量/财务分析。',
        welcome: '我是您的 AI运营经理Cyrus。我负责百货业务日常订单履约、客诉退款拦截、分销跟单与每日资金大盘审计。主要对接「订单、客户、分析」页面！',
        specialty: '订单极速下发发货、客诉秒级关怀拦截、分销渠道数据结转'
      },
      {
        roleId: 'marketing_mgr',
        role: 'AI营销经理',
        emoji: '📣',
        name: '营销专家 Nova',
        desc: '撰写社媒裂变推介内容、大促销优惠券发放方案、及流量直通车竞价调优。主要负责：营销 100%。',
        welcome: '我是您的 AI营销经理Nova。我负责线上大促优惠券配置、小红书/微群文案创意输出、直通车精准预算调优。主要对接「营销页面」！',
        specialty: '精敏直通车调价竞价、大促满减券派发策略、品牌曝光推播策划'
      },
      {
        roleId: 'finance_mgr',
        role: 'AI财务经理',
        emoji: '💰',
        name: '财务主管 刘会计',
        desc: '负责公司全盘账务审计、利润分析、现金流预测及税务合规建议。主要负责：财务中心 100%。',
        welcome: '我是您的 AI财务经理刘会计。我负责公司收入、支出、利润的实时审计，并为您提供经营决策建议。主要对接「财务中心」！',
        specialty: '实时损益审计、现金流健康评估、成本精算优化'
      }
    ];
  } else {
    // Default: 'fashion' 服装公司
    return [
      {
        roleId: 'designer',
        role: 'AI设计师',
        emoji: '👗',
        name: '时装设计师 Aria',
        desc: '负责服装线上装修、版图搭配、微店页面整体视觉设计与UI风格排布。配置比例：店铺 70%、产品 30%。',
        welcome: '我是您的 AI设计师 Aria。我负责服装页面的视觉陈列、首页海报视觉设计、详情页穿搭排版。主要精力负责「店铺页面」与部分「产品详情」！',
        specialty: '线上橱窗陈列、配色方案制定、海报视觉设计渲染'
      },
      {
        roleId: 'product_mgr',
        role: 'AI商品经理',
        emoji: '👚',
        name: '选品好手 Barton',
        desc: '负责服装面料比对、潮流选品、极速快反打样排单与价格核定。配置比例：产品 100%。',
        welcome: '我是您的 AI商品经理 Barton。我负责服装商品研发选品、规格多SKU/SPU建档上架及毛利定价。全权负责「产品页面」！',
        specialty: '潮流热词选款、快反打样物耗、服装溢价与毛利率策略'
      },
      {
        roleId: 'ops_mgr',
        role: 'AI运营经理',
        emoji: '📈',
        name: '跟单专家 Cyrus',
        desc: '负责分销渠道、SPU库存红线监控、一站式发往顺丰极速托揽与日常退款纠纷。配置比例：订单、客户、分析页面。',
        welcome: '我是您的 AI运营经理 Cyrus。我负责订单一件代发托管、顺丰揽件打单、客户CRM退换退款拦截、资金损益对账。全权管控「订单、客户、分析」页面！',
        specialty: '订单托管揽件、顺丰一件代发对接、每日资金结算周报'
      },
      {
        roleId: 'marketing_mgr',
        role: 'AI营销经理',
        emoji: '📣',
        name: '宣发大咖 Daphne',
        desc: '主导活动策划、全网优惠代金券发放、投放广告ROI精细化调优及博主寄样。配置比例：营销 100%。',
        welcome: '我是您的 AI营销经理 Daphne。我负责活动策划、优惠代金券发放、推广ROI调优与小红书等社媒带货文案输出。全权对接「营销页面」！',
        specialty: '小红书潮流穿搭种草文案、抖音短视起拍脚本、千万粉博主派样'
      },
      {
        roleId: 'finance_mgr',
        role: 'AI财务经理',
        emoji: '💰',
        name: '财务主管 刘会计',
        desc: '负责公司全盘账务审计、利润分析、现金流预测及税务合规建议。主要负责：财务中心 100%。',
        welcome: '我是您的 AI财务经理刘会计。我负责公司收入、支出、利润的实时审计，并为您提供经营决策建议。主要对接「财务中心」！',
        specialty: '实时损益审计、现金流健康评估、成本精算优化'
      }
    ];
  }
};

const SlsTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#09090B] border border-[#2F3336] p-3 rounded-lg shadow-xl font-mono text-xs text-neutral-200">
        <p className="font-bold mb-1 text-white">{label}</p>
        <p className="text-sky-400">
          销售额: <span className="font-bold">¥{Number(payload[0].value).toFixed(2)}</span>
        </p>
      </div>
    );
  }
  return null;
};

const ChnTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#09090B] border border-[#2F3336] p-3 rounded-lg shadow-xl font-mono text-xs text-neutral-200">
        <p className="font-bold mb-1 text-white">{label}</p>
        <p className="text-indigo-400">
          获客比率: <span className="font-bold">{payload[0].value}%</span>
        </p>
      </div>
    );
  }
  return null;
};

const getIndustryDefaultHeadline = (indId: string) => {
  const defaults: Record<string, string> = {
    fashion: '👗 Aria 季风高定系列 · 舒感美学新风尚',
    catering: '☕ Tyson Cafe · 经典美式/手作拿铁特惠',
    retail: '✈️ 全球尖货精选直邮 · 发现品质生活好物',
    beauty: '💄 Coco Salon · 焕活平衡 SPA 与定制深层理疗',
    fitness: '🏋️ Kelly Gym · 尊享周度私教定制与低碳膳食',
    jewelry: '💎 18K足金古法拉丝龙凤金镯 · 匠人高定传承',
    home: '🛋️ 空间美学 · 环保级棉麻主卧全套风格软装'
  };
  return defaults[indId] || defaults.catering;
};

export default function MerchantDashboard({ 
  industry, 
  strategy, 
  userEmail, 
  onExit,
  userRole = 'founder',
  onUpdateRole,
  onNavigate
}: MerchantDashboardProps) {
  // Backstage Active Menu State
  // 'workbench' | 'store' | 'product' | 'order' | 'customer' | 'marketing' | 'analytics' | 'settings' | 'team_members' | 'app_store' | 'developer' | 'rbac'
  const getInitialMenuFromUrl = () => {
    if (typeof window === 'undefined') return 'finance' as const;
    const path = window.location.pathname;
    if (path.startsWith('/admin/')) {
      const sub = path.slice(7);
      if (sub === 'zhifu' || sub === 'payment') return 'payment' as const;
      if (sub === 'caiwu' || sub === 'finance') return 'finance' as const;
      if (sub === 'rosters' || sub === 'team-members' || sub === 'team_members') return 'team_members' as const;
      if (sub === 'orders' || sub === 'order') return 'order' as const;
      if (sub === 'app-store' || sub === 'app_store') return 'app_store' as const;
      if (sub === 'merchant-settings' || sub === 'merchant_settings') return 'merchant_settings' as const;
      if (sub === 'inventory') return 'inventory' as const;
      const valid = ['finance', 'payment', 'workbench', 'store', 'product', 'inventory', 'order', 'customer', 'marketing', 'analytics', 'settings', 'team_members', 'app_store', 'developer', 'rbac', 'merchant_settings'];
      if (valid.includes(sub)) return sub as any;
    }
    const targetMenu = localStorage.getItem('platform_active_menu');
    if (targetMenu) {
      if (['finance', 'payment', 'workbench', 'store', 'product', 'inventory', 'order', 'customer', 'marketing', 'analytics', 'settings', 'team_members', 'app_store', 'developer', 'rbac', 'merchant_settings'].includes(targetMenu)) {
        localStorage.removeItem('platform_active_menu');
        return targetMenu as any;
      }
    }
    return 'finance' as const;
  };

  const [activeMenu, setActiveMenu] = useState<'pos' | 'supplier' | 'purchase' | 'sales_center' | 'analytics' | 'finance' | 'payment' | 'workbench' | 'store' | 'product' | 'inventory' | 'order' | 'customer' | 'marketing' | 'settings' | 'team_members' | 'app_store' | 'developer' | 'rbac' | 'merchant_settings'>(getInitialMenuFromUrl());

  const tenantId = userEmail ? userEmail.replace(/[^a-zA-Z0-9]/g, '_') : 'default_tenant';

  // Synchronize URL and listen to back/forward navigation
  useEffect(() => {
    let targetPath = '/admin';
    if (activeMenu === 'payment') targetPath = '/admin/zhifu';
    else if (activeMenu === 'finance') targetPath = '/admin/finance';
    else if (activeMenu === 'team_members') targetPath = '/admin/team_members';
    else if (activeMenu === 'order') targetPath = '/admin/orders';
    else if (activeMenu === 'app_store') targetPath = '/admin/app_store';
    else targetPath = `/admin/${activeMenu}`;

    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  }, [activeMenu]);

  useEffect(() => {
    const handleRouteSync = () => {
      const initialMenu = getInitialMenuFromUrl();
      if (initialMenu !== activeMenu) {
        setActiveMenu(initialMenu);
      }
    };
    window.addEventListener('popstate', handleRouteSync);
    return () => {
      window.removeEventListener('popstate', handleRouteSync);
    };
  }, [activeMenu]);
  
  const [sales, setSales] = useState(25488.60);

  // Dynamic daily revenue data based on live sales state
  const getDailySalesData = () => {
    const baseDays = [
      { date: '5-26', sales: 3200 },
      { date: '5-27', sales: 4100 },
      { date: '5-28', sales: 3800 },
      { date: '5-29', sales: 5200 },
      { date: '5-30', sales: 4800 },
      { date: '5-31', sales: 6100 },
    ];
    const todaySales = Math.max(1000, Number((sales - 19800).toFixed(2)));
    return [
      ...baseDays,
      { date: '今天(实时)', sales: todaySales }
    ];
  };

  const channelsData = [
    { name: '小红书种草', value: 42, color: '#f43f5e' },
    { name: '抖音生活圈', value: 35, color: '#6366f1' },
    { name: '平台自然流量', value: 15, color: '#10b981' },
    { name: '私域裂变推广', value: 8, color: '#f59e0b' }
  ];
  const [orders, setOrders] = useState(132);
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [chatMessage, setChatMessage] = useState('');
  const [chats, setChats] = useState<Record<string, ChatMessage[]>>({});
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<'stream' | 'tasks'>('stream');
  
  // Custom Multi-Modal states for Advanced AI Control Console
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedImageName, setAttachedImageName] = useState<string | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'transcribing'>('idle');
  const [micActiveLevel, setMicActiveLevel] = useState<number>(0);
  const [voiceWaveformArr, setVoiceWaveformArr] = useState<number[]>(new Array(16).fill(3));
  
  // Right Sidebar active manager focus
  const managers = getManagers(industry.id);
  const [selectedStaff, setSelectedStaff] = useState<TeamMember>({
    role: managers[0].role,
    emoji: managers[0].emoji,
    name: managers[0].name,
    desc: managers[0].desc,
    status: 'active',
    tasks: []
  });

  // Master Settings States
  const [apiProvider, setApiProvider] = useState<'gemini' | 'deepseek' | 'openai' | 'ollama'>('gemini');
  const [geminiKey, setGeminiKey] = useState('sk-gemini-8v1823ha923m1acb...');
  const [deepseekKey, setDeepseekKey] = useState('sk-ds-921a9230b080cff1a...');
  const [openaiKey, setOpenaiKey] = useState('sk-proj-4o0129kals01a238b...');
  const [ollamaEndpoint, setOllamaEndpoint] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('llama3:8b');
  const [ollamaModels, setOllamaModels] = useState<string[]>([
    'llama3:8b', 
    'qwen2.5:7b', 
    'gemma2:9b', 
    'mistral:7b',
    'deepseek-r1:8b',
    'deepseek-v3:latest'
  ]);
  const [ollamaSearchQuery, setOllamaSearchQuery] = useState('');
  const [customOllamaModelInput, setCustomOllamaModelInput] = useState('');
  const [isSyncingOllama, setIsSyncingOllama] = useState(false);
  const [isDropdownActive, setIsDropdownActive] = useState(false);
  const [ollamaSyncError, setOllamaSyncError] = useState<string | null>(null);

  const [merchant, setMerchant] = useState<any>(null);

  useEffect(() => {
    const fetchMerchant = async () => {
      try {
        const res = await apiService.getMerchant(industry.id === 'catering' ? 'T-001' : 'T-001'); // Using T-001 as demo fallback
        if (res.success) setMerchant(res.merchant);
      } catch (e) {
        console.error('Failed to fetch merchant for sidebar:', e);
      }
    };
    fetchMerchant();
  }, [industry.id]);
  const [globalTemperature, setGlobalTemperature] = useState(0.85);
  const [selectedPreset, setSelectedPreset] = useState<'balanced' | 'aggressive' | 'harmonic' | 'analytic'>('balanced');
  const [testConnectionStatus, setTestConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [testLog, setTestLog] = useState<string>('系统路由就绪。等待诊断通信连通性...');
  const [geminiConnected, setGeminiConnected] = useState<'online' | 'local'>('local');

  // Sub-navigation state selectors for secondary-level dashboard tabs
  const [storeSubTab, setStoreSubTab] = useState<'overview' | 'decoration' | 'channels' | 'domain' | 'brand' | 'seo'>('overview');
  const [productSubTab, setProductSubTab] = useState<'list' | 'categories' | 'inventory' | 'sku' | 'brands' | 'collections' | 'images' | 'batches' | 'suppliers' | 'purchase'>('list');
  const [inventorySubTab, setInventorySubTab] = useState<'overview' | 'warehouses' | 'locations' | 'records' | 'transfers' | 'adjustments'>('overview');
  const [orderSubTab, setOrderSubTab] = useState<'all' | 'draft' | 'refund' | 'aftersales' | 'tracking'>('all');
  const [customerSubTab, setCustomerSubTab] = useState<'list' | 'tags' | 'segments' | 'membership' | 'b2b'>('list');
  const [marketingSubTab, setMarketingSubTab] = useState<'coupon' | 'campaign' | 'email' | 'sms' | 'ai'>('coupon');
  const [analyticsSubTab, setAnalyticsSubTab] = useState<'sales' | 'customer' | 'product' | 'marketing' | 'realtime'>('sales');

  // Real-time synchronization from SQLite via API
  useEffect(() => {
    if (!tenantId) return;

    const fetchOrders = async () => {
      try {
        const res = await apiService.getOrders(tenantId);
        if (res.success) {
          setOrdersList(res.orders);
        }
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      }
    };

    const fetchFinanceReport = async () => {
      try {
        const res = await apiService.getFinanceReport(tenantId);
        if (res.success) {
          setSales(res.report.income);
          // You could also set other finance related states here
        }
      } catch (error) {
        console.error('Failed to fetch finance report:', error);
      }
    };

    fetchOrders();
    fetchFinanceReport();
    
    // Polling for updates every 10 seconds to simulate real-time
    const interval = setInterval(() => {
      fetchOrders();
      fetchFinanceReport();
    }, 10000);

    return () => clearInterval(interval);
  }, [tenantId]);

  // Extra sub-navigation database fields for store overview and other parameters
  const [isStoreOnline, setIsStoreOnline] = useState(true);
  const [customDomainName, setCustomDomainName] = useState('');
  const [brandPrimaryColor, setBrandPrimaryColor] = useState('#1D9BF0');
  const [brandLogoText, setBrandLogoText] = useState('');
  const [seoHtmlTitle, setSeoHtmlTitle] = useState('');
  const [seoMetaDesc, setSeoMetaDesc] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');

  // Auxiliary database lists loaded dynamically or seeded
  const [categoriesList, setCategoriesList] = useState<string[]>(['爆款推荐', '本季新品', '限时折扣', '招牌单品']);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [suppliersList, setSuppliersList] = useState<any[]>([
    { id: 'sup1', name: '大同高定面料源头基地', contact: '梁经理', phone: '13812345678', category: '针织纺织类', status: '合作中' },
    { id: 'sup2', name: '云滇有机茶山庄园', contact: '罗庄主', phone: '18998765432', category: '餐饮原料类', status: '优质服务商' },
    { id: 'sup3', name: '万通精品包材制造集团', contact: '肖厂长', phone: '15566667777', category: '包装辅助材料', status: '合作中' }
  ]);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierContact, setNewSupplierContact] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [newSupplierCategory, setNewSupplierCategory] = useState('');

  const [purchaseOrdersList, setPurchaseOrdersList] = useState<any[]>([
    { id: 'PO20260601', supplierName: '云滇有机茶山庄园', productName: '极品高山乌龙茶胚', qty: 200, amount: 4800, date: '2026-06-01', status: '已发货' },
    { id: 'PO20260602', supplierName: '大同高定面料源头基地', productName: '100%精梳长绒棉布匹', qty: 50, amount: 12500, date: '2026-06-02', status: '等待付款' }
  ]);
  const [purchaseSelectedProduct, setPurchaseSelectedProduct] = useState('');
  const [purchaseSelectedSupplier, setPurchaseSelectedSupplier] = useState('');
  const [purchaseQtyInput, setPurchaseQtyInput] = useState('100');
  const [purchasePriceInput, setPurchasePriceInput] = useState('25');

  const [draftOrdersList, setDraftOrdersList] = useState<any[]>([
    { id: 'DR1001', customerName: '张敏捷 (大客户渠道)', items: '首发重磅卫衣 x10', total: 2990, date: '2026-06-03', status: '待审核' },
    { id: 'DR1002', customerName: '李思聪 (企业定制专区)', items: '定制印花礼盒 x50', total: 8500, date: '2026-06-03', status: '草稿' }
  ]);
  const [refundOrdersList, setRefundOrdersList] = useState<any[]>([]);

  const [couponsList, setCouponsList] = useState<any[]>([
    { code: 'VIP888', discount: 12, desc: 'VIP全店通用直减 ¥12', minSpend: 100, active: true },
    { code: 'MODA666', discount: 20, desc: '公司开业百万红包 ¥20', minSpend: 150, active: true },
    { code: 'WELCOME5', discount: 5, desc: '新人关注即送 ¥5 无门槛', minSpend: 0, active: true }
  ]);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState('10');
  const [newCouponMinSpend, setNewCouponMinSpend] = useState('50');
  const [newCouponDesc, setNewCouponDesc] = useState('');

  const [customerTags, setCustomerTags] = useState<string[]>(['白金会员', '高频消遣', '沉睡客群', '首购新客', '餐饮狂热粉']);
  const [newTagInput, setNewTagInput] = useState('');
  const [selectedProductSkuUid, setSelectedProductSkuUid] = useState<string>('');
  const [skuVariants, setSkuVariants] = useState<any[]>([
    { name: '尺寸: M | 颜色: 玄黑', price: 199, stock: 45 },
    { name: '尺寸: L | 颜色: 玄黑', price: 199, stock: 60 },
    { name: '尺寸: M | 颜色: 霜白', price: 219, stock: 30 },
    { name: '尺寸: L | 颜色: 霜白', price: 219, stock: 55 }
  ]);
  const [newSkuVariantName, setNewSkuVariantName] = useState('');
  const [newSkuVariantPrice, setNewSkuVariantPrice] = useState('');
  const [newSkuVariantStock, setNewSkuVariantStock] = useState('');

  const [b2bCustomers, setB2bCustomers] = useState<any[]>([
    { id: 'b2b-01', company: '望京SOHO联合办公集团', contact: '沈总', creditLimit: 50000, usedCredit: 12000, termDays: 30 },
    { id: 'b2b-02', company: '爱琴海美业连锁机构', contact: '王经理', creditLimit: 20000, usedCredit: 4500, termDays: 15 }
  ]);
  const [newB2bCompany, setNewB2bCompany] = useState('');
  const [newB2bContact, setNewB2bContact] = useState('');
  const [newB2bCreditLimit, setNewB2bCreditLimit] = useState('30000');
  const [newB2bTermDays, setNewB2bTermDays] = useState('30');

  // Interactive Mock Workspace States
  // 1. Store Decoration mock state
  const [storeTheme, setStoreTheme] = useState<'retro' | 'dark' | 'classic'>('retro');
  const [storeHeadline, setStoreHeadline] = useState(getIndustryDefaultHeadline(industry.id));
  const [isGeneratingWebsite, setIsGeneratingWebsite] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  
  // 2. Product selection mock state
  const [productsList, setProductsList] = useState<any[]>([]);
  const [newProductInput, setNewProductInput] = useState('');
  const [newProductPriceInput, setNewProductPriceInput] = useState('');
  const [isDevelopingProduct, setIsDevelopingProduct] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingPrice, setEditingPrice] = useState<number>(0);
  const [editingStock, setEditingStock] = useState<number>(0);
  const [editingImage, setEditingImage] = useState('🍛');

  const [newProductStockInput, setNewProductStockInput] = useState('100');
  const [newProductEmojiInput, setNewProductEmojiInput] = useState(
    industry.id === 'catering' ? '🍛' : industry.id === 'retail' ? '📦' : '👚'
  );

  // 3. Order fulfillment mock state
  const [ordersList, setOrdersList] = useState<any[]>([]);

  // AI Team members custom avatars state
  const [memberAvatars, setMemberAvatars] = useState<Record<string, string>>({
    'Aria': '/src/assets/images/fashion_designer_aria_1780453654705.png',
    'Barton': '/src/assets/images/fashion_buyer_barton_1780453671012.png',
    'Kai': '/src/assets/images/catering_chef_kai_1780453688255.png',
    'Lulu': '/src/assets/images/catering_ops_lulu_1780453703816.png',
  });
  const [isGeneratingAvatarForRole, setIsGeneratingAvatarForRole] = useState<string | null>(null);
  const [avatarProgress, setAvatarProgress] = useState<number>(0);
  const [avatarProgressText, setAvatarProgressText] = useState<string>('');

  // Real Merchant System, Profile, Status and Billing fields
  const [merchantName, setMerchantName] = useState(`${industry.name}极智协同总站`);
  const [merchantSlogan, setMerchantSlogan] = useState('');
  const [editBrandName, setEditBrandName] = useState('');
  const [editSlogan, setEditSlogan] = useState('');
  const [merchantStatus, setMerchantStatus] = useState<'active' | 'suspended' | 'trial_expired'>('active');
  const [merchantBillingTier, setMerchantBillingTier] = useState<'trial' | 'professional' | 'enterprise'>('trial');
  const [merchantTokenBalance, setMerchantTokenBalance] = useState<number>(1500000); // 1.5M tokens
  const [merchantSpendAmount, setMerchantSpendAmount] = useState<number>(24.50); // initial spending RMB
  const [merchantRechargeTotal, setMerchantRechargeTotal] = useState<number>(0); // initial deposit RMB
  const [billingLogs, setBillingLogs] = useState<any[]>([]); // Dynamic invoices from Firestore sub-collection
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Real-time synchronization and Seeding logic
  useEffect(() => {
    // 0. Listen and seed Tenant Profile
    const unsubscribeTenantProfile = apiService.subscribe(`tenants/${tenantId}`, async (data) => {
      setIsLoadingProfile(false);
      if (data) {
        if (data.merchantName) {
          setMerchantName(data.merchantName);
          setEditBrandName(prev => prev || data.merchantName);
        }
        if (data.companySlogan) {
          setMerchantSlogan(data.companySlogan);
          setStoreHeadline(data.companySlogan);
          setEditSlogan(prev => prev || data.companySlogan);
        }
        if (data.status) setMerchantStatus(data.status);
        if (data.billingTier) setMerchantBillingTier(data.billingTier);
        if (data.tokenBalance !== undefined) setMerchantTokenBalance(data.tokenBalance);
        if (data.spendAmount !== undefined) setMerchantSpendAmount(data.spendAmount);
        if (data.depositTotal !== undefined) setMerchantRechargeTotal(data.depositTotal);
        
        if (data.isStoreOnline !== undefined) setIsStoreOnline(data.isStoreOnline);
        if (data.customDomainName !== undefined) setCustomDomainName(data.customDomainName);
        if (data.brandPrimaryColor !== undefined) setBrandPrimaryColor(data.brandPrimaryColor);
        if (data.brandLogoText !== undefined) setBrandLogoText(data.brandLogoText);
        if (data.seoHtmlTitle !== undefined) setSeoHtmlTitle(data.seoHtmlTitle);
        if (data.seoMetaDesc !== undefined) setSeoMetaDesc(data.seoMetaDesc);
        if (data.seoKeywords !== undefined) setSeoKeywords(data.seoKeywords);
      } else {
        // Initialize
        try {
          await apiService.setDoc(`tenants/${tenantId}`, {
            merchantName: `${industry.name}极智协同总站`,
            companySlogan: getIndustryDefaultHeadline(industry.id),
            status: 'active',
            billingTier: 'trial',
            tokenBalance: 1500000,
            spendAmount: 24.50,
            depositTotal: 0,
            createdAt: new Date().toISOString(),
            industryId: industry.id
          });
        } catch (e) {
          console.error("Failed to seed initial tenant profile:", e);
        }
      }
    });

    // 0.5. Listen to Tenant Billing Invoice Logs
    const unsubscribeBillingLogs = apiService.subscribe(`tenants/${tenantId}/billing_logs`, (data) => {
      if (data && Array.isArray(data)) {
        const sorted = [...data].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setBillingLogs(sorted);
      }
    });

    // A. Listen and seed "metrics"
    const unsubscribeMetrics = apiService.subscribe(`tenants/${tenantId}/industries/${industry.id}/metrics/operating`, async (data) => {
      if (data) {
        setSales(data.sales || 0);
        setOrders(data.orders || 0);
      } else {
        try {
          await apiService.setDoc(`tenants/${tenantId}/industries/${industry.id}/metrics/operating`, { sales: 0, orders: 0 });
        } catch (e) {
          console.error("Failed to seed initial metrics:", e);
        }
      }
    });

    // B. Listen and seed "products"
    const unsubscribeProducts = apiService.subscribe(`tenants/${tenantId}/industries/${industry.id}/products`, async (data) => {
      if (data && Array.isArray(data) && data.length > 0) {
        setProductsList(data);
      } else {
        const defaultProducts = industry.id === 'catering' ? [
          { id: 'p1', name: '冰美式', price: 18, stock: 120, image: '🥤', category: '咖啡', desc: '清爽顺滑，经典之选，100%阿拉比卡咖啡豆。', sales: 0, rating: '100%', specs: { sizes: ['中杯 ¥18', '大杯 ¥22', '超大杯 ¥26'], labels: '标准/少冰/去冰' } },
          { id: 'p2', name: '拿铁咖啡', price: 28, stock: 85, image: '☕', category: '咖啡', desc: '经典比例，奶香浓郁，自然甘甜，丝滑口感。', sales: 0, rating: '100%', specs: { sizes: ['中杯 ¥28', '大杯 ¥32', '超大杯 ¥36'], labels: '常温/少冰/去冰' } },
          { id: 'p3', name: '生椰拿铁', price: 28, stock: 140, image: '🥥', category: '咖啡', desc: '椰香浓郁，口感顺滑，香甜醇厚，一口惊艳。', sales: 0, rating: '100%', specs: { sizes: ['中杯 ¥28', '大杯 ¥32', '超大杯 ¥36'], labels: '推荐冰饮' } },
          { id: 'p4', name: '焦糖玛奇朵', price: 32, stock: 60, image: '🍯', category: '咖啡', desc: '经典香草糖浆融合浓缩，淋上焦糖沙司，甜润芬芳。', sales: 0, rating: '100%', specs: { sizes: ['中杯 ¥32', '大杯 ¥36', '超大杯 ¥40'], labels: '多冰/标准' } },
          { id: 'p5', name: '巧克力蛋糕', price: 36, stock: 35, image: '🍫', category: '甜品', desc: '醇厚黑巧克力重度烘焙，口感细腻，入口即化，甜而不腻。', sales: 0, rating: '100%', specs: { sizes: ['标准切片'], labels: '冷藏风味' } },
          { id: 'p6', name: '提拉米苏', price: 26, stock: 40, image: '🍰', category: '甜品', desc: '意式经典重现，马斯卡彭慕斯搭配咖啡酒味，回味悠长。', sales: 0, rating: '100%', specs: { sizes: ['标准切片'], labels: '甜品配咖啡' } },
          { id: 'p7', name: '抹茶拿铁', price: 28, stock: 95, image: '🍵', category: '饮品', desc: '精选高山茶叶研磨抹茶，融入细腻蒸牛奶，清爽微甘。', sales: 0, rating: '100%', specs: { sizes: ['中杯 ¥28', '大杯 ¥32'], labels: '香浓纯厚' } }
        ] : industry.id === 'retail' ? [
          { id: 'p1', name: '日系多功能防尘便携包', price: 49, stock: 110, image: '🎒', category: '配饰', desc: '防泼水防污黑科技面料，十三分区科学收纳空间', sales: 0 },
          { id: 'p2', name: '桌面高密度空气循环扇', price: 99, stock: 75, image: '🌀', category: '数码', desc: '直流变频超静音无刷风机，双螺旋加速空气对流', sales: 0 },
          { id: 'p3', name: '智能重力速感防漏雨伞', price: 35, stock: 240, image: '☔', category: '居家', desc: '一键全自动回弹秒收，杜绝雨水沾湿衣物', sales: 0 }
        ] : [
          { id: 'p1', name: '法式单排扣羊毛经典风衣', price: 680, stock: 120, image: '👗', category: '外套', desc: '100%美利奴高支全羊毛面料，利落意式手工剪裁', sales: 0 },
          { id: 'p2', name: '高腰水洗修身直筒牛仔裤', price: 239, stock: 95, image: '👖', category: '下装', desc: '经典复古水洗丹宁工艺，修饰腿型不紧绷', sales: 0 },
          { id: 'p3', name: '重磅双股纯棉复古刺绣T恤', price: 159, stock: 450, image: '👕', category: '上装', desc: '挺括美式复古圆领，240g精梳棉双股排吸汗透气', sales: 0 }
        ];

        try {
          for (const p of defaultProducts) {
            await apiService.setDoc(`tenants/${tenantId}/industries/${industry.id}/products/${p.id}`, p);
          }
        } catch (e) {
          console.error("Failed to seed initial products:", e);
        }
      }
    });

    // C. Listen and seed "orders"
    const unsubscribeOrders = apiService.subscribe(`tenants/${tenantId}/industries/${industry.id}/orders`, (data) => {
      if (data && Array.isArray(data)) {
        const sorted = [...data].sort((a, b) => b.id.localeCompare(a.id));
        setOrdersList(sorted);
      } else {
        setOrdersList([]);
      }
    });

    // D. Listen and seed "coupons"
    const unsubscribeCoupons = apiService.subscribe(`tenants/${tenantId}/industries/${industry.id}/coupons`, async (data) => {
      if (data && Array.isArray(data) && data.length > 0) {
        setCouponsList(data);
      } else {
        const defaultCoupons = [
          { code: 'VIP888', discount: 12, desc: 'VIP全店通用直减 ¥12', minSpend: 100, active: true },
          { code: 'MODA666', discount: 20, desc: '公司开业百万红包 ¥20', minSpend: 150, active: true },
          { code: 'WELCOME5', discount: 5, desc: '新人关注即送 ¥5 无门槛', minSpend: 0, active: true }
        ];
        try {
          for (const c of defaultCoupons) {
            await apiService.setDoc(`tenants/${tenantId}/industries/${industry.id}/coupons/${c.code}`, c);
          }
        } catch (e) {
          console.error("Error seeding default coupons:", e);
        }
      }
    });

    // E. Listen and seed "categories"
    const unsubscribeCategories = apiService.subscribe(`tenants/${tenantId}/industries/${industry.id}/categories`, async (data) => {
      if (data && Array.isArray(data) && data.length > 0) {
        setCategoriesList(data.map(d => d.id));
      } else {
        const defaultCats = ['爆款推荐', '本季新品', '限时折扣', '招牌单品'];
        try {
          for (const cat of defaultCats) {
            await apiService.setDoc(`tenants/${tenantId}/industries/${industry.id}/categories/${cat}`, { name: cat });
          }
        } catch (e) {
          console.error("Error seeding default categories:", e);
        }
      }
    });

    return () => {
      unsubscribeTenantProfile();
      unsubscribeBillingLogs();
      unsubscribeMetrics();
      unsubscribeProducts();
      unsubscribeOrders();
      unsubscribeCoupons();
      unsubscribeCategories();
    };
  }, [industry.id, tenantId]);

  // Helper to save Merchant profile configs
  const handleSaveMerchantProfile = async (newBrandName: string, newSlogan: string) => {
    try {
      await apiService.setDoc(`tenants/${tenantId}`, {
        merchantName: newBrandName,
        companySlogan: newSlogan
      }, { merge: true });
      
      setLogs(prev => [
        {
          id: `profile-update-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          sender: '系统运营',
          emoji: '⚙️',
          message: `商户核心配置修改入库成功。新商号:「${newBrandName}」，新标语:「${newSlogan}」。`,
          type: 'success'
        },
        ...prev
      ]);
    } catch (e) {
      console.error("Failed to update merchant profile:", e);
    }
  };

  // Helper to perform computing power topup or SaaS package upgrade
  const handlePerformSaaSTopup = async (topupType: 'token_pack' | 'tier_upgrade', amount: number, tokensCredited: number, itemName: string) => {
    try {
      const updatedBalance = merchantTokenBalance + tokensCredited;
      const updatedRechargeTotal = merchantRechargeTotal + amount;
      const nextTier = topupType === 'tier_upgrade' ? 'professional' : merchantBillingTier;
      
      // 1. Write the update to Tenant Master doc
      await apiService.setDoc(`tenants/${tenantId}`, {
        tokenBalance: updatedBalance,
        depositTotal: updatedRechargeTotal,
        billingTier: nextTier,
        status: 'active'
      }, { merge: true });

      // 2. Insert new transaction invoice document
      const invoiceId = `INV-${Date.now().toString().slice(-6)}`;
      await apiService.setDoc(`tenants/${tenantId}/billing_logs/${invoiceId}`, {
        id: invoiceId,
        timestamp: new Date().toISOString(),
        item: itemName,
        amount: amount,
        tokensCredited: tokensCredited,
        status: 'success',
        type: topupType,
        paymentMethod: 'alipay'
      });

      // 3. Print log on workbench
      setLogs(prev => [
        {
          id: `topup-success-${invoiceId}`,
          timestamp: new Date().toLocaleTimeString(),
          sender: '财务系统',
          emoji: '🪙',
          message: `【财务记账】商户成功订购「${itemName}」，实付 ￥${amount}。算力已到账: +${tokensCredited.toLocaleString()} Tokens。`,
          type: 'success'
        },
        ...prev
      ]);
    } catch (e) {
      console.error("Failed to perform simulated SaaS topup in Firestore: ", e);
    }
  };

  // Helper helper to safely update aggregate performance stats
  const updateMetricsInDb = async (addedSales: number, addedOrders: number) => {
    try {
      const metricsPath = `tenants/${tenantId}/industries/${industry.id}/metrics/operating`;
      const snap = await apiService.getDoc(metricsPath);
      if (snap) {
        await apiService.setDoc(metricsPath, {
          sales: Number(((snap.sales || 0) + addedSales).toFixed(2)),
          orders: (snap.orders || 0) + addedOrders
        });
      } else {
        await apiService.setDoc(metricsPath, {
          sales: Number((25488.60 + addedSales).toFixed(2)),
          orders: 132 + addedOrders
        });
      }
    } catch (err) {
      console.error("Failed to update metrics:", err);
    }
  };

  // 6. Food Delivery (Takeout) and Dine-in simulation states
  const [customerOrderType, setCustomerOrderType] = useState<'takeout' | 'dine_in'>('takeout');
  const [customerCart, setCustomerCart] = useState<any[]>([]); // Array of { id, name, price, image, quantity, customSpecs }
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('北京市朝阳区望京西园三区301楼1204室');
  const [deliveryPhone, setDeliveryPhone] = useState('13910245678');
  const [deliveryName, setDeliveryName] = useState('王小二');
  const [dineInTableNumber, setDineInTableNumber] = useState('B08桌');
  
  // Tab-state inside the simulator (home, menu, cart, checkout, success, mine)
  const [simulatorTab, setSimulatorTab] = useState<'home' | 'menu' | 'cart' | 'checkout' | 'success' | 'mine'>('home');
  const [simulatorBalance, setSimulatorBalance] = useState<number>(258.00);
  // Specific customized spec choices state for Product Detail Choices
  const [chosenSpecSize, setChosenSpecSize] = useState<string>('中杯');
  const [chosenSpecSweetness, setChosenSpecSweetness] = useState<string>('标准糖');
  const [chosenSpecIce, setChosenSpecIce] = useState<string>('标准冰');
  
  const [activeOrderCategory, setActiveOrderCategory] = useState<'all' | 'dine_in' | 'takeout'>('all');
  const [incomingOrderAlert, setIncomingOrderAlert] = useState<{
    id: string;
    type: 'dine_in' | 'takeout';
    desc: string;
    price: number;
    location: string;
    customerName: string;
    time?: string;
  } | null>(null);

  // Advanced ordering app details state
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<any | null>(null);
  const [simulatorCategory, setSimulatorCategory] = useState<string>('全部');
  const [simulatorSearchQuery, setSimulatorSearchQuery] = useState<string>('');

  const [autoOrderInterval, setAutoOrderInterval] = useState<boolean>(false); // Sandbox automatic busy hours simulation toggle

  // Sandbox realistic busy-hour dining simulation order stream
  useEffect(() => {
    if (!autoOrderInterval) return;

    const intervalId = setInterval(() => {
      // Create random order based on available products list
      if (productsList.length === 0) return;
      const index = Math.floor(Math.random() * productsList.length);
      const item = productsList[index];
      const quantity = Math.floor(Math.random() * 2) + 1;
      const type = Math.random() > 0.4 ? 'takeout' : 'dine_in';
      const orderId = 'AUTO-' + (type === 'takeout' ? 'WM' : 'TS') + '-' + Math.floor(Math.random() * 899 + 100);
      
      const addresses = ['朝阳区曙光西里甲15号 凤凰城A座', '朝阳区阜通东大街 望京方恒国际C座', '朝阳区酒仙桥路4号 798艺术区B05', '朝阳区建国门外大街1号 国贸商城南区', '朝阳区工体东路 16号院公寓'];
      const tables = ['A03桌', 'B12桌', 'C02桌', 'A15桌', 'B04桌'];
      
      const selectedLocation = type === 'takeout' 
        ? '配送 🛵 ' + addresses[Math.floor(Math.random() * addresses.length)] 
        : '就餐 🍱 ' + tables[Math.floor(Math.random() * tables.length)] + ' 扫码点单';

      const usernames = ['林先生', '孙小姐', '钱老板', '周女士', '小胖同学'];
      const name = type === 'takeout' ? usernames[Math.floor(Math.random() * usernames.length)] : (tables[Math.floor(Math.random() * tables.length)] + '顾客');
      const phone = type === 'takeout' ? '158****' + Math.floor(Math.random() * 8999 + 1000) : '堂食自助';

      const simulatedOrder = {
        id: orderId,
        time: '刚才',
        location: selectedLocation,
        desc: `${item.name} x${quantity}`,
        price: item.price * quantity,
        status: 'pending',
        type: type,
        customerName: name,
        phone: phone,
        tracking: ''
      };

      apiService.setDoc(`tenants/${tenantId}/industries/${industry.id}/orders/${orderId}`, simulatedOrder)
        .catch(err => console.error("Order simulation failed:", err));
      
      updateMetricsInDb(item.price * quantity, 1);

      setLogs(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
          sender: type === 'takeout' ? '仿真外卖网关' : '仿真堂食终端',
          emoji: type === 'takeout' ? '🛵' : '🍱',
          message: `📡 【流式模拟下单】顾客 ${name} 成功下单 ${item.image} ${item.name}*${quantity}，已安全持久化至远程 Firestore。`,
          type: 'success' as any
        }
      ]);

      // Trigger tone notification chime and set state alert so it displays elegantly
      setIncomingOrderAlert(simulatedOrder as any);
      playLiveOrderChime();

    }, 20000); // Trigger order simulation every 20 seconds

    return () => clearInterval(intervalId);
  }, [autoOrderInterval, productsList]);

  const [couponApplied, setCouponApplied] = useState<boolean>(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'wechat' | 'alipay' | 'balance'>('wechat');
  const [orderRemarks, setOrderRemarks] = useState<string>('');
  const [customSpecOption, setCustomSpecOption] = useState<string>(''); // For size, spicy level or sweetness

  // Sound chime synthesizer using HTML5 Web Audio API
  const playLiveOrderChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const playNote = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + start + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      // Play melody (beautiful digital service ring)
      playNote(523.25, 0, 0.4);      // C5
      playNote(659.25, 0.15, 0.4);   // E5
      playNote(783.99, 0.3, 0.4);    // G5
      playNote(1046.5, 0.45, 0.6);   // C6
    } catch (err) {
      console.warn('Web Audio has been blocked:', err);
    }
  };

  // 4. CRM Client Complaint mock state
  const [disputeResolved, setDisputeResolved] = useState<'active' | 'resolving' | 'solved'>('active');
  const [crmLog, setCrmLog] = useState<string>('客户【李阿姨】发起求求助：收到衣服发现码数选大了，套上去不显腰身，正在联系客服退款且在沟通群情绪激动。');

  // 5. Marketing context state
  const [mktBudget, setMktBudget] = useState(150);
  const [mktTopic, setMktTopic] = useState('');
  const [mktOutput, setMktOutput] = useState('');
  const [mktLoading, setMktLoading] = useState(false);

  // Automated Campaign management states
  const [campaignList, setCampaignList] = useState<any[]>([]);
  const [campPlatform, setCampPlatform] = useState<'wechat' | 'xiaohongshu' | 'tiktok'>('xiaohongshu');
  const [campType, setCampType] = useState<'coupon' | 'influencer_matrix' | 'bidding' | 'rebate'>('influencer_matrix');
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch(`/api/campaigns?tenantId=${industry.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.campaigns)) {
          setCampaignList(data.campaigns);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch campaigns:", e);
    }
  };

  useEffect(() => {
    if (activeMenu === 'marketing') {
      fetchCampaigns();
    }
  }, [activeMenu]);

  const bottomLogsRef = useRef<HTMLDivElement>(null);
  const bottomChatsRef = useRef<HTMLDivElement>(null);

  // Sync selected staff member to current menu context automatically
  useEffect(() => {
    let targetRole = 'AI运营经理';
    if (activeMenu === 'store') {
      targetRole = 'AI设计师';
    } else if (activeMenu === 'product') {
      targetRole = 'AI商品经理';
    } else if (activeMenu === 'marketing') {
      targetRole = 'AI营销经理';
    } else {
      targetRole = 'AI运营经理';
    }

    const matched = managers.find(m => m.role === targetRole);
    if (matched) {
      // Create TeamMember item wrapper
      const staffMember: TeamMember = {
        role: matched.role,
        emoji: matched.emoji,
        name: matched.name,
        desc: matched.desc,
        status: 'active',
        tasks: getTasksForRole(matched.role, industry.id)
      };
      setSelectedStaff(staffMember);
    }
  }, [activeMenu]);

  // ==========================================
  // GOOGLE DRIVE INTEGRATION & OPERATIONS
  // ==========================================
  const [selectedBackupId, setSelectedBackupId] = useState<string>('');
  const [wipeProductsInPurge, setWipeProductsInPurge] = useState(false);
  const [driveAccessToken, setDriveAccessToken] = useState<string | null>(null);
  const [driveUserEmail, setDriveUserEmail] = useState<string | null>(null);
  const [driveBackups, setDriveBackups] = useState<any[]>([]);
  const [isSearchingBackups, setIsSearchingBackups] = useState<boolean>(false);
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  const handleConnectDrive = async () => {
    // Simulated Google Drive Connection without Firebase Auth
    setDriveAccessToken('mock_access_token');
    setDriveUserEmail('owner@modaui.com');
    setLogs(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        sender: 'Google 安全盾',
        emoji: '🔑',
        message: `🔓 成功对接 Google Drive 云端存储授权！账号：owner@modaui.com。数据导入/备份导出通道已全面开启。`,
        type: 'success'
      }
    ]);
  };

  const handleDisconnectDrive = () => {
    setDriveAccessToken(null);
    setDriveUserEmail(null);
    setDriveBackups([]);
    setSelectedBackupId('');
    setLogs(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        sender: 'Google 备份引擎',
        emoji: '🔒',
        message: '🔒 已断开 Google Drive 连接，缓存的 Access Token 已安全清空。',
        type: 'info'
      }
    ]);
  };

  const handleFetchBackups = async (token = driveAccessToken) => {
    const activeToken = token || driveAccessToken;
    if (!activeToken) return;
    setIsSearchingBackups(true);
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=name contains 'dining_system_backup' and mimeType='application/json'&spaces=drive&fields=files(id, name, createdTime)&orderBy=createdTime desc`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      const data = await res.json();
      if (data.files) {
        setDriveBackups(data.files);
        if (data.files.length > 0) {
          setSelectedBackupId(data.files[0].id);
        }
      }
    } catch (e: any) {
      console.error('获取 Google Drive 备份失败:', e);
    } finally {
      setIsSearchingBackups(false);
    }
  };

  const handleBackupToDrive = async () => {
    if (!driveAccessToken) {
      alert('请先连接 Google Drive');
      return;
    }
    const confirmed = window.confirm('确认要将当前店铺的在售商品、销售记录、业绩大盘数据导出一份备份文件保存到 Google Drive 吗？');
    if (!confirmed) return;

    setIsBackingUp(true);
    try {
      const metricsData = await apiService.getDoc(`tenants/${tenantId}/industries/${industry.id}/metrics/operating`) || { sales: sales, orders: orders };

      const productsList = await apiService.getDoc(`tenants/${tenantId}/industries/${industry.id}/products`) || [];
      const ordersList = await apiService.getDoc(`tenants/${tenantId}/industries/${industry.id}/orders`) || [];

      const backupObj = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        industry: industry.id,
        companyName: industry.name,
        metrics: metricsData,
        products: productsList,
        orders: ordersList
      };

      const fileName = `dining_system_backup_${industry.id}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      const metadata = {
        name: fileName,
        mimeType: 'application/json'
      };

      const fileContent = JSON.stringify(backupObj, null, 2);
      const boundary = 'foo_bar_backup_boundary';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const close_delim = "\r\n--" + boundary + "--";

      const body =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        fileContent +
        close_delim;

      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${driveAccessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: body
      });

      const fileInfo = await res.json();

      setLogs(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
          sender: 'Google 备份引擎',
          emoji: '💾',
          message: `💾 店铺数据云备份储存成功！文件名称：${fileName} (ID: ${fileInfo.id})`,
          type: 'success'
        }
      ]);

      alert('云端数据备份上传成功！');
      await handleFetchBackups();
    } catch (err: any) {
      console.error('备份失败:', err);
      alert('备份导出失败: ' + err.message);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleProductionPurge = async (wipeProducts: boolean) => {
    const doubleCheck1 = window.confirm('⚠️ 警告：当前操作为上线做准备。您即将彻底清除所有的测试订单和销售额额度，使主盘数据恢复为 0 (测试环境彻底消亡)！确定要执行吗？');
    if (!doubleCheck1) return;

    const doubleCheck2 = window.confirm(`🔥 最终确认：是否同意彻底删档？${wipeProducts ? '包括所有商品条目也将被完全清理空，' : ''}该操作将真实地在 Firestore 数据库中发生，一旦开始无法撤销！`);
    if (!doubleCheck2) return;

    try {
      // Reset metrics
      await apiService.setDoc(`tenants/${tenantId}/industries/${industry.id}/metrics/operating`, { sales: 0, orders: 0 });

      // Clear orders
      const orders = await apiService.getDoc(`tenants/${tenantId}/industries/${industry.id}/orders`) || [];
      for (const ord of orders) {
        await apiService.deleteDoc(`tenants/${tenantId}/industries/${industry.id}/orders/${ord.id}`);
      }

      // Clear products if requested
      const products = await apiService.getDoc(`tenants/${tenantId}/industries/${industry.id}/products`) || [];
      if (wipeProducts) {
        for (const prod of products) {
          await apiService.deleteDoc(`tenants/${tenantId}/industries/${industry.id}/products/${prod.id}`);
        }
      } else {
        // Reset product-level sales tracking back to 0
        for (const prod of products) {
          await apiService.setDoc(`tenants/${tenantId}/industries/${industry.id}/products/${prod.id}`, { sales: 0 }, { merge: true });
        }
      }

      setLogs(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
          sender: '生产微控制',
          emoji: '🚀',
          message: `⚙️ 【生产校准完成】实验室沙箱模拟记录完美擦除！交易总流水、每日销售统计已完美结算归零 (0 元 / 0 订单)。系统现已处于 100% 真实营业就绪状态，无任何非真实交易。`,
          type: 'success'
        }
      ]);

      alert('生产整盘清零成功！系统已处于纯净状态，随时可以迎接真实客户下单。');
    } catch (e: any) {
      console.error('Clearing database error: ', e);
      alert('数据清空失败: ' + e.message);
    }
  };


const handleRestoreFromDrive = async () => {
    if (!driveAccessToken) {
      alert('请先连接 Google Drive');
      return;
    }
    if (!selectedBackupId) {
      alert('未检测到有效的备份文件，请确认列表或重新获取');
      return;
    }
    const confirmed = window.confirm('⚠️ 警告：从云备份恢复数据，将会重置并清空当前店铺所有的订单、销售数据业绩大盘，并用备份覆盖商品属性！请确认是否继续？该操作不可逆！');
    if (!confirmed) return;

    setIsRestoring(true);
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${selectedBackupId}?alt=media`, {
        headers: { Authorization: `Bearer ${driveAccessToken}` }
      });
      if (!res.ok) {
        throw new Error('无法下载对应的备份数据');
      }
      const data = await res.json();

      // Clear existing products
      const products = await apiService.getDoc(`tenants/${tenantId}/industries/${industry.id}/products`) || [];
      for (const prod of products) {
        await apiService.deleteDoc(`tenants/${tenantId}/industries/${industry.id}/products/${prod.id}`);
      }

      // Clear existing orders
      const orders = await apiService.getDoc(`tenants/${tenantId}/industries/${industry.id}/orders`) || [];
      for (const ord of orders) {
        await apiService.deleteDoc(`tenants/${tenantId}/industries/${industry.id}/orders/${ord.id}`);
      }

      // Restore metrics
      const operatingMetrics = data.metrics || { sales: 0, orders: 0 };
      await apiService.setDoc(`tenants/${tenantId}/industries/${industry.id}/metrics/operating`, {
        sales: Number(operatingMetrics.sales || 0),
        orders: Number(operatingMetrics.orders || 0)
      });

      // Restore products
      if (Array.isArray(data.products)) {
        for (const p of data.products) {
          if (p.id) {
            await apiService.setDoc(`tenants/${tenantId}/industries/${industry.id}/products/${p.id}`, p);
          }
        }
      }

      // Restore orders
      if (Array.isArray(data.orders)) {
        for (const o of data.orders) {
          if (o.id) {
            await apiService.setDoc(`tenants/${tenantId}/industries/${industry.id}/orders/${o.id}`, o);
          }
        }
      }

      setLogs(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
          sender: 'Google 备份引擎',
          emoji: '🔄',
          message: `🔄 数据还原完毕！成功恢复 ${data.products?.length || 0} 款商品、${data.orders?.length || 0} 张订单，大盘总营业额变更为：¥${(operatingMetrics.sales || 0).toLocaleString()} 元`,
          type: 'success'
        }
      ]);

      alert('云端备份还原入库成功！界面所有属性已加载刷新。');
    } catch (err: any) {
      console.error('备份恢复失败:', err);
      alert('备份导入还原失败: ' + err.message);
    } finally {
      setIsRestoring(false);
    }
  };


  const parseActionDetails = (rawResponseText: string) => {
    const actionRegex = /\[ACTION:\s*([^\]\s|]+)\s*(?:\|\s*([^\]|]+)\s*)?(?:\|\s*([^\]|]+)\s*)?\]/;
    const match = rawResponseText.match(actionRegex);
    
    if (match) {
      const actionType = match[1].trim();
      const arg1 = match[2]?.trim() || '';
      const arg2 = match[3]?.trim() || '';
      
      let title = '';
      if (actionType === 'SET_HEADLINE') {
        title = '主页面标语热更新';
      } else if (actionType === 'SET_THEME') {
        title = '一键切换店面视觉主题';
      } else if (actionType === 'ADD_PRODUCT') {
        title = '精细测款并自动上架产品';
      } else if (actionType === 'SHIP_ORDERS') {
        title = '顺丰速运极速出库发货';
      } else if (actionType === 'RESOLVE_COMPLAINT') {
        title = 'AI 调解中心介入纠纷调停';
      } else if (actionType === 'SET_BUDGET') {
        title = '每日直通车营销投放推广限额微调';
      } else {
        title = `AI 物理动作指令 [${actionType}]`;
      }
      
      return {
        type: actionType,
        title,
        success: true,
        param1: arg1,
        param2: arg2
      };
    }
    return undefined;
  };

  // Sidekick action parser & executor helper
  const executeAction = (rawResponseText: string): string => {
    let cleanMsg = rawResponseText;
    const actionRegex = /\[ACTION:\s*([^\]\s|]+)\s*(?:\|\s*([^\]|]+)\s*)?(?:\|\s*([^\]|]+)\s*)?\]/;
    const match = rawResponseText.match(actionRegex);
    
    if (match) {
      const actionType = match[1].trim();
      const arg1 = match[2]?.trim() || '';
      const arg2 = match[3]?.trim() || '';
      
      // Remove the action block from display
      cleanMsg = rawResponseText.replace(actionRegex, "").trim();

      // 1. SET_HEADLINE: Change slogan
      if (actionType === 'SET_HEADLINE') {
        setStoreHeadline(arg1);
        setLogs((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
            sender: selectedStaff.role,
            emoji: selectedStaff.emoji,
            message: `⚙️ 【Sidekick 自动部署】网店主页标语已由 AI 实时发布热更新为：“${arg1}”！`,
            type: 'success'
          }
        ]);
      }
      
      // 2. SET_THEME: Change CSS theme
      else if (actionType === 'SET_THEME') {
        const targetTheme = arg1.toLowerCase();
        let matchedTheme: 'retro' | 'dark' | 'classic' = 'retro';
        if (targetTheme.includes('dark') || targetTheme.includes('暗') || targetTheme.includes('黑')) {
          matchedTheme = 'dark';
        } else if (targetTheme.includes('classic') || targetTheme.includes('极简') || targetTheme.includes('观') || targetTheme.includes('雅') || targetTheme.includes('经')) {
          matchedTheme = 'classic';
        } else {
          matchedTheme = 'retro';
        }
        setStoreTheme(matchedTheme);
        setLogs((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
            sender: selectedStaff.role,
            emoji: selectedStaff.emoji,
            message: `✨ 【Sidekick 自动部署】首页视觉风格已更换装配为：【${matchedTheme === 'dark' ? '潮冷暗黑' : matchedTheme === 'classic' ? '现代极简' : '奶油法式'}】！`,
            type: 'success'
          }
        ]);
      }

      // 3. ADD_PRODUCT: Add a new product
      else if (actionType === 'ADD_PRODUCT') {
        const prodName = arg1;
        const prodPrice = parseFloat(arg2) || Math.floor(Math.random() * 150 + 50);
        const em = industry.id === 'catering' ? '🍛' : industry.id === 'retail' ? '📦' : '👚';
        const newItemId = 'p' + (productsList.length + Math.floor(Math.random() * 100) + 10);
        const newItem = {
          id: newItemId,
          name: prodName,
          price: prodPrice,
          stock: Math.floor(Math.random() * 200 + 100),
          image: em,
          category: industry.id === 'catering' ? '咖啡' : industry.id === 'retail' ? '居家' : '外套',
          desc: 'AI 研发打新商品',
          sales: 0,
          rating: '100%',
          specs: { sizes: ['标准'], labels: 'AI精算' }
        };

        apiService.setDoc(`tenants/${tenantId}/industries/${industry.id}/products/${newItemId}`, newItem)
          .then(() => {
            setLogs((prevLogs) => [
              ...prevLogs,
              {
                id: Math.random().toString(),
                timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
                sender: 'AI商品经理',
                emoji: '👚',
                message: `✔ 【Sidekick 自动建档】新品【${newItem.name}】精算打版完毕，定价 ¥${prodPrice}，初始配给库存 ${newItem.stock}件，已成功上架并写入数据库！`,
                type: 'success'
              }
            ]);
          })
          .catch(err => console.error("Add product failed:", err));
      }

      // 4. SHIP_ORDERS: Ship all pending orders
      else if (actionType === 'SHIP_ORDERS') {
        let checkPendingCount = 0;
        const processOrders = async () => {
          for (const o of ordersList) {
            if (o.status === 'pending') {
              checkPendingCount++;
              await apiService.setDoc(`tenants/${tenantId}/industries/${industry.id}/orders/${o.id}`, {
                status: 'dispatched',
                tracking: 'SF' + Math.floor(Math.random() * 8999999 + 1000000000)
              }, { merge: true });
            }
          }

          if (checkPendingCount > 0) {
            setLogs((prevLogs) => [
              ...prevLogs,
              {
                id: Math.random().toString(),
                timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
                sender: 'AI运营经理',
                emoji: '📈',
                message: `🚚 【Sidekick 自动跟单】一键托管发货，已在数据库批量更新发货并在顺丰网关生成 ${checkPendingCount} 个单号！`,
                type: 'success'
              }
            ]);
            updateMetricsInDb(325 * checkPendingCount, checkPendingCount);
          }
        };
        processOrders().catch(err => console.error("Ship orders failed:", err));
      }

      // 5. RESOLVE_COMPLAINT: Mitigate customer complaints
      else if (actionType === 'RESOLVE_COMPLAINT') {
        setDisputeResolved('solved');
        setCrmLog('👴 李阿姨的纠纷已被自动解决。\n【调停反馈】：“哎哟，小姑娘服务真是好得没话说，态度真诚还送了无门槛代金券，退换货也免费，我就不申请退款了，穿穿看，给你们评个大大的五星好评！”');
        setLogs((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
            sender: 'AI 客服调停',
            emoji: '💬',
            message: '🎉 【Sidekick 客情调解】秒级介入客户补偿调和，李阿姨投诉已化解，成功撤销客怨！',
            type: 'success'
          }
        ]);
      }

      // 6. SET_BUDGET: Save daily marketing limits
      else if (actionType === 'SET_BUDGET') {
        const parsedB = parseInt(arg1) || 150;
        const finalB = Math.max(50, Math.min(1000, parsedB));
        setMktBudget(finalB);
        setLogs((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
            sender: 'AI营销经理',
            emoji: '📣',
            message: `📈 【Sidekick 预算微控】直通车投发每日预算调整并锁定为：¥${finalB} 元！`,
            type: 'success'
          }
        ]);
      }
    }

    return cleanMsg;
  };

  const queryBackendForText = async (searchKeyword: string) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: searchKeyword,
          employeeRole: selectedStaff.role,
          employeeName: selectedStaff.name,
          employeeDesc: selectedStaff.desc,
          industryName: industry.name,
          industryTagline: industry.tagline,
          strategyName: strategy.name,
          strategyDesc: strategy.desc,
          apiProvider,
          ollamaEndpoint,
          ollamaModel
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      
      if (data && data.fallbackToSimulated) {
        throw new Error(`Ollama sandbox simulation bypass trigger: ${data.error || "unreachable"}`);
      }

      if (data && data.success && data.reply) {
        const parsedAct = parseActionDetails(data.reply.trim());
        const executedReply = executeAction(data.reply.trim());
        const aiReply: ChatMessage = {
          id: Math.random().toString(),
          sender: selectedStaff.name,
          role: selectedStaff.role,
          emoji: selectedStaff.emoji,
          message: executedReply,
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
          isUser: false,
          actionDetected: parsedAct
        };

        setChats((prev) => ({
          ...prev,
          [selectedStaff.role]: [...(prev[selectedStaff.role] || []), aiReply]
        }));

        setLogs((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
            sender: selectedStaff.role,
            emoji: selectedStaff.emoji,
            message: `【${selectedStaff.name}】实时接收指令任务并执行部署完毕。 (模型引擎：${data.source || 'Gemini Core'})`,
            type: 'success'
          }
        ]);
        setIsTyping(false);
        return;
      }
      throw new Error("模型故障或回复为空");
    } catch (err: any) {
      // Fallback simulation fallback
      console.warn('Backend chat failed, using premium local parameters:', err.message);
      
      let fallbackReply = '';
      const lowerText = searchKeyword.toLowerCase();

      if (lowerText.includes('利润') || lowerText.includes('钱') || lowerText.includes('账') || lowerText.includes('财务') || lowerText.includes('周报') || lowerText.includes('报告')) {
        fallbackReply = `收到指示！当前采取【${strategy.name}】。今日累计取得销售利润约 ¥${(sales * 0.38).toFixed(2)}，渠道无异常退款拦截，已完成自动流水核销与资产合并。`;
      } else if (lowerText.includes('标语') || lowerText.includes('看板') || lowerText.includes('招牌') || lowerText.includes('改成') || lowerText.includes('主题') || lowerText.includes('装修') || lowerText.includes('风格')) {
        const hMatch = searchKeyword.match(/(?:标语改成|看板改成|改成|设为标语|改为标语|标语定为)[：:]?\s*(.+)/);
        const targetHead = hMatch ? hMatch[1].trim().replace(/["'「」]/g, "") : "👗 2026春夏高定·亚麻系列新品首发";
        
        let actionTag = `[ACTION: SET_HEADLINE | ${targetHead}]`;
        let themeDesc = "";
        if (lowerText.includes('暗黑') || lowerText.includes('黑色') || lowerText.includes('酷')) {
          actionTag = `[ACTION: SET_THEME | dark]`;
          themeDesc = "已同步将网店格调更换为【潮冷暗黑】主题风格。";
        } else if (lowerText.includes('极简') || lowerText.includes('现代') || lowerText.includes('高级')) {
          actionTag = `[ACTION: SET_THEME | classic]`;
          themeDesc = "已同步将网店格调更换为【现代极简】主题风格。";
        } else if (lowerText.includes('法式') || lowerText.includes('复古') || lowerText.includes('奶油')) {
          actionTag = `[ACTION: SET_THEME | retro]`;
          themeDesc = "已同步将网店格调更换为【奶油法式】主题风格。";
        }

        fallbackReply = `明白，所有者！网店装修与品牌橱窗发布指令已代完成。改动信息已经直接推流至全网CDN节点生效中。` + (themeDesc ? ` ${themeDesc}` : "") + ` \n\n${actionTag}`;
      } else if (lowerText.includes('产品') || lowerText.includes('商品') || lowerText.includes('上架') || lowerText.includes('添加') || lowerText.includes('新增')) {
        const pMatch = searchKeyword.match(/(?:上架|添加|新增|打板上架)(?:一个|款)?(?:新品|新产品|商品)?(?:服装|美食|货品)?[:：]?\s*([^，,。¥\d]+)(?:价格|售价|卖)?(?:为)?(\d+)?/);
        const prodName = pMatch ? pMatch[1].trim() : "莫代尔柔肤修身打底衫";
        const prodPrice = pMatch && pMatch[2] ? pMatch[2].trim() : "129";
        
        fallbackReply = `收到！我已核算物料及备货物流，新品打样成功！SPU属性与录单已经100%匹配上线，主站商品目录即时生效。 \n\n[ACTION: ADD_PRODUCT | ${prodName} | ${prodPrice}]`;
      } else if (lowerText.includes('发货') || lowerText.includes('打包') || lowerText.includes('跟单') || lowerText.includes('顺丰') || lowerText.includes('快递')) {
        fallbackReply = `收到托管指令！正联系顺丰极速接单配货，已对当前所有待履约订单执行一键打包发配程序，物流单号已写进运单。 \n\n[ACTION: SHIP_ORDERS]`;
      } else if (lowerText.includes('李阿姨') || lowerText.includes('投诉') || lowerText.includes('客怨') || lowerText.includes('解决差评') || lowerText.includes('纠纷')) {
        fallbackReply = `高优先级纠纷已接管！我们极速沟通李阿姨并在系统内主动赔付5元无门槛券。买家对极高时效跟进深表感激，已改口好评，退款诉求撤销。 \n\n[ACTION: RESOLVE_COMPLAINT]`;
      } else if (lowerText.includes('预算') || lowerText.includes('广告') || lowerText.includes('每日预算') || lowerText.includes('直通车') || lowerText.includes('营销金')) {
        const bMatch = searchKeyword.match(/(?:预算|直通车)(?:设为|改成|调整为|定为|增加至|增加到|减少到)?[:：]?\s*(\d+)/);
        const budgetVal = bMatch ? bMatch[1].trim() : "350";
        
        fallbackReply = `明白，所有者！商业直通车与多矩阵小红书多点开花每日推广投放支出限额已修改。让我们全权护航。 \n\n[ACTION: SET_BUDGET | ${budgetVal}]`;
      } else if (lowerText.includes('推广') || lowerText.includes('营销') || lowerText.includes('小红书') || lowerText.includes('文案') || lowerText.includes('种草')) {
        fallbackReply = `正在为您代拟营销文案。我已经将穿搭潮流高契合种草帖子草稿放到了“营销页面”，直通车引流也保持高速拉新姿态。`;
      } else {
        fallbackReply = `明白您的指示。关于“${searchKeyword}”，我已经作为最高优先级载入了当前的 AI 常态流水之中。我会督促各位成员形成坚实决策闭环，5 分钟内执行完毕。`;
      }

      setTimeout(() => {
        const parsedAct = parseActionDetails(fallbackReply.trim());
        const executedReply = executeAction(fallbackReply);
        const aiReply: ChatMessage = {
          id: Math.random().toString(),
          sender: selectedStaff.name,
          role: selectedStaff.role,
          emoji: selectedStaff.emoji,
          message: executedReply,
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
          isUser: false,
          actionDetected: parsedAct
        };

        setChats((prev) => ({
          ...prev,
          [selectedStaff.role]: [...(prev[selectedStaff.role] || []), aiReply]
        }));

        setLogs((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
            sender: selectedStaff.role,
            emoji: selectedStaff.emoji,
            message: `【${selectedStaff.name}】完成了对您“${searchKeyword}”指令的即时对齐和处理。 (高仿真精算沙盒 - 引擎：${apiProvider === 'ollama' ? 'Ollama/' + ollamaModel : apiProvider === 'gemini' ? 'Gemini 1.5 Flash' : apiProvider})`,
            type: 'success'
          }
        ]);
        setIsTyping(false);
      }, 1200);
    }
  };

  // Action helper to update specific fields of a message in real-time
  const updateChatMessageCustomField = (msgId: string, updater: (msg: any) => any) => {
    setChats((prev) => {
      const currentList = prev[selectedStaff.role] || [];
      const updatedList = currentList.map((m) => (m.id === msgId ? updater(m) : m));
      return {
        ...prev,
        [selectedStaff.role]: updatedList,
      };
    });
  };

  // Simulated Speech-to-Text high fidelity listening driver
  const handleVoiceSimulationStart = () => {
    if (voiceState !== 'idle') return;
    
    setVoiceState('listening');
    setMicActiveLevel(10);
    
    let ticks = 0;
    const waveOscillator = setInterval(() => {
      // Create fancy shifting waveform array
      setVoiceWaveformArr(() => 
        new Array(16).fill(0).map(() => Math.floor(Math.random() * 14) + 2)
      );
      setMicActiveLevel(Math.floor(Math.random() * 30) + 70);
      ticks++;
      
      if (ticks >= 15) { // 3 seconds
        clearInterval(waveOscillator);
        setVoiceState('transcribing');
        
        setTimeout(() => {
          let transcribedStr = "请拉取今天的各渠道销量利润以及流水一览，顺便写个财报汇报。";
          const r = selectedStaff.role;
          if (r === 'AI设计师' || r === 'AI开店经理') {
            transcribedStr = "请帮我将网店标语改成：🧺 梦回巴黎·奶油法式经典双排叠扣百褶防风风衣今日首发上线！";
          } else if (r === 'AI商品经理') {
            transcribedStr = "帮我打板上架一款价格为 189 元的 莫代尔温润高密舒柔卫衣居家服，极速建立 SPU 档案！";
          } else if (r === 'AI运营经理') {
            transcribedStr = "把我们系统里处于待履约的全部订单一键打包，同步让顺丰速运极速扫描出库。";
          } else if (r === 'AI营销经理') {
            transcribedStr = "立刻帮我们直通车推广在全网 CDN 的单日预算调整为限额 500 元，做好精细控投。";
          }
          
          setChatMessage(transcribedStr);
          setVoiceState('idle');
          
          setLogs((prev) => [
            ...prev,
            {
              id: Math.random().toString(),
              timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
              sender: '创始人语音听写',
              emoji: '🎙️',
              message: `【AI语音听写成功】听写识别语素为：“${transcribedStr}”，已载入对话框。`,
              type: 'info'
            }
          ]);
        }, 800);
      }
    }, 200);
  };

  // 1. Trigger AI Creative Poster inside Chat Stream
  const triggerAICreativePoster = () => {
    const isRetail = industry.id === 'retail';
    const isCatering = industry.id === 'catering';
    const defaultTitle = isCatering ? "拾光老街 匠心传承霸王餐" : isRetail ? "摩登法式 100%全呼吸高定风衣" : "AI 臻选·限定爆款正式发售";
    const defaultSubtitle = isCatering ? "正宗川西口味限时5折双人套餐" : isRetail ? "感知天然麻料，定义法式柔焦新美学" : "全链路工艺打版，限量爆品实时特惠中";
    
    const userMsgId = Math.random().toString();
    const posterMsgId = Math.random().toString();
    
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: '创始人(你)',
      role: 'Owner',
      emoji: '👤',
      message: '🎨 帮我针对当前的网店风格和战略，全自动设计排版一款引流视觉海报/招牌展示面板。',
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      isUser: true
    };

    const workerMsg: ChatMessage = {
      id: posterMsgId,
      sender: selectedStaff.name,
      role: selectedStaff.role,
      emoji: selectedStaff.emoji,
      message: `收到！我已经深度解析您当前的【${strategy.name}】战略和 ${storeTheme === 'dark' ? '潮冷暗黑' : storeTheme === 'classic' ? '现代极简' : '奶油法式'} 首页色调，为您自动进行创意海报渲染。您可在下方面板中实时预览和微调，并一键发布热更新到店铺首页招牌中！`,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      isUser: false,
      generatedPoster: {
        title: defaultTitle,
        subtitle: defaultSubtitle,
        theme: storeTheme,
        image: isCatering ? '🍛' : isRetail ? '👚' : '📦',
        isDeployed: false
      }
    };

    setChats((prev) => ({
      ...prev,
      [selectedStaff.role]: [...(prev[selectedStaff.role] || []), userMsg, workerMsg]
    }));

    setLogs((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        sender: selectedStaff.role,
        emoji: '🎨',
        message: `【AI创意排版】设计海报画幅渲染完成，已载入创始人会商工作流。`,
        type: 'success'
      }
    ]);
  };

  // 2. Trigger AI Xiaohongshu/Douyin Copywriter inside Chat Stream
  const triggerAICopywriter = () => {
    const isRetail = industry.id === 'retail';
    const isCatering = industry.id === 'catering';
    
    const baseTitle = isCatering ? "🔥 怎么会有这么绝的小店！老街双人套餐好吃到哭！" : isRetail ? "🧺 救命！穿上这件法式风衣出门被疯狂询问要链接！" : "✨ 太酷了！创始人一秒把店铺装修成高端潮流风！";
    const baseBody = isCatering 
      ? "姐妹们！今天终于薅到了这家宝藏老字号的羊毛！一进门就被它复古的环境震撼到，双人霸王餐简直是性价比之王！\n\n那碗手作经典意面爽滑弹牙，裹满了浓郁的秘制酱汁，一口下去幸福感拉满！配料超有诚意，用料极其讲究！\n\n重点是全线5折！精选老街风味，真的太懂年轻人的胃了。别再吃外卖了，快和闺蜜来打卡吧！"
      : "懂行的人都在穿这件！100%呼吸感亚麻质地的法式风行款，真的是早春降降温穿搭神仙单品！\n\n它的天然亚麻面料轻盈透气，有一种慵懒松弛的高级感，挺括的版型不论是上班通勤还是出门喝杯咖啡都绝美！\n\n温柔耐看的卡其杏色，高级而克制，真的是完美演绎法式优雅的穿衣美学。穿上去优雅显瘦，回头率100%！";

    const userMsgId = Math.random().toString();
    const copyMsgId = Math.random().toString();

    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: '创始人(你)',
      role: 'Owner',
      emoji: '👤',
      message: '✍️ 帮我写一篇高点击、强种草属性的热门小红书营销传播文案，要符合咱们当下的品牌主张。',
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      isUser: true
    };

    const workerMsg: ChatMessage = {
      id: copyMsgId,
      sender: selectedStaff.name,
      role: selectedStaff.role,
      emoji: selectedStaff.emoji,
      message: `已为您定制撰写高互动爆文。结合了点击率预估推荐特征并附带了多轮语气调换，您可以拖拽滑块微调文案口舌，一键复制使用：`,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      isUser: false,
      generatedCopywriting: {
        title: baseTitle,
        body: baseBody,
        tags: isCatering ? ['老街风味', '周末吃什么', '霸王餐'] : ['每日穿搭', '慵懒法式', '早春高级感'],
        rating: 94,
        emotionalScore: 85,
        tone: 'classic'
      }
    };

    setChats((prev) => ({
      ...prev,
      [selectedStaff.role]: [...(prev[selectedStaff.role] || []), userMsg, workerMsg]
    }));

    setLogs((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        sender: selectedStaff.role,
        emoji: '📖',
        message: `【AI爆文写作】自研写手模型根据创始战略，极速编制高流量笔记草案。`,
        type: 'success'
      }
    ]);
  };

  // 3. Trigger AI Merchandiser Product Model Prediction in Chat Stream
  const triggerAIPrediction = () => {
    const isRetail = industry.id === 'retail';
    const isCatering = industry.id === 'catering';

    const pName = isCatering ? "手工黑松露菌菇宽意面 (AI预测款)" : isRetail ? "手作罗纹莫代尔高弹针织内搭" : "AI自研智能配给畅销尖货";
    const cPrice = isCatering ? 12.50 : 28.00;
    const normMarkup = 240; // 240%

    const userMsgId = Math.random().toString();
    const predMsgId = Math.random().toString();

    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: '创始人(你)',
      role: 'Owner',
      emoji: '👤',
      message: '🔮 帮我结合供应链库存，测算一款当前高利润率、易打爆的趋势测款新品。',
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      isUser: true
    };

    const workerMsg: ChatMessage = {
      id: predMsgId,
      sender: selectedStaff.name,
      role: selectedStaff.role,
      emoji: selectedStaff.emoji,
      message: `我深度检索了上游供应链库存配额，结合【${strategy.name}】的溢价期望值，为您智能打底以下新品参数。推演毛利倍数即可自动得出首月预估投产比，批准即可直接录入 ERP 货架！`,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      isUser: false,
      generatedPrediction: {
        name: pName,
        price: Math.floor(cPrice * (normMarkup / 100)),
        markup: normMarkup,
        cost: cPrice,
        predictedROI: 78,
        isUploaded: false
      }
    };

    setChats((prev) => ({
      ...prev,
      [selectedStaff.role]: [...(prev[selectedStaff.role] || []), userMsg, workerMsg]
    }));

    setLogs((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        sender: selectedStaff.role,
        emoji: '🔮',
        message: `【AI趋势测算】产品模型微控搭建完毕，正加载于会商面板待创始批准。`,
        type: 'success'
      }
    ]);
  };

  // Action: Trigger Image Scan & Analysis
  const handleLocalImageScan = (imageUrl: string, filename: string) => {
    setIsAnalyzingImage(true);
    
    // Push the user message showing a picture placeholder
    const userMsgId = Math.random().toString();
    const scanMsgId = Math.random().toString();
    
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: '创始人(你)',
      role: 'Owner',
      emoji: '👤',
      message: `📷 [已上载商品图纸素材 - ${filename}] 帮我运行视觉智能感知，提取配色与SPU卖点信息！`,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      isUser: true,
      analyzedImage: {
        name: filename,
        detectedSPUs: [],
        colorPalette: [],
        suggestedPrice: 0,
        textIdea: '',
        imageBase64: imageUrl
      }
    };

    setChats((prev) => ({
      ...prev,
      [selectedStaff.role]: [...(prev[selectedStaff.role] || []), userMsg]
    }));

    // Trigger computer vision simulated logic with actual uploaded base64 reference!
    setTimeout(() => {
      const isRetail = industry.id === 'retail';
      const isCatering = industry.id === 'catering';
      
      const suggestedPrice = isCatering ? 58 : 169;
      const detectedSPUs = isCatering 
        ? ['经典汤料配方 (主厨特级纯手工)', '色泽红亮 (严选大明灯笼椒与汉源花椒)', '精美保鲜塑封 (外带不洒不漏)']
        : ['100% 新西兰原生精梳美利奴羊毛', '高级卡其暖杏 (天然活性染料)', '无死褶隐形骨接针理工艺'];
      const colorPalette = isCatering 
        ? ['#DC2626 (极耀辣椒红)', '#F59E0B (金橘橙)', '#B45309 (琥珀酱黄)']
        : ['#D4B296 (法式温润卡其)', '#E5E5E5 (磨砂哑灰)', '#1E293B (藏青矿石绿)'];
      const textIdea = isCatering 
        ? '【全景视觉SPU要义】汤红油亮，质地浓糯，在自然采光摄影中散发浓郁麦香胃口感。建议在主图追加大标题文字突出非遗古法手作！'
        : '【全景视觉SPU要义】原生美利奴纱线的丰盈磨合质感完美契合了【奶油法式】店铺风格，质地细挺，绝对是高点击爆款的标配！';

      const workerMsg: ChatMessage = {
        id: scanMsgId,
        sender: selectedStaff.name,
        role: selectedStaff.role,
        emoji: selectedStaff.emoji,
        message: `【AI Computer Vision 计算机视觉引擎】针对创始人上传的实拍图质 [${filename}] 感知解析成功！已提取出其微观质感卖点要素与配色组态。建议测款制定基础售价为 ¥${suggestedPrice} 元：`,
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        isUser: false,
        analyzedImage: {
          name: filename,
          detectedSPUs,
          colorPalette,
          suggestedPrice,
          textIdea,
          imageBase64: imageUrl
        }
      };

      setChats((prev) => ({
        ...prev,
        [selectedStaff.role]: [...(prev[selectedStaff.role] || []), workerMsg]
      }));

      setLogs((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
          sender: selectedStaff.role,
          emoji: '🔍',
          message: `【AI多模态扫描成功】检测到上载素材 [${filename}]，提取色彩及SPU细节就绪。`,
          type: 'success'
        }
      ]);
      setIsAnalyzingImage(false);
      setAttachedImage(null);
      setAttachedImageName(null);
    }, 2200);
  };

  const handleShortcutClick = (promptText: string) => {
    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: '创始人(你)',
      role: 'Owner',
      emoji: '👤',
      message: promptText,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      isUser: true
    };

    setChats((prev) => ({
      ...prev,
      [selectedStaff.role]: [...(prev[selectedStaff.role] || []), userMsg]
    }));

    setIsTyping(true);
    queryBackendForText(promptText);
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: '创始人(你)',
      role: 'Owner',
      emoji: '👤',
      message: chatMessage,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      isUser: true
    };

    setChats((prev) => ({
      ...prev,
      [selectedStaff.role]: [...(prev[selectedStaff.role] || []), userMsg]
    }));

    const searchKeyword = chatMessage;
    setChatMessage('');
    setIsTyping(true);

    queryBackendForText(searchKeyword);
  };

  const getPromptShortcuts = (role: string) => {
    if (role === 'AI设计师' || role === 'AI开店经理') {
      return [
        { label: '标语: 奶油法式', prompt: '帮我把网店的标题改成 🧺 舒适经典·极致软糯法式针织新品今日上新！' },
        { label: '风格: 潮冷暗黑', prompt: '一键将我的店铺整体页面调换为酷潮冷色暗黑主题风格' },
        { label: '标语: 极简通勤', prompt: '帮我改写标题标语并且调换为意式极简高定通勤系列发布' }
      ];
    } else if (role === 'AI商品经理') {
      return [
        { label: '上架：柔糯打底衫 ¥139', prompt: '打板上架一个高性价比新品服装，“柔糯高弹莫代尔通勤打底衫”，定价139元' },
        { label: '上架：金牌手作意面 ¥48', prompt: '上架畅销爆品“意式白松露手工意面”，定价48元' }
      ];
    } else if (role === 'AI运营经理') {
      return [
        { label: '承运：顺丰一键批量发货', prompt: '将目前处于待处理的待发货订单一键安排顺丰速运极速出库' },
        { label: '客情：调和解危李阿姨投诉', prompt: '极速介入：帮忙化解买家李阿姨的衣服尺码中差评误会' }
      ];
    } else if (role === 'AI营销经理') {
      return [
        { label: '预算: 提至 ¥600/天', prompt: '提升直通车推广广告投放每日资金限额至600元' },
        { label: '限额: 降至 ¥80/天', prompt: '降低营销每日预算直通车限额到精打细算水平80元' }
      ];
    }
    return [
      { label: '核账: 查询今日累计利润营收', prompt: '拉取今天的各渠道销量利润以及流水一览，顺便写个财报汇报' }
    ];
  };

  const getTasksForRole = (role: string, industryId: string): string[] => {
    if (role === 'AI设计师' || role === 'AI开店经理') {
      return ['布置店铺高级装潢视觉版块', '一句话实时微调首页促销标语', '设计生成视觉海报与穿搭详情页'];
    } else if (role === 'AI商品经理') {
      return industryId === 'catering' ? 
        ['更新今日堂食特惠新品', '开发健康营养低卡套餐', '核验食材出厂进价及毛利策略'] :
        ['精选1688创意零售居家新品', '自动同步匹配一件代发供应商API', '对比全网活动类似竞品定价'];
    } else if (role === 'AI运营经理') {
      return ['检测渠道库存周转水位红线', '一键全流程跟单发货顺丰揽揽件', '全网稽核资金账期安全对账'];
    } else {
      return ['更新小红书精品博主寄样穿搭文案', '编排抖音极客短视频起盘文大纲', '精算广告ROI测品推广让利出价'];
    }
  };

  // Quick Macro Directives for main workbench
  const triggerQuickMacro = (type: 'ad_boost' | 'inventory_sync' | 'audit_reconcile' | 'customer_crm') => {
    let message = '';
    let emoji = '⚡';
    let sender = '操作面板';

    if (type === 'ad_boost') {
      message = '📣 所有者触发【投放直通车推广扩充】，自动划拨 ¥100 开路。已在 Firestore 实时累加销售额 ¥480，订单量 +2，智能推广正极速获客。';
      emoji = '📣';
      sender = '智能推广控制台';
      updateMetricsInDb(480, 2);
    } else if (type === 'inventory_sync') {
      message = '📦 所有者启动【柔性快反补货系统】，批处理写入 Firestore，在线更新商品在轨库存（全员 +20~60 件）！';
      emoji = '📦';
      sender = '柔性供应链控管';
      
      const processStock = async () => {
        for (const p of productsList) {
          const added = Math.floor(Math.random() * 40 + 20);
          await apiService.setDoc(`tenants/${tenantId}/industries/${industry.id}/products/${p.id}`, { stock: p.stock + added }, { merge: true });
        }
      };
      processStock().catch(err => console.error("Stock update failed:", err));
    } else if (type === 'audit_reconcile') {
      const p = (sales * 0.385).toFixed(2);
      message = `💰 启动【全局资产全合并稽查】，自动对标 Firestore 实收数据。本期预估税后净利约 ¥${p}元，账面极度坚实。`;
      emoji = '💰';
      sender = '全域财务审计中心';
    } else {
      message = '💬 所有者启用【智能买家安抚与退款纠纷极速拦截】，客服中心极速接入。化解一宗历史差评疑点并挽留客户。';
      emoji = '💬';
      sender = 'AI 客服调停中枢';
      setDisputeResolved('solved');
      setCrmLog('👴 李阿姨的纠纷已被自动解决。\n【调停反馈】：“哎哟，小姑娘服务真是好得没话说，态度真诚还送了无门槛代金券，退换货也免费，我就不申请退款了，穿穿看，给你们评个大大的五星好评！”');
    }

    setLogs((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        sender,
        emoji,
        message,
        type: 'success'
      }
    ]);
  };

  // Fetch / Sync Ollama list
  const syncOllamaModelsList = async () => {
    setIsSyncingOllama(true);
    setOllamaSyncError(null);
    setTestLog(`▶ [Ollama 注册表] 正在同步本地 ${ollamaEndpoint}/api/tags 模型清单...`);
    
    try {
      const res = await fetch(`${ollamaEndpoint}/api/tags`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data && Array.isArray(data.models)) {
        const names = data.models.map((m: any) => m.name);
        if (names.length > 0) {
          setOllamaModels(names);
          setOllamaModel(names[0]);
          setTestLog(`✔ 同步本地 Ollama 成功！共发现 ${names.length} 个本地就绪模型: [${names.join(', ')}]`);
        } else {
          throw new Error('未发现模型 (Ollama database is empty)');
        }
      }
    } catch (err: any) {
      console.warn('Ollama offline, fallback placeholders synced:', err.message);
      setTestLog(`⚠ 本地 Ollama 未接通，已为您拉取预备本地极安全沙盒替代库。\n(${err.message || "CORS拦截"})`);
    } finally {
      setIsSyncingOllama(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-[#FFFFFF] font-sans flex flex-col antialiased selection:bg-[#1D9BF0] selection:text-white">
      
      {/* Interactive Website & App Published Modal Overlay */}
      <AnimatePresence>
        {isPublishModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-zinc-850 rounded-2xl p-6 max-w-lg w-full relative space-y-5 text-white shadow-2xl text-left"
            >
              {/* Close Button top-right */}
              <button
                type="button"
                onClick={() => setIsPublishModalOpen(false)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Title Header */}
              <div className="text-center space-y-2">
                <div className="inline-flex w-12 h-12 bg-emerald-500/10 text-sky-400 rounded-full items-center justify-center text-xl animate-bounce">
                  🚀
                </div>
                <h3 className="text-base font-extrabold tracking-tight text-white mb-1">恭喜！官方网站与 App 已经一键同步发布全网</h3>
                <p className="text-[11px] text-zinc-400 font-sans">
                  您的线上店铺已部署至超高速云服务器，完成了全网跨端推流。
                </p>
              </div>

              {/* URL card with direct action button */}
              <div className="bg-[#09090B] border border-zinc-900 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">官方全渠道体验链接:</span>
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[8px] bg-emerald-500/10 text-sky-400">
                    运行中 / Online
                  </span>
                </div>

                <div className="flex items-center space-x-2 bg-black border border-zinc-850 px-3 py-2 rounded-lg">
                  <span className="text-sky-500 text-[11px] font-mono select-none">https://</span>
                  <span className="text-zinc-250 text-xs font-mono select-all flex-1 truncate">
                    {(industry.name || 'shop').toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')}.ai-shop.co
                  </span>
                  
                  {/* Copy Button */}
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.origin + '?preview=true');
                      alert('已成功复制官方线上体验链接！您可在任何浏览器或手机中打开体验。');
                    }}
                    className="p-1 hover:text-white text-zinc-500 rounded transition-colors duration-150 cursor-pointer"
                    title="复制链接"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Primary CTA - Opens Browser Tab */}
                <button
                  type="button"
                  onClick={() => {
                    window.open(window.location.origin + '?preview=true', '_blank');
                  }}
                  className="w-full py-2.5 bg-[#1D9BF0] hover:bg-[#38BDF8] duration-150 rounded-lg text-xs font-extrabold text-white cursor-pointer select-none active:scale-98 flex items-center justify-center space-x-2 border border-sky-500/10 shadow-[0_4px_12px_rgba(31,111,84,0.15)]"
                >
                  <Globe className="w-4 h-4" />
                  <span>🖥️ 在浏览器新窗口直接大屏预览 ➔</span>
                </button>
              </div>

              {/* QR Code description mockup */}
              <div className="flex items-center space-x-4 bg-[#09090B]/40 p-3 rounded-xl border border-zinc-900 text-left">
                <div className="w-16 h-16 bg-white p-1 rounded-lg shrink-0 flex items-center justify-center select-none shadow">
                  {/* Simulated QR Code via a neat visual grid */}
                  <div className="grid grid-cols-5 gap-0.5 w-[56px] h-[56px] text-zinc-950">
                    {[
                      1, 1, 0, 1, 1,
                      1, 0, 1, 0, 1,
                      0, 1, 1, 1, 0,
                      1, 0, 1, 0, 1,
                      1, 1, 0, 1, 1
                    ].map((val, idx) => (
                      <div key={idx} className={val ? 'bg-black' : 'bg-white'} />
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-sky-400 font-bold block">微信/手机扫一扫立即预览 (QR CODE)</span>
                  <p className="text-[9.5px] text-zinc-400 font-sans leading-relaxed">
                    使用手机相机或微信扫码，可直接加载跨端编译的 **Mobile 小程序点单端**，体验真实的在线加购与结算。
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-900 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsPublishModalOpen(false)}
                  className="px-5 py-2 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-lg text-xs font-semibold border border-zinc-800 transition-all duration-150 cursor-pointer"
                >
                  关闭
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Realtime Order Toast Notification Block */}
      <AnimatePresence>
        {incomingOrderAlert && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 18 }}
            className="fixed top-4 right-4 z-50 w-full max-w-sm bg-[#09090B] border-2 border-sky-500 rounded-xl p-4 shadow-[0_0_20px_rgba(16,185,129,0.3)] text-xs text-white"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 select-none text-xl animate-bounce">
                  {incomingOrderAlert.type === 'takeout' ? '🛵' : '🍱'}
                </div>
                <div>
                  <h4 className="font-bold text-[12px] text-white tracking-tight flex items-center">
                    <span>⚡ 您有新订单啦！(New Catering Order!)</span>
                    <span className="ml-2 animate-pulse inline-block w-1.5 h-1.5 rounded-full bg-red-500" />
                  </h4>
                  <p className="text-[10px] text-zinc-400 font-mono mt-0.5">{incomingOrderAlert.id} • {incomingOrderAlert.time}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIncomingOrderAlert(null)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 p-2 bg-neutral-900/60 rounded border border-[#2F3336] space-y-1.5">
              <div className="flex justify-between font-mono text-[9px]">
                <span className="text-zinc-500">分类:</span>
                <span className="text-white font-bold px-1.5 py-0.2 rounded bg-[#1D9BF0] text-[8.5px]">
                  {incomingOrderAlert.type === 'takeout' ? '外卖配送点单' : '堂食扫码点单'}
                </span>
              </div>
              <div className="flex justify-between font-mono text-[9.5px]">
                <span className="text-zinc-500">详情:</span>
                <span className="text-white font-bold truncate max-w-[200px]">{incomingOrderAlert.desc}</span>
              </div>
              <div className="flex justify-between font-mono text-[9.5px]">
                <span className="text-zinc-500">地址/桌台:</span>
                <span className="text-zinc-300 font-bold max-w-[190px] truncate">{incomingOrderAlert.location}</span>
              </div>
              <div className="flex justify-between font-mono text-[9.5px]">
                <span className="text-zinc-500">顾客:</span>
                <span className="text-[#8B949E] font-bold">{incomingOrderAlert.customerName}</span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] font-mono border-t border-[#2F3336]/60 pt-2.5">
              <div className="text-sky-400 font-bold text-sm">
                ¥ {incomingOrderAlert.price.toFixed(2)}
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIncomingOrderAlert(null)}
                  className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 font-bold transition-all cursor-pointer"
                >
                  暂存
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Accept and ship instantly
                    const trackingNo = incomingOrderAlert.type === 'takeout' ? ('MT' + Math.floor(Math.random() * 899999 + 100000)) : '店内自配传菜';
                    apiService.setDoc(`tenants/${tenantId}/industries/${industry.id}/orders/${incomingOrderAlert.id}`, {
                      status: 'dispatched',
                      tracking: trackingNo
                    }, { merge: true })
                      .then(() => {
                        setLogs(prev => [
                          ...prev,
                          {
                            id: Math.random().toString(),
                            timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
                            sender: '餐饮厨调度',
                            emoji: '🧑‍🍳',
                            message: `🍳 【一键接单】接受自主点菜/外卖【${incomingOrderAlert.id}】，已在数据库持久化流式就位，后厨传单配制承接。`,
                            type: 'success'
                          }
                        ]);
                      })
                      .catch(err => console.error("Order acceptance failed:", err));

                    setIncomingOrderAlert(null);
                  }}
                  className="px-3 py-1 rounded bg-[#1D9BF0] hover:bg-[#38BDF8] font-bold transition-all text-white cursor-pointer"
                >
                  立即接单制作
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Professional Header */}
      <header className="border-b border-[#2F3336] bg-[#09090B] px-5 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <span className="text-2xl filter drop-shadow select-none">{industry.emoji}</span>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-sm font-bold text-white tracking-tight font-display">{merchantName || industry.name} — MODAUI Finance Center</h1>
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-mono bg-[#111] border border-[#2F3336] text-[#8B949E]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1D9BF0] animate-pulse" />
                <span>AI Company OS Native</span>
              </span>
            </div>
            <p className="text-[11px] text-[#8B949E] font-mono mt-0.5">
              {userEmail} • {strategy.name}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Active human role badge & simulator */}
          <div className="flex items-center space-x-2 border border-[#2F3336] bg-black/40 rounded-lg px-3 py-1.5 text-xs shrink-0 select-none">
            <span className="text-neutral-400 text-[10px] font-mono uppercase tracking-wider">🔒 席位:</span>
            <select
              value={userRole}
              onChange={(e) => {
                if (onUpdateRole) {
                  onUpdateRole(e.target.value as any);
                }
              }}
              className="bg-transparent text-[#1D9BF0] font-bold border-none outline-none focus:ring-0 text-xs py-0 px-1 cursor-pointer font-sans"
            >
              <option value="founder" className="bg-[#09090B] text-white">创始人 (Founder/Owner)</option>
              <option value="manager" className="bg-[#09090B] text-white">副总裁 (Manager)</option>
              <option value="staff" className="bg-[#09090B] text-white">运营员工 (Staff)</option>
              <option value="customer" className="bg-[#09090B] text-white">进店顾客 (Customer)</option>
              <option value="admin" className="bg-[#09090B] text-white">超级管理员 (Admin)</option>
            </select>
          </div>

          <span className="text-xs font-mono text-[#8B949E] bg-neutral-900 border border-[#2F3336] px-2.5 py-1 rounded-lg">
            系统在线
          </span>
          <button
            onClick={onExit}
            className="flex items-center space-x-1 bg-[#1D9BF0]/10 hover:bg-[#1D9BF0]/20 border border-[#1D9BF0]/30 duration-150 px-3 py-1 text-xs text-sky-400 hover:text-white rounded-lg font-medium cursor-pointer"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>安全退出</span>
          </button>
        </div>
      </header>

      {/* Main Backstage Dashboard Frame (Three Columns Panel) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* SIDE COLUMN 1: LEFT HAND-CRAFTED DARK BACKSTAGE MENU */}
        <aside className="w-full lg:w-56 bg-[#09090B] border-b lg:border-b-0 lg:border-r border-[#2F3336] flex flex-row lg:flex-col shrink-0 overflow-x-auto lg:overflow-x-visible">
          
          <div className="hidden lg:block p-4 border-b border-[#2F3336]/60 bg-black/40">
            <span className="text-[10px] text-[#8B949E] uppercase tracking-wider font-mono block">操作菜单</span>
            <p className="text-[11px] text-neutral-400 font-bold mt-1">系统控制台</p>
          </div>

          <nav className="flex-1 p-2 lg:p-3 flex flex-row lg:flex-col space-x-2 lg:space-x-0 lg:space-y-1.5 min-w-max lg:min-w-0">
            {[
              { id: 'workbench', label: '智能大盘', desc: '营运大盘', emoji: '📊', icon: LayoutGrid },
              { id: 'pos', label: '收银系统', desc: 'POS结账', emoji: '💰', icon: CreditCard },
              { id: 'sales_center', label: '销售中心', desc: '订单管理', emoji: '📦', icon: ShoppingCart },
              { id: 'purchase', label: '采购中心', desc: '进货管理', emoji: '🛍️', icon: ShoppingBag },
              { id: 'supplier', label: '供应商', desc: '货源管理', emoji: '🤝', icon: Users },
              { id: 'analytics', label: '经营报表', desc: '数据分析', emoji: '📈', icon: BarChart3 },
              { id: 'finance', label: '财务中心', desc: '公司资产中枢', emoji: '🏦', icon: Landmark },
              { id: 'store', label: '店铺装修', desc: '店面装修', emoji: '🏪', icon: Building2 },
              { id: 'product', label: '产品管理', desc: '商品管理', emoji: '👗', icon: Package },
              { id: 'inventory', label: '库存中心', desc: '库存盘点', emoji: '📦', icon: Building2 },
              { id: 'order', label: '订单监控', desc: '订单监控', emoji: '📈', icon: ShoppingCart },
              { id: 'customer', label: '客户维权', desc: '客户服务', emoji: '👥', icon: Users },
              { id: 'marketing', label: '营销活动', desc: '营销推广', emoji: '📣', icon: Sparkles },
              { id: 'app_store', label: '功能商店', desc: '功能扩展', emoji: '🔌', icon: Layers },
              { id: 'developer', label: '开发者中心', desc: '接口配置', emoji: '💻', icon: Key },
              { id: 'merchant_settings', label: '商户设置', desc: '企业参数', emoji: '🏢', icon: Building2 },
              { id: 'team_members', label: 'AI团队成员', desc: '专家头像', emoji: '🤖', icon: Award },
              { id: 'rbac', label: '权限管理', desc: 'RBAC角色', emoji: '🛡️', icon: ShieldAlert },
              { id: 'user_settings', label: '账号中心', desc: '个人安全', emoji: '👤', icon: User },
              { id: 'settings', label: '系统设置', desc: '核心设置', emoji: '⚙️', icon: Settings },
            ].filter(menuItem => {
              const menuToModuleMap: Record<string, string> = {
                'pos': 'pos',
                'sales_center': 'sales',
                'purchase': 'purchase',
                'inventory': 'inventory',
                'customer': 'customer',
                'supplier': 'supplier',
                'finance': 'wallet',
                'payment': 'payment',
                'analytics': 'report',
              };
              const modId = menuToModuleMap[menuItem.id];
              if (!modId) return true;
              return merchant?.modules?.[modId]?.enabled ?? true;
            }).map((menuItem) => {
              const Icon = menuItem.icon;
              const isActive = activeMenu === menuItem.id;
              return (
                <button
                  key={menuItem.id}
                  onClick={() => {
                    if (menuItem.id === 'user_settings' && onNavigate) {
                      onNavigate({ step: 'USER_SETTINGS' });
                      return;
                    }
                    setActiveMenu(menuItem.id as any);
                    // Append small systemic directive logs when swapping tabs
                    setLogs((prev) => [
                      ...prev,
                      {
                        id: Math.random().toString(),
                        timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
                        sender: '后台主页',
                        emoji: '📑',
                        message: `所有者进入【${menuItem.label}】核心工作空间看板。`,
                        type: 'info'
                      }
                    ]);
                  }}
                  className={`w-40 lg:w-full flex items-center space-x-2 px-3.5 py-2.5 rounded-lg text-left transition-all duration-150 cursor-pointer ${
                    isActive 
                      ? 'bg-[#1D9BF0] text-white font-bold shadow-lg border border-[#1D9BF0]/30' 
                      : 'text-[#8B949E] hover:text-white hover:bg-neutral-900/60 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#8B949E]'}`} />
                  <div className="flex flex-col">
                    <span className="text-xs tracking-tight">{menuItem.label}</span>
                  </div>
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  )}
                </button>
              );
            })}
          </nav>

          {onNavigate && (
            <div className="hidden lg:flex flex-col p-3 border-t border-[#2F3336]/60 bg-black/20">
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-2 px-1.5 font-sans">
                视图维度跳转
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => onNavigate({ step: 'LANDING' })}
                  className="flex items-center justify-center gap-1 py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 text-[#8B949E] hover:text-white text-[10.5px] font-bold transition-all cursor-pointer border border-zinc-800/20"
                >
                  <span>🏠</span>
                  <span>官方主页</span>
                </button>
                <button
                  onClick={() => onNavigate({ step: 'CUSTOMER_STOREFRONT' })}
                  className="flex items-center justify-center gap-1 py-1.5 rounded bg-red-950/10 hover:bg-red-950/30 text-rose-450 hover:text-rose-200 text-[10.5px] font-bold transition-all cursor-pointer border border-red-950/20"
                >
                  <span>🛒</span>
                  <span>顾客前台</span>
                </button>
                <button
                  className="flex items-center justify-center gap-1 py-1.5 rounded bg-emerald-600/10 text-emerald-300 text-[10.5px] font-extrabold cursor-default border border-emerald-500/20 select-none"
                >
                  <span>💼</span>
                  <span>商家后台</span>
                </button>
                <button
                  onClick={() => onNavigate({ step: 'PLATFORM_ADMIN' })}
                  className="flex items-center justify-center gap-1 py-1.5 rounded bg-blue-950/10 hover:bg-blue-950/30 text-blue-400 hover:text-blue-200 text-[10.5px] font-bold transition-all cursor-pointer border border-blue-900/20"
                >
                  <span>💻</span>
                  <span>管理后台</span>
                </button>
              </div>
            </div>
          )}

          <div className="hidden lg:flex p-4 border-t border-[#2F3336]/60 bg-black/40 text-[9px] text-[#8B949E] font-mono flex-col space-y-1">
            <span>底座信息: <span className="text-[#38BDF8] font-bold">ONLINE</span></span>
            <span>运行时间: <span className="text-neutral-400">24H</span></span>
          </div>
        </aside>

        {/* MIDDLE COLUMN 2: ACTIVE DYNAMIC BACKSTAGE CANVAS VIEWPORT */}
        <main className="flex-1 bg-black p-4 lg:p-6 overflow-y-auto border-r border-[#2F3336]/50 flex flex-col space-y-6">
          
          {/* HEADER BAR FOR SELECTED VIEW */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#2F3336]/60 pb-3 gap-3">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#1D9BF0] animate-pulse" />
                <span>{
                  activeMenu === 'pos' ? '智能收银系统 (POS)' :
                  activeMenu === 'sales_center' ? '销售中心 (Orders)' :
                  activeMenu === 'purchase' ? '采购中心 (Purchases)' :
                  activeMenu === 'supplier' ? '供应商管理' :
                  activeMenu === 'analytics' ? '经营数据分析' :
                  activeMenu === 'workbench' ? '智能大盘' :
                  activeMenu === 'store' ? '店铺装修' :
                  activeMenu === 'product' ? '产品列表' :
                  activeMenu === 'inventory' ? '库存中枢' :
                  activeMenu === 'order' ? '订单管理' :
                  activeMenu === 'customer' ? '客诉维权' :
                  activeMenu === 'marketing' ? '营销活动' :
                  activeMenu === 'analytics' ? '收支分析' :
                  activeMenu === 'team_members' ? '团队智能专家' :
                  activeMenu === 'app_store' ? '软件插件商店' :
                  activeMenu === 'finance' ? '财务中心' :
                  activeMenu === 'developer' ? '开发者 API 中枢' :
                  activeMenu === 'merchant_settings' ? '商户参数配置' :
                  activeMenu === 'rbac' ? '账号角色权限规约 (RBAC Panel)' : '安全设置'
                }</span>
              </h2>
              <p className="text-[11px] text-[#8B949E] font-mono mt-0.5">
                {activeMenu === 'pos' ? '极速收银与订单结算' :
                 activeMenu === 'sales_center' ? '管理全渠道订单与流水' :
                 activeMenu === 'purchase' ? '管理供应链进货与入库' :
                  activeMenu === 'supplier' ? '维护合作伙伴关系' :
                  activeMenu === 'analytics' ? '多维度业务增长看板' :
                  activeMenu === 'workbench' ? '监控收入' :
                 activeMenu === 'store' ? '样式配置' :
                 activeMenu === 'product' ? '商品管理' :
                 activeMenu === 'inventory' ? '库存盘点与调拨' :
                 activeMenu === 'order' ? '订单处理' :
                 activeMenu === 'customer' ? '纠纷解决' :
                 activeMenu === 'marketing' ? '生成文案' :
                 activeMenu === 'analytics' ? '损益趋势' :
                 activeMenu === 'team_members' ? 'AI专家智能形象绘设' :
                 activeMenu === 'app_store' ? 'SaaS官方插件装配' :
                 activeMenu === 'finance' ? '公司账户与经营流水' :
                 activeMenu === 'developer' ? '双向 Webhooks 与密钥' :
                 activeMenu === 'merchant_settings' ? '企业全局参数及订阅管理' :
                 activeMenu === 'rbac' ? '企业级多维度操作权限及仿真调试' : '接口配置'}
              </p>
            </div>

            <div className="text-[10px] bg-[#111] border border-[#2F3336] px-3 py-1 rounded-full font-mono text-[#8B949E]">
              负责人：<span className="text-white font-bold">{selectedStaff.name}</span>
            </div>
          </div>

          {/* SECONDARY LEVEL DASHBOARD NAVIGATION SUB-MENU */}
          {(() => {
            const getSubTabsForMenu = () => {
              switch (activeMenu) {
                case 'store':
                  return [
                    { id: 'overview', name: '店铺概览', emoji: '🏢' },
                    { id: 'decoration', name: '店铺装修', emoji: '🎨' },
                    { id: 'channels', name: '渠道接收', emoji: '🔌' },
                    { id: 'domain', name: '域名设置', emoji: '🌐' },
                    { id: 'brand', name: '品牌设置', emoji: '✨' },
                    { id: 'seo', name: 'SEO设置', emoji: '🔍' }
                  ];
                case 'product':
                  return [
                    { id: 'list', name: '产品列表', emoji: '👗' },
                    { id: 'categories', name: '分类管理', emoji: '🗂' },
                    { id: 'inventory', name: '库存管理', emoji: '📊' },
                    { id: 'sku', name: 'SKU管理', emoji: '🎟' },
                    { id: 'brands', name: '品牌中心', emoji: '🏷' },
                    { id: 'collections', name: '系列集合', emoji: '🧩' },
                    { id: 'images', name: '商品图片', emoji: '🖼' },
                    { id: 'batches', name: '批次库存', emoji: '📦' },
                    { id: 'suppliers', name: '供应商', emoji: '🤝' },
                    { id: 'purchase', name: '采购单', emoji: '📝' }
                  ];
                case 'order':
                  return [
                    { id: 'all', name: '全部订单', emoji: '📈' },
                    { id: 'draft', name: '草稿订单', emoji: '📝' },
                    { id: 'refund', name: '退款订单', emoji: '💸' },
                    { id: 'aftersales', name: '售后管理', emoji: '🛡' },
                    { id: 'tracking', name: '物流跟踪', emoji: '🚚' }
                  ];
                case 'customer':
                  return [
                    { id: 'list', name: '客户列表', emoji: '👥' },
                    { id: 'tags', name: '客户标签', emoji: '🏷' },
                    { id: 'segments', name: '客户分群', emoji: '🎯' },
                    { id: 'membership', name: '会员等级', emoji: '💎' },
                    { id: 'b2b', name: '企业客户(B2B)', emoji: '🏢' }
                  ];
                case 'marketing':
                  return [
                    { id: 'coupon', name: '优惠券', emoji: '🎫' },
                    { id: 'campaign', name: '活动中心', emoji: '🎡' },
                    { id: 'email', name: '邮件营销', emoji: '✉' },
                    { id: 'sms', name: '短信营销', emoji: '💬' },
                    { id: 'ai', name: 'AI营销', emoji: '🤖' }
                  ];
                case 'analytics':
                  return [
                    { id: 'sales', name: '销售分析', emoji: '📈' },
                    { id: 'customer', name: '客户分析', emoji: '👥' },
                    { id: 'product', name: '商品分析', emoji: '🛍' },
                    { id: 'marketing', name: '营销分析', emoji: '📣' },
                    { id: 'realtime', name: '实时数据', emoji: '⚡' }
                  ];
                case 'inventory':
                  return [
                    { id: 'overview', name: '库存总览', emoji: '📦' },
                    { id: 'warehouses', name: '仓库管理', emoji: '🏬' },
                    { id: 'locations', name: '库位布局', emoji: '📍' },
                    { id: 'records', name: '库存记录', emoji: '🧾' },
                    { id: 'transfers', name: '调拨', emoji: '🔁' },
                    { id: 'adjustments', name: '盘点/调整', emoji: '🧮' },
                    { id: 'movements', name: '库存流水', emoji: '📜' }
                  ];
                default:
                  return null;
              }
            };

            const getActiveSubTab = () => {
              if (activeMenu === 'store') return storeSubTab;
              if (activeMenu === 'product') return productSubTab;
              if (activeMenu === 'inventory') return inventorySubTab;
              if (activeMenu === 'order') return orderSubTab;
              if (activeMenu === 'customer') return customerSubTab;
              if (activeMenu === 'marketing') return marketingSubTab;
              if (activeMenu === 'analytics') return analyticsSubTab;
              return '';
            };

            const setSubTab = (id: string) => {
              if (activeMenu === 'store') setStoreSubTab(id as any);
              else if (activeMenu === 'product') setProductSubTab(id as any);
              else if (activeMenu === 'inventory') setInventorySubTab(id as any);
              else if (activeMenu === 'order') setOrderSubTab(id as any);
              else if (activeMenu === 'customer') setCustomerSubTab(id as any);
              else if (activeMenu === 'marketing') setMarketingSubTab(id as any);
              else if (activeMenu === 'analytics') setAnalyticsSubTab(id as any);
            };

            const subTabs = getSubTabsForMenu();
            if (!subTabs) return null;
            const currentSubTab = getActiveSubTab();
            return (
              <div className="flex items-center space-x-1 p-1 bg-[#09090B] border border-[#2F3336]/60 rounded-xl overflow-x-auto min-w-0 shrink-0 scrollbar-none">
                {subTabs.map((subTab) => {
                  const isActive = currentSubTab === subTab.id;
                  return (
                    <button
                      key={subTab.id}
                      onClick={() => setSubTab(subTab.id)}
                      className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-medium duration-150 shrink-0 cursor-pointer ${
                        isActive
                          ? 'bg-[#1D9BF0]/15 border border-[#1D9BF0]/35 text-sky-450 font-bold'
                          : 'text-[#8B949E] hover:text-white hover:bg-neutral-900 border border-transparent'
                      }`}
                    >
                      <span className="text-xs">{subTab.emoji}</span>
                      <span>{subTab.name}</span>
                    </button>
                  );
                })}
              </div>
            );
          })()}

          {/* ACTIVE RENDER CONTENT BODY PANEL */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeMenu}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="flex-1 flex flex-col space-y-6"
            >
              
              {/* VIEW 0: POS (💰 收银系统) */}
              {activeMenu === 'pos' && (
                <POSCenterView merchantId={tenantId} userId={(industry as any).userId || 'founder-id'} />
              )}

              {/* VIEW 0.1: Sales Center (📦 销售中心) */}
              {activeMenu === 'sales_center' && (
                <SalesCenterView merchantId={tenantId} />
              )}

              {/* VIEW 0.2: Purchase Center (🛍️ 采购中心) */}
              {activeMenu === 'purchase' && (
                <PurchaseCenterView merchantId={tenantId} userId={(industry as any).userId || 'founder-id'} />
              )}

              {/* VIEW 0.3: Supplier Center (🤝 供应商) */}
              {activeMenu === 'supplier' && (
                <SupplierCenterView merchantId={tenantId} />
              )}

              {/* VIEW 0.4: Analytics Center (📈 报表) */}
              {activeMenu === 'analytics' && (
                <ReportCenterView merchantId={tenantId} />
              )}

              {/* VIEW 1: WORKBENCH (📊 工作台) */}
              {activeMenu === 'workbench' && (
                <div className="space-y-6">
                  {/* Grid cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-[#09090B] border border-[#2F3336] p-4 rounded-xl flex flex-col justify-between h-28 text-left animate-fadeIn">
                      <p className="text-[10px] font-mono text-[#8B949E] uppercase tracking-wider">今日累计收入</p>
                      <span className="text-lg font-bold font-mono tracking-tight text-white mt-1">
                        ¥ {sales.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[9px] text-sky-400 font-mono mt-auto flex items-center space-x-1">
                        <TrendingUp className="w-2.5 h-2.5" />
                        <span>自动增加28%</span>
                      </span>
                    </div>

                    <div className="bg-[#09090B] border border-[#2F3336] p-4 rounded-xl flex flex-col justify-between h-28 text-left animate-fadeIn">
                      <p className="text-[10px] font-mono text-[#8B949E] uppercase tracking-wider">成单数量</p>
                      <span className="text-lg font-bold font-mono tracking-tight text-white mt-1">{orders} 笔</span>
                      <span className="text-[9px] text-[#8B949E] font-mono mt-auto">处理完毕</span>
                    </div>

                    <div className="bg-[#09090B] border border-[#2F3336] p-4 rounded-xl flex flex-col justify-between h-28 text-left animate-fadeIn">
                      <p className="text-[10px] font-mono text-[#8B949E] uppercase tracking-wider">数字员工</p>
                      <span className="text-lg font-bold font-mono text-[#1D9BF0] mt-1">5位智能在岗</span>
                      <span className="text-[9px] text-sky-400 font-mono mt-auto flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                        <span>持续运行</span>
                      </span>
                    </div>

                    <div className="bg-[#09090B] border border-[#2F3336] p-4 rounded-xl flex flex-col justify-between h-28 text-left animate-fadeIn">
                      <p className="text-[10px] font-mono text-[#8B949E] uppercase tracking-wider">节省成本</p>
                      <span className="text-lg font-bold font-mono tracking-tight text-white mt-1">¥ 1,850 /天</span>
                      <span className="text-[9px] text-neutral-400 font-mono mt-auto">降本增效</span>
                    </div>
                  </div>

                  {/* Cumulative Sales SVG slope chart */}
                  <div className="bg-[#09090B] border border-[#2F3336] p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-3 text-left">
                      <span className="text-xs font-mono text-[#8B949E] uppercase tracking-wider">销售趋势</span>
                      <span className="text-[9px] bg-neutral-900 border border-[#2F3336] px-2 py-0.5 rounded font-mono text-sky-400">实时更新</span>
                    </div>
                    {/* SVG Curve */}
                    <div className="h-32 w-full relative">
                      <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#1D9BF0" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#1D9BF0" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path 
                          d="M0,90 Q40,65 80,72 T160,50 T240,42 T320,25 T400,10 L400,100 L0,100 Z" 
                          fill="url(#chartGrad)" 
                        />
                        <path 
                          d="M0,90 Q40,65 80,72 T160,50 T240,42 T320,25 T400,10" 
                          fill="none" 
                          stroke="#1D9BF0" 
                          strokeWidth="2" 
                        />
                        <circle cx="80" cy="72" r="3" fill="#ffffff" />
                        <circle cx="160" cy="50" r="3" fill="#ffffff" />
                        <circle cx="320" cy="25" r="3" fill="#ffffff" stroke="#1D9BF0" strokeWidth="1" />
                        <circle cx="400" cy="10" r="4" fill="#1D9BF0" className="animate-pulse" />
                      </svg>
                      {/* X labels */}
                      <div className="flex justify-between text-[8px] font-mono text-[#8B949E] mt-1.5">
                        <span>08:00</span>
                        <span>10:00</span>
                        <span>12:00</span>
                        <span>14:00</span>
                        <span>16:00</span>
                      </div>
                    </div>
                  </div>

                  {/* Manual direct controls */}
                  <div className="bg-[#09090B] border border-[#2F3336] p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider">快捷操作</span>
                      <span className="text-[9px] text-[#8B949E]">CONTROL</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <button 
                        type="button"
                        onClick={() => triggerQuickMacro('ad_boost')}
                        className="bg-neutral-950 border border-[#2F3336] hover:border-[#1D9BF0] hover:bg-[#1D9BF0]/5 duration-200 p-3 rounded-xl text-left cursor-pointer group active:scale-95"
                      >
                        <span className="text-sm">📣</span>
                        <p className="text-xs font-bold text-white mt-1 group-hover:text-sky-400">推广投放</p>
                        <p className="text-[10px] text-[#8B949E] mt-0.5">一键推广</p>
                      </button>
                      
                      <button 
                        type="button"
                        onClick={() => triggerQuickMacro('inventory_sync')}
                        className="bg-neutral-950 border border-[#2F3336] hover:border-[#1D9BF0] hover:bg-[#1D9BF0]/5 duration-200 p-3 rounded-xl text-left cursor-pointer group active:scale-95"
                      >
                        <span className="text-sm">📦</span>
                        <p className="text-xs font-bold text-white mt-1 group-hover:text-sky-400">货源快反</p>
                        <p className="text-[10px] text-[#8B949E] mt-0.5">一键补货</p>
                      </button>

                      <button 
                        type="button"
                        onClick={() => setActiveMenu('finance')}
                        className="bg-[#09090B] border border-[#2F3336] hover:border-[#1D9BF0] hover:bg-[#1D9BF0]/5 duration-200 p-3 rounded-xl text-left cursor-pointer group active:scale-95"
                      >
                        <span className="text-sm">🪙</span>
                        <p className="text-xs font-bold text-white mt-1 group-hover:text-sky-400">对账合并</p>
                        <p className="text-[10px] text-[#8B949E] mt-0.5">自动核对</p>
                      </button>

                      <button 
                        type="button"
                        onClick={() => triggerQuickMacro('customer_crm')}
                        className="bg-neutral-950 border border-[#2F3336] hover:border-[#1D9BF0] hover:bg-[#1D9BF0]/5 duration-200 p-3 rounded-xl text-left cursor-pointer group active:scale-95"
                      >
                        <span className="text-sm">💬</span>
                        <p className="text-xs font-bold text-white mt-1 group-hover:text-sky-400">纠纷处理</p>
                        <p className="text-[10px] text-[#8B949E] mt-0.5">极速安抚</p>
                      </button>
                    </div>
                  </div>

                  {/* Logs ticker layout */}
                  <div className="bg-[#09090B] border border-[#2F3336] rounded-xl flex flex-col h-[280px] overflow-hidden">
                    <div className="bg-[#0d0d0f] border-b border-[#2F3336] px-4 py-2.5 flex items-center justify-between shrink-0">
                      <span className="text-xs font-mono text-[#8B949E] uppercase tracking-wider">系统监控日志</span>
                      <span className="text-[9px] bg-[#1D9BF0]/15 text-[#38BDF8] border border-[#1D9BF0]/20 px-2 py-0.5 rounded">ONLINE</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-[11px] bg-black text-left">
                      {logs.slice(-30).map((log) => (
                        <div key={log.id} className="p-2 border border-[#2F3336]/40 bg-[#070708] rounded-lg">
                          <div className="flex justify-between items-center text-[9px] text-[#8B949E] mb-1">
                            <span className="font-bold text-neutral-300 flex items-center space-x-1">
                              <span>{log.emoji}</span>
                              <span>{log.sender}</span>
                            </span>
                            <span>{log.timestamp}</span>
                          </div>
                          <p className="text-neutral-200 leading-relaxed text-[11px] pl-1.5 border-l border-[#1D9BF0]">{log.message}</p>
                        </div>
                      ))}
                      <div ref={bottomLogsRef} />
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 2: STORE (🏪 店铺) */}
              {activeMenu === 'store' && (
                <>
                  {storeSubTab === 'overview' && (
                    <div className="bg-[#09090B] border border-[#2F3336] p-6 rounded-xl space-y-6 animate-fadeIn text-left">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#2F3336]/60 pb-4 gap-4">
                        <div>
                          <h3 className="text-sm font-bold text-white flex items-center space-x-1.5">
                            <span className="text-sky-400">🏪</span>
                            <span>店铺线上状态及基础配置概览</span>
                          </h3>
                          <p className="text-[10px] text-zinc-500 mt-1">检测边缘节点及分布式静态网页运行就绪指标</p>
                        </div>
                        
                        <div className="flex items-center space-x-3 bg-black/60 border border-[#2F3336] px-4 py-2.5 rounded-xl">
                          <span className={`w-2 h-2 rounded-full ${isStoreOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                          <span className="text-[11px] font-bold text-zinc-300">
                            {isStoreOnline ? '店面线上营业中' : '店面自配打烊中'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsStoreOnline(!isStoreOnline)}
                            className={`px-3 py-1 text-[10px] font-extrabold rounded cursor-pointer ${isStoreOnline ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}`}
                          >
                            {isStoreOnline ? '拉闸停业' : '一键营业'}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-black/40 border border-[#2F3336] p-4 rounded-xl space-y-1.5">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">前台店点单网口</span>
                          <a href="#" className="text-xs text-sky-450 hover:underline inline-flex items-center space-x-1 font-bold">
                            <span>打开前向订餐流 🛍</span>
                            <Globe className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="bg-black/40 border border-[#2F3336] p-4 rounded-xl space-y-1.5">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">安全证书 SSL / CDN</span>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-emerald-500 text-xs">✔</span>
                            <span className="text-xs text-zinc-300 font-mono">Let\'s Encrypt 100％ 加密</span>
                          </div>
                        </div>
                        <div className="bg-black/40 border border-[#2F3336] p-4 rounded-xl space-y-1.5">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">SEO 收录状态</span>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-sky-400 text-xs">ℹ</span>
                            <span className="text-xs text-sky-400 font-mono">全权重抓取就绪</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {storeSubTab === 'decoration' && (
                    <StorefrontView 
                      tenantId={tenantId}
                      industryId={industry.id}
                      onAddLog={(sender, emoji, msg, type) => setLogs(prev => [...prev, { id: Math.random().toString(), timestamp: new Date().toLocaleTimeString(), sender, emoji, message: msg, type: type as any }])}
                    />
                  )}
                  {storeSubTab === 'channels' && (
                    <ChannelsView 
                      tenantId={tenantId}
                      onAddLog={(sender, emoji, msg, type) => setLogs(prev => [...prev, { id: Math.random().toString(), timestamp: new Date().toLocaleTimeString(), sender, emoji, message: msg, type: type as any }])}
                    />
                  )}
                </>
              )}

              {/* VIEW 3: PRODUCT (👗 产品) */}
              {activeMenu === 'product' && (
                <ProductCenterView tenantId={tenantId} activeSubTab={productSubTab} />
              )}

              {activeMenu === 'inventory' && (
                <InventoryCenterView tenantId={tenantId} activeSubTab={inventorySubTab} />
              )}

              {/* VIEW 4: ORDER (📈 订单) */}
              {activeMenu === 'order' && (
                <SalesCenterView merchantId={tenantId} />
              )}

              {/* VIEW 5: CUSTOMER (👥 客户) */}
              {activeMenu === 'customer' && (
                <CustomerCenterView merchantId={tenantId} />
              )}

              {/* VIEW 6: MARKETING (📣 营销) */}
              {activeMenu === 'marketing' && (
                <ContentView 
                  tenantId={tenantId} 
                  industryId={industry.id} 
                  onAddLog={(sender, emoji, msg, type) => setLogs(prev => [...prev, { id: Math.random().toString(), timestamp: new Date().toLocaleTimeString(), sender, emoji, message: msg, type: type as any }])}
                />
              )}

              {/* VIEW 7: ANALYTICS (📊 分析) */}
              {activeMenu === 'analytics' && (
                <div className="bg-[#09090B] border border-[#2F3336] p-6 rounded-xl animate-fadeIn text-left">
                   <div className="flex items-center justify-between mb-6">
                     <h3 className="text-white font-bold">全渠道收支分析趋势</h3>
                     <span className="text-[10px] text-sky-400 font-mono">💰 刘会计实时审计中</span>
                   </div>
                   <div className="h-64">
                     <D3FinancialStreamChart />
                   </div>
                </div>
              )}

              {/* VIEW 8: TEAM MEMBERS (🤖 团队) */}
              {activeMenu === 'team_members' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {managers.map((member, index) => {
                      const avatarSrc = `https://api.dicebear.com/7.x/bottts/svg?seed=${member.name}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
                      return (
                        <div key={index} className="bg-[#09090B] border border-[#2F3336] rounded-xl p-4 flex items-center space-x-4 text-left hover:border-neutral-700 transition-colors">
                          <img src={avatarSrc} alt={member.name} className="w-16 h-16 rounded-xl bg-zinc-900" />
                          <div>
                            <h4 className="text-sm font-bold text-white">{member.role} • {member.name}</h4>
                            <p className="text-[11px] text-[#8B949E] mt-1">{member.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* VIEW 14: FINANCE HUB (🏦 财务中心) */}
              {activeMenu === 'finance' && (
                <FinanceHubView tenantId={industry.id} />
              )}

              {/* VIEW 10: APP STORE (🔌 App Store) */}
              {activeMenu === 'app_store' && (
                <AppStoreView 
                  tenantId={industry.id} 
                  onAddLog={(sender, emoji, message, type) => setLogs(prev => [...prev, { id: Math.random().toString(), timestamp: new Date().toLocaleTimeString(), sender, emoji, message, type: type as any }])}
                />
              )}

              {/* VIEW 13: MERCHANT SETTINGS (🏢 商户设置) */}
              {activeMenu === 'merchant_settings' && (
                <MerchantSettingsView merchantId={tenantId} />
              )}

              {/* VIEW 11: DEVELOPER CONSOLE (💻 开发者) */}
              {activeMenu === 'developer' && (
                <DeveloperConsoleView 
                  tenantId={industry.id} 
                  onAddLog={(sender, emoji, message, type) => setLogs(prev => [...prev, { id: Math.random().toString(), timestamp: new Date().toLocaleTimeString(), sender, emoji, message, type: type as any }])}
                />
              )}

              {/* VIEW 12: RBAC (🛡️ 权限管理) */}
              {activeMenu === 'rbac' && (
                <RoleManagementPanel 
                  tenantId={industry.id} 
                  currentRole={userRole === 'admin' ? 'Platform Admin' : userRole === 'founder' ? 'Merchant Owner' : userRole === 'manager' ? 'Manager' : userRole === 'staff' ? 'Staff' : 'Customer'}
                  onRoleChange={(newRole) => {
                    if (onUpdateRole) {
                      const propRole = newRole === 'Platform Admin' ? 'admin' : newRole === 'Merchant Owner' ? 'founder' : newRole === 'Manager' ? 'manager' : newRole === 'Staff' ? 'staff' : 'customer';
                      onUpdateRole(propRole);
                    }
                  }}
                  onAddLog={(sender, emoji, message, type) => setLogs(prev => [...prev, { id: Math.random().toString(), timestamp: new Date().toLocaleTimeString(), sender, emoji, message, type: type as any }])}
                />
              )}

            </motion.div>
          </AnimatePresence>

        </main>

        {/* SIDE COLUMN 3: PERSISTENT RIGHT CHATBOX INTERFACE PANEL */}
        <section className="w-full lg:w-80 bg-[#09090B] border-t lg:border-t-0 lg:border-l border-[#2F3336] shrink-0 flex flex-col h-[520px] lg:h-auto overflow-hidden">
          
          <div className="bg-[#0d0d0f] border-b border-[#2F3336] p-4 flex flex-col justify-between space-y-2">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-[#1D9BF0]" />
              <div className="text-left">
                <span className="text-[10px] text-[#8B949E] uppercase tracking-wider font-mono block">当前窗口数字岗位伙伴</span>
                <p className="text-xs font-extrabold text-white">7x24 执勤全天候会商室</p>
              </div>
            </div>
          </div>

          {/* Active Employee Bio */}
          <div className="p-3 bg-black/60 border-b border-[#2F3336]/60 flex items-start space-x-3 text-xs font-mono">
            <div className="w-10 h-10 rounded-full border border-[#2F3336] bg-neutral-950 flex items-center justify-center text-2xl select-none shrink-0 animate-pulse">
              {selectedStaff.emoji}
            </div>
            <div className="text-left space-y-1">
              <div className="flex items-center space-x-1.5">
                <span className="text-white font-bold">{selectedStaff.name}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-neutral-900 border border-[#2F3336] text-[#8B949E]">
                  {selectedStaff.role}
                </span>
              </div>
              <p className="text-[10px] text-[#8B949E] leading-relaxed">{selectedStaff.desc}</p>
            </div>
          </div>

          {/* Chat scrolling log window */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-950 flex flex-col">
            {chats[selectedStaff.role]?.map((chat) => (
              <div
                key={chat.id}
                className={`flex flex-col max-w-[85%] text-left ${chat.isUser ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                <div className="flex items-center space-x-1.5 mb-1 text-[9px] text-[#8B949E] font-mono">
                  <span>{chat.emoji}</span>
                  <span>{chat.sender}</span>
                  <span>•</span>
                  <span>{chat.timestamp}</span>
                </div>
                <div className={`p-3 rounded-xl border text-xs leading-relaxed whitespace-pre-wrap ${
                  chat.isUser 
                    ? 'bg-[#1D9BF0] border-[#1D9BF0]/30 text-white rounded-tr-none' 
                    : 'bg-[#09090B] border-[#2F3336] text-neutral-200 rounded-tl-none'
                }`}>
                  {chat.message}

                  {/* Render Sidekick interactive AI action terminal block if parsed */}
                  {!chat.isUser && chat.actionDetected && (
                    <div className="mt-2.5 overflow-hidden rounded-md border border-sky-500/35 bg-black text-left font-mono">
                      {/* Header */}
                      <div className="flex items-center justify-between bg-sky-950/20 px-2.5 py-1.5 border-b border-sky-500/20">
                        <div className="flex items-center space-x-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                          <span className="text-[9px] uppercase font-bold text-sky-400 tracking-wider">
                            SIDEKICK 自动化决策调试调度
                          </span>
                        </div>
                        <span className="text-[7px] text-sky-500/70 border border-sky-500/20 px-1 py-0.5 rounded scale-90 origin-right">
                          LIVE ACTIVE
                        </span>
                      </div>

                      {/* Decoded system parameters */}
                      <div className="p-2.5 space-y-2 text-[9px] leading-relaxed text-neutral-300">
                        <div className="flex items-start space-x-1 text-[#8B949E]">
                          <span className="text-sky-500 font-bold select-none">$</span>
                          <span>sidekick --dispatch-core --task={chat.actionDetected.type.toLowerCase()}</span>
                        </div>
                        
                        <div className="border-t border-neutral-900 pt-1.5 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-neutral-500">业务指令类 (Type)</span>
                            <span className="text-neutral-200 font-medium">{chat.actionDetected.title}</span>
                          </div>
                          {chat.actionDetected.param1 && (
                            <div className="flex justify-between">
                              <span className="text-neutral-500">特征参数 A (Param1)</span>
                              <span className="text-sky-400 font-bold truncate max-w-[170px]" title={chat.actionDetected.param1}>
                                {chat.actionDetected.param1}
                              </span>
                            </div>
                          )}
                          {chat.actionDetected.param2 && (
                            <div className="flex justify-between">
                              <span className="text-neutral-500">特征参数 B (Param2)</span>
                              <span className="text-yellow-400 font-bold">
                                ¥{chat.actionDetected.param2}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between border-t border-neutral-900 pt-1">
                            <span className="text-neutral-500">后台反应堆 (Status)</span>
                            <span className="text-sky-400 font-bold flex items-center space-x-0.5 animate-pulse">
                              <span>● 部署发布生效</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Render 1: Generated Design Poster Canvas Workspace */}
                  {chat.generatedPoster && (
                    <div className="mt-3 overflow-hidden rounded-xl border border-[#2F3336] bg-[#0D0D10] text-[#E5E5E5] text-left">
                      <div className={`p-5 relative overflow-hidden flex flex-col justify-between items-center text-center aspect-[16/10] ${
                        chat.generatedPoster.theme === 'dark' 
                          ? 'bg-gradient-to-br from-zinc-950 via-neutral-900 to-zinc-950 text-white' 
                          : chat.generatedPoster.theme === 'classic'
                          ? 'bg-gradient-to-br from-zinc-100 via-neutral-200 to-zinc-50 text-neutral-900'
                          : 'bg-gradient-to-br from-[#FAF6F0] via-[#F4EBE1] to-[#FAF6F0] text-amber-950'
                      }`}>
                        <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-emerald-500/10 blur-xl pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-amber-500/15 blur-xl pointer-events-none" />
                        
                        <div className="text-[9px] uppercase tracking-widest font-mono font-bold opacity-75">
                          ✦ {industry.name} OFFICIAL MERCH DESIGNER ✦
                        </div>
                        
                        <div className="my-[15px] space-y-1 z-10 w-full max-w-[240px]">
                          <input
                            type="text"
                            value={chat.generatedPoster.title}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateChatMessageCustomField(chat.id, (m) => ({
                                ...m,
                                generatedPoster: { ...m.generatedPoster, title: val }
                              }));
                            }}
                            className="bg-zinc-900/30 border border-transparent hover:border-neutral-500/30 focus:bg-black/60 focus:border-[#1D9BF0] transition-all text-sm font-extrabold text-center w-full focus:outline-none p-1 rounded"
                            placeholder="编辑海报主文案..."
                          />
                          <input
                            type="text"
                            value={chat.generatedPoster.subtitle}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateChatMessageCustomField(chat.id, (m) => ({
                                ...m,
                                generatedPoster: { ...m.generatedPoster, subtitle: val }
                              }));
                            }}
                            className="bg-zinc-900/10 border border-transparent hover:border-neutral-500/15 focus:bg-black/40 focus:border-[#1D9BF0] transition-all text-[10px] text-center w-full focus:outline-none opacity-80 p-0.5 rounded"
                            placeholder="编辑推广副文案..."
                          />
                        </div>

                        <div className="text-4xl bg-gradient-to-b from-neutral-800 to-neutral-950 border border-white/5 backdrop-blur-sm w-12 h-12 rounded-full flex items-center justify-center animate-bounce duration-1000 select-none shadow-lg">
                          {chat.generatedPoster.image}
                        </div>

                        <div className="text-[8px] font-mono opacity-60 tracking-wider">
                          MERCH DEMAND CORE ENGINE • VER: 2026
                        </div>
                      </div>

                      <div className="p-3 bg-neutral-900/60 border-t border-[#2F3336] flex items-center justify-between">
                        <span className="text-[10px] font-mono text-[#8B949E]">
                          风格: <span className="text-white capitalize">{chat.generatedPoster.theme === 'dark' ? '潮冷暗黑' : chat.generatedPoster.theme === 'classic' ? '现代极简' : '奶油法式'}</span>
                        </span>
                        
                        <button
                          type="button"
                          disabled={chat.generatedPoster.isDeployed}
                          onClick={() => {
                            setStoreHeadline(chat.generatedPoster!.title);
                            updateChatMessageCustomField(chat.id, (m) => ({
                              ...m,
                              generatedPoster: { ...m.generatedPoster, isDeployed: true }
                            }));
                            setLogs((p) => [
                              ...p,
                              {
                                id: Math.random().toString(),
                                timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
                                sender: selectedStaff.role,
                                emoji: '🎨',
                                message: `⚙️ 【Sidekick 热更新】主店标语已热部署升级为：“${chat.generatedPoster!.title}”！`,
                                type: 'success'
                              }
                            ]);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono transition-all flex items-center space-x-1 cursor-pointer ${
                            chat.generatedPoster.isDeployed 
                              ? 'bg-neutral-800 border border-neutral-700 text-neutral-500 cursor-not-allowed'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-sky-500/20 active:scale-95'
                          }`}
                        >
                          <Check className="w-3 h-3" />
                          <span>{chat.generatedPoster.isDeployed ? '店铺招牌已生效上线' : '一键发布至网店主页'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Render 2: Generated Copywriting Canvas Workspace */}
                  {chat.generatedCopywriting && (
                    <div className="mt-3 p-3 overflow-hidden rounded-xl border border-[#2F3336] bg-[#0c0c0e] text-[#E5E5E5] text-left space-y-3">
                      <div className="flex items-center justify-between border-b border-[#2F3336] pb-2 text-[10px] font-mono font-bold tracking-wider text-rose-500">
                        <span className="flex items-center space-x-1">
                          <Sparkles className="w-3 h-3 text-rose-400 animate-spin" />
                          <span>小红书高流量文案工作室 [Red Book Workspace]</span>
                        </span>
                      </div>

                      <div className="space-y-2 bg-[#050506] border border-[#2F3336]/60 rounded-lg p-2.5 font-sans">
                        <div className="text-[11px] font-extrabold text-neutral-100 flex items-center space-x-1.5 border-b border-[#2F3336]/30 pb-1">
                          <span className="text-rose-500">📌</span>
                          <span>{chat.generatedCopywriting.title}</span>
                        </div>
                        <p className="text-[10px] leading-relaxed font-mono text-neutral-300 select-all whitespace-pre-wrap">
                          {chat.generatedCopywriting.body}
                        </p>
                        <div className="flex flex-wrap gap-1 pt-1.5 border-t border-[#2F3336]/30 animate-pulse">
                          {chat.generatedCopywriting.tags.map((tg, i) => (
                            <span key={i} className="text-[8px] bg-rose-950/20 text-rose-400 border border-rose-500/10 px-1.5 py-0.5 rounded">
                              #{tg}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5 bg-[#08080a] p-2 rounded-lg border border-[#2F3336]/30 font-mono">
                        <div className="flex justify-between items-center text-[9px] text-neutral-400">
                          <span>情感核心倾向微调 (Interactive Tone Selector)</span>
                          <span className="text-rose-400 font-bold">
                            {chat.generatedCopywriting.tone === 'classic' ? '轻奢优雅' : chat.generatedCopywriting.tone === 'hype' ? '爆品引流' : '匠心知性'}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const isRetail = industry.id === 'retail';
                              const bodyText = isRetail 
                                ? "爆红单品来袭！天然100%呼吸亚麻质地的法式风行款，真的是早春保暖又透气的绝密神仙物料！挺阔有骨骨感，回头率大爆炸！"
                                : "姐妹们薅秃这家古法老字号！双人套餐大红大火，经典意面爽滑弹牙，辣劲爆浆，精排霸王餐好吃到哭！全站冲冲冲！";
                              updateChatMessageCustomField(chat.id, (m) => ({
                                ...m,
                                generatedCopywriting: { 
                                  ...m.generatedCopywriting, 
                                  tone: 'hype', 
                                  body: bodyText,
                                  rating: 98,
                                  emotionalScore: 92
                                }
                              }));
                            }}
                            className={`flex-1 text-[8px] py-1 border rounded transition-all cursor-pointer ${
                              chat.generatedCopywriting.tone === 'hype' 
                                ? 'bg-rose-950/30 border-rose-500 text-rose-300 font-bold' 
                                : 'border-[#2F3336] text-neutral-400 hover:bg-neutral-900'
                            }`}
                          >
                            🔥 燥热吸粉
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const isRetail = industry.id === 'retail';
                              const bodyText = isRetail 
                                ? "好衣服能写满光阴。严选100%法国麻，它的松弛、骨挺与清雅，无一不在演绎着关于高阶审美的独立意志。低调、克制，通勤首推。"
                                : "岁月是一缕香浓。在老街头用八小时慢熬出一锅香郁。意式手工宽面里揉入的是质朴的心思。一箸入口，恰如风土的回响。";
                              updateChatMessageCustomField(chat.id, (m) => ({
                                ...m,
                                generatedCopywriting: { 
                                  ...m.generatedCopywriting, 
                                  tone: 'intellectual', 
                                  body: bodyText,
                                  rating: 91,
                                  emotionalScore: 94
                                }
                              }));
                            }}
                            className={`flex-1 text-[8px] py-1 border rounded transition-all cursor-pointer ${
                              chat.generatedCopywriting.tone === 'intellectual' 
                                ? 'bg-sky-950/30 border-sky-500 text-emerald-300 font-bold' 
                                : 'border-[#2F3336] text-neutral-400 hover:bg-neutral-900'
                            }`}
                          >
                            ☕ 深沉匠心
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const isRetail = industry.id === 'retail';
                              const bodyText = isRetail 
                                ? "懂行的人都在穿这件！100%呼吸感亚麻质地的法式风行款，真的是早春降降温穿搭神仙单品！它的天然亚麻面料轻盈透气，有一种慵懒松弛的高级感。"
                                : "姐妹们！今天终于薅到了这家宝藏老字号的羊毛！一进门就被它复古的环境震撼到，双人霸王餐简直是性价比之王！那碗意面裹满了秘制酱汁，巨美味！";
                              updateChatMessageCustomField(chat.id, (m) => ({
                                ...m,
                                generatedCopywriting: { 
                                  ...m.generatedCopywriting, 
                                  tone: 'classic', 
                                  body: bodyText,
                                  rating: 94,
                                  emotionalScore: 85
                                }
                              }));
                            }}
                            className={`flex-1 text-[8px] py-1 border rounded transition-all cursor-pointer ${
                              chat.generatedCopywriting.tone === 'classic' 
                                ? 'bg-indigo-950/30 border-indigo-500 text-indigo-300 font-bold' 
                                : 'border-[#2F3336] text-neutral-400 hover:bg-neutral-900'
                            }`}
                          >
                            ⚜ 经典优雅
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-[#2F3336] pt-2">
                        <div className="flex space-x-3 text-[8.5px] font-mono text-neutral-500">
                          <div>
                            爆款红利转化率: <span className="text-[#10b981] font-bold">{chat.generatedCopywriting.rating}%</span>
                          </div>
                          <div>
                            点击倾向: <span className="text-yellow-400 font-bold">{chat.generatedCopywriting.emotionalScore} 分</span>
                          </div>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(`${chat.generatedCopywriting!.title}\n\n${chat.generatedCopywriting!.body}\n\n${chat.generatedCopywriting!.tags.map(m=>'#'+m).join(' ')}`);
                            setLogs((p) => [
                              ...p,
                              {
                                id: Math.random().toString(),
                                timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
                                sender: '系统听写',
                                emoji: '📋',
                                message: `✔ 小红书文案已成功一键同步至切板面板！`,
                                type: 'success'
                              }
                            ]);
                          }}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 border border-rose-500/20 rounded text-[9px] font-bold text-white transition-all cursor-pointer flex items-center space-x-1 active:scale-95"
                        >
                          <Copy className="w-2.5 h-2.5" />
                          <span>一键复制爆款推文</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Render 3: Generated Product Sourcing Forecast ERP Card */}
                  {chat.generatedPrediction && (
                    <div className="mt-3 p-3 overflow-hidden rounded-xl border border-[#2F3336] bg-[#0c0c0e] text-[#E5E5E5] text-left space-y-3 font-mono text-[9.5px]">
                      <div className="flex items-center justify-between border-b border-[#2F3336] pb-2 text-[10px] font-bold tracking-wider text-yellow-500">
                        <span className="flex items-center space-x-1">
                          <LineChart className="w-3.5 h-3.5 text-yellow-500" />
                          <span>AI供应链测款与ROI反向精算 [Merchandiser Predict]</span>
                        </span>
                      </div>

                      <div className="space-y-1.5 p-2 bg-[#050506] rounded-lg border border-[#2F3336]/40">
                        <div className="flex justify-between items-center text-xs font-bold text-white border-b border-neutral-900 pb-1">
                          <span>推荐商品名 (SPU Name)</span>
                          <span className="text-yellow-400 text-[10px] text-right font-extrabold max-w-[130px] truncate">{chat.generatedPrediction.name}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1 text-neutral-400 border-b border-neutral-900 pb-1.5">
                          <div className="flex justify-between">
                            <span>供应链物料成本:</span>
                            <span className="text-neutral-200">¥{chat.generatedPrediction.cost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span>建档建议零售价:</span>
                            <span className="text-sky-400">¥{chat.generatedPrediction.price}</span>
                          </div>
                          <div className="flex justify-between col-span-2">
                            <span>毛益加乘倍数:</span>
                            <span className="text-yellow-400 font-bold">{chat.generatedPrediction.markup}% ({(chat.generatedPrediction.price / chat.generatedPrediction.cost).toFixed(1)}x Cost)</span>
                          </div>
                        </div>

                        <div className="pt-2 space-y-1">
                          <div className="flex justify-between text-[8.5px]">
                            <span className="text-neutral-500 font-sans">交互式演算利润率 (Slide to Adjust Markup):</span>
                            <span className="text-indigo-400 font-bold">{chat.generatedPrediction.markup}%</span>
                          </div>
                          <input
                            type="range"
                            min="120"
                            max="450"
                            value={chat.generatedPrediction.markup}
                            onChange={(e) => {
                              const newMarkup = parseInt(e.target.value);
                              const calculatedPrice = Math.floor(chat.generatedPrediction!.cost * (newMarkup / 100));
                              const priceRatio = calculatedPrice / chat.generatedPrediction!.cost;
                              let valROI = 78;
                              if (priceRatio >= 1.5 && priceRatio <= 3.5) {
                                valROI = Math.floor(92 - (priceRatio - 2.5) * (priceRatio - 2.5) * 15);
                              } else {
                                valROI = Math.floor(62 - Math.abs(priceRatio - 2.5) * 12);
                              }
                              updateChatMessageCustomField(chat.id, (m) => ({
                                ...m,
                                generatedPrediction: {
                                  ...m.generatedPrediction,
                                  markup: newMarkup,
                                  price: calculatedPrice,
                                  predictedROI: Math.max(30, Math.min(99, valROI))
                                }
                              }));
                            }}
                            className="w-full h-1 bg-neutral-900 rounded appearance-none cursor-pointer accent-yellow-400"
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[8.5px] text-neutral-400 pt-1">
                        <span>首月综合销路热度 / ROI 预估:</span>
                        <span className="text-sky-400 font-bold font-mono">
                          {chat.generatedPrediction.predictedROI}分 / ROI ~ 1:{(chat.generatedPrediction.price / chat.generatedPrediction.cost * 0.85).toFixed(1)}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={chat.generatedPrediction.isUploaded}
                        onClick={() => {
                          const newItem = {
                            id: 'p' + Math.floor(Math.random() * 1000 + 100),
                            name: chat.generatedPrediction!.name,
                            price: chat.generatedPrediction!.price,
                            stock: 250,
                            image: industry.id === 'catering' ? '🍲' : '👚'
                          };
                          setProductsList((prev) => [...prev, newItem]);
                          updateChatMessageCustomField(chat.id, (m) => ({
                            ...m,
                            generatedPrediction: { ...m.generatedPrediction, isUploaded: true }
                          }));
                          setLogs((prev) => [
                            ...prev,
                            {
                              id: Math.random().toString(),
                              timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
                              sender: 'AI商品经理',
                              emoji: '📦',
                              message: `✔ 【ERP 建档成功】爆款商品【${newItem.name}】精算定价为 ¥${newItem.price} 元并上架，今日同步配置初始现货 ${newItem.stock} 件。`,
                              type: 'success'
                            }
                          ]);
                        }}
                        className={`w-full py-1.5 rounded-lg text-center font-bold tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                          chat.generatedPrediction.isUploaded
                            ? 'bg-neutral-800 border border-neutral-700 text-neutral-500 cursor-not-allowed'
                            : 'bg-yellow-500 hover:bg-yellow-400 text-black border border-yellow-500/20 active:scale-95 font-sans'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{chat.generatedPrediction.isUploaded ? '已一建录单并在前端货架发布' : '批准建档：录入 ERP 后台并在网店上架'}</span>
                      </button>
                    </div>
                  )}

                  {/* Render 4: Generated Sensory Analysis Image Center Card */}
                  {chat.analyzedImage && (
                    <div className="mt-3 p-3 overflow-hidden rounded-xl border border-[#2F3336] bg-[#0c0c0e] text-[#E5E5E5] text-left space-y-3 font-mono text-[9.5px]">
                      <div className="flex items-center justify-between border-b border-[#2F3336] pb-2 text-[10px] font-bold tracking-wider text-sky-400">
                        <span className="flex items-center space-x-1.5">
                          <Server className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                          <span>AI 商品视觉像素解构终端 [Eye CV Studio]</span>
                        </span>
                      </div>

                      <div className="flex space-x-3 items-start bg-[#050506] p-2 rounded-lg border border-[#2F3336]/40">
                        <div className="w-14 h-14 rounded border border-[#2F3336] bg-neutral-900 overflow-hidden shrink-0 relative flex items-center justify-center">
                          {chat.analyzedImage.imageBase64 ? (
                            <img
                              src={chat.analyzedImage.imageBase64}
                              alt="Item Source"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <FileImage className="w-6 h-6 text-neutral-600" />
                          )}
                          <div className="absolute inset-0 border border-sky-500/20 animate-pulse pointer-events-none" />
                        </div>

                        <div className="flex-1 space-y-1.5 text-[10px] text-neutral-300">
                          <div className="flex justify-between text-[11px] font-bold text-white border-b border-neutral-900 pb-1">
                            <span>材质来源图纸</span>
                            <span className="text-sky-400 max-w-[110px] truncate" title={chat.analyzedImage.name}>
                              {chat.analyzedImage.name}
                            </span>
                          </div>
                          
                          <div className="space-y-1">
                            <span className="text-neutral-500 text-[8px] block">高灵敏色素吸取 (Visual Swatches):</span>
                            <div className="flex flex-wrap gap-1">
                              {chat.analyzedImage.colorPalette.map((col, idx) => {
                                const hexVal = col.split(' ')[0] || '#4B5563';
                                return (
                                  <div key={idx} className="flex items-center space-x-1 border border-[#2F3336]/40 bg-[#0d0d0f] rounded px-1.5 py-0.5 scale-90 origin-left">
                                    <span className="w-2.5 h-2.5 rounded-sm border border-neutral-800" style={{ backgroundColor: hexVal }} />
                                    <span className="text-[7.5px] text-neutral-400">{col.split(' ')[1] || 'Color'}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      {chat.analyzedImage.detectedSPUs.length > 0 && (
                        <div className="space-y-1 p-2 bg-[#09090b] rounded border border-[#2F3336]/30">
                          <span className="text-[#8B949E] text-[8.5px] block font-bold">💎 智能提取微操卖点 (SPU Key Elements):</span>
                          <ul className="space-y-1 text-neutral-300 list-disc list-inside">
                            {chat.analyzedImage.detectedSPUs.map((spu, idx) => (
                              <li key={idx} className="list-none flex items-start space-x-1">
                                <span className="text-[#10b981] font-bold">✔</span>
                                <span>{spu}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="p-2 bg-sky-950/10 border border-sky-500/10 text-emerald-300/90 leading-relaxed text-[8.5px] rounded-lg">
                        {chat.analyzedImage.textIdea}
                      </div>

                      <div className="flex items-center space-x-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            triggerAICopywriter();
                          }}
                          className="flex-1 py-1 px-2 text-center text-[9px] font-bold bg-[#1D9BF0] hover:bg-[#38BDF8] text-white rounded transition-all cursor-pointer border border-[#1D9BF0]/10"
                        >
                          ✍ 一键编写种草笔记
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            triggerAICreativePoster();
                          }}
                          className="flex-1 py-1 px-2 text-center text-[9px] font-bold bg-neutral-900 border border-[#2F3336] text-[#8B949E] hover:text-white rounded transition-all cursor-pointer hover:bg-neutral-800"
                        >
                          🎨 渲染视觉宣传海报
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
 
             {isTyping && (
               <div className="flex flex-col items-start max-w-[80%] text-left">
                 <div className="flex items-center space-x-1.5 mb-1 text-[10px] text-[#8B949E] font-mono">
                   <span>{selectedStaff.emoji}</span>
                   <span>【{selectedStaff.name}】正在进行大网调优、整合数据...</span>
                 </div>
                 <div className="p-3 rounded-xl border bg-[#09090B] border-[#2F3336] text-xs flex items-center space-x-1.5">
                   <span className="w-1.5 h-1.5 rounded-full bg-[#8B949E] animate-bounce" />
                   <span className="w-1.5 h-1.5 rounded-full bg-[#8B949E] animate-bounce [animation-delay:0.2s]" />
                   <span className="w-1.5 h-1.5 rounded-full bg-[#8B949E] animate-bounce [animation-delay:0.4s]" />
                 </div>
               </div>
             )}
             <div ref={bottomChatsRef} />
           </div>

          {/* Quick interactive suggest shortcuts panel */}
          <div className="px-3 py-1.5 bg-[#09090B] border-t border-[#2F3336]/40 text-left">
            <span className="text-[9px] text-[#8B949E] uppercase tracking-wider font-mono block mb-1">
              推荐指令 / Suggestions
            </span>
            <div className="flex flex-wrap gap-1.5 pb-1 max-h-[72px] overflow-y-auto scrollbar">
              {getPromptShortcuts(selectedStaff.role).map((shortcut, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleShortcutClick(shortcut.prompt)}
                  className="text-[9px] bg-neutral-900 hover:bg-neutral-800 border border-[#2F3336] text-neutral-300 rounded px-2 py-0.5 cursor-pointer transition-colors font-mono flex items-center space-x-1 hover:text-white"
                >
                  <span>🚀</span>
                  <span>{shortcut.label}</span>
                </button>
              ))}
            </div>
          </div>
 
           {/* Chat input submit box form */}
           <form onSubmit={handleChatSubmit} className="p-3 border-t border-[#2F3336] bg-[#09090B] flex flex-col space-y-2 shrink-0">
             {/* Premium Advanced AI Action Toolbar inside form container */}
             <div className="flex items-center justify-between text-left pb-1 border-b border-[#2F3336]/30">
               <div className="flex items-center space-x-1">
                 <Sparkles className="w-3 h-3 text-sky-400 animate-pulse" />
                 <span className="text-[9px] font-bold text-neutral-300 tracking-wider font-mono">
                   AI 战略多模态行动工具条 (Premium Copilot Tool Belt)
                 </span>
               </div>
               <div className="flex items-center space-x-1.5">
                 <button
                   type="button"
                   onClick={triggerAICreativePoster}
                   className="text-[9px] bg-sky-950/40 hover:bg-sky-900 border border-sky-500/20 text-emerald-300 rounded px-2 py-0.5 cursor-pointer transition-all active:scale-95 duration-100 font-sans"
                 >
                   🎨 视觉海报
                 </button>
                 <button
                   type="button"
                   onClick={triggerAICopywriter}
                   className="text-[9px] bg-rose-950/40 hover:bg-rose-900 border border-rose-500/20 text-rose-300 rounded px-2 py-0.5 cursor-pointer transition-all active:scale-95 duration-100 font-sans"
                 >
                   ✍ 文案开发
                 </button>
                 <button
                   type="button"
                   onClick={triggerAIPrediction}
                   className="text-[9px] bg-yellow-950/40 hover:bg-yellow-900 border border-yellow-500/20 text-yellow-300 rounded px-2 py-0.5 cursor-pointer transition-all active:scale-95 duration-100 font-sans"
                 >
                   🔮 爆款微测
                 </button>
               </div>
             </div>

             <div className="flex items-center space-x-2 w-full">
               {voiceState !== 'idle' ? (
                 /* Voice recording Waveform View replacing input box */
                 <div className="flex-1 h-9 bg-neutral-900 border border-rose-500/40 rounded-lg flex items-center justify-between px-3 text-white font-mono text-[9px] animate-pulse w-full">
                   <div className="flex items-center space-x-2 relative">
                     <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute" />
                     <span className="w-2 h-2 rounded-full bg-rose-500 relative" />
                     <span className="font-bold pl-1">
                       {voiceState === 'listening' ? '高精语音听感捕捉中...' : '深度识素译谱中...'}
                     </span>
                   </div>
                   
                   {/* Oscillating visual bars */}
                   <div className="flex items-center space-x-0.5 h-3">
                     {voiceWaveformArr.map((vol, idx) => (
                       <div
                         key={idx}
                         className="w-0.5 bg-rose-500 rounded-sm"
                         style={{ height: `${vol}px`, minHeight: '2px' }}
                       />
                     ))}
                   </div>

                   <button
                     type="button"
                     onClick={() => {
                       setVoiceState('idle');
                       setLogs((prev) => [
                         ...prev,
                         {
                           id: Math.random().toString(),
                           timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
                           sender: '控制台',
                           emoji: '🎙',
                           message: '创始人取消了语音输入。',
                           type: 'info'
                         }
                       ]);
                     }}
                     className="p-1 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded transition-colors cursor-pointer"
                   >
                     <X className="w-3 h-3" />
                   </button>
                 </div>
               ) : (
                 /* Normal view with text input & multi-modal buttons */
                 <div className="flex-1 flex items-center gap-1.5 min-w-0">
                   {/* Upload picker */}
                   <div className="relative group shrink-0">
                     <input
                       type="file"
                       accept="image/*"
                       onChange={(e) => {
                         const file = e.target.files?.[0];
                         if (file) {
                           const reader = new FileReader();
                           reader.onload = (event) => {
                             const base64Str = event.target?.result as string;
                             setAttachedImage(base64Str);
                             setAttachedImageName(file.name);
                           };
                           reader.readAsDataURL(file);
                         }
                       }}
                       className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                       id="multi-modal-file-picker"
                     />
                     <button
                       type="button"
                       className="p-2 bg-neutral-900 border border-[#2F3336] rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer"
                       title="上传大底图片进行AI多模层分析"
                     >
                       <Image className="w-3.5 h-3.5" />
                       <span className="sr-only">Upload Asset</span>
                     </button>
                   </div>

                   {/* Microphone activator trigger */}
                   <button
                     type="button"
                     onClick={handleVoiceSimulationStart}
                     className="p-2 bg-neutral-900 border border-[#2F3336] rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer shrink-0"
                     title="高精语音听写"
                   >
                     <Mic className="w-3.5 h-3.5 animate-pulse" />
                   </button>

                   {/* Text input with floating preview */}
                   <div className="flex-1 relative flex items-center min-w-0">
                     <input
                       type="text"
                       value={chatMessage}
                       onChange={(e) => setChatMessage(e.target.value)}
                       placeholder={
                         attachedImage 
                           ? `[素材就绪: ${attachedImageName}] 点击右侧 Scan 开始解析` 
                           : `向【${selectedStaff.role}】的 ${selectedStaff.name} 下指任务指令...`
                       }
                       className="w-full bg-black border border-[#2F3336] focus:border-[#1D9BF0] rounded-lg py-2 pl-3 pr-24 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#1D9BF0] truncate"
                     />
                     
                     {attachedImage && (
                       <div className="absolute right-1 flex items-center space-x-1 bg-neutral-900/95 border border-[#2F3336] p-0.5 rounded z-20 scale-90">
                         <div className="w-4 h-4 rounded overflow-hidden border border-neutral-800 shrink-0">
                           <img src={attachedImage} alt="attached draft" className="w-full h-full object-cover" />
                         </div>
                         <button
                           type="button"
                           onClick={() => handleLocalImageScan(attachedImage!, attachedImageName || 'image_spec.png')}
                           className="text-[8px] bg-[#1D9BF0] hover:bg-[#38BDF8] font-bold px-1.5 py-0.5 rounded text-white flex items-center transition-all cursor-pointer active:scale-95 shrink-0"
                           title="多模态智能感知识别"
                         >
                           <span>Scan</span>
                         </button>
                         <button
                           type="button"
                           onClick={() => {
                             setAttachedImage(null);
                             setAttachedImageName(null);
                           }}
                           className="p-0.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors cursor-pointer shrink-0"
                         >
                           <X className="w-2.5 h-2.5" />
                         </button>
                       </div>
                     )}
                   </div>
                 </div>
               )}

               <button
                 type="submit"
                 disabled={voiceState !== 'idle' || isTyping}
                 className={`p-2 rounded-lg text-white font-mono flex items-center justify-center shrink-0 border cursor-pointer active:scale-95 duration-150 ${
                   voiceState !== 'idle' || isTyping
                     ? 'bg-neutral-800 border-neutral-700 text-neutral-500 cursor-not-allowed'
                     : 'bg-[#1D9BF0] hover:bg-[#38BDF8] border-[#1D9BF0]/25'
                 }`}
               >
                 <Send className="w-3.5 h-3.5" />
               </button>
             </div>
           </form>

        </section>

      </div>
    </div>
  );
}
