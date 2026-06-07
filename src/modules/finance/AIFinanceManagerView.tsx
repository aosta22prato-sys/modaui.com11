import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, TrendingUp, TrendingDown, Lightbulb, CheckCircle2, FileText, ArrowRight, BrainCircuit } from 'lucide-react';
import axios from 'axios';

interface AIFinanceManagerViewProps {
  tenantId?: string;
}

export default function AIFinanceManagerView({ tenantId }: AIFinanceManagerViewProps) {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalysis();
  }, [tenantId]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/company/ai-analysis', {
        params: { merchantId: tenantId }
      });
      if (res.data.success) {
        setAnalysis(res.data.analysis);
      }
    } catch (err) {
      console.error('Failed to fetch AI analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl">💰</span>
          </div>
        </div>
        <p className="text-sm text-[#8B949E] font-mono animate-pulse">刘会计正在审计您的经营数据...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
              <span className="text-4xl">💰</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                AI 财务经理 - {analysis?.agentName || '刘会计'}
                <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
              </h2>
              <p className="text-indigo-100 text-sm mt-1">
                <BrainCircuit className="w-4 h-4 inline-block mr-1" />
                已接入实时经营数据链路，正在为您提供经营决策建议
              </p>
            </div>
          </div>
          <button className="bg-white text-indigo-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-50 transition-colors shadow-lg">
            生成详细周报
          </button>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full -ml-24 -mb-24 blur-2xl"></div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: '本期收入', value: `¥${analysis?.metrics?.revenue?.toLocaleString() || '0'}`, trend: '+12.5%', icon: TrendingUp, color: 'text-emerald-400' },
          { label: '本期支出', value: `¥${analysis?.metrics?.expense?.toLocaleString() || '0'}`, trend: '-2.1%', icon: TrendingDown, color: 'text-rose-400' },
          { label: '净利润', value: `¥${analysis?.metrics?.profit?.toLocaleString() || '0'}`, trend: '+18.2%', icon: CheckCircle2, color: 'text-sky-400' },
          { label: '增长率', value: `${analysis?.metrics?.growth || '0'}%`, trend: '领先同行', icon: Sparkles, color: 'text-amber-400' },
        ].map((stat, i) => (
          <div key={i} className="bg-[#09090B] border border-[#2F3336] p-5 rounded-xl group hover:border-[#1D9BF0]/50 transition-all">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[10px] font-mono text-[#8B949E] uppercase tracking-wider">{stat.label}</p>
              <stat.icon className={`w-4 h-4 ${stat.color} opacity-40 group-hover:opacity-100 transition-opacity`} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-white">{stat.value}</span>
            </div>
            <div className="mt-2 flex items-center text-[10px] font-mono">
              <span className={stat.trend.startsWith('+') ? 'text-emerald-400' : 'text-[#8B949E]'}>{stat.trend}</span>
              <span className="text-[#536471] ml-1">vs 上期</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Insights */}
        <div className="bg-[#09090B] border border-[#2F3336] rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            智能经营洞察
          </h3>
          <div className="space-y-3">
            {analysis?.insights?.map((insight: string, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-zinc-900/30 rounded-xl border border-transparent hover:border-[#2F3336] transition-all">
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 shadow-[0_0_8px_rgba(251,191,36,0.5)]"></div>
                <p className="text-xs text-zinc-300 leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-[#09090B] border border-[#2F3336] rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-400" />
            刘会计建议
          </h3>
          <div className="space-y-4">
            {analysis?.recommendations?.map((rec: string, i: number) => (
              <div key={i} className="group flex items-center justify-between p-4 bg-zinc-900/50 rounded-xl border border-[#2F3336] hover:bg-zinc-800/50 transition-all cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-white font-medium">{rec}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-[#8B949E] group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
            ))}
            
            <div className="pt-2">
              <button className="w-full py-3 bg-zinc-900 border border-[#2F3336] text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2">
                <FileText className="w-4 h-4" />
                查看完整分析报告
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
