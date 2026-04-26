// Cliente por dispositivo: combina host + token en una API ligera para no
// repetir argumentos por todas partes.

import { api, UnauthorizedError } from './http';
import type { SavedDevice } from './types';

export function hostOf(d: SavedDevice): string {
    return d.ip || `${d.hostname}.local`;
}

export function apiFor(d: SavedDevice) {
    const host  = hostOf(d);
    const token = d.apiToken;
    return {
        host,
        token,
        status:        ()                  => api.status(host, token),
        config:        ()                  => api.config(host, token),
        setConfig:     (c: any)            => api.setConfig(host, c, token),
        scan:          ()                  => api.scan(host, token),
        schedules:     ()                  => api.schedules(host, token),
        setSchedule:   (s: any)            => api.setSchedule(host, s, token),
        deleteSchedule:(i: number)         => api.deleteSchedule(host, i, token),
        favorites:     ()                  => api.favorites(host, token),
        setFavorite:   (f: any)            => api.setFavorite(host, f, token),
        deleteFavorite:(i: number)         => api.deleteFavorite(host, i, token),
        open:          ()                  => api.open(host, token),
        close:         ()                  => api.close(host, token),
        stop:          ()                  => api.stop(host, token),
        set:           (v: number)         => api.set(host, v, token),
        calibrate:     ()                  => api.calibrate(host, token),
        reboot:        ()                  => api.reboot(host, token),
        factory:       ()                  => api.factory(host, token),
        forgetWifi:    ()                  => api.forgetWifi(host, token),
        setHere:       (v: number)         => api.setHere(host, v, token),
        bleControl:    (a: 'on' | 'off')   => api.bleControl(host, a, token),
    };
}

export { UnauthorizedError };
