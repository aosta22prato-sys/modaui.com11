import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { 
  TrendingUp, DollarSign, Sparkles, Plus, RefreshCw, Layers, 
  HelpCircle, CheckCircle, Flame, ArrowUpRight, Activity
} from 'lucide-react';
import { motion } from 'motion/react';

interface ChartData {
  date: string;
  revenue: number;
  transactions: number;
}

interface D3FinancialStreamChartProps {
  industryId: string;
  industryName: string;
}

// Fixed design specs for each of the 6 core industries
const INDUSTRY_SPECS: Record<string, {
  color: string;
  gradient: [string, string];
  unitName: string;
  defaultAvgTicket: number;
}> = {
  fashion: {
    color: '#D4AF37', // Gold
    gradient: ['#F2C94C', '#B27A23'],
    unitName: '件高奢打样',
    defaultAvgTicket: 850
  },
  catering: {
    color: '#F2994A', // Orange
    gradient: ['#F2994A', '#F55B14'],
    unitName: '客单外卖折算',
    defaultAvgTicket: 45
  },
  retail: {
    color: '#10B981', // Emerald
    gradient: ['#34D399', '#047857'],
    unitName: '件跨境日用',
    defaultAvgTicket: 120
  },
  beauty: {
    color: '#EC4899', // Pink / Rose
    gradient: ['#F472B6', '#BE185D'],
    unitName: '人次明星年卡',
    defaultAvgTicket: 1500
  },
  hotel: {
    color: '#0EA5E9', // Sky Blue
    gradient: ['#38BDF8', '#0369A1'],
    unitName: '间尾房清仓别院',
    defaultAvgTicket: 680
  },
  influencer: {
    color: '#6366F1', // Indigo / Purple
    gradient: ['#818CF8', '#3730A3'],
    unitName: '单直播憋爆品货单',
    defaultAvgTicket: 88
  }
};

// Raw initial data tailored to highlight each industry's distinct market scale
const BASE_REVENUE_TEMPLATES: Record<string, ChartData[]> = {
  fashion: [
    { date: '5/30', revenue: 4500, transactions: 6 },
    { date: '5/31', revenue: 5200, transactions: 7 },
    { date: '6/01', revenue: 4800, transactions: 6 },
    { date: '6/02', revenue: 6100, transactions: 9 },
    { date: '6/03', revenue: 5800, transactions: 8 },
    { date: '6/04', revenue: 7200, transactions: 11 },
    { date: '6/05', revenue: 8500, transactions: 13 },
  ],
  catering: [
    { date: '5/30', revenue: 3200, transactions: 72 },
    { date: '5/31', revenue: 3600, transactions: 80 },
    { date: '6/01', revenue: 3400, transactions: 75 },
    { date: '6/02', revenue: 3900, transactions: 86 },
    { date: '6/03', revenue: 4100, transactions: 91 },
    { date: '6/04', revenue: 5600, transactions: 124 },
    { date: '6/05', revenue: 6100, transactions: 135 },
  ],
  retail: [
    { date: '5/30', revenue: 5800, transactions: 48 },
    { date: '5/31', revenue: 6200, transactions: 51 },
    { date: '6/01', revenue: 5900, transactions: 49 },
    { date: '6/02', revenue: 6700, transactions: 55 },
    { date: '6/03', revenue: 7100, transactions: 59 },
    { date: '6/04', revenue: 8200, transactions: 68 },
    { date: '6/05', revenue: 9100, transactions: 75 },
  ],
  beauty: [
    { date: '5/30', revenue: 7200, transactions: 5 },
    { date: '5/31', revenue: 6800, transactions: 4 },
    { date: '6/01', revenue: 8100, transactions: 6 },
    { date: '6/02', revenue: 7500, transactions: 5 },
    { date: '6/03', revenue: 9200, transactions: 7 },
    { date: '6/04', revenue: 11000, transactions: 8 },
    { date: '6/05', revenue: 12500, transactions: 9 },
  ],
  hotel: [
    { date: '5/30', revenue: 12000, transactions: 18 },
    { date: '5/31', revenue: 10500, transactions: 15 },
    { date: '6/01', revenue: 11000, transactions: 16 },
    { date: '6/02', revenue: 13500, transactions: 20 },
    { date: '6/03', revenue: 15000, transactions: 22 },
    { date: '6/04', revenue: 19000, transactions: 28 },
    { date: '6/05', revenue: 22000, transactions: 32 },
  ],
  influencer: [
    { date: '5/30', revenue: 15000, transactions: 170 },
    { date: '5/31', revenue: 22000, transactions: 250 },
    { date: '6/01', revenue: 18000, transactions: 205 },
    { date: '6/02', revenue: 35000, transactions: 398 },
    { date: '6/03', revenue: 29000, transactions: 330 },
    { date: '6/04', revenue: 48000, transactions: 545 },
    { date: '6/05', revenue: 55000, transactions: 625 },
  ],
};

