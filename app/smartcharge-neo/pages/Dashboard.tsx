import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PlusCircle, Zap, X, Filter, Download, ChevronRight, Sparkles, Bot, Send, ChevronDown, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SESSIONS } from '../constants';
import { fetchDashboardStats, DashboardStats, cancelReservation, requestAiOptimization } from '../services/api';
import { useUser } from '../context/UserContext';

const TimerBlock = ({ val, label }: { val: string; label: string }) => (
  <div className="flex flex-col items-center gap-2">
    <div className="flex w-16 h-16 lg:w-20 lg:h-20 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 backdrop-blur-sm">
      <p className="text-primary text-2xl lg:text-3xl font-bold font-mono">{val}</p>
    </div>
    <p className="text-text-secondary text-xs uppercase tracking-wider font-medium">{label}</p>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useUser();

  // Data State
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // AI State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Filter State
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // 加载数据
  const loadData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const statsData = await fetchDashboardStats(user?.id);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoadingData(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
    // 每 30 秒刷新数据
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // 从 stats 获取 sessions，如果没有则使用静态数据
  const sessions = useMemo(() => {
    if (stats?.recentSessions && stats.recentSessions.length > 0) {
      return stats.recentSessions;
    }
    return SESSIONS;
  }, [stats]);

  // 获取活跃预约
  const activeReservation = useMemo(() => {
    if (stats?.activeReservations && stats.activeReservations.length > 0) {
      return stats.activeReservations[0];
    }
    return null;
  }, [stats]);

  // 计算预约剩余时间
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!activeReservation) {
      setTimeLeft(0);
      return;
    }

    const calculateTimeLeft = () => {
      const now = new Date();
      const end = new Date(activeReservation.endTime);
      const diff = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
      setTimeLeft(diff);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [activeReservation]);

  // 取消预约
  const handleCancelReservation = async () => {
    if (!activeReservation) return;
    try {
      await cancelReservation(activeReservation.id);
      loadData(); // 刷新数据
    } catch (error) {
      console.error('Failed to cancel reservation:', error);
    }
  };


  const handleAiOptimize = async () => {
    if (!aiPrompt.trim()) return;

    setIsAiThinking(true);
    setAiResponse(null);

    try {
      const context = activeReservation
        ? `Current Status: Active reservation at ${activeReservation.stationName}. ${activeReservation.powerType} (${activeReservation.maxPower}kW). ${Math.floor(timeLeft / 60)} mins remaining.`
        : 'Current Status: No active charging session. User is planning for future charging.';

      const result = await requestAiOptimization(aiPrompt, context);
      setAiResponse(result.response);
    } catch (error) {
      console.error('AI Error:', error);
      setAiResponse('Unable to connect to SmartCharge Neural Core. Please try again.');
    } finally {
      setIsAiThinking(false);
    }
  };

  const filteredSessions = sessions.filter(session =>
      filterStatus === 'All' ? true : session.status === filterStatus
  );

  const handleExport = () => {
    const headers = ["Date", "Time", "Location", "SubLocation", "Energy", "Cost", "Status"];
    const rows = filteredSessions.map(s => [s.date, s.time, s.location, s.locationSub, s.energy, s.cost, s.status]);
    const csvContent = "data:text/csv;charset=utf-8,"
        + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "charging_history.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hours = Math.floor(timeLeft / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((timeLeft % 3600) / 60).toString().padStart(2, '0');
  const seconds = (timeLeft % 60).toString().padStart(2, '0');

  return (
    <div className="h-full overflow-y-auto scrollbar-hide p-4 lg:p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        
        {/* Header */}
        <div className="flex flex-wrap justify-between items-end gap-4 pb-4 border-b border-border-dark">
          <div className="flex flex-col gap-1">
            <h1 className="text-white text-3xl font-bold font-display tracking-tight">Dashboard</h1>
            <p className="text-text-secondary">Welcome back, {user?.firstName || 'User'}. Here is your charging overview.</p>
          </div>
          <button 
            onClick={() => navigate('/map')}
            className="bg-surface-lighter hover:bg-border-dark text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border border-border-dark"
          >
            <PlusCircle size={18} />
            <span>New Session</span>
          </button>
        </div>

        {/* Active Reservation - 真实数据 */}
        {activeReservation ? (
          <section className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <h2 className="text-white text-xl font-bold font-display flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
              Active Reservation
            </h2>

            <div className="rounded-xl bg-surface-dark p-6 shadow-xl border border-border-dark flex flex-col lg:flex-row gap-8 items-center relative overflow-hidden">
               {/* Abstract BG Decoration */}
               <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

              <div className="flex-shrink-0 flex gap-3 z-10">
                <TimerBlock val={hours} label="Hours" />
                <TimerBlock val={minutes} label="Mins" />
                <TimerBlock val={seconds} label="Secs" />
              </div>

              <div className="flex flex-col flex-grow gap-2 text-center lg:text-left z-10 w-full lg:w-auto">
                <div className="flex items-center justify-center lg:justify-start gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                    activeReservation.status === 'ACTIVE'
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {activeReservation.status === 'ACTIVE' ? 'Charging' : 'Pending'}
                  </span>
                  {timeLeft < 600 && <span className="text-text-secondary text-xs">• Expires soon</span>}
                </div>
                <h3 className="text-white text-xl font-bold leading-tight">
                  {activeReservation.stationName}
                </h3>
                <p className="text-text-secondary text-sm">
                  {activeReservation.powerType} • {activeReservation.maxPower}kW • {activeReservation.stationAddress}
                </p>

                <div className="flex gap-6 mt-3 justify-center lg:justify-start">
                  <div className="flex items-center gap-2 text-white text-sm bg-bg-dark px-3 py-1.5 rounded-lg border border-border-dark">
                    <Calendar size={16} className="text-primary" />
                    <span className="font-mono text-xs">
                      {new Date(activeReservation.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      {' - '}
                      {new Date(activeReservation.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 w-full lg:w-auto z-10">
                <button
                  onClick={handleCancelReservation}
                  className="w-full lg:w-auto flex items-center justify-center gap-2 h-12 px-6 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all font-medium"
                >
                  <X size={18} />
                  Cancel Reservation
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section className="rounded-xl bg-surface-dark/50 border border-dashed border-border-dark p-8 flex flex-col items-center justify-center gap-4 text-center animate-in fade-in duration-500">
              <div className="size-12 rounded-full bg-surface-lighter flex items-center justify-center text-text-secondary">
                  <Zap size={24} />
              </div>
              <div>
                  <h3 className="text-white font-bold">No Active Reservations</h3>
                  <p className="text-text-secondary text-sm">Find a station on the map to start charging.</p>
              </div>
              <button
                onClick={() => navigate('/map')}
                className="text-primary hover:text-white text-sm font-medium hover:underline"
              >
                  Go to Map View
              </button>
          </section>
        )}

        {/* AI Smart Allocation Section */}
        <section className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
             <h2 className="text-white text-xl font-bold font-display flex items-center gap-3">
                <Sparkles className="text-purple-400" size={24} />
                SmartCharge AI Allocation
             </h2>
             <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-[#1a1f35] to-[#161025] p-6 relative overflow-hidden shadow-2xl shadow-purple-900/10">
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
                
                <div className="flex flex-col gap-4 relative z-10">
                    {!aiResponse ? (
                        <>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm text-purple-200 font-medium">Describe your charging goal</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={aiPrompt}
                                        onChange={(e) => setAiPrompt(e.target.value)}
                                        placeholder="e.g., Optimize for lowest cost, prioritize speed..."
                                        className="flex-1 bg-bg-dark/50 border border-purple-500/30 rounded-lg px-4 py-3 text-white placeholder-purple-300/30 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 outline-none transition-all"
                                        onKeyDown={(e) => e.key === 'Enter' && handleAiOptimize()}
                                    />
                                    <button 
                                        onClick={handleAiOptimize}
                                        disabled={isAiThinking || !aiPrompt.trim()}
                                        className="bg-purple-600 hover:bg-purple-500 text-white px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[3rem] shadow-lg shadow-purple-600/20"
                                    >
                                        {isAiThinking ? (
                                            <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <Send size={20} />
                                        )}
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {['Minimize Cost', 'Fastest Charge', 'Eco-Friendly Mode'].map(suggestion => (
                                    <button 
                                        key={suggestion}
                                        onClick={() => setAiPrompt(suggestion)}
                                        className="text-xs px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                             <div className="flex items-start gap-4">
                                <div className="size-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 border border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                                    <Bot size={20} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-white font-bold text-sm mb-1">Optimization Plan</h3>
                                    <p className="text-purple-100 text-sm leading-relaxed">{aiResponse}</p>
                                    <div className="mt-4 flex items-center justify-between border-t border-purple-500/20 pt-3">
                                        <div className="flex items-center gap-2 text-xs text-purple-300">
                                            <div className="size-1.5 bg-purple-400 rounded-full animate-pulse"></div>
                                            Allocation Active
                                        </div>
                                        <button 
                                            onClick={() => { setAiResponse(null); setAiPrompt(''); }}
                                            className="text-xs text-purple-400 hover:text-white font-medium flex items-center gap-1 transition-colors"
                                        >
                                            Start New Optimization
                                        </button>
                                    </div>
                                </div>
                             </div>
                        </div>
                    )}
                </div>
             </div>
        </section>

        {/* History */}
        <section className="flex flex-col gap-4 pb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-white text-xl font-bold font-display">Charging History</h2>
            <div className="flex gap-3">
              <div className="relative">
                  <button 
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border ${isFilterOpen || filterStatus !== 'All' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-surface-lighter text-text-secondary hover:text-white hover:bg-border-dark border-border-dark'}`}
                  >
                    <Filter size={16} />
                    {filterStatus === 'All' ? 'Filter' : filterStatus}
                    <ChevronDown size={14} className={`transition-transform duration-200 ${isFilterOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isFilterOpen && (
                      <div className="absolute top-full right-0 mt-2 w-40 bg-surface-dark border border-border-dark rounded-lg shadow-xl z-20 flex flex-col py-1 animate-in fade-in zoom-in-95 duration-200">
                          {['All', 'Completed', 'Stopped', 'Charging'].map(status => (
                              <button 
                                  key={status} 
                                  onClick={() => { setFilterStatus(status); setIsFilterOpen(false); }}
                                  className={`px-4 py-2 text-left text-sm hover:bg-surface-lighter transition-colors ${filterStatus === status ? 'text-primary font-medium' : 'text-text-secondary hover:text-white'}`}
                              >
                                  {status}
                              </button>
                          ))}
                      </div>
                  )}
              </div>
              <button 
                onClick={handleExport}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-sm font-medium transition-colors border border-primary/20 active:scale-95"
              >
                <Download size={16} />
                Export CSV
              </button>
            </div>
          </div>

          <div className="w-full overflow-hidden rounded-xl border border-border-dark bg-surface-dark shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-dark bg-surface-lighter/50">
                    <th className="p-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Date & Time</th>
                    <th className="p-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Location</th>
                    <th className="p-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Energy</th>
                    <th className="p-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Cost</th>
                    <th className="p-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Status</th>
                    <th className="p-4 text-xs font-semibold uppercase tracking-wider text-text-secondary text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-dark">
                  {filteredSessions.length > 0 ? (
                      filteredSessions.map((session) => (
                        <tr key={session.id} className="group hover:bg-surface-lighter/30 transition-colors">
                          <td className="p-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-white text-sm font-medium">{session.date}</span>
                              <span className="text-text-secondary text-xs">{session.time}</span>
                            </div>
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="size-8 rounded bg-border-dark flex items-center justify-center text-text-secondary">
                                 <Zap size={14} />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-white text-sm font-medium">{session.location}</span>
                                <span className="text-text-secondary text-xs">{session.locationSub}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 whitespace-nowrap text-white text-sm font-mono">{session.energy}</td>
                          <td className="p-4 whitespace-nowrap text-white text-sm font-mono">{session.cost}</td>
                          <td className="p-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                              session.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                              session.status === 'Stopped' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : ''
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${session.status === 'Completed' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                              {session.status}
                            </span>
                          </td>
                          <td className="p-4 whitespace-nowrap text-right">
                            <button 
                                onClick={() => navigate('/station/1')} 
                                className="text-text-secondary hover:text-white p-1.5 rounded-lg hover:bg-border-dark transition-colors"
                            >
                              <ChevronRight size={18} />
                            </button>
                          </td>
                        </tr>
                      ))
                  ) : (
                      <tr>
                          <td colSpan={6} className="p-8 text-center text-text-secondary">
                              No sessions found matching your filter.
                          </td>
                      </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination Footer */}
            <div className="flex items-center justify-between p-4 border-t border-border-dark bg-surface-lighter/30">
              <p className="text-text-secondary text-sm">Showing {filteredSessions.length} sessions</p>
              <div className="flex gap-2">
                <button disabled className="px-3 py-1.5 rounded bg-surface-lighter text-text-secondary text-sm disabled:opacity-50 border border-border-dark">Previous</button>
                <button disabled className="px-3 py-1.5 rounded bg-surface-lighter text-text-secondary text-sm disabled:opacity-50 border border-border-dark">Next</button>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default Dashboard;
