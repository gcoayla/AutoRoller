// Cliente HTTP minimalista para hablar con un nodo AutoRoller.
// Trabaja con la API REST documentada en docs/api.md.

import type {
    DeviceConfig,
    DeviceStatus,
    Schedule,
    WifiNetwork,
} from './types';

const TIMEOUT_MS = 4000;

function baseUrl(host: string): string {
    if (host.startsWith('http://') || host.startsWith('https://')) return host;
    return `http://${host}`;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), init?.signal ? 0 : TIMEOUT_MS);
    try {
        const r = await fetch(url, { ...init, signal: init?.signal ?? ctl.signal });
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        const ct = r.headers.get('content-type') || '';
        if (ct.includes('application/json')) return (await r.json()) as T;
        return (await r.text()) as unknown as T;
    } finally {
        clearTimeout(timer);
    }
}

export const api = {
    status: (host: string) =>
        fetchJson<DeviceStatus>(`${baseUrl(host)}/api/status`),

    config: (host: string) =>
        fetchJson<DeviceConfig>(`${baseUrl(host)}/api/config`),

    setConfig: (host: string, cfg: DeviceConfig) =>
        fetchJson<{ ok: boolean }>(`${baseUrl(host)}/api/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cfg),
        }),

    scan: (host: string) =>
        fetchJson<{ networks: WifiNetwork[] }>(`${baseUrl(host)}/api/scan`),

    schedules: (host: string) =>
        fetchJson<{ schedules: Schedule[]; time: string }>(
            `${baseUrl(host)}/api/schedules`,
        ),

    setSchedule: (host: string, s: Schedule) =>
        fetchJson<{ ok: boolean }>(`${baseUrl(host)}/api/schedules`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(s),
        }),

    deleteSchedule: (host: string, i: number) =>
        fetchJson<{ ok: boolean }>(`${baseUrl(host)}/api/schedules?i=${i}`, {
            method: 'DELETE',
        }),

    open:      (host: string) => fetchJson<unknown>(`${baseUrl(host)}/api/open`,      { method: 'POST' }),
    close:     (host: string) => fetchJson<unknown>(`${baseUrl(host)}/api/close`,     { method: 'POST' }),
    stop:      (host: string) => fetchJson<unknown>(`${baseUrl(host)}/api/stop`,      { method: 'POST' }),
    set:       (host: string, value: number) =>
        fetchJson<unknown>(`${baseUrl(host)}/api/set?value=${Math.round(value)}`, { method: 'POST' }),
    calibrate: (host: string) => fetchJson<unknown>(`${baseUrl(host)}/api/calibrate`, { method: 'POST' }),
    reboot:    (host: string) => fetchJson<unknown>(`${baseUrl(host)}/api/reboot`,    { method: 'POST' }),
    factory:   (host: string) => fetchJson<unknown>(`${baseUrl(host)}/api/factory-reset`, { method: 'POST' }),
    forgetWifi:(host: string) => fetchJson<unknown>(`${baseUrl(host)}/api/forget-wifi`,   { method: 'POST' }),
    setHere:   (host: string, value: number) =>
        fetchJson<unknown>(`${baseUrl(host)}/api/set-here?value=${value}`, { method: 'POST' }),
    bleControl: (host: string, action: 'on' | 'off') =>
        fetchJson<unknown>(`${baseUrl(host)}/api/ble`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action }),
        }),

    // Health-check rápido.
    ping: async (host: string): Promise<boolean> => {
        try {
            await api.status(host);
            return true;
        } catch {
            return false;
        }
    },
};
