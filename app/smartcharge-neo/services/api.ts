import { Station, SessionData } from '../types';

// API 基础 URL - 前端 (Vite) 和后端 (Next.js) 分开运行
// 开发环境: 前端 localhost:3000, 后端 localhost:3007
const API_BASE_URL = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || 'http://localhost:3007';

// 后端返回的站点类型 (匹配 Prisma schema)
interface BackendStation {
  id: number;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE' | 'FAULT';
  powerType: 'AC_SLOW' | 'AC_FAST' | 'DC_FAST';
  maxPower: number;  // kW
  deviceId?: string | null;
  lastPing?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// 后端返回的预约类型
interface BackendReservation {
  id: number;
  userId: number;
  stationId: number;
  startTime: string;
  endTime: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  createdAt: string;
  updatedAt: string;
  station?: BackendStation;
}

// 后端返回的充电会话类型
interface BackendChargingSession {
  id: string;
  userId: string;
  stationId: number;
  startTime: string;
  endTime: string | null;
  energyDelivered: number | null;
  cost: number | null;
  station?: {
    id: number;
    name: string;
    address: string;
    city?: string;
  };
}

// 后端返回的活跃预约类型（包含站点信息）
interface BackendActiveReservation {
  id: string;
  userId: string;
  stationId: number;
  startTime: string;
  endTime: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  station: {
    id: number;
    name: string;
    address: string;
    powerType: 'AC_SLOW' | 'AC_FAST' | 'DC_FAST';
    maxPower: number;
  };
}

// 后端统计数据响应类型
interface BackendStatsResponse {
  stations: {
    total: number;
    available: number;
    occupied: number;
    reserved: number;
    maintenance: number;
    fault: number;
  };
  charging: {
    totalSessions: number;
    totalEnergy: number;
    totalCost: number;
  };
  reservations: {
    pending: number;
    active: number;
    completed: number;
    cancelled: number;
  };
  activeReservations: BackendActiveReservation[];
  recentSessions: BackendChargingSession[];
}

// 状态映射: 后端 -> 前端
const statusMap: Record<BackendStation['status'], Station['status']> = {
  'AVAILABLE': 'Available',
  'OCCUPIED': 'Occupied',
  'RESERVED': 'Reserved',
  'MAINTENANCE': 'Issue',
  'FAULT': 'Issue',
};

// 功率类型映射: 后端 -> 前端
const powerTypeMap: Record<BackendStation['powerType'], Station['type']> = {
  'AC_SLOW': 'AC',
  'AC_FAST': 'AC',
  'DC_FAST': 'DC',
};

// 将后端站点数据转换为前端格式
function mapBackendStationToFrontend(backend: BackendStation, userLat?: number, userLng?: number): Station {
  // 计算距离 (如果提供了用户位置)
  let distance = '未知';
  if (userLat !== undefined && userLng !== undefined) {
    const dist = calculateDistance(userLat, userLng, backend.latitude, backend.longitude);
    distance = dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`;
  }

  return {
    id: String(backend.id),
    name: backend.name,
    address: backend.address,
    status: statusMap[backend.status] || 'Issue',
    distance,
    type: powerTypeMap[backend.powerType] || 'AC',
    power: `${backend.maxPower}kW`,
    lat: backend.latitude,
    lng: backend.longitude,
    gps: `${backend.latitude.toFixed(4)}° N, ${backend.longitude.toFixed(4)}° E`,
  };
}

// 计算两点之间的距离 (Haversine 公式)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // 地球半径 (km)
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// 将后端预约/会话数据转换为前端 SessionData 格式
function mapBackendSessionToFrontend(session: BackendChargingSession): SessionData {
  const startDate = new Date(session.startTime);
  const endDate = session.endTime ? new Date(session.endTime) : null;

  const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formatTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  const isCompleted = endDate !== null;
  const energy = session.energyDelivered ?? 0;
  const cost = session.cost ?? 0;

  return {
    id: String(session.id),
    date: formatDate(startDate),
    time: endDate ? `${formatTime(startDate)} - ${formatTime(endDate)}` : `${formatTime(startDate)} - 进行中`,
    location: session.station?.name || `Station ${session.stationId}`,
    locationSub: session.station?.address || '',
    energy: `${energy.toFixed(1)} kWh`,
    cost: `€ ${cost.toFixed(2)}`,
    status: isCompleted ? 'Completed' : 'Charging',
  };
}

// API 错误处理
class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(response.status, errorData.error || `HTTP ${response.status}`);
  }
  return response.json();
}

// 后端 API 响应格式
interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  error?: string;
}

// ==================== 站点 API ====================

export async function fetchStations(options?: {
  status?: string;
  powerType?: string;
  city?: string;
  search?: string;
  userLat?: number;
  userLng?: number;
}): Promise<Station[]> {
  const params = new URLSearchParams();
  if (options?.status) params.append('status', options.status);
  if (options?.powerType) params.append('powerType', options.powerType);
  if (options?.city) params.append('city', options.city);
  if (options?.search) params.append('search', options.search);

  const url = `${API_BASE_URL}/api/stations${params.toString() ? `?${params}` : ''}`;
  const response = await fetch(url);
  const result = await handleResponse<ApiResponse<BackendStation[]>>(response);

  if (!result.success || !result.data) {
    throw new ApiError(500, result.error || 'Failed to fetch stations');
  }

  return result.data.map((s) => mapBackendStationToFrontend(s, options?.userLat, options?.userLng));
}

export async function fetchStationById(id: string | number): Promise<Station | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/stations/${id}`);
    const result = await handleResponse<ApiResponse<BackendStation>>(response);

    if (!result.success || !result.data) {
      return null;
    }

    return mapBackendStationToFrontend(result.data);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

// ==================== 预约 API ====================

export async function fetchReservations(userId?: number): Promise<BackendReservation[]> {
  const params = userId ? `?userId=${userId}` : '';
  const response = await fetch(`${API_BASE_URL}/api/reservations${params}`);
  const result = await handleResponse<ApiResponse<BackendReservation[]>>(response);
  return result.data || [];
}

export async function createReservation(data: {
  userId: string;
  stationId: number;
  startTime: string;
  endTime: string;
}): Promise<BackendReservation> {
  const response = await fetch(`${API_BASE_URL}/api/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await handleResponse<ApiResponse<BackendReservation>>(response);
  return result.data;
}

export async function cancelReservation(id: string): Promise<BackendReservation> {
  const response = await fetch(`${API_BASE_URL}/api/reservations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'CANCELLED' }),
  });
  const result = await handleResponse<ApiResponse<BackendReservation>>(response);
  return result.data;
}

