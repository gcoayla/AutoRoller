// Sondeo del estado del nodo, con dos transportes:
//   1) WebSocket en `/ws` (preferido): el nodo empuja cambios de estado
//      según ocurren, sin polling.
//   2) HTTP polling cada `intervalMs` (fallback): se activa si el WS no
//      conecta o se cae, y vuelve a intentar el WS pasados unos segundos.
//
// El primer disparo del polling se escalona con un offset determinístico
// por id para evitar avalanchas en la red doméstica si tienes muchos nodos.

import { useEffect } from 'react';

import { apiFor, hostOf } from '@/lib/device-client';
import type { DeviceStatus, SavedDevice } from '@/lib/types';
import { useDevices } from '@/store/devices';

function hashOffset(id: string, mod: number): number {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    return Math.abs(h) % mod;
}

export function useDeviceStatus(device: SavedDevice, intervalMs = 2500) {
    const setStatus = useDevices((s) => s.setStatus);
    const setOnline = useDevices((s) => s.setOnline);
    const update    = useDevices((s) => s.update);

    useEffect(() => {
        if (device.id === '__none__') return;

        let alive = true;
        let pollTimer: ReturnType<typeof setTimeout> | null = null;
        let ws: WebSocket | null = null;
        let wsRetryTimer: ReturnType<typeof setTimeout> | null = null;
        let pollMode = false;

        const client = apiFor(device);
        const host = hostOf(device);
        const offset = hashOffset(device.id, intervalMs);

        const applyStatus = (st: DeviceStatus) => {
            setStatus(device.id, st);
            setOnline(device.id, true);
            if (st.wifi_ip && st.wifi_ip !== device.ip) {
                update(device.id, { ip: st.wifi_ip });
            }
            if (st.device && st.device !== device.hostname) {
                update(device.id, { hostname: st.device });
            }
        };

        // --- WebSocket -----------------------------------------------------
        const connectWS = () => {
            if (!alive) return;
            try {
                ws = new WebSocket(`ws://${host}/ws`);
            } catch {
                startPolling();
                return;
            }
            ws.onopen = () => {
                pollMode = false;
                if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
            };
            ws.onmessage = (ev) => {
                if (!alive) return;
                try {
                    const st = JSON.parse(String(ev.data)) as DeviceStatus;
                    applyStatus(st);
                } catch {}
            };
            ws.onerror = () => {
                // ignoramos; onclose se encargará
            };
            ws.onclose = () => {
                if (!alive) return;
                if (!pollMode) {
                    setOnline(device.id, false);
                    startPolling();
                }
                // intenta reabrir WS tras un poco
                if (wsRetryTimer) clearTimeout(wsRetryTimer);
                wsRetryTimer = setTimeout(() => {
                    if (!alive) return;
                    connectWS();
                }, 8000);
            };
        };

        // --- HTTP polling fallback ----------------------------------------
        const tick = async () => {
            if (!alive) return;
            try {
                const st = await client.status();
                if (!alive) return;
                applyStatus(st);
            } catch {
                if (alive) setOnline(device.id, false);
            } finally {
                if (alive && pollMode) pollTimer = setTimeout(tick, intervalMs);
            }
        };

        const startPolling = () => {
            if (pollMode) return;
            pollMode = true;
            pollTimer = setTimeout(tick, offset);
        };

        // Empezamos por WS y dejamos el polling como red de seguridad.
        connectWS();
        // Si el WS no se abre en 4s, arrancamos polling igual.
        const safetyNet = setTimeout(() => {
            if (!alive) return;
            if (!ws || ws.readyState !== WebSocket.OPEN) startPolling();
        }, 4000);

        return () => {
            alive = false;
            clearTimeout(safetyNet);
            if (pollTimer) clearTimeout(pollTimer);
            if (wsRetryTimer) clearTimeout(wsRetryTimer);
            if (ws) {
                ws.onopen = ws.onclose = ws.onmessage = ws.onerror = null;
                try { ws.close(); } catch {}
            }
        };
    }, [device.id, device.ip, device.hostname, device.apiToken, intervalMs, setStatus, setOnline, update]);
}
