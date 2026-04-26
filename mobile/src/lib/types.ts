// Tipos compartidos por toda la app.

export type DeviceState =
    | 'idle'
    | 'moving_up'
    | 'moving_down'
    | 'homing'
    | 'calibrating'
    | 'fault'
    | 'unknown';

// Lo que persistimos en Zustand para cada nodo.
export type SavedDevice = {
    id: string;             // UUID local
    hostname: string;       // se actualiza si cambia
    ip?: string;            // última IP conocida (mDNS o BLE info)
    bleId?: string;         // address BLE para reconectar
    apiToken?: string;      // token para auth HTTP (vacío = sin auth)
    roomId?: string;        // habitación a la que pertenece (opcional)
    addedAt: number;
    favorite?: boolean;
    color?: string;         // tinte personalizado para distinguirlos
    notes?: string;
};

// Habitación (sólo en la app, no en el firmware).
export type Room = {
    id: string;
    name: string;
    icon?: string;          // nombre de un Ionicon (e.g. "bed-outline")
    color?: string;
    order: number;
};

// Preset / escena: combinación de posiciones para varios dispositivos.
export type PresetItem = {
    deviceId: string;
    target_pct: number;
};
export type Preset = {
    id: string;
    name: string;
    icon?: string;
    items: PresetItem[];
};

// Favorita por dispositivo (vive en el firmware, expuesta como Settings.favorites).
export type Favorite = {
    i: number;
    enabled: boolean;
    name: string;
    target_pct: number;
};

// Estado en vivo (no persistente) del nodo.
export type DeviceStatus = {
    device?: string;
    fw?: string;
    state?: DeviceState;
    position?: number;
    max?: number;
    percent?: number;
    calibrated?: boolean;
    wifi_ssid?: string;
    wifi_ip?: string;
    wifi_rssi?: number;
    mqtt_on?: boolean;
    ble_on?: boolean;
    ble_conn?: boolean;
    time?: string;
    uptime_s?: number;
};

export type DeviceConfig = {
    hostname?: string;
    wifi_ssid?: string;
    wifi_password?: string;
    mqtt_enabled?: boolean;
    mqtt_host?: string;
    mqtt_port?: number;
    mqtt_user?: string;
    mqtt_password?: string;
    mqtt_base_topic?: string;
    invert_direction?: boolean;
    max_speed_hz?: number;
    accel_hz_per_s?: number;
    use_endstops?: boolean;
    /** 0 = chain_puller (no invasivo), 1 = in_tube (invasivo) */
    mechanism_type?: number;
    ble_enabled?: boolean;
    ble_policy?: number;
    ble_passkey?: number;
    ntp_enabled?: boolean;
    ntp_server?: string;
    timezone?: string;
    api_token?: string;
    limit_open?: number;
    limit_close?: number;
};

export type Schedule = {
    i: number;
    enabled: boolean;
    hour: number;
    minute: number;
    days_mask: number;  // bit0=Lun..bit6=Dom
    target_pct: number;
};

export type WifiNetwork = {
    ssid: string;
    rssi: number;
    channel: number;
    open: boolean;
};