// ==================== 充电会话 API ====================

export async function fetchChargingSessions(userId?: string): Promise<SessionData[]> {
  const params = userId ? `?userId=${userId}` : '';
  const response = await fetch(`${API_BASE_URL}/api/sessions${params}`);
  const result = await handleResponse<ApiResponse<BackendChargingSession[]>>(response);

  if (!result.success || !result.data) {
    return [];
  }

  return result.data.map(mapBackendSessionToFrontend);
}

// ==================== 统计数据 API ====================

export interface DashboardStats {
  // 站点统计
  totalStations: number;
  availableStations: number;
  occupiedStations: number;

  // 充电统计
  totalSessions: number;
  totalEnergy: number;
  totalCost: number;

  // 活跃预约
  activeReservations: ActiveReservation[];

  // 最近充电会话
  recentSessions: SessionData[];
}

// 活跃预约类型（前端使用）
export interface ActiveReservation {
  id: string;
  stationId: number;
  stationName: string;
  stationAddress: string;
  powerType: string;
  maxPower: number;
  startTime: Date;
  endTime: Date;
  status: string;
}

export async function fetchDashboardStats(userId?: string): Promise<DashboardStats> {
  const params = userId ? `?userId=${userId}` : '';
  const response = await fetch(`${API_BASE_URL}/api/stats${params}`);
  const result = await handleResponse<ApiResponse<BackendStatsResponse>>(response);

  if (!result.success || !result.data) {
    // 返回空数据
    return {
      totalStations: 0,
      availableStations: 0,
      occupiedStations: 0,
      totalSessions: 0,
      totalEnergy: 0,
      totalCost: 0,
      activeReservations: [],
      recentSessions: [],
    };
  }

  const data = result.data;

  // 转换活跃预约
  const activeReservations: ActiveReservation[] = data.activeReservations.map(r => ({
    id: r.id,
    stationId: r.stationId,
    stationName: r.station.name,
    stationAddress: r.station.address,
    powerType: powerTypeMap[r.station.powerType] || 'AC',
    maxPower: r.station.maxPower,
    startTime: new Date(r.startTime),
    endTime: new Date(r.endTime),
    status: r.status,
  }));

  // 转换最近会话
  const recentSessions = data.recentSessions.map(mapBackendSessionToFrontend);

  return {
    totalStations: data.stations.total,
    availableStations: data.stations.available,
    occupiedStations: data.stations.occupied,
    totalSessions: data.charging.totalSessions,
    totalEnergy: data.charging.totalEnergy,
    totalCost: data.charging.totalCost,
    activeReservations,
    recentSessions,
  };
}

// ==================== Analytics 数据 API ====================

export interface AnalyticsData {
  revenue: number;
  revenueTrend: string;
  avgChargeTime: number;
  uptime: string;
  co2Saved: string;
  energyConsumptionData: { name: string; value: number }[];
}

