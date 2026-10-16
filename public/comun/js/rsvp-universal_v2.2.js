// JavaScript Document
document.addEventListener("DOMContentLoaded", function () {

const invField = document.getElementById("inv-field");

// 🔥 ID INVITADO DESDE URL
const params = new URLSearchParams(window.location.search);
const invParam = params.get("inv") || params.get("id");

if (invField) {
  invField.value = invParam ? invParam : "inv-" + Date.now();
}
	
  let _acompSelect = null;
	
  const form      = document.getElementById("rsvp-form");
  const ok        = document.getElementById("rsvp-ok");
  const fijos     = document.getElementById("rsvp-fijos");
  const dinamicos = document.getElementById("rsvp-dinamicos");
  const errorBox  = document.getElementById("rsvp-error");
  const cfg       = document.getElementById("rsvp-config")?.dataset || {};

  // Página sin formulario RSVP propio: no hacer nada
  if (!form || !errorBox) return;

  const url = window.INVITACION_CONFIG?.rsvp_url || cfg.url;

  // 🔒 Invitación "solo invitados": oculta el formulario si no hay invitado válido
  window.addEventListener("invitado-bloqueado", () => {
    if (form) form.style.display = "none";
    const footer = document.getElementById("rsvp-footer");
    if (footer) footer.style.display = "none";
  });

  // 🔒 Requiere PIN: el PIN es por invitado (?inv=), así que el formulario arranca
  // oculto SOLO si el link trae un invitado; se muestra al validar su PIN. Sin
  // ?inv= (acceso libre, soloInvitados: false) el formulario se ve normal.
  const requierePinCfg = window.INVITACION_CONFIG?.requierePin === true || window.INVITACION_CONFIG?.requierePin === "true";
  if (requierePinCfg && invParam) {
    if (form) form.style.display = "none";
    const footerInicial = document.getElementById("rsvp-footer");
    if (footerInicial) footerInicial.style.display = "none";
  }

  // invitado-libre: el ?inv= no está en la lista y la invitación no es solo para invitados
  ["invitado-ready", "invitado-libre"].forEach(ev => window.addEventListener(ev, () => {
    if (form) form.style.display = "";
    const footer = document.getElementById("rsvp-footer");
    if (footer) footer.style.display = "";
  }));

  // =========================
  // HELPERS
  // =========================

  const txt = (key) => cfg[key] || "";

  function mostrarError(msg) {
    errorBox.innerText     = msg;
    errorBox.style.display = "block";
  }

  form.addEventListener("input",  () => errorBox.style.display = "none");
  form.addEventListener("change", () => errorBox.style.display = "none");

  const createInput = (name, placeholder) => {
    const i       = document.createElement("input");
    i.type        = "text";
    i.name        = name;
    i.className   = "form-control mb-3";
    i.placeholder = placeholder;
    return i;
  };

  const createLabel = (text) => {
    const l     = document.createElement("label");
    l.className = "font-weight-bold d-block mb-1";
    l.innerText = text;
    return l;
  };

  const createSelect = (name, labelText, options, sublabelText = "") => {
    const wrap     = document.createElement("div");
    wrap.className = "mb-3";

    wrap.appendChild(createLabel(labelText));

    if (sublabelText) {
      const sub     = document.createElement("small");
      sub.className = "d-block text-black-50 mb-2";
      sub.innerText = sublabelText;
      wrap.appendChild(sub);
    }

    const sel     = document.createElement("select");
    sel.name      = name;
    sel.className = "form-control";
    sel.innerHTML = `<option value="">${txt("textSeleccionar")}</option>`;

    options.forEach(([value, label]) => {
      sel.innerHTML += `<option value="${value}">${label}</option>`;
    });

    wrap.appendChild(sel);
    dinamicos.appendChild(wrap);

    return sel;
  };

  const createTextQuestion = (name, labelText, sublabelText, placeholder) => {
    const wrap     = document.createElement("div");
    wrap.className = "mb-3";

    wrap.appendChild(createLabel(labelText));

    if (sublabelText) {
      const sub     = document.createElement("small");
      sub.className = "d-block text-black-50 mb-2";
      sub.innerText = sublabelText;
      wrap.appendChild(sub);
    }

    wrap.appendChild(createInput(name, placeholder || labelText));
    dinamicos.appendChild(wrap);
  };

  // =========================
  // RENDER FORM
  // =========================

  function renderForm(invitado) {

    fijos.innerHTML     = "";
    dinamicos.innerHTML = "";
    _acompSelect        = null;

    // 🟢 NOMBRE
    fijos.appendChild(createLabel(txt("labelNombre")));
    const inputNombre = createInput("nombre", txt("labelNombre"));

    if (invitado?.nombre) {
      inputNombre.value    = invitado.nombre;
      inputNombre.readOnly = true;
    }

    fijos.appendChild(inputNombre);
  

    // 🟢 ASISTENCIA
    fijos.appendChild(createLabel(txt("labelAsiste")));

    const asistencia     = document.createElement("select");
    asistencia.name      = "asiste";
    asistencia.className = "form-control mb-3";
    asistencia.innerHTML =
      `<option value="">${txt("textSeleccionar")}</option>
       <option value="Si">${txt("textSiAsiste")}</option>
       <option value="No">${txt("textNoAsiste")}</option>`;

    fijos.appendChild(asistencia);

    asistencia.addEventListener("change", () => {
      asistencia.classList.remove("is-invalid");
      const no = asistencia.value === "No";

      dinamicos.style.display = no ? "none" : "block";
      acompWrap.style.display = no ? "none" : "block";
      msgNo.style.display     = no ? "block" : "none";
    });

    // 👥 ACOMPAÑANTES
    const acompWrap = document.createElement("div");
    fijos.appendChild(acompWrap);

    function renderAcomp(n) {
      acompWrap.innerHTML = "";
      if (n <= 0) return;

      acompWrap.appendChild(createLabel(txt("labelAcompanante")));

      for (let i = 1; i <= n; i++) {
        acompWrap.appendChild(
          createInput("acompanante_" + i, txt("textAcompanante") + " " + i)
        );
      }
    }

    const rawMaxLibre = cfg.maxAcompanantesLibre || "";
    const esLibre     = rawMaxLibre === "libre";
    const maxLibre    = esLibre ? 0 : parseInt(rawMaxLibre || 0);
    const pases       = parseInt(invitado?.pases || 0);

    if (invitado?.nombre) {
      // Invitado de lista con pases fijos
      if (pases > 0) renderAcomp(pases);

    } else if (esLibre) {
      // Modo libre: label + un solo input de texto sin select
      acompWrap.appendChild(createLabel(txt("labelAcompanantesSelect")));
      acompWrap.appendChild(
        createInput("acompanante_1", txt("acompanantesPlaceholder") || txt("textAcompanante") + " 1")
      );
      // _acompSelect queda null: el submit lee acompanante_1 directamente

    } else if (maxLibre > 0) {
      // Modo select: opcion No + cantidades
      acompWrap.appendChild(createLabel(txt("labelAcompanantesSelect")));

      const select     = document.createElement("select");
      select.className = "form-control mb-3";
      select.innerHTML =
        `<option value="">${txt("textSeleccionar")}</option>
         <option value="No">${txt("textNoAcompanantes") || "No"}</option>`;

      for (let i = 1; i <= maxLibre; i++) {
        select.innerHTML += `<option value="${i}">${i}</option>`;
      }

      acompWrap.appendChild(select);

      const inputsWrap = document.createElement("div");
      acompWrap.appendChild(inputsWrap);

      select.addEventListener("change", () => {
        inputsWrap.innerHTML = "";
        const val = select.value;
        if (!val || val === "No") return;
        inputsWrap.appendChild(createLabel(txt("labelAcompanante")));
        for (let i = 1; i <= parseInt(val); i++) {
          inputsWrap.appendChild(
            createInput("acompanante_" + i, txt("textAcompanante") + " " + i)
          );
        }
      });

      _acompSelect = select;
    }

    // 🍽 COMIDA
    if (cfg.preguntasComida !== "false") {
      const opcionesBase = txt("comidaOpciones")
        .split("|")
        .map(o => o.trim())
        .filter(Boolean);

      const opcionesFull = [...opcionesBase, txt("textOtra")].filter(Boolean);

      const sel = createSelect(
        "comida",
        txt("labelComida"),
        opcionesFull.map(o => [o, o]),
        txt("sublabelComida")
      );

      const otro         = createInput("comida_otro", txt("textDetalle"));
      otro.style.display = "none";
      dinamicos.appendChild(otro);

      sel.addEventListener("change", () => {
        otro.style.display = sel.value === txt("textOtra") ? "block" : "none";
      });
    }

    // 🍷 ALCOHOL
    if (cfg.preguntasAlcohol !== "false") {
      createSelect(
        "alcohol",
        txt("labelAlcohol"),
        [
          ["Si", txt("textSiAlcohol")],
          ["No", txt("textNoAlcohol")]
        ],
        txt("sublabelAlcohol")
      );
    }

    // 👶 NIÑOS
    if (cfg.preguntasNinos !== "false") {
      const sel = createSelect(
        "ninos",
        txt("labelNinos"),
        [
          ["Si", txt("textSiNinos")],
          ["No", txt("textNoNinos")]
        ],
        txt("sublabelNinos")
      );

      const input         = createInput("ninos_detalle", txt("labelNinosInput"));
      input.style.display = "none";
      dinamicos.appendChild(input);

      sel.addEventListener("change", () => {
        input.style.display = sel.value === "Si" ? "block" : "none";
      });
    }

    // 🚗 TRASLADO
    if (cfg.preguntasTraslado !== "false") {
      createSelect(
        "traslado",
        txt("labelTraslado"),
        [
          ["Si", txt("textSiTraslado")],
          ["No", txt("textNoTraslado")]
        ],
        txt("sublabelTraslado")
      );
    }

    // ✨ PREGUNTAS EXTRA (opt-in por cliente, no afectan a los demás)
    // Hasta 5: data-preguntas-extra, data-preguntas-extra2, ... data-preguntas-extra5
    // (la 1ª mantiene el campo "extra" sin sufijo por compatibilidad).
    for (let i = 1; i <= 5; i++) {
      const suf = i === 1 ? "" : String(i);
      if (cfg["preguntasExtra" + suf] !== "true") continue;

      const campo         = "extra" + suf;
      const tipoExtra      = cfg["extraTipo" + suf] || "texto";
      const labelExtra     = txt("labelExtra" + suf);
      const sublabelExtra  = txt("sublabelExtra" + suf);

      if (tipoExtra === "select") {
        const opcionesExtra = txt("extraOpciones" + suf)
          .split("|")
          .map(o => o.trim())
          .filter(Boolean);

        createSelect(
          campo,
          labelExtra,
          opcionesExtra.map(o => [o, o]),
          sublabelExtra
        );
      } else {
        createTextQuestion(campo, labelExtra, sublabelExtra, txt("extraPlaceholder" + suf));
      }
    }

    // ❌ MENSAJE NO ASISTE
    const msgNo         = document.createElement("p");
    msgNo.className     = "text-center mt-3";
    msgNo.innerText     = txt("msgNoAsiste");
    msgNo.style.display = "none";
    form.appendChild(msgNo);

    // 🔘 TEXTO BOTÓN SUBMIT
    const btnSubmit = document.querySelector("#rsvp-footer button[type='submit']");
    if (btnSubmit) btnSubmit.innerHTML = txt("textBtnSubmit");
  }

  // =========================
  // INIT
  // =========================

  renderForm(window.INVITADO_DATA || null);

  window.addEventListener("invitado-ready", () => {
    renderForm(window.INVITADO_DATA);
  });

  // =========================
  // SUBMIT
  // =========================

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const btn = form.querySelector("button[type='submit']");
    if (btn.disabled) return;

    // 🔴 VALIDACIÓN
    const nombre     = form.querySelector("[name='nombre']");
    const asistencia = form.querySelector("[name='asiste']");

    if (!nombre?.value.trim() && !nombre?.readOnly) {
      nombre.focus();
      nombre.classList.add("is-invalid");
      mostrarError(txt("msgCamposVacios"));
      return;
    } else {
      nombre.classList.remove("is-invalid");
    }

    if (!asistencia?.value) {
      asistencia.focus();
      asistencia.classList.add("is-invalid");
      mostrarError(txt("msgCamposVacios"));
      return;
    } else {
      asistencia.classList.remove("is-invalid");
    }

    // ✅ ENVÍO
    btn.disabled   = true;
    const original = btn.innerHTML;
    btn.innerHTML  = txt("textEnviando");

    const eventId = window.INVITACION_CONFIG?.event_id || "sin-evento";

    // 🔥 ARMAR DATOS PROCESADOS
    const raw      = Object.fromEntries(new FormData(form));
    const enviando = {};
    const labels   = {};

    // NOMBRE
    enviando["nombre"] = raw["nombre"] || "";
    labels["nombre"]   = txt("labelNombre") || "Nombre";

    // ASISTE
    enviando["asiste"] = raw["asiste"] || "";
    labels["asiste"]   = txt("labelAsiste") || "Asistirá";

    // ACOMPAÑANTES → unir en un solo campo separado por comas
    const selectAcomp = form.querySelector("select[name='acompanantes_cantidad']");
    const acompanantes = [];
    let idx = 1;
    while (raw["acompanante_" + idx]) {
      acompanantes.push(raw["acompanante_" + idx].trim());
      idx++;
    }

    if (_acompSelect?.value === "No") {
      enviando["acompanantes"] = txt("textNoAcompanantes") || "No";
      labels["acompanantes"]   = txt("labelAcompanante") || "Acompañantes";
    } else if (acompanantes.length > 0) {
      enviando["acompanantes"] = acompanantes.join(", ");
      labels["acompanantes"]   = txt("labelAcompanante") || "Acompañantes";
    }

    // COMIDA → si eligió "Otra", usar el detalle directamente
    if (raw["comida"]) {
      const esOtra       = raw["comida"] === txt("textOtra");
      enviando["comida"] = esOtra
        ? (raw["comida_otro"]?.trim() || txt("textOtra"))
        : raw["comida"];
      labels["comida"]   = txt("labelComida") || "Restricción alimentaria";
    }

    // ALCOHOL
    if (raw["alcohol"]) {
      enviando["alcohol"] = raw["alcohol"];
      labels["alcohol"]   = txt("labelAlcohol") || "Beberá alcohol";
    }

    // NIÑOS → si hay detalle, reemplaza el "Si"
    if (raw["ninos"]) {
      const tieneNinos    = raw["ninos"] === "Si";
      enviando["ninos"]   = tieneNinos && raw["ninos_detalle"]?.trim()
        ? raw["ninos_detalle"].trim()
        : raw["ninos"];
      labels["ninos"]     = txt("labelNinos") || "Asistirá con niños";
    }

    // TRASLADO
    if (raw["traslado"]) {
      enviando["traslado"] = raw["traslado"];
      labels["traslado"]   = txt("labelTraslado") || "Traslado";
    }

    // EXTRA (preguntas opt-in por cliente, hasta 5 — ver renderForm)
    for (let i = 1; i <= 5; i++) {
      const suf   = i === 1 ? "" : String(i);
      const campo = "extra" + suf;
      if (raw[campo]) {
        enviando[campo] = raw[campo];
        labels[campo]   = txt("labelExtra" + suf) || campo;
      }
    }

    // ARMAR FORMDATA LIMPIO
    const formData = new FormData();
    formData.set("event_id", eventId);
    formData.set("inv",      raw["inv"] || "");

    for (const key in enviando) {
      formData.set(key, enviando[key]);
    }

    formData.set("labels", JSON.stringify(labels));

    fetch(url, {
      method: "POST",
      body: formData
    })
    .then(r => r.json())
    .then(res => {
      if (res.result === "ok") {
        form.style.display = "none";
        ok.innerHTML       = `<p class="text-center font-weight-bold mt-3">${txt("msgOk")}</p>`;
        ok.style.display   = "block";
      } else {
        throw new Error(txt("msgRespuestaInvalida"));
      }
    })
    .catch(err => {
      console.error(err);
      mostrarError(txt("msgError"));
      btn.disabled  = false;
      btn.innerHTML = original;
    });
  });

});

