// AutoRoller — UI mínima para el firmware embebido
// Sin frameworks, JS estándar. Toda la lógica encaja en menos de 200 líneas.

(() => {
    const $ = (id) => document.getElementById(id);

    const ws = new WebSocket(`ws://${location.host}/ws`);
    let lastState = null;

    // ---- helpers
    const post = (path, body) =>
        fetch(path, {
            method: "POST",
            headers: body ? { "Content-Type": "application/json" } : {},
            body: body ? JSON.stringify(body) : undefined,
        }).then((r) => r.json());

    const get = (path) => fetch(path).then((r) => r.json());

    // ---- render
    const renderState = (s) => {
        if (!s) return;
        lastState = s;
        $("device-name").textContent = s.device || "—";
        $("fw").textContent  = s.fw  || "—";
        $("ip").textContent  = s.wifi_ip   || "—";
        $("ssid").textContent = s.wifi_ssid || "—";

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
    ws.onclose = () => {
        setTimeout(() => location.reload(), 2000);
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
})();