export default function D3FinancialStreamChart({ industryId, industryName }: D3FinancialStreamChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Current industry specifications
  const spec = useMemo(() => {
    return INDUSTRY_SPECS[industryId] || INDUSTRY_SPECS.fashion;
  }, [industryId]);

  // Dynamic state keeping isolated datasets per industry to support dynamic sales stimulation
  const [datasets, setDatasets] = useState<Record<string, ChartData[]>>(() => {
    return JSON.parse(JSON.stringify(BASE_REVENUE_TEMPLATES));
  });

  const [activeData, setActiveData] = useState<ChartData[]>([]);
  const [hoveredNode, setHoveredNode] = useState<ChartData | null>(null);
  const [realtimePulse, setRealtimePulse] = useState<boolean>(false);
  const [simulationEffect, setSimulationEffect] = useState<string | null>(null);

  // Sync active dataset when industryId or datasets updates
  useEffect(() => {
    if (datasets[industryId]) {
      setActiveData([...datasets[industryId]]);
    } else {
      setActiveData([...BASE_REVENUE_TEMPLATES.fashion]);
    }
  }, [industryId, datasets]);

  // Totalized stats for selected industry
  const totals = useMemo(() => {
    if (!activeData.length) return { revenue: 0, transactions: 0, maxVal: 1000 };
    const rev = activeData.reduce((acc, d) => acc + d.revenue, 0);
    const tx = activeData.reduce((acc, d) => acc + d.transactions, 0);
    const maxVal = Math.max(...activeData.map(d => d.revenue));
    return { revenue: rev, transactions: tx, maxVal };
  }, [activeData]);

  // Inject a new mock transaction (Live sales simulation)
  const handleSimulateSale = () => {
    const amt = Math.floor(spec.defaultAvgTicket * (0.85 + Math.random() * 0.4));
    setDatasets(prev => {
      const copy = { ...prev };
      const list = [...(copy[industryId] || [])];
      
      // Update last day's metrics (or create a new day if empty)
      if (list.length > 0) {
        const lastIndex = list.length - 1;
        list[lastIndex] = {
          ...list[lastIndex],
          revenue: list[lastIndex].revenue + amt,
          transactions: list[lastIndex].transactions + 1
        };
      }
      copy[industryId] = list;
      return copy;
    });

    setSimulationEffect(`+¥${amt.toLocaleString()}`);
    setRealtimePulse(true);
    setTimeout(() => {
      setSimulationEffect(null);
      setRealtimePulse(false);
    }, 1800);
  };

  // Main D3 Rendering Pipeline
  useEffect(() => {
    if (!svgRef.current || !activeData.length || !containerRef.current) return;

    // 1. Setup responsive dimensions from observer or bounding container
    const margin = { top: 30, right: 20, bottom: 40, left: 55 };
    const width = containerRef.current.clientWidth || 500;
    const height = 260;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create D3 selections
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clean container to enforce pure state-driven updates

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // 2. Setup D3 Scales
    const x = d3.scalePoint()
      .domain(activeData.map(d => d.date))
      .range([0, innerWidth]);

    const y = d3.scaleLinear()
      .domain([0, Math.ceil(totals.maxVal * 1.15)])
      .range([innerHeight, 0]);

    // 3. Render gridlines (Y-axis only for ultra-clean look)
    const gridG = g.append('g').attr('class', 'grid').attr('opacity', 0.15);
    y.ticks(5).forEach(tickVal => {
      gridG.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', y(tickVal))
        .attr('y2', y(tickVal))
        .attr('stroke', '#E4E4E5')
        .attr('stroke-width', 0.8)
        .attr('stroke-dasharray', '3 3');
    });

    // 4. Define linear gradients for rich aesthetic filling (brand thematic matching)
    const defs = svg.append('defs');
    const areaGradId = `area-gradient-${industryId}`;
    const areaGrad = defs.append('linearGradient')
      .attr('id', areaGradId)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    areaGrad.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', spec.color)
      .attr('stop-opacity', 0.25);

    areaGrad.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', spec.color)
      .attr('stop-opacity', 0.0);

    // 5. Build Generator Functions for Paths
    const areaGenerator = d3.area<ChartData>()
      .x(d => x(d.date) || 0)
      .y0(innerHeight)
      .y1(d => y(d.revenue))
      .curve(d3.curveMonotoneX);

    const lineGenerator = d3.line<ChartData>()
      .x(d => x(d.date) || 0)
      .y(d => y(d.revenue))
      .curve(d3.curveMonotoneX);

    // 6. Draw Glowing Area Under Line
    g.append('path')
      .datum(activeData)
      .attr('class', 'area')
      .attr('d', areaGenerator)
      .attr('fill', `url(#${areaGradId})`)
      .attr('opacity', 0); // Start at 0 for entrance animation

    // 7. Draw The Core Colored Line
    const path = g.append('path')
      .datum(activeData)
      .attr('class', 'line-path')
      .attr('fill', 'none')
      .attr('stroke', spec.color)
      .attr('stroke-width', 2.5)
      .attr('stroke-linecap', 'round')
      .attr('d', lineGenerator);

    // Dynamic stroke dash array offset animation for entrance look
    const totalLength = path.node()?.getTotalLength() || 0;
    path
      .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
      .attr('stroke-dashoffset', totalLength)
      .transition()
      .duration(1200)
      .ease(d3.easeCubicOut)
      .attr('stroke-dashoffset', 0);

    // Fade area back in after stroke draws
    g.select('.area')
      .transition()
      .delay(400)
      .duration(700)
      .attr('opacity', 1);

    // 8. Custom Aesthetic Axes Rendering
    const xAxis = d3.axisBottom(x as any).tickSize(0).tickPadding(10);
    const yAxis = d3.axisLeft(y).ticks(5).tickSize(0).tickPadding(12)
      .tickFormatter(v => `¥${Number(v).toLocaleString()}`);

    const xAxisG = g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    xAxisG.select('.domain').remove();
    xAxisG.selectAll('text')
      .attr('fill', '#8B949E')
      .attr('font-size', '9px')
      .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace');

    const yAxisG = g.append('g')
      .call(yAxis);

    yAxisG.select('.domain').remove();
    yAxisG.selectAll('text')
      .attr('fill', '#8B949E')
      .attr('font-size', '9.5px')
      .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace');

    // 9. Interactive Hover Overlay Dots and Overlay Capturer
    const tooltipLine = g.append('line')
      .attr('class', 'tooltip-line')
      .attr('stroke', '#2F3336')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4 4')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .style('opacity', 0);

    const tooltipFocusedDot = g.append('circle')
      .attr('r', 5)
      .attr('fill', spec.color)
      .attr('stroke', '#09090B')
      .attr('stroke-width', 1.5)
      .style('opacity', 0);

    const trackingRect = g.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair');

    // Map coordinates to data nodes on move
    trackingRect.on('mousemove touchmove', function(event) {
      const [mouseX] = d3.pointer(event);
      const points = activeData.map(d => x(d.date) || 0);
      
      // Find closest node index
      let closestIdx = 0;
      let minDiff = Infinity;
      points.forEach((ptX, idx) => {
        const diff = Math.abs(ptX - mouseX);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });

      const selectedPoint = activeData[closestIdx];
      const selectedX = points[closestIdx];
      const selectedY = y(selectedPoint.revenue);

      tooltipLine
        .attr('x1', selectedX)
        .attr('x2', selectedX)
        .style('opacity', 0.8);

      tooltipFocusedDot
        .attr('cx', selectedX)
        .attr('cy', selectedY)
        .style('opacity', 1);

      setHoveredNode(selectedPoint);
    });

    trackingRect.on('mouseleave touchend', function() {
      tooltipLine.style('opacity', 0);
      tooltipFocusedDot.style('opacity', 0);
      setHoveredNode(null);
    });

  }, [activeData, industryId, totals.maxVal, spec.color]);

  return (
    <div className="bg-[#09090B] border border-[#2F3336] p-5 rounded-xl flex flex-col justify-between space-y-4">
      
      {/* Dynamic Header Block with Isolated Brand Accent */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Activity className="w-4.5 h-4.5" style={{ color: spec.color }} />
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-mono uppercase tracking-wider text-[#8B949E]">
                {industryName} 独立营收监控
              </h3>
              <span className="text-[9px] bg-red-950/40 text-red-500 hover:text-red-400 border border-red-800/40 px-1.5 py-0.2 rounded font-mono select-none duration-250">
                行业隔离
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">D3.js Core Vector Rendering Sandbox</p>
          </div>
        </div>

        {/* Real-time actions and active metrics */}
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleSimulateSale}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#1A1A1E] hover:bg-[#252528] rounded-md border border-[#2F3336] text-[10px] font-mono text-zinc-100 transition-all select-none"
          >
            <Plus className="w-3 h-3 text-emerald-400" />
            模拟成交
          </motion.button>
        </div>
      </div>

      {/* Dynamic isolated metrics scoreboard */}
      <div className="grid grid-cols-3 gap-2 py-1 bg-[#040405] p-3 rounded-lg border border-zinc-950 text-left font-mono">
        <div>
          <span className="text-[9px] text-[#8B949E] block">累计总营收</span>
          <span className="text-xs font-bold text-white">
            ¥{totals.revenue.toLocaleString()}
          </span>
        </div>
        <div>
          <span className="text-[9px] text-[#8B949E] block">全案成交单</span>
          <span className="text-xs font-bold text-white">
            {totals.transactions} 单
          </span>
        </div>
        <div className="relative">
          <span className="text-[9px] text-[#8B949E] block">单位模式</span>
          <span className="text-[10px] text-zinc-300 font-bold truncate block" style={{ color: spec.color }}>
            {spec.unitName}
          </span>
          
          {/* Real-time incoming animation popover */}
          {simulationEffect && (
            <div className="absolute -top-6 right-0 text-[10px] font-bold text-emerald-400 animate-bounce bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800 font-mono z-10 shadow-lg">
              {simulationEffect}
            </div>
          )}
        </div>
      </div>

      {/* SVG Canvas Container with D3 Binding */}
      <div 
        ref={containerRef} 
        className="w-full relative h-[260px] flex items-center justify-center bg-[#05055] select-none rounded-lg"
      >
        <svg ref={svgRef} className="overflow-visible" />
        
        {/* Real-time Heartbeat Glow Dot on upper-right corner */}
        <div className="absolute top-1 right-2 flex items-center space-x-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${realtimePulse ? 'bg-amber-400 scale-200' : 'bg-emerald-500'} duration-200 animate-pulse`} />
          <span className="text-[8px] text-zinc-500 font-mono tracking-wider">REACTIVE</span>
        </div>

        {/* Dynamic Context Tooltip (Interactive HUD) */}
        {hoveredNode && (
          <div className="absolute bg-[#0b0b0e]/95 border border-[#2F3336]/90 p-2.5 rounded shadow-2xl font-mono text-[9.5px] text-zinc-300 space-y-1 select-none pointer-events-none left-1/2 top-1 -translate-x-1/2 flex items-center gap-4">
            <div>
              <span className="text-[8px] text-[#8B949E] block">日期 / 统计节点</span>
              <span className="font-bold text-white">{hoveredNode.date}</span>
            </div>
            <div className="w-px h-5 bg-[#2F3336]" />
            <div>
              <span className="text-[8px] text-[#8B949E] block">单日销售额</span>
              <span className="font-bold text-emerald-400">¥{hoveredNode.revenue.toLocaleString()}</span>
            </div>
            <div className="w-px h-5 bg-[#2F3336]" />
            <div>
              <span className="text-[8px] text-[#8B949E] block">自主算力打单</span>
              <span className="font-bold text-amber-500">{hoveredNode.transactions} 次</span>
            </div>
          </div>
        )}
      </div>

      {/* Security sandbox advice tag */}
      <div className="flex items-center justify-between text-[9px] text-zinc-500 font-mono pt-1">
        <span className="flex items-center gap-1">
          <Flame className="w-3 h-3 text-red-500" />
          行业标识: <strong className="text-zinc-300 select-all font-bold font-mono">{industryId}</strong>
        </span>
        <span>数据已通过 SHA-256 哈希加密隔离</span>
      </div>

    </div>
  );
}
