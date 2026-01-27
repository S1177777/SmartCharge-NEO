import React, { useState, useEffect, useCallback } from 'react';
import { Download, TrendingUp, Clock, CheckCircle, Leaf, AlertCircle, ArrowRight, Zap, ChevronDown, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { ENERGY_CONSUMPTION_DATA, PEAK_HOURS_DATA, REVENUE_PIE_DATA, STATION_PERFORMANCE_DATA } from '../constants';
import { fetchAnalyticsStats, AnalyticsStats } from '../services/api';

const Analytics = () => {
  const [timeRange, setTimeRange] = useState<'Last 30 Days' | 'Last 7 Days' | 'YTD'>('Last 30 Days');
  const [isTimeRangeOpen, setIsTimeRangeOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulated, setIsSimulated] = useState(false);

  // Dynamic Data State
  const [stats, setStats] = useState({
    revenue: "€0",
    revenueTrend: "+0%",
    avgTime: "0m 0s",
    avgTimeTrend: "+0%",
    uptime: "100%",
    uptimeTrend: "+0%",
    co2: "0 Tons",
    co2Trend: "+0%"
  });

  const [graphData, setGraphData] = useState(ENERGY_CONSUMPTION_DATA);

  // 格式化平均时间
  const formatAvgTime = (minutes: number): string => {
    const m = Math.floor(minutes);
    const s = Math.round((minutes - m) * 60);
    return `${m}m ${s}s`;
  };

  // 加载数据
  const loadData = useCallback(async () => {
    setIsLoading(true);
    const range = timeRange === 'Last 7 Days' ? '7d' : timeRange === 'YTD' ? 'ytd' : '30d';

    try {
      const data = await fetchAnalyticsStats(range);

      if (data && data.analytics) {
        setIsSimulated(false);
        setStats({
          revenue: `€${data.analytics.revenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
          revenueTrend: data.analytics.revenueTrend,
          avgTime: formatAvgTime(data.analytics.avgChargeTime),
          avgTimeTrend: '+0%', // 暂时固定，需要后端支持
          uptime: data.analytics.uptime,
          uptimeTrend: '+0.2%', // 暂时固定
          co2: data.analytics.co2Saved,
          co2Trend: '+5%', // 暂时固定
        });

        // 使用后端返回的能源消耗数据，如果为空则使用静态数据
        if (data.analytics.energyConsumptionData && data.analytics.energyConsumptionData.length > 0) {
          setGraphData(data.analytics.energyConsumptionData);
        } else {
          setGraphData(ENERGY_CONSUMPTION_DATA);
        }
      } else {
        // 使用模拟数据
        setIsSimulated(true);
        if (timeRange === 'Last 30 Days') {
          setStats({
            revenue: "€48,295", revenueTrend: "+12.5%",
            avgTime: "42m 15s", avgTimeTrend: "-2.1%",
            uptime: "99.8%", uptimeTrend: "+0.2%",
            co2: "8.5 Tons", co2Trend: "+5.4%"
          });
          setGraphData(ENERGY_CONSUMPTION_DATA);
        } else if (timeRange === 'Last 7 Days') {
          setStats({
            revenue: "€12,450", revenueTrend: "+5.2%",
            avgTime: "38m 20s", avgTimeTrend: "-1.5%",
            uptime: "99.9%", uptimeTrend: "+0.1%",
            co2: "2.1 Tons", co2Trend: "+2.8%"
          });
          setGraphData([
            { name: 'Mon', value: 35 }, { name: 'Tue', value: 42 },
            { name: 'Wed', value: 38 }, { name: 'Thu', value: 55 },
            { name: 'Fri', value: 48 }, { name: 'Sat', value: 62 },
            { name: 'Sun', value: 58 }
          ]);
        } else {
          setStats({
            revenue: "€482,100", revenueTrend: "+24.8%",
            avgTime: "45m 10s", avgTimeTrend: "+1.2%",
            uptime: "99.5%", uptimeTrend: "-0.3%",
            co2: "85.4 Tons", co2Trend: "+15.2%"
          });
          setGraphData([
            { name: 'Jan', value: 240 }, { name: 'Feb', value: 300 },
            { name: 'Mar', value: 280 }, { name: 'Apr', value: 350 },
            { name: 'May', value: 320 }, { name: 'Jun', value: 400 },
            { name: 'Jul', value: 450 }, { name: 'Aug', value: 430 },
            { name: 'Sep', value: 480 }, { name: 'Oct', value: 510 }
          ]);
        }
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
      setIsSimulated(true);
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExport = () => {
    const headers = ["Metric", "Value", "Trend"];
    const rows = [
        ["Total Revenue", stats.revenue, stats.revenueTrend],
        ["Avg Charge Time", stats.avgTime, stats.avgTimeTrend],
        ["Network Uptime", stats.uptime, stats.uptimeTrend],
        ["CO2 Saved", stats.co2, stats.co2Trend]
    ];
    
    const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `analytics_report_${timeRange.replace(/\s/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full overflow-y-auto p-4 lg:p-8 scrollbar-hide">
        <div className="max-w-6xl mx-auto flex flex-col gap-8">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between gap-6 items-start lg:items-center pb-4 border-b border-border-dark">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <h1 className="text-white text-3xl font-bold font-display tracking-tight">Network Overview</h1>
                        {isLoading && <Loader2 className="animate-spin text-primary" size={20} />}
                        {isSimulated && !isLoading && (
                            <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                Demo Data
                            </span>
                        )}
                    </div>
                    <p className="text-text-secondary">Real-time insights and performance metrics across Paris network</p>
                </div>
                <div className="flex items-center gap-3 w-full lg:w-auto">
                     <div className="relative">
                         <button
                             onClick={() => setIsTimeRangeOpen(!isTimeRangeOpen)}
                             className="h-10 pl-4 pr-3 rounded-lg bg-surface-dark text-white text-sm border border-border-dark hover:border-primary/50 transition-all cursor-pointer flex items-center gap-2 min-w-[150px] justify-between shadow-sm"
                         >
                             <span className="truncate">{timeRange}</span>
                             <ChevronDown size={16} className={`text-text-secondary transition-transform duration-200 ${isTimeRangeOpen ? 'rotate-180' : ''}`} />
                         </button>

                         {isTimeRangeOpen && (
                             <div className="absolute top-full right-0 mt-2 w-full min-w-[150px] bg-surface-dark border border-border-dark rounded-lg shadow-xl z-50 flex flex-col py-1 animate-in fade-in zoom-in-95 duration-200">
                                 {(['Last 30 Days', 'Last 7 Days', 'YTD'] as const).map((opt) => (
                                     <button
                                         key={opt}
                                         onClick={() => {
                                             setTimeRange(opt);
                                             setIsTimeRangeOpen(false);
                                         }}
                                         className={`px-4 py-2 text-left text-sm hover:bg-primary/10 transition-colors ${timeRange === opt ? 'text-primary font-medium' : 'text-text-secondary hover:text-white'}`}
                                     >
                                         {opt}
                                     </button>
                                 ))}
                             </div>
                         )}
                     </div>

                     <button 
                        onClick={handleExport}
                        className="h-10 px-4 rounded-lg bg-primary hover:bg-blue-600 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transform duration-200"
                    >
                        <Download size={16} /> Export Report
                     </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 {/* Card 1 */}
                 <div className="rounded-xl p-6 bg-surface-dark border border-border-dark flex flex-col gap-4 relative overflow-hidden group hover:border-primary/30 transition-colors">
                     <div className="flex items-center gap-3">
                         <div className="size-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                             <TrendingUp size={20} />
                         </div>
                         <h3 className="text-text-secondary font-medium text-sm">Total Revenue</h3>
                     </div>
                     <div className="flex items-end gap-3 mt-2">
                         <span className="text-3xl lg:text-4xl font-bold text-white tracking-tight">{stats.revenue}</span>
                         <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md mb-1 ${stats.revenueTrend.startsWith('+') ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                             <span>{stats.revenueTrend}</span>
                         </div>
                     </div>
                 </div>
                 {/* Card 2 */}
                 <div className="rounded-xl p-6 bg-surface-dark border border-border-dark flex flex-col gap-4 relative overflow-hidden group hover:border-purple-500/30 transition-colors">
                     <div className="flex items-center gap-3">
                         <div className="size-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                             <Clock size={20} />
                         </div>
                         <h3 className="text-text-secondary font-medium text-sm">Avg. Charge Time</h3>
                     </div>
                     <div className="flex items-end gap-3 mt-2">
                         <span className="text-3xl lg:text-4xl font-bold text-white tracking-tight">{stats.avgTime}</span>
                         <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md mb-1 ${stats.avgTimeTrend.startsWith('-') ? 'text-rose-400 bg-rose-500/10' : 'text-emerald-400 bg-emerald-500/10'}`}>
                             <span>{stats.avgTimeTrend}</span>
                         </div>
                     </div>
                 </div>
                 {/* Card 3 */}
                 <div className="rounded-xl p-6 bg-surface-dark border border-border-dark flex flex-col gap-4 relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
                     <div className="flex items-center gap-3">
                         <div className="size-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                             <CheckCircle size={20} />
                         </div>
                         <h3 className="text-text-secondary font-medium text-sm">Network Uptime</h3>
                     </div>
                     <div className="flex items-end gap-3 mt-2">
                         <span className="text-3xl lg:text-4xl font-bold text-white tracking-tight">{stats.uptime}</span>
                         <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md mb-1 ${stats.uptimeTrend.startsWith('+') ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                             <span>{stats.uptimeTrend}</span>
                         </div>
                     </div>
                 </div>
                 {/* Card 4 - New CO2 */}
                 <div className="rounded-xl p-6 bg-surface-dark border border-border-dark flex flex-col gap-4 relative overflow-hidden group hover:border-green-400/30 transition-colors">
                     <div className="flex items-center gap-3">
                         <div className="size-10 rounded-lg bg-green-400/20 flex items-center justify-center text-green-400">
                             <Leaf size={20} />
                         </div>
                         <h3 className="text-text-secondary font-medium text-sm">CO₂ Saved</h3>
                     </div>
                     <div className="flex items-end gap-3 mt-2">
                         <span className="text-3xl lg:text-4xl font-bold text-white tracking-tight">{stats.co2}</span>
                         <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md mb-1 ${stats.co2Trend.startsWith('+') ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                             <span>{stats.co2Trend}</span>
                         </div>
                     </div>
                 </div>
            </div>

            {/* Main Area Chart */}
            <div className="rounded-xl border border-border-dark bg-surface-dark p-6 lg:p-8">
                 <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            Total Energy Consumption
                            <span className="text-[10px] font-bold text-text-secondary bg-bg-dark px-2 py-0.5 rounded border border-border-dark uppercase tracking-wider">MWh</span>
                        </h3>
                    </div>
                 </div>
                 <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={graphData}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3c83f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3c83f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <RechartsTooltip 
                                contentStyle={{ backgroundColor: '#101723', borderColor: '#2e3e5b', color: '#fff', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff' }}
                                cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                            />
                            <XAxis dataKey="name" stroke="#566b8c" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                            <Area type="monotone" dataKey="value" stroke="#3c83f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                        </AreaChart>
                    </ResponsiveContainer>
                 </div>
            </div>

            {/* Bottom Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
                {/* Pie Chart */}
                <div className="rounded-xl border border-border-dark bg-surface-dark p-6 flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-6">Revenue by Power Type</h3>
                    <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-8">
                        <div className="h-56 w-56 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={REVENUE_PIE_DATA}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {REVENUE_PIE_DATA.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} stroke="transparent" />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                                <span className="text-text-secondary text-xs uppercase tracking-widest">Total</span>
                                <span className="text-white text-xl font-bold">100%</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-4 w-full md:w-auto">
                            {REVENUE_PIE_DATA.map(item => (
                                <div key={item.name} className="flex items-center justify-between md:justify-start gap-3 w-full">
                                    <span className="size-3 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: item.fill, color: item.fill }}></span>
                                    <div className="flex flex-col">
                                        <span className="text-white text-sm font-medium">{item.name}</span>
                                    </div>
                                    <span className="text-white font-bold ml-auto md:ml-4">{item.value}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bar Chart */}
                <div className="rounded-xl border border-border-dark bg-surface-dark p-6 flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-6">Peak Utilization Hours</h3>
                    <div className="h-56 w-full mt-auto">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={PEAK_HOURS_DATA}>
                                <RechartsTooltip 
                                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                    contentStyle={{ backgroundColor: '#101723', borderColor: '#2e3e5b', color: '#fff', borderRadius: '8px' }}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {PEAK_HOURS_DATA.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 3 ? '#3c83f6' : '#223149'} />
                                    ))}
                                </Bar>
                                <XAxis dataKey="name" stroke="#566b8c" fontSize={10} tickLine={false} axisLine={false} dy={5} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Bottom Row: Top Stations Table & Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-6">
                {/* Top Stations */}
                <div className="lg:col-span-2 rounded-xl border border-border-dark bg-surface-dark p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white">Top Performing Stations</h3>
                        <button className="text-primary text-sm font-medium hover:text-white transition-colors flex items-center gap-1">
                            View All <ArrowRight size={14} />
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-xs text-text-secondary uppercase tracking-wider border-b border-border-dark">
                                    <th className="pb-3 font-medium">Station Name</th>
                                    <th className="pb-3 font-medium">Sessions</th>
                                    <th className="pb-3 font-medium">Revenue</th>
                                    <th className="pb-3 font-medium">Utilization</th>
                                    <th className="pb-3 font-medium text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-dark">
                                {STATION_PERFORMANCE_DATA.map((station) => (
                                    <tr key={station.id} className="group hover:bg-surface-lighter/30 transition-colors">
                                        <td className="py-4 pr-4">
                                            <div className="flex items-center gap-3">
                                                <div className="size-8 rounded bg-bg-dark border border-border-dark flex items-center justify-center text-text-secondary">
                                                    <Zap size={14} />
                                                </div>
                                                <span className="text-white text-sm font-medium">{station.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 pr-4 text-text-secondary text-sm">{station.sessions}</td>
                                        <td className="py-4 pr-4 text-white font-mono text-sm">{station.revenue}</td>
                                        <td className="py-4 pr-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-1.5 bg-bg-dark rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full ${station.utilization > 80 ? 'bg-emerald-500' : station.utilization > 50 ? 'bg-primary' : 'bg-amber-500'}`} style={{ width: `${station.utilization}%` }}></div>
                                                </div>
                                                <span className="text-xs text-text-secondary">{station.utilization}%</span>
                                            </div>
                                        </td>
                                        <td className="py-4 text-right">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                                                station.status === 'Online' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                            }`}>
                                                <span className={`size-1.5 rounded-full ${station.status === 'Online' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                                {station.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* System Alerts List */}
                <div className="rounded-xl border border-border-dark bg-surface-dark p-6 flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <AlertCircle className="text-amber-500" size={20} />
                        Recent Alerts
                    </h3>
                    <div className="flex flex-col gap-4">
                        <div className="p-3 rounded-lg bg-bg-dark border border-border-dark flex gap-3">
                             <div className="mt-1">
                                 <div className="size-2 rounded-full bg-rose-500"></div>
                             </div>
                             <div>
                                 <h4 className="text-white text-sm font-bold">Connection Lost</h4>
                                 <p className="text-text-secondary text-xs mt-1">Station Marais FastCharge (ID: 03) is not responding to ping.</p>
                                 <p className="text-text-secondary text-[10px] mt-2 opacity-60">2 mins ago</p>
                             </div>
                        </div>
                        <div className="p-3 rounded-lg bg-bg-dark border border-border-dark flex gap-3">
                             <div className="mt-1">
                                 <div className="size-2 rounded-full bg-amber-500"></div>
                             </div>
                             <div>
                                 <h4 className="text-white text-sm font-bold">High Latency</h4>
                                 <p className="text-text-secondary text-xs mt-1">Network latency {'>'} 200ms in District 11.</p>
                                 <p className="text-text-secondary text-[10px] mt-2 opacity-60">15 mins ago</p>
                             </div>
                        </div>
                        <div className="p-3 rounded-lg bg-bg-dark border border-border-dark flex gap-3 opacity-60">
                             <div className="mt-1">
                                 <div className="size-2 rounded-full bg-emerald-500"></div>
                             </div>
                             <div>
                                 <h4 className="text-white text-sm font-bold">System Update</h4>
                                 <p className="text-text-secondary text-xs mt-1">Firmware v2.4.1 deployed successfully.</p>
                                 <p className="text-text-secondary text-[10px] mt-2 opacity-60">2 hours ago</p>
                             </div>
                        </div>
                    </div>
                    <button className="mt-auto w-full py-2 text-xs text-text-secondary hover:text-white border-t border-border-dark pt-4 transition-colors">
                        View System Logs
                    </button>
                </div>
            </div>

        </div>
    </div>
  );
};

export default Analytics;