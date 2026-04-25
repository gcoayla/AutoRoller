// Sondeo periódico del estado de un nodo por HTTP.
// Si el dispositivo está offline (timeout) marca onlineMap=false hasta que
// vuelva. Se usa en HomeScreen y DeviceScreen.

import { useEffect } from 'react';

import { api } from '@/lib/http';
import type { SavedDevice } from '@/lib/types';
import { useDevices } from '@/store/devices';

export function useDeviceStatus(device: SavedDevice, intervalMs = 2500) {
    const setStatus = useDevices((s) => s.setStatus);
    const setOnline = useDevices((s) => s.setOnline);
    const update    = useDevices((s) => s.update);

    useEffect(() => {
        if (device.id === '__none__') return;
        let alive = true;
        const host = device.ip || `${device.hostname}.local`;

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
            }
        }
        tick();
        const t = setInterval(tick, intervalMs);
        return () => {
            alive = false;
            clearInterval(t);
        };
    }, [device.id, device.ip, device.hostname, intervalMs, setStatus, setOnline, update]);
}
