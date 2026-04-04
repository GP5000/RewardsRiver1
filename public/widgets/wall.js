// public/widgets/wall.js
(function () {
  var script = document.currentScript;
  if (!script) return;

  var placementId = script.getAttribute("data-placement-id");
  var userId = script.getAttribute("data-user-id") || "";
  var containerSelector =
    script.getAttribute("data-container") || "#rewardsriver-wall";
  var baseUrl =
    script.getAttribute("data-base-url") ||
    (location.hostname === "localhost"
      ? "http://localhost:3000"
      : "https://rewardsriver.com");

  if (!placementId) {
    console.error(
      "[RewardsRiver] data-placement-id is required on the wall.js script tag."
    );
    return;
  }

  var container =
    document.querySelector(containerSelector) || script.parentElement;
  if (!container) {
    console.error(
      "[RewardsRiver] Could not find container for selector:",
      containerSelector
    );
    return;
  }

  var iframe = document.createElement("iframe");
  var src =
    baseUrl +
    "/wall?placement_id=" +
    encodeURIComponent(placementId) +
    (userId ? "&sub_id=" + encodeURIComponent(userId) : "");

  iframe.src = src;
  iframe.style.border = "0";
  iframe.style.width = "100%";
  iframe.style.minHeight = "620px";
  iframe.style.borderRadius = "18px";
  iframe.style.overflow = "hidden";
  iframe.setAttribute(
    "sandbox",
    "allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
  );
  iframe.setAttribute("loading", "lazy");
  iframe.setAttribute("referrerpolicy", "no-referrer-when-downgrade");

  container.appendChild(iframe);

  // Auto-resize listener
  function onMessage(event) {
    var data = event.data;
    if (!data || data.type !== "rewardsriver:wall-height") return;
    if (event.source !== iframe.contentWindow) return;

    var height = parseInt(data.height, 10);
    if (!height || isNaN(height)) return;
    iframe.style.height = height + "px";
  }

  window.addEventListener("message", onMessage, false);
})();
