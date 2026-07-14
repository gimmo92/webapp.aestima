/**
 * aestima — loader embed assistenza service
 * Modalità: data-mode="bubble" | "wide"
 *
 * In produzione impostare data-base-url al dominio di deploy del cliente.
 */
(function () {
  "use strict";

  var script = document.currentScript;
  if (!script) return;

  var mode = (script.getAttribute("data-mode") || "bubble").toLowerCase();
  var baseUrl = (script.getAttribute("data-base-url") || "").replace(/\/$/, "");
  if (!baseUrl) {
    try {
      baseUrl = new URL(script.src).origin;
    } catch (e) {
      console.error("[aestima embed] data-base-url mancante");
      return;
    }
  }

  var chatPath = script.getAttribute("data-chat-path") || "/embed/chat";
  var chatUrl =
    mode === "bubble"
      ? baseUrl + chatPath + "?chrome=0"
      : baseUrl + chatPath;
  var height = parseInt(script.getAttribute("data-height") || "640", 10);
  var position = script.getAttribute("data-position") || "bottom-right";
  var zIndex = script.getAttribute("data-z-index") || "999999";
  var brandColor = script.getAttribute("data-color") || "#2f81f7";

  var iframeTitle = "Assistenza service aestima";

  function createIframe(extraStyle) {
    var iframe = document.createElement("iframe");
    iframe.src = chatUrl;
    iframe.title = iframeTitle;
    iframe.setAttribute("allow", "clipboard-write");
    iframe.style.border = "0";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.display = "block";
    if (extraStyle) {
      for (var key in extraStyle) {
        if (Object.prototype.hasOwnProperty.call(extraStyle, key)) {
          iframe.style[key] = extraStyle[key];
        }
      }
    }
    return iframe;
  }

  if (mode === "wide") {
    var containerId = script.getAttribute("data-container");
    var container = containerId
      ? document.getElementById(containerId)
      : null;

    if (!container) {
      container = document.createElement("div");
      container.id = containerId || "aestima-chat-wide";
      script.parentNode.insertBefore(container, script.nextSibling);
    }

    container.style.width = "100%";
    container.style.height = height + "px";
    container.style.maxWidth = "100%";
    container.style.overflow = "hidden";
    container.style.borderRadius = "16px";
    container.style.boxShadow = "0 16px 48px rgba(0,0,0,0.35)";

    container.appendChild(createIframe());
    return;
  }

  /* --- Modalità bolla floating --- */
  var isLeft = position === "bottom-left";
  var panelW = parseInt(script.getAttribute("data-panel-width") || "400", 10);
  var panelH = parseInt(script.getAttribute("data-panel-height") || "580", 10);
  var open = false;

  var panel = document.createElement("div");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", iframeTitle);
  panel.style.cssText =
    "position:fixed;" +
    (isLeft ? "left:20px;" : "right:20px;") +
    "bottom:88px;width:" +
    panelW +
    "px;height:" +
    panelH +
    "px;max-width:calc(100vw - 40px);max-height:calc(100vh - 100px);" +
    "border-radius:16px;overflow:hidden;box-shadow:0 16px 48px rgba(0,0,0,0.4);" +
    "background:#111722;border:1px solid #23303f;z-index:" +
    zIndex +
    ";display:none;flex-direction:column;";

  var panelHeader = document.createElement("div");
  panelHeader.style.cssText =
    "display:flex;align-items:center;justify-content:space-between;padding:8px 12px;" +
    "background:rgba(17,23,34,0.95);border-bottom:1px solid #23303f;color:#e8edf4;" +
    "font-family:system-ui,sans-serif;font-size:12px;font-weight:600;";

  var panelTitle = document.createElement("span");
  panelTitle.textContent = "Assistenza aestima";

  var closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Chiudi chat");
  closeBtn.textContent = "✕";
  closeBtn.style.cssText =
    "background:transparent;border:0;color:#9fb0c3;cursor:pointer;font-size:16px;padding:4px 8px;";

  panelHeader.appendChild(panelTitle);
  panelHeader.appendChild(closeBtn);

  var panelBody = document.createElement("div");
  panelBody.style.cssText = "flex:1;min-height:0;";
  panelBody.appendChild(createIframe());

  panel.appendChild(panelHeader);
  panel.appendChild(panelBody);

  var launcher = document.createElement("button");
  launcher.type = "button";
  launcher.setAttribute("aria-label", "Apri assistenza service");
  launcher.style.cssText =
    "position:fixed;bottom:20px;" +
    (isLeft ? "left:20px;" : "right:20px;") +
    "width:56px;height:56px;border-radius:50%;border:0;cursor:pointer;" +
    "background:" +
    brandColor +
    ";color:#fff;font-size:22px;z-index:" +
    zIndex +
    ";box-shadow:0 8px 24px rgba(47,129,247,0.35);display:flex;align-items:center;justify-content:center;";

  launcher.innerHTML =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';

  function setOpen(next) {
    open = next;
    panel.style.display = open ? "flex" : "none";
    launcher.setAttribute("aria-expanded", open ? "true" : "false");
    launcher.setAttribute(
      "aria-label",
      open ? "Chiudi assistenza service" : "Apri assistenza service"
    );
  }

  launcher.addEventListener("click", function () {
    setOpen(!open);
  });
  closeBtn.addEventListener("click", function () {
    setOpen(false);
  });

  document.body.appendChild(panel);
  document.body.appendChild(launcher);
})();
