import React from 'react';

export interface Station {
    id: string;
    name: string;
    address: string;
    status: 'Available' | 'Occupied' | 'Reserved' | 'Issue';
    distance: string;
    type: 'AC' | 'DC';
    power: string;
    lat: number;
    lng: number;
    gps: string;
}

export interface ChartData {
    name: string;
    value: number;
}

export interface SessionData {
    id: string;
    date: string;
    time: string;
    location: string;
    locationSub: string;
    energy: string;
    cost: string;
    status: 'Completed' | 'Stopped' | 'Charging';
}

export interface StatCardProps {
    title: string;
    value: string;
    change: string;
    isPositive: boolean;
    icon: React.ElementType;
    subText: string;
    colorClass: string;
}
