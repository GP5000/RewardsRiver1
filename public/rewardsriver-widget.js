<script>
(function () {
  let modal, iframe;

  function openRewardsRiver(placementId, subId) {
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "rr-modal";
      modal.style = `
        position: fixed; inset: 0; z-index: 999999;
        background: rgba(0,0,0,0.65);
        display: flex; align-items: center; justify-content: center;
      `;

      const inner = document.createElement("div");
      inner.style = `
        width: min(960px, 100% - 32px);
        height: min(640px, 100% - 32px);
        background: #020617; border-radius: 18px;
        overflow: hidden; position: relative;
      `;

      const close = document.createElement("button");
      close.innerHTML = "✕";
      close.style = `
        position: absolute; right: 12px; top: 10px;
        background: rgba(15,23,42,0.8); border: 0;
        padding: 4px 12px; border-radius: 999px;
        color: white; font-size: 16px; cursor: pointer;
        z-index: 20;
      `;
      close.onclick = () => document.body.removeChild(modal);

      iframe = document.createElement("iframe");
      iframe.style = "border:0; width:100%; height:100%;";
      iframe.sandbox =
        "allow-scripts allow-same-origin allow-top-navigation-by-user-activation";
      iframe.referrerPolicy = "no-referrer-when-downgrade";

      inner.appendChild(close);
      inner.appendChild(iframe);
      modal.appendChild(inner);
      document.body.appendChild(modal);

      // Auto-resize from postMessage
      window.addEventListener("message", (e) => {
        if (e.data?.type === "rewardsriver:wall-height") {
          iframe.style.height = e.data.height + "px";
        }
      });
    }

    iframe.src =
      "https://YOURDOMAIN.com/wall?placement_id=" +
      placementId +
      "&sub_id=" +
      encodeURIComponent(subId || "");
  }

  window.RewardsRiver = { open: openRewardsRiver };
})();
</script>
