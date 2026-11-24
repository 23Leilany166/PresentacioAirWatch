/**
 * ============================================================================
 * AIR WATCH · PRESENTATION CONTROLLER & TELEMETRY ENGINE
 * Proyecto: Monitoreo Continuo y Cuantificación de Gases Nocivos Volatilizados
 *           en Cuerpos de Agua Receptores de Descargas Industriales
 * Institución: ITSOEH · Ingeniería en TIC 2026
 * ============================================================================
 */

// URL oficial editable para acceso y código QR
const AIRWATCH_URL = "https://pag-integrador.pages.dev/";

// Objeto de configuración y estado global
const PresenterState = {
  currentSlideIndex: 0,
  totalSlides: 10,
  isNotesOpen: false,
  isHelpOpen: false,
  isPlatformModalOpen: false,
  isAppFlowModalOpen: false,
  
  // Temporizador de 12 minutos (720 segundos)
  timer: {
    totalSeconds: 12 * 60, // 720 segundos
    remainingSeconds: 12 * 60,
    isRunning: false,
    intervalId: null,
    isOvertime: false
  },

  // Simulación de telemetría de gases (Lámina 7)
  simulation: {
    isSpikeActive: false,
    eco2: 412,
    tvoc: 65,
    mics: 0.94,
    status: 'safe'
  }
};

let webCarouselController = null;

// ============================================================================
// INICIALIZACIÓN AL CARGAR EL DOM
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
  initSlideNavigation();
  initPresenterTimer();
  initSpeakerNotes();
  initFullscreen();
  initModals();
  initSlideSpecificWidgets();
  initQRCode();
  initConclusionImage();
  initPrototypeVideo();
  webCarouselController = initWebShowcaseCarousel();
  updateSlideUI();
  console.log("⚡ Air Watch Telemetry Presentation Engine Inicializado.");
});

