import { Station, SessionData } from './types';

// Real coordinates for Paris locations
export const STATIONS: Station[] = [
    { id: '1', name: 'Station Bastille A1', address: '12 Rue de la Roquette', status: 'Available', distance: '0.4km', type: 'AC', power: '22kW', lat: 48.8534, lng: 2.3698, gps: "48.8534° N, 2.3698° E" },
    { id: '2', name: 'Gare de Lyon E-Spot', address: 'Place Louis-Armand', status: 'Occupied', distance: '1.2km', type: 'DC', power: '150kW', lat: 48.8443, lng: 2.3744, gps: "48.8443° N, 2.3744° E" },
    { id: '3', name: 'Marais FastCharge', address: 'Rue de Rivoli', status: 'Issue', distance: '1.5km', type: 'DC', power: '50kW', lat: 48.8556, lng: 2.3522, gps: "48.8556° N, 2.3522° E" },
    { id: '4', name: 'Place des Vosges North', address: 'Place des Vosges', status: 'Reserved', distance: '1.8km', type: 'AC', power: '22kW', lat: 48.8566, lng: 2.3652, gps: "48.8566° N, 2.3652° E" },
    { id: '5', name: 'République Hub B2', address: '12 Av. de la République', status: 'Available', distance: '2.1km', type: 'AC', power: '22kW', lat: 48.8672, lng: 2.3634, gps: "48.8672° N, 2.3634° E" },
];

export const SESSIONS: SessionData[] = [
    { id: '1', date: 'Oct 24, 2023', time: '14:30 - 15:15', location: 'Station 12', locationSub: 'Le Marais, Paris', energy: '45.2 kWh', cost: '€ 12.50', status: 'Completed' },
    { id: '2', date: 'Oct 22, 2023', time: '09:15 - 10:00', location: 'Station 08', locationSub: 'Montmartre, Paris', energy: '22.8 kWh', cost: '€ 8.20', status: 'Completed' },
    { id: '3', date: 'Oct 18, 2023', time: '18:45 - 19:00', location: 'Station 03', locationSub: 'La Défense, Paris', energy: '5.1 kWh', cost: '€ 2.10', status: 'Stopped' },
    { id: '4', date: 'Oct 15, 2023', time: '08:00 - 10:00', location: 'Station 19', locationSub: 'Bastille, Paris', energy: '62.4 kWh', cost: '€ 18.00', status: 'Completed' },
];

export const HOURLY_POWER_DATA = [
    { time: '00:00', value: 20 }, { time: '02:00', value: 15 }, { time: '04:00', value: 10 },
    { time: '06:00', value: 35 }, { time: '08:00', value: 70 }, { time: '10:00', value: 85 },
    { time: '12:00', value: 90 }, { time: '14:00', value: 75 }, { time: '16:00', value: 60 },
    { time: '18:00', value: 80 }, { time: '20:00', value: 55 }, { time: '22:00', value: 30 },
];

export const WEEKLY_POWER_DATA = [
    { time: 'Mon', value: 320 }, { time: 'Tue', value: 450 }, { time: 'Wed', value: 410 },
    { time: 'Thu', value: 550 }, { time: 'Fri', value: 500 }, { time: 'Sat', value: 680 },
    { time: 'Sun', value: 620 },
];

export const ENERGY_CONSUMPTION_DATA = [
    { name: 'Oct 1', value: 105 }, { name: 'Oct 5', value: 115 }, { name: 'Oct 10', value: 85 },
    { name: 'Oct 15', value: 190 }, { name: 'Oct 20', value: 65 }, { name: 'Oct 25', value: 180 },
    { name: 'Today', value: 140 },
];

export const PEAK_HOURS_DATA = [
    { name: '00-04', value: 15 }, { name: '04-08', value: 25 }, { name: '08-12', value: 65 },
    { name: '12-16', value: 90 }, { name: '16-20', value: 75 }, { name: '20-24', value: 35 },
];

export const REVENUE_PIE_DATA = [
    { name: 'AC Charging', value: 65, fill: '#3c83f6' },
    { name: 'DC Charging', value: 35, fill: '#10b981' },
];

export const STATION_PERFORMANCE_DATA = [
    { id: '1', name: 'Station Bastille A1', sessions: 142, revenue: '€2,150', utilization: 85, status: 'Online' },
    { id: '2', name: 'Gare de Lyon E-Spot', sessions: 98, revenue: '€4,200', utilization: 92, status: 'Online' },
    { id: '5', name: 'République Hub B2', sessions: 76, revenue: '€1,850', utilization: 64, status: 'Maintenance' },
    { id: '4', name: 'Place des Vosges North', sessions: 45, revenue: '€890', utilization: 42, status: 'Online' },
];
