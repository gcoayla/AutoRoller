// AutoRoller — UI mínima para el firmware embebido
// Sin frameworks, JS estándar. Toda la lógica encaja en menos de 200 líneas.

(() => {
    const $ = (id) => document.getElementById(id);

    // ---- token de auth (persistente en localStorage)
    const TOKEN_KEY = "autoroller.token";
    const getToken = () => localStorage.getItem(TOKEN_KEY) || "";
    const setToken = (t) => {
        if (t) localStorage.setItem(TOKEN_KEY, t);
        else localStorage.removeItem(TOKEN_KEY);
    };
    const wsUrl = () => {
        const t = getToken();
        return `ws://${location.host}/ws${t ? `?token=${encodeURIComponent(t)}` : ""}`;
    };
    let ws = new WebSocket(wsUrl());
    let lastState = null;


    const authHeaders = () => {
        const t = getToken();
        return t ? { "X-AutoRoller-Token": t } : {};
    };

    async function call(path, init = {}) {
        const headers = { ...authHeaders(), ...(init.headers || {}) };
        const r = await fetch(path, { ...init, headers });
        if (r.status === 401) {
            const t = prompt("Este nodo requiere un token de API. Introdúcelo:");
            if (t) {
                setToken(t);
                return call(path, init);
            }
            throw new Error("Sin token");
        }
        return r;
    }

    const post = (path, body) =>
        call(path, {
            method: "POST",
            headers: body ? { "Content-Type": "application/json" } : {},
            body: body ? JSON.stringify(body) : undefined,
        }).then((r) => r.json());

    const get = (path) => call(path).then((r) => r.json());

    const fmtUptime = (sec) => {
        if (sec == null) return "—";
        const d = Math.floor(sec / 86400);
        const h = Math.floor((sec % 86400) / 3600);
        const m = Math.floor((sec % 3600) / 60);
        return d ? `${d}d ${h}h ${m}m` : h ? `${h}h ${m}m` : `${m}m`;
    };

    // ---- render
    const renderState = (s) => {
        if (!s) return;
        lastState = s;
        $("device-name").textContent = s.device || "—";
        $("fw").textContent   = s.fw  || "—";
        $("ip").textContent   = s.wifi_ip   || "—";
        $("ssid").textContent = s.wifi_ssid || "—";
        $("rssi").textContent = s.wifi_rssi != null ? s.wifi_rssi : "—";
        $("time").textContent = s.time || "—";
        $("ble").textContent  = s.ble_on ? (s.ble_conn ? "conectado" : "anunciando") : "off";
        $("uptime").textContent = fmtUptime(s.uptime_s);

        $("position-label").textContent = `${s.percent ?? 0} %`;
        $("curtain").style.height = `${s.percent ?? 0}%`;
        if (document.activeElement !== $("slider")) {
            $("slider").value = s.percent ?? 0;
        }

        const pill = $("state-pill");
        pill.textContent = (s.state || "·").replace("_", " ");
        pill.className = "pill " +
            (s.state === "idle"        ? "idle" :
             s.state === "calibrating" ? "calib":
             s.state === "fault"       ? "fault":
                                          "moving");
    };

    const renderConfig = (c) => {
        if (!c) return;
        for (const k of Object.keys(c)) {
            const el = $(k);
            if (!el) continue;
            if (el.type === "checkbox") el.checked = !!c[k];
            else el.value = c[k] ?? "";
        }
    };

    // ---- WebSocket
    ws.onmessage = (ev) => {
        try { renderState(JSON.parse(ev.data)); } catch {}
    };
    ws.onclose = (ev) => {
        // 1008 = policy violation (token inválido). Pedimos token y recargamos.
        if (ev && ev.code === 1008) {
            const t = prompt("Este nodo requiere un token de API. Introdúcelo:");
            if (t) setToken(t);
        }
        setTimeout(() => location.reload(), 1500);
    };

    // ---- inicial
    get("/api/status").then(renderState).catch(() => {});
    get("/api/config").then(renderConfig).catch(() => {});

    // ---- controles
    $("btn-up").addEventListener("click",   () => post("/api/open"));
    $("btn-down").addEventListener("click", () => post("/api/close"));
    $("btn-stop").addEventListener("click", () => post("/api/stop"));

    let sliderTimer;
    $("slider").addEventListener("input", () => {
        const v = $("slider").value;
        $("position-label").textContent = `${v} %`;
        $("curtain").style.height = `${v}%`;
        clearTimeout(sliderTimer);
        sliderTimer = setTimeout(() => {
            fetch(`/api/set?value=${v}`, { method: "POST" });
        }, 150);
    });

    // ---- configuración
    const collectConfig = () => {
        const ids = [
            "hostname",
            "wifi_ssid", "wifi_password",
            "mqtt_enabled", "mqtt_host", "mqtt_port",
            "mqtt_user", "mqtt_password", "mqtt_base_topic",
            "invert_direction", "use_endstops",
            "max_speed_hz", "accel_hz_per_s",
        ];
        const out = {};
        for (const id of ids) {
            const el = $(id);
            if (!el) continue;
            if (el.type === "checkbox") out[id] = el.checked;
            else if (el.type === "number") out[id] = Number(el.value);
            else out[id] = el.value;
        }
        return out;
    };

    $("btn-save").addEventListener("click", async () => {
        const cfg = collectConfig();
        const r = await post("/api/config", cfg);
        alert(r.ok ? "Guardado." : "Error al guardar.");
    });

    $("btn-calibrate").addEventListener("click", () => {
        if (confirm("¿Iniciar calibración? El motor se moverá entre topes.")) {
            post("/api/calibrate");
        }
    });

    $("btn-set-here-0").addEventListener("click", () =>
        fetch("/api/set-here?value=0", { method: "POST" }));
    $("btn-set-here-max").addEventListener("click", () => {
        const m = (lastState && lastState.max) || 20000;
        fetch(`/api/set-here?value=${m}`, { method: "POST" });
    });

    $("btn-forget-wifi").addEventListener("click", async () => {
        if (!confirm("Borrar credenciales WiFi y abrir el portal?")) return;
        await post("/api/forget-wifi");
    });
    $("btn-factory-reset").addEventListener("click", async () => {
        if (!confirm("Reset de fábrica: borra TODA la configuración. ¿Seguro?")) return;
        await post("/api/factory-reset");
    });
    $("btn-reboot").addEventListener("click", () => post("/api/reboot"));

    // ---- escaneo WiFi (botón "Buscar redes")
    const renderWifiList = (nets) => {
        const c = $("wifi-list");
        c.innerHTML = "";
        if (!nets || !nets.length) {
            c.textContent = "(sin redes)";
            return;
        }
        for (const n of nets) {
            const row = document.createElement("button");
            row.type = "button";
            row.className = "ghost";
            row.style.display = "block";
            row.style.width = "100%";
            row.style.textAlign = "left";
            row.style.margin = "4px 0";
            const lock = n.open ? "" : "🔒 ";
            row.textContent = `${lock}${n.ssid || "(oculta)"}  ${n.rssi} dBm`;
            row.onclick = () => { $("wifi_ssid").value = n.ssid; };
            c.appendChild(row);
        }
    };
    $("btn-scan-wifi").addEventListener("click", async () => {
        $("wifi-list").textContent = "Buscando…";
        // El endpoint es asíncrono: si devuelve 202, reintentamos un par de veces.
        for (let i = 0; i < 5; i++) {
            const r = await fetch("/api/scan");
            if (r.status === 200) { renderWifiList((await r.json()).networks); return; }
            await new Promise((res) => setTimeout(res, 1200));
        }
        $("wifi-list").textContent = "Tiempo agotado.";
    });
})();
