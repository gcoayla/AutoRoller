// Wrapper sobre react-native-ble-plx para hablar con un nodo AutoRoller.
// El protocolo (REQUEST/RESPONSE/STATUS) está documentado en
// docs/ble-provisioning.md.

import { BleManager, Device, Characteristic, BleError } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { PermissionsAndroid, Platform } from 'react-native';

export const SVC          = '5a6f7e10-1a0e-4b0f-bd54-aaaa00000001';
export const CHR_REQUEST  = '5a6f7e10-1a0e-4b0f-bd54-aaaa00000002';
export const CHR_RESPONSE = '5a6f7e10-1a0e-4b0f-bd54-aaaa00000003';
export const CHR_STATUS   = '5a6f7e10-1a0e-4b0f-bd54-aaaa00000004';

let _manager: BleManager | null = null;
function manager(): BleManager {
    if (!_manager) _manager = new BleManager();
    return _manager;
}

// -----------------------------------------------------------------------------
//  Permisos Android
// -----------------------------------------------------------------------------
export async function requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    const sdk = Number(Platform.Version);
    const perms: string[] =
        sdk >= 31
            ? [
                  PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                  PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
              ]
            : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

    const res = await PermissionsAndroid.requestMultiple(perms as any);
    return Object.values(res).every((v) => v === PermissionsAndroid.RESULTS.GRANTED);
}

// -----------------------------------------------------------------------------
//  Escaneo
// -----------------------------------------------------------------------------
export type ScanResult = {
    id: string;
    name: string;
    rssi: number;
};

export function scan(
    onFound: (d: ScanResult) => void,
    timeoutMs = 8000,
): () => void {
    const seen = new Set<string>();
    manager().startDeviceScan(null, { allowDuplicates: false }, (err, dev) => {
        if (err) {
            console.warn('[BLE] scan error', err);
            return;
        }
        if (!dev || !dev.name) return;
        if (!dev.name.startsWith('AutoRoller')) return;
        if (seen.has(dev.id)) return;
        seen.add(dev.id);
        onFound({ id: dev.id, name: dev.name, rssi: dev.rssi ?? 0 });
    });
    const stopper = setTimeout(() => {
        manager().stopDeviceScan();
    }, timeoutMs);
    return () => {
        clearTimeout(stopper);
        manager().stopDeviceScan();
    };
}

// -----------------------------------------------------------------------------
//  Sesión con un nodo
// -----------------------------------------------------------------------------
export class BleSession {
    private device: Device | null = null;
    private respSub: { remove: () => void } | null = null;
    private buf = '';
    private waiters: Array<{
        resolve: (v: any) => void;
        reject: (e: Error) => void;
        timer: ReturnType<typeof setTimeout>;
    }> = [];

    static async connect(id: string): Promise<BleSession> {
        const s = new BleSession();
        const dev = await manager().connectToDevice(id, { requestMTU: 247 });
        await dev.discoverAllServicesAndCharacteristics();
        s.device = dev;
        s.respSub = dev.monitorCharacteristicForService(
            SVC,
            CHR_RESPONSE,
            (err, c) => s.onResponse(err, c),
        ) as any;
        return s;
    }

    async disconnect() {
        try {
            this.respSub?.remove();
            if (this.device) await this.device.cancelConnection();
        } catch {}
        for (const w of this.waiters) {
            clearTimeout(w.timer);
            w.reject(new Error('BLE desconectado'));
        }
        this.waiters = [];
        this.device = null;
    }

    private onResponse(err: BleError | null, c: Characteristic | null) {
        if (err) {
            // a menudo es la baja del monitor; lo ignoramos
            return;
        }
        if (!c?.value) return;
        const chunk = Buffer.from(c.value, 'base64').toString('utf-8');
        this.buf += chunk;
        let idx;
        while ((idx = this.buf.indexOf('\n')) !== -1) {
            const line = this.buf.slice(0, idx);
            this.buf = this.buf.slice(idx + 1);
            try {
                const obj = JSON.parse(line);
                const w = this.waiters.shift();
                if (w) {
                    clearTimeout(w.timer);
                    w.resolve(obj);
                }
            } catch (e) {
                console.warn('[BLE] respuesta no parseable:', line);
            }
        }
    }

    request<T = any>(payload: object, timeoutMs = 8000): Promise<T> {
        if (!this.device) return Promise.reject(new Error('no conectado'));
        const body = JSON.stringify(payload);
        const b64 = Buffer.from(body, 'utf-8').toString('base64');
        return new Promise<T>(async (resolve, reject) => {
            const timer = setTimeout(() => {
                const idx = this.waiters.findIndex((w) => w.timer === timer);
                if (idx >= 0) this.waiters.splice(idx, 1);
                reject(new Error('timeout BLE'));
            }, timeoutMs);
            this.waiters.push({ resolve, reject, timer });
            try {
                await this.device!.writeCharacteristicWithoutResponseForService(
                    SVC,
                    CHR_REQUEST,
                    b64,
                );
            } catch (e: any) {
                const idx = this.waiters.findIndex((w) => w.timer === timer);
                if (idx >= 0) this.waiters.splice(idx, 1);
                clearTimeout(timer);
                reject(e);
            }
        });
    }

    // ----------------- helpers -----------------
    info()                 { return this.request({ op: 'info' }); }
    scanWifi()             { return this.request({ op: 'scan_wifi' }, 14000); }
    setWifi(ssid: string, password: string) {
        return this.request({ op: 'set_wifi', ssid, password });
    }
    setMqtt(cfg: any)      { return this.request({ op: 'set_mqtt', ...cfg }); }
    setHostname(h: string) { return this.request({ op: 'set_hostname', hostname: h }); }
    setMotor(cfg: any)     { return this.request({ op: 'set_motor', ...cfg }); }
    setTime(cfg: any)      { return this.request({ op: 'set_time', ...cfg }); }
    getConfig()            { return this.request({ op: 'get_config' }); }
    getSchedules()         { return this.request({ op: 'get_schedules' }); }
    setSchedule(s: any)    { return this.request({ op: 'set_schedule', ...s }); }
    delSchedule(i: number) { return this.request({ op: 'del_schedule', i }); }
    control(action: string, value?: number) {
        return this.request({ op: 'control', action, value });
    }
    calibrate()  { return this.request({ op: 'calibrate' }); }
    reboot()     { return this.request({ op: 'reboot' }); }
    factory()    { return this.request({ op: 'factory_reset' }); }
    bleOff()     { return this.request({ op: 'ble_off' }); }
}
