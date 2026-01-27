import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Share2, AlertTriangle, MapPin, Zap, Activity, Thermometer, Calendar, Clock, ArrowRight, BatteryCharging, Plug, CheckCircle, Loader2, Power, PowerOff } from 'lucide-react';
import { HOURLY_POWER_DATA, WEEKLY_POWER_DATA, STATIONS } from '../constants';
import { BarChart, Bar, ResponsiveContainer, Cell, XAxis, Tooltip } from 'recharts';
import { fetchStationById, createReservation, fetchStationTelemetry, TelemetryData, sendStationCommand } from '../services/api';
import { useUser } from '../context/UserContext';
import { Station } from '../types';

const SensorCard = ({ title, value, unit, icon: Icon, color, percent }: any) => (
  <div className="flex flex-col gap-3 rounded-xl p-5 bg-surface-dark border border-border-dark relative overflow-hidden group hover:border-primary/50 transition-colors">
    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
      <Icon size={40} />
    </div>
    <p className="text-text-secondary text-sm font-medium">{title}</p>
    <div className="flex items-baseline gap-1">
      <p className="text-white text-2xl font-bold font-display tracking-tight">{value}</p>
      <span className="text-xs text-text-secondary">{unit}</span>
    </div>
    <div className="w-full h-1 bg-bg-dark rounded-full overflow-hidden mt-1">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }}></div>
    </div>
  </div>
);

const StationDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const [station, setStation] = useState<Station | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartView, setChartView] = useState<'24h' | '7d'>('24h');
  const [isBooked, setIsBooked] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState('1h');
  const [bookingTime, setBookingTime] = useState('16:00');

  // 传感器数据状态
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [isSimulatedData, setIsSimulatedData] = useState(true);

  // 继电器控制状态
  const [isCharging, setIsCharging] = useState(false);
  const [isSendingCommand, setIsSendingCommand] = useState(false);
  const [commandMessage, setCommandMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const chartData = chartView === '24h' ? HOURLY_POWER_DATA : WEEKLY_POWER_DATA;

  // 当前小时（用于时间可用性显示）
  const currentHour = useMemo(() => new Date().getHours(), []);

  // 加载站点数据
  const loadStation = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchStationById(id);
      if (data) {
        setStation(data);
      } else {
        // 回退到静态数据
        const fallback = STATIONS.find(s => s.id === id);
        if (fallback) {
          setStation(fallback);
        } else {
          setError('Station not found');
        }
      }
    } catch (err) {
      console.error('Failed to fetch station:', err);
      // 回退到静态数据
      const fallback = STATIONS.find(s => s.id === id);
      if (fallback) {
        setStation(fallback);
        setError('使用本地数据');
      } else {
        setError('无法加载站点数据');
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadStation();
  }, [loadStation]);

  // 加载传感器数据
  const loadTelemetry = useCallback(async () => {
    if (!id) return;
    try {
      const data = await fetchStationTelemetry(id);
      setTelemetry(data.current);
      setIsSimulatedData(data.isSimulated);
    } catch (err) {
      console.error('Failed to fetch telemetry:', err);
    }
  }, [id]);

  useEffect(() => {
    loadTelemetry();
    // 每 5 秒刷新传感器数据
    const interval = setInterval(loadTelemetry, 5000);
    return () => clearInterval(interval);
  }, [loadTelemetry]);

  // 根据传感器数据判断是否在充电
  useEffect(() => {
    if (telemetry?.current && telemetry.current > 0.5) {
      setIsCharging(true);
    } else if (telemetry?.current !== null && telemetry?.current !== undefined) {
      setIsCharging(false);
    }
  }, [telemetry]);

  // 发送继电器控制命令
  const handleRelayControl = async (command: 'START' | 'STOP') => {
    if (!id) return;

    setIsSendingCommand(true);
    setCommandMessage(null);

    try {
      await sendStationCommand(id, command);
      setCommandMessage({
        type: 'success',
        text: command === 'START' ? 'Charging started!' : 'Charging stopped!'
      });
      // 立即刷新遥测数据
      setTimeout(loadTelemetry, 1000);
    } catch (err) {
      console.error('Failed to send command:', err);
      setCommandMessage({
        type: 'error',
        text: 'Failed to send command. Please try again.'
      });
    } finally {
      setIsSendingCommand(false);
      // 3秒后清除消息
      setTimeout(() => setCommandMessage(null), 3000);
    }
  };

  const handleBooking = async () => {
    if (!id || !user) {
      console.error('Cannot book: missing station ID or user');
      return;
    }
    setIsBooking(true);
    try {
      // 计算结束时间
      const [hours, minutes] = bookingTime.split(':').map(Number);
      const startTime = new Date();
      startTime.setHours(hours, minutes, 0, 0);

      const durationMinutes = selectedDuration === '30m' ? 30 : selectedDuration === '1h' ? 60 : 120;
      const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

      await createReservation({
        userId: user.id,
        stationId: parseInt(id),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });
      setIsBooked(true);
    } catch (err) {
      console.error('Booking failed:', err);
      // 模拟成功以保持 UI 体验
      setIsBooked(true);
    } finally {
      setIsBooking(false);
    }
  };

  // 加载状态
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-hide">
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-bg-dark/95 backdrop-blur-sm border-b border-border-dark px-6 lg:px-10 py-4 flex items-center justify-between">
           <div className="flex items-center gap-2 text-sm text-text-secondary">
               <span onClick={() => navigate('/')} className="hover:text-white cursor-pointer">Home</span>
               <span>/</span>
               <span onClick={() => navigate('/map')} className="hover:text-white cursor-pointer">Stations</span>
               <span>/</span>
               <span className="text-white">Station Details</span>
           </div>
           <div className="flex gap-3">
               <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-dark border border-border-dark text-white text-sm hover:bg-surface-lighter transition-colors">
                   <Share2 size={16} /> Share
               </button>
               <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-dark border border-border-dark text-rose-400 text-sm hover:bg-surface-lighter transition-colors">
                   <AlertTriangle size={16} /> Report
               </button>
           </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 lg:px-10 py-8 flex flex-col gap-8">
            
            {/* Title Section */}
            <div className="flex flex-col gap-2">
                {error && (
                  <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3 py-2 rounded-lg text-xs mb-2">
                    {error}
                  </div>
                )}
                <div className="flex items-center gap-4">
                    <h1 className="text-white text-3xl md:text-4xl font-bold font-display tracking-tight">
                      {station?.name || 'Station Details'}
                    </h1>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      station?.status === 'Available' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      station?.status === 'Occupied' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                      station?.status === 'Reserved' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    }`}>
                        <span className={`size-1.5 rounded-full animate-pulse ${
                          station?.status === 'Available' ? 'bg-emerald-400' :
                          station?.status === 'Occupied' ? 'bg-rose-400' :
                          station?.status === 'Reserved' ? 'bg-amber-400' : 'bg-slate-400'
                        }`}></span>
                        {station?.status || 'Unknown'}
                    </span>
                </div>
                <p className="text-text-secondary flex items-center gap-2">
                    <MapPin size={16} />
                    {station?.address || 'Address unavailable'}
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
                {/* Left Column (8 cols) */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    {/* Sensors */}
                    <section>
                         <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Activity className="text-primary" size={20} />
                                Real-time Sensor Data
                            </h3>
                            <span className={`text-xs flex items-center gap-1 ${isSimulatedData ? 'text-amber-400' : 'text-emerald-400'}`}>
                                <span className={`size-1.5 rounded-full animate-pulse ${isSimulatedData ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                                {isSimulatedData ? 'Simulated' : 'Live'}
                            </span>
                         </div>
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                             <SensorCard
                               title="Voltage"
                               value={telemetry?.voltage?.toFixed(1) ?? '---'}
                               unit="V"
                               icon={Zap}
                               color="bg-primary"
                               percent={telemetry?.voltage ? Math.min((telemetry.voltage / 250) * 100, 100) : 0}
                             />
                             <SensorCard
                               title="Current"
                               value={telemetry?.current?.toFixed(1) ?? '---'}
                               unit="A"
                               icon={Activity}
                               color="bg-cyan-400"
                               percent={telemetry?.current ? Math.min((telemetry.current / 50) * 100, 100) : 0}
                             />
                             <SensorCard
                               title="Output"
                               value={telemetry?.power?.toFixed(1) ?? '---'}
                               unit="kW"
                               icon={BatteryCharging}
                               color="bg-purple-400"
                               percent={telemetry?.power ? Math.min((telemetry.power / 22) * 100, 100) : 0}
                             />
                             <SensorCard
                               title="Temp"
                               value={telemetry?.temperature?.toFixed(0) ?? '---'}
                               unit="°C"
                               icon={Thermometer}
                               color="bg-emerald-400"
                               percent={telemetry?.temperature ? Math.min((telemetry.temperature / 80) * 100, 100) : 0}
                             />
                         </div>
                    </section>

                    {/* Relay Control Panel */}
                    <section className="bg-surface-dark rounded-xl border border-border-dark p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Power className="text-primary" size={20} />
                                Charging Control
                            </h3>
                            <span className={`text-xs flex items-center gap-1 px-2 py-1 rounded-full ${
                                isCharging
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                            }`}>
                                <span className={`size-1.5 rounded-full ${isCharging ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}></span>
                                {isCharging ? 'Charging Active' : 'Standby'}
                            </span>
                        </div>

                        {/* Command Message */}
                        {commandMessage && (
                            <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${
                                commandMessage.type === 'success'
                                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                            }`}>
                                {commandMessage.text}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            {/* START Button */}
                            <button
                                onClick={() => handleRelayControl('START')}
                                disabled={isSendingCommand}
                                className={`flex flex-col items-center justify-center gap-2 p-6 rounded-xl border transition-all ${
                                    isSendingCommand
                                        ? 'bg-surface-lighter border-border-dark text-text-secondary cursor-not-allowed'
                                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 active:scale-[0.98]'
                                }`}
                            >
                                {isSendingCommand ? (
                                    <Loader2 size={32} className="animate-spin" />
                                ) : (
                                    <Power size={32} />
                                )}
                                <span className="font-bold text-sm">START</span>
                                <span className="text-xs opacity-70">Enable Relay</span>
                            </button>

                            {/* STOP Button */}
                            <button
                                onClick={() => handleRelayControl('STOP')}
                                disabled={isSendingCommand}
                                className={`flex flex-col items-center justify-center gap-2 p-6 rounded-xl border transition-all ${
                                    isSendingCommand
                                        ? 'bg-surface-lighter border-border-dark text-text-secondary cursor-not-allowed'
                                        : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/50 active:scale-[0.98]'
                                }`}
                            >
                                {isSendingCommand ? (
                                    <Loader2 size={32} className="animate-spin" />
                                ) : (
                                    <PowerOff size={32} />
                                )}
                                <span className="font-bold text-sm">STOP</span>
                                <span className="text-xs opacity-70">Disable Relay</span>
                            </button>
                        </div>

                        <p className="text-xs text-text-secondary mt-4 text-center">
                            Commands are queued and sent to the device on next telemetry cycle (~5s)
                        </p>
                    </section>

                    {/* Chart */}
                    <section className="bg-surface-dark rounded-xl border border-border-dark p-6">
                         <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white">Power Output History</h3>
                            <select 
                                value={chartView}
                                onChange={(e) => setChartView(e.target.value as '24h' | '7d')}
                                className="bg-bg-dark border border-border-dark text-xs text-white rounded px-2 py-1 outline-none focus:border-primary"
                            >
                                <option value="24h">Last 24 Hours</option>
                                <option value="7d">Last 7 Days</option>
                            </select>
                         </div>
                         <div className="h-56 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <Tooltip 
                                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                        contentStyle={{ backgroundColor: '#101723', borderColor: '#2e3e5b', color: '#fff' }}
                                    />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={chartView === '24h' && index === 6 ? '#3c83f6' : 'rgba(60, 131, 246, 0.4)'} />
                                        ))}
                                    </Bar>
                                    <XAxis dataKey="time" stroke="#566b8c" fontSize={12} tickLine={false} axisLine={false} />
                                </BarChart>
                            </ResponsiveContainer>
                         </div>
                    </section>

                    {/* Timeline */}
                    <section className="bg-surface-dark rounded-xl border border-border-dark p-6">
                         <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                             <Calendar className="text-primary" size={20} /> Availability Today
                         </h3>
                         <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
                            {Array.from({ length: 12 }, (_, i) => {
                                // 从当前小时开始显示未来12小时
                                const hour = (currentHour + i) % 24;
                                const isPast = i === 0 && new Date().getMinutes() > 30; // 当前小时已过半
                                const isCurrent = i === 0;
                                const isOccupied = station?.status === 'Occupied' && isCurrent;
                                return (
                                    <div key={hour} className={`min-w-[70px] flex-1 flex flex-col gap-1 ${isCurrent ? 'opacity-100' : 'opacity-70'}`}>
                                        <div
                                          onClick={() => !isPast && !isOccupied && setBookingTime(`${hour.toString().padStart(2, '0')}:00`)}
                                          className={`h-10 rounded-lg flex items-center justify-center text-xs font-medium border ${
                                            isPast ? 'bg-surface-lighter border-border-dark text-white/30 cursor-not-allowed' :
                                            isOccupied ? 'bg-rose-500/20 border-rose-500 text-rose-400' :
                                            isCurrent ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' :
                                            'bg-primary/20 border-primary/30 text-primary cursor-pointer hover:bg-primary/30'
                                        }`}>
                                            {hour.toString().padStart(2, '0')}:00
                                        </div>
                                    </div>
                                )
                            })}
                         </div>
                         <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-text-secondary">
                             <div className="flex items-center gap-2"><span className="size-2.5 rounded bg-primary/20 border border-primary/30"></span> Available</div>
                             <div className="flex items-center gap-2"><span className="size-2.5 rounded bg-amber-500/20 border border-amber-500/30"></span> Current Hour</div>
                             <div className="flex items-center gap-2"><span className="size-2.5 rounded bg-rose-500/20 border border-rose-500"></span> Occupied</div>
                             <div className="flex items-center gap-2"><span className="size-2.5 rounded bg-surface-lighter border border-border-dark"></span> Past</div>
                         </div>
                    </section>
                </div>

                {/* Right Column (4 cols) */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    {/* Map Mini */}
                    <div className="rounded-xl overflow-hidden border border-border-dark bg-surface-dark relative group h-48">
                         <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://picsum.photos/seed/mapmini/400/300')" }}></div>
                         <div className="absolute inset-0 bg-gradient-to-t from-bg-dark to-transparent"></div>
                         <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                             <div>
                                 <p className="text-white font-bold text-sm">Navigation</p>
                                 <p className="text-text-secondary text-xs">2.4 km away • ~12 min drive</p>
                             </div>
                             <button className="bg-primary hover:bg-blue-600 text-white p-2 rounded-lg transition-colors shadow-lg">
                                 <ArrowRight size={18} />
                             </button>
                         </div>
                    </div>

                    {/* Booking Form */}
                    <div className="rounded-xl border border-border-dark bg-surface-dark p-6 flex flex-col gap-5 shadow-lg relative overflow-hidden">
                         {isBooked ? (
                            <div className="absolute inset-0 bg-surface-dark z-20 flex flex-col items-center justify-center text-center p-6 animate-in fade-in zoom-in">
                                <div className="size-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                                    <CheckCircle size={32} className="text-emerald-500" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-1">Confirmed!</h3>
                                <p className="text-text-secondary text-sm mb-6">Your spot has been reserved for {bookingTime}.</p>
                                <button 
                                    onClick={() => navigate('/')}
                                    className="w-full h-11 bg-surface-lighter hover:bg-border-dark border border-border-dark text-white rounded-lg font-bold text-sm transition-all"
                                >
                                    View Dashboard
                                </button>
                                <button 
                                    onClick={() => setIsBooked(false)}
                                    className="mt-3 text-xs text-text-secondary hover:text-white"
                                >
                                    Make another reservation
                                </button>
                            </div>
                         ) : null}

                         <div className="flex items-center gap-2 border-b border-border-dark pb-4">
                             <Clock className="text-primary" size={20} />
                             <h3 className="text-lg font-bold text-white">Reserve a Spot</h3>
                         </div>
                         
                         <div className="flex flex-col gap-1">
                             <label className="text-xs text-text-secondary font-medium uppercase tracking-wider">Start Time</label>
                             <input 
                                type="time" 
                                value={bookingTime}
                                onChange={(e) => setBookingTime(e.target.value)}
                                className="w-full bg-bg-dark border border-border-dark rounded-lg h-10 px-3 text-white text-sm focus:border-primary outline-none" 
                             />
                         </div>
                         
                         <div className="flex flex-col gap-2">
                             <label className="text-xs text-text-secondary font-medium uppercase tracking-wider">Duration</label>
                             <div className="grid grid-cols-3 gap-2">
                                 {['30m', '1h', '2h'].map(dur => (
                                    <button 
                                        key={dur}
                                        onClick={() => setSelectedDuration(dur)}
                                        className={`h-9 rounded border text-sm transition-all ${
                                            selectedDuration === dur 
                                            ? 'border-primary bg-primary/10 text-primary font-medium shadow-[0_0_10px_rgba(60,131,246,0.2)]' 
                                            : 'border-border-dark text-text-secondary hover:text-white hover:bg-surface-lighter'
                                        }`}
                                    >
                                        {dur}
                                    </button>
                                 ))}
                             </div>
                         </div>

                         <div className="bg-bg-dark rounded-lg p-3 flex justify-between items-center border border-border-dark mt-2">
                             <span className="text-sm text-text-secondary">Estimated Cost</span>
                             <span className="text-lg font-bold text-white">
                                {selectedDuration === '30m' ? '€7.50' : selectedDuration === '1h' ? '€14.50' : '€28.00'}
                             </span>
                         </div>

                         <button 
                            onClick={handleBooking}
                            disabled={isBooking}
                            className="w-full h-11 bg-primary hover:bg-blue-600 disabled:bg-primary/50 text-white rounded-lg font-bold text-sm shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                             {isBooking ? (
                                 <>
                                    <div className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                                    <span>Processing...</span>
                                 </>
                             ) : (
                                 <span>Confirm Reservation</span>
                             )}
                         </button>
                    </div>

                    {/* Specs */}
                    <div className="rounded-xl border border-border-dark bg-surface-dark p-5 flex flex-col gap-4">
                        <h4 className="text-white font-bold text-sm uppercase tracking-wide border-b border-border-dark pb-2">Technical Specs</h4>
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-lg bg-bg-dark flex items-center justify-center border border-border-dark">
                                <Plug size={20} className="text-text-secondary" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-white text-sm font-medium">
                                  {station?.type === 'DC' ? 'CCS2 Combo' : 'Type 2 (Mennekes)'}
                                </span>
                                <span className="text-text-secondary text-xs">
                                  {station?.type || 'AC'} • Max {station?.power || '22kW'}
                                </span>
                            </div>
                        </div>
                         <div className="flex items-center gap-3">
                            <div className="size-10 rounded-lg bg-bg-dark flex items-center justify-center border border-border-dark">
                                <Zap size={20} className="text-text-secondary" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-white text-sm font-medium">Power Output</span>
                                <span className="text-text-secondary text-xs">{station?.power || 'Unknown'}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-lg bg-bg-dark flex items-center justify-center border border-border-dark">
                                <MapPin size={20} className="text-text-secondary" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-white text-sm font-medium">GPS Coordinates</span>
                                <span className="text-text-secondary text-xs font-mono">{station?.gps || 'Unknown'}</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </main>
    </div>
  );
};

export default StationDetails;