export interface AnalyticsStats {
  stations: {
    total: number;
    available: number;
    occupied: number;
    reserved: number;
    maintenance: number;
    fault: number;
  };
  charging: {
    totalSessions: number;
    totalEnergy: number;
    totalCost: number;
  };
  analytics: AnalyticsData;
}

export async function fetchAnalyticsStats(range: '7d' | '30d' | 'ytd' = '30d'): Promise<AnalyticsStats | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/stats?range=${range}`);
    const result = await handleResponse<ApiResponse<{
      stations: AnalyticsStats['stations'];
      charging: AnalyticsStats['charging'];
      analytics: AnalyticsData;
    }>>(response);

    if (!result.success || !result.data) {
      return null;
    }

    return {
      stations: result.data.stations,
      charging: result.data.charging,
      analytics: result.data.analytics,
    };
  } catch (error) {
    console.error('Failed to fetch analytics stats:', error);
    return null;
  }
}

// ==================== 认证 API ====================

// 用户类型
export interface BackendUser {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

export async function loginUser(email: string): Promise<BackendUser> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const result = await handleResponse<ApiResponse<BackendUser>>(response);

  if (!result.success || !result.data) {
    throw new ApiError(401, result.error || 'Login failed');
  }

  return result.data;
}

export async function getCurrentUser(userId: string): Promise<BackendUser | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: { 'x-user-id': userId },
    });
    const result = await handleResponse<ApiResponse<BackendUser>>(response);

    if (!result.success || !result.data) {
      return null;
    }

    return result.data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

export async function registerUser(email: string, name: string): Promise<BackendUser> {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name }),
  });
  const result = await handleResponse<ApiResponse<BackendUser>>(response);

  if (!result.success || !result.data) {
    throw new ApiError(400, result.error || 'Registration failed');
  }

  return result.data;
}

// ==================== AI 优化 API ====================

export interface AiOptimizationResult {
  response: string;
  isSimulated: boolean;
}

export async function requestAiOptimization(
  prompt: string,
  context?: string
): Promise<AiOptimizationResult> {
  const response = await fetch(`${API_BASE_URL}/api/ai/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, context }),
  });
  const result = await handleResponse<ApiResponse<AiOptimizationResult>>(response);

  if (!result.success || !result.data) {
    throw new ApiError(500, result.error || 'AI optimization failed');
  }

  return result.data;
}

// ==================== 传感器遥测 API ====================

export interface TelemetryData {
  voltage: number | null;
  current: number | null;
  power: number | null;
  temperature: number | null;
  timestamp: string;
}

export interface TelemetryResponse {
  current: TelemetryData;
  history: TelemetryData[];
  isSimulated: boolean;
}

export async function fetchStationTelemetry(stationId: string | number): Promise<TelemetryResponse> {
  const response = await fetch(`${API_BASE_URL}/api/stations/${stationId}/telemetry`);
  const result = await handleResponse<ApiResponse<TelemetryResponse>>(response);

  if (!result.success || !result.data) {
    // 返回默认的模拟数据
    return {
      current: {
        voltage: 230,
        current: 0,
        power: 0,
        temperature: 25,
        timestamp: new Date().toISOString(),
      },
      history: [],
      isSimulated: true,
    };
  }

  return result.data;
}

// ==================== 设备命令 API ====================

export interface DeviceCommand {
  id: string;
  stationId: number;
  command: 'START' | 'STOP' | 'REBOOT';
  payload: string | null;
  status: 'PENDING' | 'SENT' | 'ACKNOWLEDGED';
  createdAt: string;
  sentAt: string | null;
  ackedAt: string | null;
}

export async function sendStationCommand(
  stationId: string | number,
  command: 'START' | 'STOP' | 'REBOOT'
): Promise<DeviceCommand> {
  const response = await fetch(`${API_BASE_URL}/api/stations/${stationId}/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command }),
  });
  const result = await handleResponse<ApiResponse<{
    commandId: string;
    command: string;
    status: string;
    message: string;
  }>>(response);

  if (!result.success || !result.data) {
    throw new ApiError(500, result.error || 'Failed to send command');
  }

  return {
    id: result.data.commandId,
    stationId: Number(stationId),
    command: result.data.command as DeviceCommand['command'],
    payload: null,
    status: result.data.status as DeviceCommand['status'],
    createdAt: new Date().toISOString(),
    sentAt: null,
    ackedAt: null,
  };
}

export async function fetchStationCommands(stationId: string | number): Promise<DeviceCommand[]> {
  const response = await fetch(`${API_BASE_URL}/api/stations/${stationId}/command`);
  const result = await handleResponse<ApiResponse<DeviceCommand[]>>(response);

  if (!result.success || !result.data) {
    return [];
  }

  return result.data;
}

// 导出类型供其他模块使用
export type { BackendStation, BackendReservation, BackendChargingSession, BackendActiveReservation };
