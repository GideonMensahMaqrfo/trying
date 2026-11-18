/* Customer tracking page */
(function () {
  const C = window.CBFL,
    esc = C.esc,
    out = document.getElementById("out"),
    input = document.getElementById("code");

  // Example shipment shown only while the database is not connected yet
  const DEMO = {
    tracking_code: "CBDEMO2026",
    origin: "Amsterdam, Netherlands",
    destination: "Accra, Ghana",
    description: "2 pallets – machine parts",
    status: "At Port",
    current_location: "Tema Port, Ghana",
    eta: new Date(Date.now() + 6 * 864e5).toISOString().slice(0, 10),
    updated_at: new Date().toISOString(),
    events: [
      {
        location: "Tema Port, Ghana",
        status: "At Port",
        note: "Vessel arrived. Waiting for unloading.",
        time: new Date(Date.now() - 2 * 36e5).toISOString(),
      },
      {
        location: "Atlantic Ocean",
        status: "In Transit",
        note: "On board vessel.",
        time: new Date(Date.now() - 9 * 864e5).toISOString(),
      },
      {
        location: "Port of Rotterdam, Netherlands",
        status: "In Transit",
        note: "Loaded on vessel.",
        time: new Date(Date.now() - 16 * 864e5).toISOString(),
      },
      {
        location: "Amsterdam warehouse",
        status: "Received",
        note: "Goods received and checked.",
        time: new Date(Date.now() - 18 * 864e5).toISOString(),
      },
    ],
  };

  function card(s, demo) {
    const st = C.STATUSES,
      idx = Math.max(0, st.indexOf(s.status));
    const pillCls =
      s.status === "Delivered" ? "ok" : s.status === "On Hold" ? "warn" : "";
    return `
      ${demo ? '<div class="demo-note" style="margin-bottom:14px">Example only. This shows how a live shipment looks.</div>' : ""}
      <article class="result">
        <div class="top">
          <div><small style="color:var(--muted)">Tracking number</small><div class="code">${esc(s.tracking_code)}</div>${s.description ? `<div style="color:var(--muted)">${esc(s.description)}</div>` : ""}</div>
          <div style="text-align:right"><span class="pill ${pillCls}">${esc(s.status)}</span><div style="margin-top:6px;font-size:14px;color:var(--muted)">${s.eta ? 'Estimated delivery: <b style="color:var(--navy)">' + C.fdate(s.eta) + "</b>" : ""}</div></div>
        </div>
        <div class="route"><div class="end"><small>From</small><b>${esc(s.origin || "—")}</b></div><div class="line" aria-hidden="true"></div><div class="end"><small>To</small><b>${esc(s.destination || "—")}</b></div></div>
        ${st.includes(s.status) ? `<div class="progress" role="img" aria-label="Progress: step ${idx + 1} of ${st.length}, ${esc(s.status)}">${st.map((x, i) => `<div class="${i <= idx ? "done" : ""} ${i === idx ? "cur" : ""}">${x}</div>`).join("")}</div>` : ""}
        <div><small style="color:var(--muted)">Current location</small><div style="font:700 18px var(--display);color:var(--navy)">${esc(s.current_location || "—")}</div><small style="color:var(--muted)">Last update: ${C.fdate(s.updated_at, true)}</small></div>
        <div><h3 style="margin-bottom:14px">Shipment history</h3>
          <ol class="timeline">${(s.events || []).map((e) => `<li><div><b>${esc(e.status)}</b> · ${esc(e.location)}<br>${e.note ? esc(e.note) + "<br>" : ""}<small>${C.fdate(e.time, true)}</small></div></li>`).join("") || "<li><div>No updates yet.</div></li>"}</ol></div>
        <p style="color:var(--muted);font-size:14px">Questions about this shipment? Email <a href="mailto:${C.EMAIL_INFO}?subject=Shipment ${encodeURIComponent(s.tracking_code)}">${C.EMAIL_INFO}</a> and quote your tracking number.</p>
      </article>`;
  }

  const notFound = (code) =>
    `<div class="msg bad">No shipment found for <b>${esc(code)}</b>. Check the number on your receipt and try again.</div>`;

  async function one(code) {
    if (!C.db) {
      if (code === DEMO.tracking_code) return card(DEMO, true);
      return `<div class="msg info">No live result for <b>${esc(code)}</b> yet. Try the example number <b>${DEMO.tracking_code}</b> to see how tracking works.</div>`;
    }
    const { data, error } = await C.db.rpc("track_shipment", { code });
    if (error)
      return '<div class="msg bad">Tracking is temporarily unavailable. Please try again in a few minutes.</div>';
    if (!data) return code === DEMO.tracking_code ? card(DEMO, true) : notFound(code);
    return card(data, false);
  }

  const parse = (v) =>
    [...new Set(String(v).toUpperCase().split(/[\s,;]+/).filter(Boolean))].slice(0, 10);

  async function lookup(raw) {
    const codes = parse(raw);
    if (!codes.length) return;
    out.innerHTML = '<div class="msg info">Searching…</div>';
    const parts = await Promise.all(codes.map(one));
    out.innerHTML =
      (codes.length > 1
        ? `<p style="color:var(--muted);margin-bottom:14px">Showing ${codes.length} shipments.</p>`
        : "") + `<div class="multi-list">${parts.join("")}</div>`;
    tools.hidden = false;
  }

  const tools = document.getElementById("trackTools");
  document.getElementById("copyLink").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      C.toast("Tracking link copied");
    } catch {
      C.toast("Copy this page address to share it");
    }
  });
  document.getElementById("printBtn").addEventListener("click", () => window.print());
  document.getElementById("helpMail").href = `mailto:${C.EMAIL_INFO}?subject=Shipment enquiry`;

  document.getElementById("trackForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const c = parse(input.value).join(",");
    history.replaceState(null, "", "?code=" + encodeURIComponent(c));
    lookup(c);
  });
  const q = new URLSearchParams(location.search).get("code");
  if (q) {
    input.value = parse(q).join(", ");
    lookup(q);
  }
})();