// ============================================================================
// 1. GESTIÓN DE NAVEGACIÓN ENTRE DIAPOSITIVAS
// ============================================================================
function initSlideNavigation() {
  const slides = document.querySelectorAll(".slide, .slide-section");
  PresenterState.totalSlides = slides.length;

  // Botones de navegación inferior
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  if (prevBtn) {
    prevBtn.addEventListener("click", () => navigateSlide(-1));
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => navigateSlide(1));
  }

  // Píldoras / Miniaturas directas
  const pills = document.querySelectorAll(".pill-dot");
  pills.forEach((pill, idx) => {
    pill.addEventListener("click", () => {
      goToSlide(idx);
    });
  });

  // Atajos de teclado para el presentador
  document.addEventListener("keydown", handleKeyNavigation);

  // Soporte para gestos táctiles (Swipe en tablets/pantallas táctiles)
  let touchStartX = 0;
  let touchEndX = 0;
  const viewport = document.getElementById("slidesViewport");

  if (viewport) {
    viewport.addEventListener("touchstart", (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    viewport.addEventListener("touchend", (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipeGesture(touchStartX, touchEndX);
    }, { passive: true });
  }
}

function handleSwipeGesture(startX, endX) {
  const swipeThreshold = 50;
  if (endX < startX - swipeThreshold) {
    // Deslizar izquierda -> siguiente lámina
    navigateSlide(1);
  } else if (endX > startX + swipeThreshold) {
    // Deslizar derecha -> lámina anterior
    navigateSlide(-1);
  }
}

function handleKeyNavigation(e) {
  // Ignorar atajos si el usuario está interactuando con un input/textarea
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

  switch (e.key) {
    case "ArrowRight":
    case " ": // Barra espaciadora
    case "PageDown":
      e.preventDefault();
      navigateSlide(1);
      break;

    case "ArrowLeft":
    case "PageUp":
      e.preventDefault();
      navigateSlide(-1);
      break;

    case "Home":
      e.preventDefault();
      goToSlide(0);
      break;

    case "End":
      e.preventDefault();
      goToSlide(PresenterState.totalSlides - 1);
      break;

    case "t":
    case "T":
      toggleTimer();
      break;

    case "n":
    case "N":
      toggleSpeakerNotes();
      break;

    case "f":
    case "F":
      toggleFullscreen();
      break;

    case "h":
    case "H":
    case "?":
      toggleHelpModal();
      break;

    case "Escape":
      closeAllModals();
      break;

    // Teclas 1 a 9 para salto directo; 0 selecciona la diapositiva 10.
    case "1":
    case "2":
    case "3":
    case "4":
    case "5":
    case "6":
    case "7":
    case "8":
    case "9":
    case "0":
      const targetIndex = e.key === "0" ? PresenterState.totalSlides - 1 : parseInt(e.key, 10) - 1;
      if (targetIndex >= 0 && targetIndex < PresenterState.totalSlides) {
        goToSlide(targetIndex);
      }
      break;
  }
}

function navigateSlide(direction) {
  const newIndex = PresenterState.currentSlideIndex + direction;
  if (newIndex >= 0 && newIndex < PresenterState.totalSlides) {
    goToSlide(newIndex);
  }
}

function goToSlide(targetIndex) {
  if (targetIndex < 0 || targetIndex >= PresenterState.totalSlides) return;
  if (targetIndex === PresenterState.currentSlideIndex) return;

  const slides = document.querySelectorAll(".slide, .slide-section");
  const currentIndex = PresenterState.currentSlideIndex;

  // Clases para animación de transición horizontal
  slides.forEach((slide, idx) => {
    slide.classList.remove("active", "prev-slide");
    if (idx < targetIndex) {
      slide.classList.add("prev-slide");
    }
  });

  slides[targetIndex].classList.add("active");
  PresenterState.currentSlideIndex = targetIndex;

  if (webCarouselController) {
    webCarouselController.onSlideChange(targetIndex);
  }
  updateSlideUI();
  syncSpeakerNotes();
  triggerSlideSpecificAnimations(targetIndex);
}

function updateSlideUI() {
  const currentIndex = PresenterState.currentSlideIndex;
  const currentSlideElement = document.querySelectorAll(".slide, .slide-section")[currentIndex];

  if (!currentSlideElement) return;

  // 1. Actualizar barra de progreso superior
  const progressFill = document.getElementById("progressFill");
  if (progressFill) {
    const progressPercent = ((currentIndex + 1) / PresenterState.totalSlides) * 100;
    progressFill.style.width = `${progressPercent}%`;
  }

  // 2. Contador numérico inferior (01 / 08)
  const currentNumEl = document.getElementById("currentSlideNum");
  if (currentNumEl) {
    currentNumEl.textContent = String(currentIndex + 1).padStart(2, "0");
  }
  const totalNumEl = document.getElementById("totalSlidesNum");
  if (totalNumEl) {
    totalNumEl.textContent = String(PresenterState.totalSlides).padStart(2, "0");
  }

  // 3. Título y tiempo de la diapositiva activa
  const activeSlideTitleEl = document.getElementById("activeSlideTitle");
  const timeBadgeTextEl = document.getElementById("timeBadgeText");

  const slideTitle = currentSlideElement.getAttribute("data-title") || "Air Watch";
  const slideTime = currentSlideElement.getAttribute("data-time") || "1:30";

  if (activeSlideTitleEl) activeSlideTitleEl.textContent = slideTitle;
  if (timeBadgeTextEl) timeBadgeTextEl.textContent = `${slideTime} min`;

  // 4. Estados de botones Anterior / Siguiente
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  if (prevBtn) prevBtn.disabled = currentIndex === 0;
  if (nextBtn) nextBtn.disabled = currentIndex === PresenterState.totalSlides - 1;

  // 5. Píldoras de navegación activa
  const pills = document.querySelectorAll(".pill-dot");
  pills.forEach((pill, idx) => {
    pill.classList.toggle("active", idx === currentIndex);
  });
}

function initPrototypeVideo() {
  const video = document.querySelector("#slide-4 .prototype-video-player");
  const fallback = document.getElementById("prototypeVideoFallback");
  if (!video || !fallback) return;

  const showFallback = () => {
    video.hidden = true;
    fallback.hidden = false;
  };
  const showVideo = () => {
    video.hidden = false;
    fallback.hidden = true;
  };

  video.addEventListener("error", showFallback);
  video.addEventListener("canplay", showVideo);
  if (video.error) showFallback();
}

// ============================================================================
// 2. TEMPORIZADOR INTERACTIVO DE 12:00 MINUTOS (TECLA T)
// ============================================================================
function initPresenterTimer() {
  const timerWidget = document.getElementById("timerWidget");
  if (!timerWidget) return;

  // Clic simple: Iniciar / Pausar
  timerWidget.addEventListener("click", () => {
    toggleTimer();
  });

  // Doble clic: Reiniciar a 12:00
  timerWidget.addEventListener("dblclick", () => {
    resetTimer();
  });

  renderTimerDisplay();
}

function toggleTimer() {
  const timer = PresenterState.timer;
  const widget = document.getElementById("timerWidget");

  if (timer.isRunning) {
    // Pausar
    clearInterval(timer.intervalId);
    timer.isRunning = false;
    if (widget) widget.classList.remove("running");
  } else {
    // Iniciar o continuar
    timer.isRunning = true;
    if (widget) widget.classList.add("running");

    timer.intervalId = setInterval(() => {
      timer.remainingSeconds--;
      renderTimerDisplay();
    }, 1000);
  }
}

function resetTimer() {
  const timer = PresenterState.timer;
  clearInterval(timer.intervalId);
  timer.isRunning = false;
  timer.remainingSeconds = timer.totalSeconds;
  timer.isOvertime = false;

  const widget = document.getElementById("timerWidget");
  if (widget) {
    widget.classList.remove("running", "warning", "danger");
  }

  const badge = document.getElementById("timerBadge");
  if (badge) badge.textContent = "12 MIN";

  renderTimerDisplay();
}

function renderTimerDisplay() {
  const timer = PresenterState.timer;
  const digitsEl = document.getElementById("timerDigits");
  const widget = document.getElementById("timerWidget");
  const badge = document.getElementById("timerBadge");

  let secs = timer.remainingSeconds;
  let isNegative = false;

  if (secs < 0) {
    isNegative = true;
    secs = Math.abs(secs);
  }

  const minutes = Math.floor(secs / 60);
  const remainingSecs = secs % 60;
  const formattedTime = `${isNegative ? '+' : ''}${String(minutes).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;

  if (digitsEl) digitsEl.textContent = formattedTime;

  // Semáforo de advertencia temporal:
  // - Ámbar: cuando faltan 2 minutos o menos (120 seg)
  // - Rojo Coral: cuando se agota el tiempo (00:00 o sobretiempo)
  if (widget) {
    if (isNegative || timer.remainingSeconds <= 0) {
      widget.classList.remove("warning");
      widget.classList.add("danger");
      if (badge) badge.textContent = "TIEMPO AGOTADO";
    } else if (timer.remainingSeconds <= 120) {
      widget.classList.remove("danger");
      widget.classList.add("warning");
      if (badge) badge.textContent = "2 MIN RESTANTES";
    } else {
      widget.classList.remove("warning", "danger");
      if (badge) badge.textContent = timer.isRunning ? "EN VIVO" : "12 MIN";
    }
  }
}

// ============================================================================
// 3. NOTAS DEL ORADOR (DRAWER / PANEL DESLIZANTE - TECLA N)
// ============================================================================
function initSpeakerNotes() {
  const notesBtn = document.getElementById("notesBtn");
  const closeNotesBtn = document.getElementById("closeNotesBtn");

  if (notesBtn) {
    notesBtn.addEventListener("click", toggleSpeakerNotes);
  }

  if (closeNotesBtn) {
    closeNotesBtn.addEventListener("click", () => {
      setSpeakerNotesOpen(false);
    });
  }

  syncSpeakerNotes();
}

function toggleSpeakerNotes() {
  setSpeakerNotesOpen(!PresenterState.isNotesOpen);
}

function setSpeakerNotesOpen(open) {
  PresenterState.isNotesOpen = open;
  const drawer = document.getElementById("notesDrawer");
  const notesBtn = document.getElementById("notesBtn");

  if (drawer) {
    drawer.classList.toggle("open", open);
  }
  if (notesBtn) {
    notesBtn.classList.toggle("active", open);
  }

  if (open) {
    syncSpeakerNotes();
  }
}

function syncSpeakerNotes() {
  const currentIndex = PresenterState.currentSlideIndex;
  const currentSlideElement = document.querySelectorAll(".slide, .slide-section")[currentIndex];
  const notesBody = document.getElementById("notesBody");

  if (!currentSlideElement || !notesBody) return;

  const notesSource = currentSlideElement.querySelector(".speaker-notes-content");
  if (notesSource) {
    notesBody.innerHTML = notesSource.innerHTML;
  } else {
    notesBody.innerHTML = `
      <h4>Notas del Orador · Lámina ${currentIndex + 1}</h4>
      <p><em>No hay notas adicionales registradas para esta lámina.</em></p>
    `;
  }
}

// ============================================================================
// 4. MODO PANTALLA COMPLETA (TECLA F)
// ============================================================================
function initFullscreen() {
  const fullscreenBtn = document.getElementById("fullscreenBtn");
  if (!fullscreenBtn) return;

  fullscreenBtn.addEventListener("click", toggleFullscreen);
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch((err) => {
      console.warn("Pantalla completa no disponible o bloqueada:", err.message);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}

// ============================================================================
// 5. MODALES (AYUDA DE ATAJOS Y VISTA PREVIA DE LA PLATAFORMA)
// ============================================================================
function initModals() {
  // Modal de Ayuda
  const helpBtn = document.getElementById("helpBtn");
  const helpModal = document.getElementById("helpModal");
  const closeHelpBtn = document.getElementById("closeHelpBtn");

  if (helpBtn) helpBtn.addEventListener("click", toggleHelpModal);
  if (closeHelpBtn) closeHelpBtn.addEventListener("click", () => setHelpModalOpen(false));
  if (helpModal) {
    helpModal.addEventListener("click", (e) => {
      if (e.target === helpModal) setHelpModalOpen(false);
    });
  }

  // Modal de Vista Previa de la Plataforma Air Watch (Lanzador desde Lámina 7)
  const launchPlatformBtn = document.getElementById("launchPlatformBtn");
  const platformModal = document.getElementById("platformPreviewModal");
  const closePlatformBtn = document.getElementById("closePlatformBtn");

  if (launchPlatformBtn) {
    launchPlatformBtn.addEventListener("click", () => setPlatformModalOpen(true));
  }
  if (closePlatformBtn) {
    closePlatformBtn.addEventListener("click", () => setPlatformModalOpen(false));
  }
  if (platformModal) {
    platformModal.addEventListener("click", (e) => {
      if (e.target === platformModal) setPlatformModalOpen(false);
    });
  }

  const openAppFlowBtn = document.getElementById("openAppFlowModal");
  const appFlowModal = document.getElementById("appFlowModal");
  const closeAppFlowBtn = document.getElementById("closeAppFlowModal");

  if (openAppFlowBtn) {
    openAppFlowBtn.addEventListener("click", () => setAppFlowModalOpen(true));
  }
  if (closeAppFlowBtn) {
    closeAppFlowBtn.addEventListener("click", () => setAppFlowModalOpen(false));
  }
  if (appFlowModal) {
    appFlowModal.addEventListener("click", (e) => {
      if (e.target === appFlowModal) setAppFlowModalOpen(false);
    });
  }
}

function toggleHelpModal() {
  setHelpModalOpen(!PresenterState.isHelpOpen);
}

function setHelpModalOpen(open) {
  PresenterState.isHelpOpen = open;
  const modal = document.getElementById("helpModal");
  if (modal) modal.classList.toggle("open", open);
}

function setPlatformModalOpen(open) {
  PresenterState.isPlatformModalOpen = open;
  const modal = document.getElementById("platformPreviewModal");
  if (modal) modal.classList.toggle("open", open);
}

function setAppFlowModalOpen(open) {
  const wasOpen = PresenterState.isAppFlowModalOpen;
  PresenterState.isAppFlowModalOpen = open;
  const modal = document.getElementById("appFlowModal");
  const openButton = document.getElementById("openAppFlowModal");
  const closeButton = document.getElementById("closeAppFlowModal");

  if (modal) {
    modal.classList.toggle("open", open);
    modal.setAttribute("aria-hidden", String(!open));
  }
  if (open && closeButton) closeButton.focus();
  if (!open && wasOpen && openButton) openButton.focus();
}

function closeAllModals() {
  setHelpModalOpen(false);
  setPlatformModalOpen(false);
  setAppFlowModalOpen(false);
  setSpeakerNotesOpen(false);
}

// ============================================================================
// 6. WIDGETS INTERACTIVOS ESPECÍFICOS POR LÁMINA
// ============================================================================
function initSlideSpecificWidgets() {
  // Widget de Lámina 7: Consola de Simulación Telemétrica Activa
  const triggerSpikeBtn = document.getElementById("triggerSpikeBtn");
  const resetSimBtn = document.getElementById("resetSimBtn");

  if (triggerSpikeBtn) {
    triggerSpikeBtn.addEventListener("click", () => {
      simulateIndustrialDischarge(true);
    });
  }

  if (resetSimBtn) {
    resetSimBtn.addEventListener("click", () => {
      simulateIndustrialDischarge(false);
    });
  }

  // Interacción en Diagrama de Arquitectura (Lámina 4)
  const archNodes = document.querySelectorAll(".interactive-node");
  archNodes.forEach(node => {
    node.addEventListener("mouseenter", () => {
      node.classList.add("active-node");
    });
    node.addEventListener("mouseleave", () => {
      node.classList.remove("active-node");
    });
  });

  // Copiar URL en Lámina 8
  const copyBtn = document.getElementById("copyUrlBtn");
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(AIRWATCH_URL).then(() => {
        copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#587449" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        setTimeout(() => {
          copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
        }, 2000);
      }).catch(err => console.error("No se pudo copiar el enlace de Air Watch:", err));
    });
  }
}

function initWebShowcaseCarousel() {
  const carousel = document.getElementById("webDeliverableCarousel");
  if (!carousel) return null;

  const slides = Array.from(carousel.querySelectorAll(".web-carousel-slide"));
  const dots = Array.from(carousel.querySelectorAll("[data-web-slide]"));
  const previousButton = carousel.querySelector(".web-carousel-previous");
  const nextButton = carousel.querySelector(".web-carousel-next");
  let currentIndex = 0;
  let intervalId = null;
  let isInteracting = false;

  function showSlide(index) {
    currentIndex = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      const isCurrent = slideIndex === currentIndex;
      slide.classList.toggle("is-current", isCurrent);
      slide.setAttribute("aria-hidden", String(!isCurrent));
    });
    dots.forEach((dot, dotIndex) => {
      const isCurrent = dotIndex === currentIndex;
      dot.classList.toggle("is-current", isCurrent);
      if (isCurrent) {
        dot.setAttribute("aria-current", "true");
      } else {
        dot.removeAttribute("aria-current");
      }
    });
  }

  function stop() {
    if (intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
  }

  function start() {
    stop();
    if (PresenterState.currentSlideIndex !== 6 || document.hidden || isInteracting) return;
    intervalId = window.setInterval(() => showSlide(currentIndex + 1), 2000);
  }

  function setInteracting(value) {
    isInteracting = value;
    if (isInteracting) stop();
    else start();
  }

  function manualNavigation(index) {
    showSlide(index);
    start();
  }

  if (previousButton) {
    previousButton.addEventListener("click", () => manualNavigation(currentIndex - 1));
  }
  if (nextButton) {
    nextButton.addEventListener("click", () => manualNavigation(currentIndex + 1));
  }
  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const targetIndex = Number.parseInt(dot.getAttribute("data-web-slide"), 10);
      if (Number.isInteger(targetIndex)) manualNavigation(targetIndex);
    });
  });

  carousel.addEventListener("pointerdown", () => setInteracting(true));
  document.addEventListener("pointerup", () => setInteracting(false));
  document.addEventListener("pointercancel", () => setInteracting(false));

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  carousel.querySelectorAll("img[data-fallback]").forEach((image) => {
    const showPlaceholder = () => {
      image.style.display = "none";
      const placeholder = image.parentElement.querySelector(".web-shot-placeholder");
      if (placeholder) placeholder.hidden = false;
    };
    image.addEventListener("error", showPlaceholder);
    if (image.complete && image.naturalWidth === 0) showPlaceholder();
  });

  showSlide(0);
  return {
    onSlideChange(index) {
      if (index === 6) start();
      else stop();
    }
  };
}

/**
 * Simulación de aumento de gases por descarga industrial (Lámina 7)
 */
function simulateIndustrialDischarge(isSpike) {
  const gEco2 = document.getElementById("gaugeEco2");
  const vEco2 = document.getElementById("valEco2");
  const sEco2 = document.getElementById("statusEco2");

  const gTvoc = document.getElementById("gaugeTvoc");
  const vTvoc = document.getElementById("valTvoc");
  const sTvoc = document.getElementById("statusTvoc");

  const gMics = document.getElementById("gaugeMics");
  const vMics = document.getElementById("valMics");
  const sMics = document.getElementById("statusMics");

  const statusBadge = document.getElementById("overallStatusBadge");
  const subtext = document.getElementById("alertSubtext");

  if (isSpike) {
    // ESTADO DE ALERTA ROJA / TOXICIDAD ELEVADA
    if (gEco2) {
      gEco2.style.width = "88%";
      gEco2.style.backgroundColor = "#bd3f39";
    }
    if (vEco2) vEco2.textContent = "1,420 ppm";
    if (sEco2) {
      sEco2.textContent = "PELIGRO";
      sEco2.className = "meter-status text-danger";
    }

    if (gTvoc) {
      gTvoc.style.width = "82%";
      gTvoc.style.backgroundColor = "#bd3f39";
    }
    if (vTvoc) vTvoc.textContent = "685 ppb";
    if (sTvoc) {
      sTvoc.textContent = "TÓXICO";
      sTvoc.className = "meter-status text-danger";
    }

    if (gMics) {
      gMics.style.width = "75%";
      gMics.style.backgroundColor = "#a9650b";
    }
    if (vMics) vMics.textContent = "Rs/R₀: 0.28 (CH₄ detectado)";
    if (sMics) {
      sMics.textContent = "ANOMALÍA";
      sMics.className = "meter-status text-warning";
    }

    if (statusBadge) {
      statusBadge.className = "alert-status-pill danger";
      statusBadge.textContent = "DESCARGA INDUSTRIAL DETECTADA";
    }
    if (subtext) {
      subtext.textContent = "Notificación push enviada a Protección Civil y usuarios de El Bondho.";
      subtext.style.color = "#a8322c";
    }
  } else {
    // RESTABLECER ESTADO SEGURO
    if (gEco2) {
      gEco2.style.width = "28%";
      gEco2.style.backgroundColor = "#48734b";
    }
    if (vEco2) vEco2.textContent = "412 ppm";
    if (sEco2) {
      sEco2.textContent = "ÓPTIMO";
      sEco2.className = "meter-status text-emerald";
    }

    if (gTvoc) {
      gTvoc.style.width = "18%";
      gTvoc.style.backgroundColor = "#48734b";
    }
    if (vTvoc) vTvoc.textContent = "65 ppb";
    if (sTvoc) {
      sTvoc.textContent = "SEGURO";
      sTvoc.className = "meter-status text-emerald";
    }

    if (gMics) {
      gMics.style.width = "15%";
      gMics.style.backgroundColor = "#48734b";
    }
    if (vMics) vMics.textContent = "Rs/R₀: 0.94";
    if (sMics) {
      sMics.textContent = "NORMAL";
      sMics.className = "meter-status text-emerald";
    }

    if (statusBadge) {
      statusBadge.className = "alert-status-pill safe";
      statusBadge.textContent = "CALIDAD DE AIRE ACEPTABLE";
    }
    if (subtext) {
      subtext.textContent = "Sin riesgo biológico inmediato en la ribera del canal.";
      subtext.style.color = "var(--text-secondary)";
    }
  }
}

/**
 * Animaciones progresivas y contadores al entrar a láminas específicas
 */
function triggerSlideSpecificAnimations(slideIndex) {
  // Lámina 2: Contador animado de 256,338 habitantes expuestos
  if (slideIndex === 1) {
    const counterEl = document.querySelector(".counter-text");
    if (counterEl) {
      const target = parseInt(counterEl.getAttribute("data-target"), 10) || 256338;
      animateNumber(counterEl, 0, target, 1200);
    }
  }
}

function animateNumber(element, start, end, duration) {
  let startTime = null;
  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    const currentVal = Math.floor(progress * (end - start) + start);
    element.textContent = currentVal.toLocaleString("es-MX");
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      element.textContent = end.toLocaleString("es-MX");
    }
  }
  window.requestAnimationFrame(step);
}

// ============================================================================
// 7. CÓDIGO QR DINÁMICO & NÍTIDO (LÁMINA 10)
// ============================================================================
function initQRCode() {
  const qrContainer = document.getElementById("qrcodeCanvas");
  const qrUrlDisplay = document.getElementById("qrUrlDisplay");

  if (qrUrlDisplay) {
    qrUrlDisplay.textContent = AIRWATCH_URL;
  }

  if (!qrContainer) return;
  qrContainer.innerHTML = "";

  function showQRCodeUnavailable() {
    qrContainer.setAttribute("role", "status");
    qrContainer.textContent = "No se pudo cargar el generador QR. Revisa tu conexión.";
  }

  // Intentar renderizar con QRCode.js si la librería del CDN está disponible
  if (typeof QRCode !== "undefined") {
    try {
      new QRCode(qrContainer, {
        text: AIRWATCH_URL,
        width: 190,
        height: 190,
        colorDark: "#040d14",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
      });
      return;
    } catch (e) {
      console.error("No se pudo generar el código QR de Air Watch:", e);
      showQRCodeUnavailable();
      return;
    }
  }

  console.error("No se pudo generar el código QR: QRCode.js no está disponible.");
  showQRCodeUnavailable();
}

function initConclusionImage() {
  const image = document.querySelector("#slide-9 .conclusion-visual img");
  if (!image) return;

  const showPlaceholder = () => {
    image.hidden = true;
    const placeholder = image.parentElement.querySelector(".conclusion-image-placeholder");
    if (placeholder) placeholder.hidden = false;
  };

  image.addEventListener("error", showPlaceholder);
  if (image.complete && image.naturalWidth === 0) showPlaceholder();
}
