console.log("Script universal cargado");
const params = new URLSearchParams(window.location.search);
const rawId  = (params.get("inv") || params.get("id") || "").trim();

document.addEventListener("DOMContentLoaded", () => {

  const config = window.INVITACION_CONFIG || {};
  const url    = config.csv || null;

  const txtFaltaCSV    = config.txtFaltaCSV    || "Falta configurar CSV";
  const txtErrorCSV    = config.txtErrorCSV    || "Error cargando datos. Actualizar la p\u00e1gina";
  const txtPasesPrefix = config.txtPasesPrefix || "";
  const txtPaseExtra   = config.txtPaseExtra   || "pase extra reservado";
  const txtPasesExtras = config.txtPasesExtras || "pases extras reservados";
  const txtMesaPrefix  = config.txtMesaPrefix  || "Mesa asignada: N\u00b0";
  const txtPinError    = config.txtPinError    || "PIN incorrecto. Intent\u00e1 nuevamente.";

  function esperarBloques(callback) {
    const bi = document.getElementById("bloque-invitado");
    const bg = document.getElementById("bloque-general");
    if (bi || bg) { callback(bi, bg); return; }
    let intentos = 0;
    const intervalo = setInterval(() => {
      const bi = document.getElementById("bloque-invitado");
      const bg = document.getElementById("bloque-general");
      intentos++;
      if (bi || bg || intentos >= 20) {
        clearInterval(intervalo);
        callback(bi, bg);
      }
    }, 50);
  }

  // 🔒 Modo "solo invitados": bloquea invitacion libre para este evento puntual
  const soloInvitados = config.soloInvitados === true || config.soloInvitados === "true";

  // El gate cubre TODA la pagina (overlay fijo), no solo la seccion de confirmacion
  function mostrarGateOverlay() {
    const go = document.getElementById("gate-overlay");
    if (go) {
      go.style.transition = "";
      go.style.opacity    = "1";
      go.style.transform  = "none";
      go.style.display    = "flex";
    }
    document.body.style.overflow = "hidden";
  }

  // Transicion suave (fade + leve zoom) en vez de un display:none seco
  function ocultarGateOverlay() {
    const go = document.getElementById("gate-overlay");
    if (go) {
      go.style.transition = "opacity .5s ease, transform .5s ease";
      go.style.opacity    = "0";
      go.style.transform  = "scale(1.04)";
      setTimeout(() => {
        go.style.display    = "none";
        go.style.opacity    = "";
        go.style.transform  = "";
        go.style.transition = "";
      }, 500);
    }
    document.body.style.overflow = "";
  }

  function mostrarBloqueado() {
    esperarBloques((bi, bg) => {
      if (bi) bi.style.display = "none";
      if (bg) bg.style.display = "none";
    });
    mostrarGateOverlay();
    const gp = document.getElementById("gate-pin");
    const gb = document.getElementById("gate-bloqueado");
    if (gp) gp.style.display = "none";
    if (gb) gb.style.display = "block";
    window.dispatchEvent(new Event("invitado-bloqueado"));
  }

  // 🔒 PIN BÁSICO: para invitaciones SIN lista de invitados (paquete básico).
  // No está ligado a un invitado puntual — es un único PIN para todo el link
  // base. Comparte el mismo #gate-overlay/#gate-pin que el PIN por invitado
  // (mismo sistema, una sola pantalla), pero el PIN real NUNCA vive acá ni
  // en el HTML: se guarda del lado del servidor (Apps Script) y esta función
  // solo pregunta "¿es este el PIN correcto?", recibiendo sí/no. Totalmente
  // separado del PIN por invitado (config.requierePin + columna Pin del
  // CSV) — nunca se cruzan, cada uno vive en su propia rama de más abajo.
  function pedirPinBasico(pinKey) {
    mostrarGateOverlay();
    const gb = document.getElementById("gate-bloqueado");
    if (gb) gb.style.display = "none";

    const gp    = document.getElementById("gate-pin");
    const input = document.getElementById("input-pin");
    const btn   = document.getElementById("btn-validar-pin");
    const msg   = document.getElementById("msg-pin-error");
    if (gp) gp.style.display = "block";

    function intentarValidarPinBasico() {
      const valor = (input?.value || "").trim();
      if (!valor) return;
      if (msg) msg.style.display = "none";
      if (btn) btn.disabled = true;

      fetch(config.rsvp_url, {
        method: "POST",
        body: new URLSearchParams({
          action:   "verificar_pin_basico",
          event_id: config.event_id || "",
          pin:      valor
        })
      })
        .then(res => res.json())
        .then(data => {
          if (btn) btn.disabled = false;
          if (data.ok) {
            // Solo guardamos que este navegador ya paso el chequeo — nunca el PIN real.
            try { localStorage.setItem(pinKey, "ok"); } catch(_) {}
            if (gp) gp.style.display = "none";
            ocultarGateOverlay();
          } else {
            if (msg) {
              msg.innerText = data.bloqueado
                ? "Demasiados intentos. Prob\u00e1 de nuevo en unos minutos."
                : txtPinError;
              msg.style.display = "block";
            }
            if (input) input.value = "";
          }
        })
        .catch(() => {
          if (btn) btn.disabled = false;
          if (msg) { msg.innerText = txtErrorCSV; msg.style.display = "block"; }
        });
    }

    if (btn) btn.onclick = intentarValidarPinBasico;
    if (input) {
      input.onkeydown = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          intentarValidarPinBasico();
        }
      };
    }
  }

  // El servidor ya resolvió quién es (link personal + PIN): su fila viene en la página
  if (config.invitado && config.invitado.nombre) {
    const iv = config.invitado;
    const cantidad = parseInt(iv.pases, 10) || 0;
    const mesa = String(iv.mesa == null ? "" : iv.mesa).trim();
    esperarBloques((bi) => {
      const nombreEl = document.getElementById("nombre");
      const pasesEl  = document.getElementById("pases");
      const mesaEl   = document.getElementById("mesa");
      if (nombreEl) nombreEl.innerText = iv.nombre;
      if (pasesEl) {
        if (cantidad > 0) {
          pasesEl.innerHTML = "";
          pasesEl.style.fontWeight = "normal";
          if (txtPasesPrefix) pasesEl.appendChild(document.createTextNode(txtPasesPrefix + " "));
          const b = document.createElement("span");
          b.className = "font-weight-bolder";
          b.innerHTML = '<i class="icon-ticket" aria-hidden="true" style="opacity:.65"></i> ';
          b.appendChild(document.createTextNode(cantidad + " " + (cantidad === 1 ? txtPaseExtra : txtPasesExtras)));
          pasesEl.appendChild(b);
        } else pasesEl.remove();
      }
      if (mesaEl) {
        if (mesa) {
          mesaEl.innerHTML = '<i class="icon-event_seat" aria-hidden="true" style="opacity:.65"></i> ';
          mesaEl.appendChild(document.createTextNode(txtMesaPrefix + " " + mesa));
        } else mesaEl.remove();
      }
      if (bi) bi.style.display = "block";
    });
    window.INVITADO_DATA = Object.assign({}, iv, { pases: cantidad, mesa: mesa });
    window.dispatchEvent(new Event("invitado-ready"));
    return;
  }

  // SIN ?inv — bloqueGeneral visible, bloqueInvitado oculto
  if (!rawId) {
    const requierePinBasico = config.requierePinBasico === true || config.requierePinBasico === "true";
    if (requierePinBasico) {
      // Invitacion basica: un solo PIN para todo el link, sin lista de
      // invitados de por medio. Toma prioridad sobre soloInvitados porque
      // las dos cosas no tienen sentido juntas (soloInvitados necesita una
      // lista contra la cual matchear, y las basicas no tienen).
      const pinKey = "pinOk_" + (config.event_id || "evt") + "_basico";
      let pinYaValidado = false;
      try { pinYaValidado = localStorage.getItem(pinKey) === "ok"; } catch(_) {}

      if (pinYaValidado) {
        ocultarGateOverlay();
      } else {
        pedirPinBasico(pinKey);
      }
      return;
    }

    if (soloInvitados) {
      mostrarBloqueado();
      return;
    }
    esperarBloques((bi, bg) => {
      if (bi) bi.style.display = "none";
      // bg ya nace visible, no se toca
    });
    return;
  }

  if (!url) {
    esperarBloques(() => {
      const nombreEl = document.getElementById("nombre");
      if (nombreEl) nombreEl.innerText = txtFaltaCSV;
    });
    throw new Error("No CSV");
  }

  const normalize = (str) =>
    (str || "").toString().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-").trim();

  const cleanId = normalize(rawId);

  fetch(url)
    .then(res => res.text())
    .then(text => {
      const filas = text
        .split("\n")
        .map(f => f.replace(/\r/g, "").trim())
        .filter(Boolean);

      const header    = filas[0].split(",").map(h => normalize(h));
      const idxNombre = header.findIndex(h => h === "nombre");
      const idxPases  = header.findIndex(h => h === "pases");
      const idxMesa   = header.findIndex(h => h.includes("mesa"));
      const idxPin    = header.findIndex(h => h === "pin");

      const datos = filas.slice(1);
      let encontrado = false;

      // Revela al invitado en pantalla (separado del chequeo de PIN)
      function revelarInvitado(nombre, cantidad, mesaRaw) {
        esperarBloques((bi, bg) => {
          const nombreEl = document.getElementById("nombre");
          const pasesEl  = document.getElementById("pases");
          const mesaEl   = document.getElementById("mesa");

          if (nombreEl) nombreEl.innerText = nombre;

          if (pasesEl) {
            if (cantidad > 0) {
              pasesEl.innerHTML        = "";
              pasesEl.style.fontWeight = "normal";
              if (txtPasesPrefix) {
                pasesEl.appendChild(document.createTextNode(txtPasesPrefix + " "));
              }
              const boldSpan     = document.createElement("span");
              boldSpan.className = "font-weight-bolder";
              boldSpan.innerHTML = `<i class="icon-ticket" aria-hidden="true" style="opacity:.65"></i> ${cantidad} ${cantidad === 1 ? txtPaseExtra : txtPasesExtras}`;
              pasesEl.appendChild(boldSpan);
            } else {
              pasesEl.remove();
            }
          }

          if (mesaEl) {
            if (idxMesa >= 0 && mesaRaw !== "") {
              mesaEl.innerHTML = `<i class="icon-event_seat" aria-hidden="true" style="opacity:.65"></i> ${txtMesaPrefix} ${mesaRaw}`;
            } else {
              mesaEl.remove();
            }
          }

          // Mostrar invitado — bloqueGeneral NO se toca, siempre visible
          if (bi) bi.style.display = "block";
        });

        window.INVITADO_DATA = { nombre, pases: cantidad, mesa: mesaRaw };
        window.dispatchEvent(new Event("invitado-ready"));
        ocultarGateOverlay();
      }

      // 🔐 Requiere PIN antes de revelar al invitado y habilitar el RSVP
      const requierePin = config.requierePin === true || config.requierePin === "true";

      function pedirPin(nombre, cantidad, mesaRaw, pinEsperado, pinKey) {
        mostrarGateOverlay();
        const gb = document.getElementById("gate-bloqueado");
        if (gb) gb.style.display = "none";

        const gp    = document.getElementById("gate-pin");
        const input = document.getElementById("input-pin");
        const btn   = document.getElementById("btn-validar-pin");
        const msg   = document.getElementById("msg-pin-error");
        if (gp) gp.style.display = "block";

        function intentarValidarPin() {
          const valor = (input?.value || "").trim();
          if (valor === pinEsperado.trim()) {
            // Recordar el PIN validado, para no volver a pedirlo si recarga la pagina
            try { localStorage.setItem(pinKey, pinEsperado.trim()); } catch(_) {}
            if (gp) gp.style.display = "none";
            if (msg) msg.style.display = "none";
            revelarInvitado(nombre, cantidad, mesaRaw);
          } else {
            if (msg) { msg.innerText = txtPinError; msg.style.display = "block"; }
            if (input) input.value = "";
          }
        }

        if (btn) btn.onclick = intentarValidarPin;

        // Enter en el campo de PIN dispara la misma validacion que el boton
        if (input) {
          input.onkeydown = (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              intentarValidarPin();
            }
          };
        }
      }

      datos.forEach(fila => {
        const cols       = fila.split(",");
        const matchIndex = cols.findIndex(c => normalize(c).includes(cleanId));
        if (matchIndex === -1) return;

        encontrado = true;

        const nombre   = (idxNombre >= 0 ? cols[idxNombre] : cols[1])?.trim() || "";
        const pasesRaw = (idxPases  >= 0 ? cols[idxPases]  : cols[2])?.trim() || "";
        const mesaRaw  = (idxMesa   >= 0 ? cols[idxMesa]   : "")?.trim()      || "";
        const pinRaw   = (idxPin    >= 0 ? cols[idxPin]    : "")?.trim()      || "";
        const cantidad = parseInt(pasesRaw, 10) || 0;

        if (requierePin && pinRaw) {
          // Si ya valido este PIN antes (aunque haya recargado la pagina), no se lo volvemos a pedir.
          // Si el organizador cambia el PIN en la planilla, el valor guardado deja de coincidir y se vuelve a pedir.
          const pinKey = "pinOk_" + (config.event_id || "evt") + "_" + cleanId;
          let pinYaValidado = false;
          try { pinYaValidado = localStorage.getItem(pinKey) === pinRaw.trim(); } catch(_) {}

          if (pinYaValidado) {
            revelarInvitado(nombre, cantidad, mesaRaw);
          } else {
            pedirPin(nombre, cantidad, mesaRaw, pinRaw, pinKey);
          }
        } else {
          revelarInvitado(nombre, cantidad, mesaRaw);
        }
      });

      // ?inv pero no encontrado — bloqueInvitado oculto, bloqueGeneral ya visible
      if (!encontrado) {
        if (soloInvitados) {
          mostrarBloqueado();
          return;
        }
        esperarBloques((bi, bg) => {
          if (bi) bi.style.display = "none";
        });
        // Acceso libre: el RSVP general y el sobre se habilitan
        window.dispatchEvent(new Event("invitado-libre"));
      }
    })
    .catch(err => {
      console.error(err);
      esperarBloques(() => {
        const nombreEl = document.getElementById("nombre");
        if (nombreEl) nombreEl.innerText = txtErrorCSV;
      });
    });
});
