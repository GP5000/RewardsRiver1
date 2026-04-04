// app/wall.js/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req: NextRequest) {
  const js = `
// RewardsRiver wall embed
(function () {
  try {
    var script = document.currentScript;
    if (!script) return;

    var origin = (script.getAttribute("data-origin") || "").trim();
    if (!origin) {
      origin = window.location.origin;
    }

    var placementId = script.getAttribute("data-placement-id") || "";
    var subId = script.getAttribute("data-sub-id") || "";

    if (!placementId) {
      console.error("[RewardsRiver] data-placement-id is required on the script tag.");
      return;
    }

    var containerId =
      script.getAttribute("data-container-id") || "rewardsriver-wall-container";

    var container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement("div");
      container.id = containerId;
      script.parentNode.insertBefore(container, script.nextSibling);
    }

    var params = new URLSearchParams({ placement_id: placementId });
    if (subId) params.set("sub_id", subId);

    var iframe = document.createElement("iframe");
    iframe.src = origin.replace(/\\/$/, "") + "/wall?" + params.toString();
    iframe.style.width = "100%";
    iframe.style.border = "0";
    iframe.style.borderRadius = "12px";
    iframe.style.minHeight = "500px";
    iframe.setAttribute("scrolling", "yes");

    container.appendChild(iframe);
  } catch (e) {
    console.error("[RewardsRiver] embed error:", e);
  }
})();`;

  return new NextResponse(js, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
