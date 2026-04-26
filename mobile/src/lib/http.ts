// Cliente HTTP minimalista para hablar con un nodo AutoRoller.
// Trabaja con la API REST documentada en docs/api.md.
//
// Auth opcional: si pasas `token`, se inyecta como X-AutoRoller-Token. Una
// petición que devuelve 401 lanza un Error("unauthorized") que la UI captura
// para pedir el token al usuario.

import type {
    DeviceConfig,
    DeviceStatus,
    Favorite,
    Schedule,
    WifiNetwork,
} from './types';

const TIMEOUT_MS = 4000;

export class UnauthorizedError extends Error {
    constructor() { super('unauthorized'); this.name = 'UnauthorizedError'; }
}

function baseUrl(host: string): string {
    if (host.startsWith('http://') || host.startsWith('https://')) return host;
    return `http://${host}`;
}

function authHeaders(token?: string): Record<string, string> {
    return token ? { 'X-AutoRoller-Token': token } : {};
}

async function fetchJson<T>(url: string, token?: string, init?: RequestInit): Promise<T> {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), init?.signal ? 0 : TIMEOUT_MS);
    try {
        const headers = { ...authHeaders(token), ...((init?.headers as any) || {}) };
        const r = await fetch(url, { ...init, headers, signal: init?.signal ?? ctl.signal });
        if (r.status === 401) throw new UnauthorizedError();
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        const ct = r.headers.get('content-type') || '';
        if (ct.includes('application/json')) return (await r.json()) as T;
        return (await r.text()) as unknown as T;
    } finally {
        clearTimeout(timer);
    }
}

export const api = {
    status: (host: string, token?: string) =>
        fetchJson<DeviceStatus>(`${baseUrl(host)}/api/status`, token),

    config: (host: string, token?: string) =>
        fetchJson<DeviceConfig>(`${baseUrl(host)}/api/config`, token),

    setConfig: (host: string, cfg: DeviceConfig, token?: string) =>
        fetchJson<{ ok: boolean }>(`${baseUrl(host)}/api/config`, token, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cfg),
        }),

    scan: (host: string, token?: string) =>
        fetchJson<{ networks: WifiNetwork[] }>(`${baseUrl(host)}/api/scan`, token),

    schedules: (host: string, token?: string) =>
        fetchJson<{ schedules: Schedule[]; time: string }>(
            `${baseUrl(host)}/api/schedules`, token,
        ),

    setSchedule: (host: string, s: Schedule, token?: string) =>
        fetchJson<{ ok: boolean }>(`${baseUrl(host)}/api/schedules`, token, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(s),
        }),

    deleteSchedule: (host: string, i: number, token?: string) =>
        fetchJson<{ ok: boolean }>(`${baseUrl(host)}/api/schedules?i=${i}`, token, {
            method: 'DELETE',
        }),

    favorites: (host: string, token?: string) =>
        fetchJson<{ favorites: Favorite[] }>(`${baseUrl(host)}/api/favorites`, token),

    setFavorite: (host: string, f: Favorite, token?: string) =>
        fetchJson<{ ok: boolean }>(`${baseUrl(host)}/api/favorites`, token, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(f),
        }),

    deleteFavorite: (host: string, i: number, token?: string) =>
        fetchJson<{ ok: boolean }>(`${baseUrl(host)}/api/favorites?i=${i}`, token, {
            method: 'DELETE',
        }),

    open:      (host: string, token?: string) => fetchJson<unknown>(`${baseUrl(host)}/api/open`,      token, { method: 'POST' }),
    close:     (host: string, token?: string) => fetchJson<unknown>(`${baseUrl(host)}/api/close`,     token, { method: 'POST' }),
    stop:      (host: string, token?: string) => fetchJson<unknown>(`${baseUrl(host)}/api/stop`,      token, { method: 'POST' }),
    set:       (host: string, value: number, token?: string) =>
        fetchJson<unknown>(`${baseUrl(host)}/api/set?value=${Math.round(value)}`, token, { method: 'POST' }),
    calibrate: (host: string, token?: string) => fetchJson<unknown>(`${baseUrl(host)}/api/calibrate`, token, { method: 'POST' }),
    reboot:    (host: string, token?: string) => fetchJson<unknown>(`${baseUrl(host)}/api/reboot`,    token, { method: 'POST' }),
    factory:   (host: string, token?: string) => fetchJson<unknown>(`${baseUrl(host)}/api/factory-reset`, token, { method: 'POST' }),
    forgetWifi:(host: string, token?: string) => fetchJson<unknown>(`${baseUrl(host)}/api/forget-wifi`,   token, { method: 'POST' }),
    setHere:   (host: string, value: number, token?: string) =>
        fetchJson<unknown>(`${baseUrl(host)}/api/set-here?value=${value}`, token, { method: 'POST' }),
    bleControl: (host: string, action: 'on' | 'off', token?: string) =>
        fetchJson<unknown>(`${baseUrl(host)}/api/ble`, token, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action }),
        }),

    ping: async (host: string, token?: string): Promise<boolean> => {
        try { await api.status(host, token); return true; } catch { return false; }
    },
};