function enviarCancion() {
  const cfg     = document.getElementById("canciones-config")?.dataset || {};
  const input   = document.getElementById("input-cancion");
  const btn     = document.getElementById("btn-cancion");
  const cancion = input.value.trim();

  if (!cancion) {
    mostrarMsgCancion(cfg.msgVacio, "error");
    return;
  }

  const url     = window.INVITACION_CONFIG?.rsvp_url;
  const eventId = window.INVITACION_CONFIG?.event_id;

  btn.disabled    = true;
  btn.textContent = cfg.msgEnviando;

  const formData = new FormData();
  formData.set("action",   "cancion");
  formData.set("event_id", eventId);
  formData.set("cancion",  cancion);

  fetch(url, { method: "POST", body: formData, redirect: "follow" })
    .then(r => r.text())
    .then(text => {
      let data = {};
      try { data = JSON.parse(text); } catch (_) {}

      btn.disabled    = false;
      btn.textContent = cfg.textoBtn;

      if (data.result === "ok") {
        input.value = "";
        mostrarMsgCancion(cfg.msgOk, "ok");
      } else {
        mostrarMsgCancion(cfg.msgError, "error");
      }
    })
    .catch(() => {
      btn.disabled    = false;
      btn.textContent = cfg.textoBtn;
      mostrarMsgCancion(cfg.msgErrorConexion, "error");
    });
}

function mostrarMsgCancion(texto, tipo) {
  const msg = document.getElementById("msg-cancion");
  msg.textContent   = texto;
  msg.style.display = "block";
  msg.style.color   = tipo === "ok" ? "green" : "crimson";
  setTimeout(() => { msg.style.display = "none"; }, 5000);
}