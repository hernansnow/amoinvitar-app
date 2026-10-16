document.addEventListener("DOMContentLoaded", function () {
  const botones = document.querySelectorAll('[data-rsvp="boton"]');
  const texto   = document.querySelector('[data-rsvp="texto"]');
  const fecha   = document.querySelector('[data-rsvp="fecha"]');  // ✅ elemento separado

  botones.forEach(boton => {
    const fechaData = boton.dataset.fecha;
    const sinLimite = !fechaData; // 🆕 sin data-fecha = confirmación sin límite de tiempo

    let abierto = true;
    let fechaFormateada = "";

    if (!sinLimite) {
      const partes      = fechaData.split("-");
      const fechaLimite = new Date(partes[0], partes[1] - 1, partes[2], 23, 59, 59, 999);
      const hoy         = new Date();
      abierto           = hoy <= fechaLimite;

      // ── FECHA FORMATEADA ─────────────────────────────────────────────
      const idioma  = boton.dataset.idioma  || document.documentElement.lang || "es-ES";
      const formato = boton.dataset.formato || "largo";

      const opcionesFormato = {
        corto: { day: "2-digit", month: "2-digit", year: "numeric" },
        medio: { day: "numeric", month: "short",   year: "numeric" },
        largo: { day: "numeric", month: "long",    year: "numeric" }
      };

      fechaFormateada = fechaLimite.toLocaleDateString(
        idioma,
        opcionesFormato[formato] || opcionesFormato.largo
      );
    }

    // ── ESTADO ABIERTO (siempre true si sinLimite) ────────────────────
    if (abierto) {
      if (boton.dataset.textoAbierto) boton.innerHTML = boton.dataset.textoAbierto;

      if (texto) {
        const bloqueInvitadoClass = texto.dataset.bloqueInvitadoClass || "";
        const bloqueInvitadoInner = texto.dataset.bloqueInvitadoInner || "";
        const bloqueGeneralClass  = texto.dataset.bloqueGeneralClass  || "";
        const textoLibre          = texto.dataset.textoAbiertoLibre   || "";

        // bloqueGeneral siempre visible
        const bloqueGeneral = textoLibre
          ? `<div id="bloque-general" class="${bloqueGeneralClass}">${textoLibre}</div>`
          : "";

        // bloqueInvitado oculto por defecto, el JS lista lo muestra si hay ?inv
        const bloqueInvitado = bloqueInvitadoInner
          ? `<div id="bloque-invitado" class="${bloqueInvitadoClass}" style="display:none;">
               <p class="text-center mb-0">${bloqueInvitadoInner}</p>
             </div>`
          : "";

        texto.innerHTML = bloqueGeneral + bloqueInvitado;
      }

      // ✅ Fecha después del botón, en su propio elemento
      // 🆕 Sin límite de tiempo: no se muestra ninguna línea de fecha
      if (fecha) {
        if (sinLimite) {
          fecha.style.display = "none";
        } else {
          const fechaTexto = texto?.dataset.fechaTexto || "Se reciben confirmaciones hasta el";
          const fechaClass = texto?.dataset.fechaClass || "";
          fecha.innerHTML  = `<span class="${fechaClass}">${fechaTexto} ${fechaFormateada}.</span>`;
          fecha.style.display = "";
        }
      }

    // ── ESTADO CERRADO (solo posible cuando hay data-fecha) ───────────
    } else {
      if (texto) {
        const bloqueGeneralClass = texto.dataset.bloqueGeneralClass || "";
        const textoCerrado       = texto.dataset.textoCerrado       || "";
        texto.innerHTML = textoCerrado
          ? `<div id="bloque-general" class="${bloqueGeneralClass}">${textoCerrado}</div>`
          : "";
      }

      // ✅ Ocultar fecha cuando está cerrado
      if (fecha) fecha.style.display = "none";

      if (boton.dataset.textoCerrado) boton.innerHTML = boton.dataset.textoCerrado;
      boton.classList.add("rsvp-cerrado");
      boton.removeAttribute("data-fancybox");
      boton.removeAttribute("data-src");
    }
  });
});