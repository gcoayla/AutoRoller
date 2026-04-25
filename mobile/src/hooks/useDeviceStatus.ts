// Sondeo periódico del estado de un nodo por HTTP.
// Cuando se sondean varios nodos a la vez, escalonamos el primer disparo con
// un offset determinístico por id para evitar avalanchas en la red.

import { useEffect } from 'react';

import { api } from '@/lib/http';
import type { SavedDevice } from '@/lib/types';
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
        let timer: ReturnType<typeof setTimeout> | null = null;
        const host = device.ip || `${device.hostname}.local`;
        const offset = hashOffset(device.id, intervalMs);

        async function tick() {
            if (!alive) return;
            try {
                const st = await api.status(host);
                if (!alive) return;
                setStatus(device.id, st);
                setOnline(device.id, true);
                if (st.wifi_ip && st.wifi_ip !== device.ip) {
                    update(device.id, { ip: st.wifi_ip });
                }
                if (st.device && st.device !== device.hostname) {
                    update(device.id, { hostname: st.device });
                }
            } catch {
                if (alive) setOnline(device.id, false);
            } finally {
                if (alive) timer = setTimeout(tick, intervalMs);
            }
        }
        timer = setTimeout(tick, offset);

        return () => {
            alive = false;
            if (timer) clearTimeout(timer);
        };
    }, [device.id, device.ip, device.hostname, intervalMs, setStatus, setOnline, update]);
}
