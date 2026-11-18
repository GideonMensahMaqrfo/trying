/* Shipping tools: volumetric weight and CBM calculators */
(function () {
  const $ = (id) => document.getElementById(id);
  const num = (id) => Math.max(0, parseFloat($(id).value) || 0);
  const fmt = (n, d = 2) =>
    n.toLocaleString("en-GB", { minimumFractionDigits: d, maximumFractionDigits: d });

  const segment = (wrap, onChange) => {
    wrap.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      wrap.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b));
      onChange(b);
    });
    return () => wrap.querySelector('[aria-pressed="true"]');
  };

  /* ---------- Volumetric weight ---------- */
  const notes = {
    6000: "Air freight: length × width × height in cm ÷ 6,000 (1 m³ = 166.7 kg).",
    5000: "Express and courier: length × width × height in cm ÷ 5,000 (1 m³ = 200 kg).",
    3000: "Road freight: length × width × height in cm ÷ 3,000 (1 m³ = 333 kg). Some routes use loading metres instead.",
    1000: "Sea freight (LCL) is charged per ‘revenue ton’: 1 m³ or 1,000 kg, whichever is greater. Results are shown in kg for comparison.",
  };
  const vwSel = segment($("vwMode"), calcVW);
  function calcVW() {
    const div = Number(vwSel().dataset.div);
    const q = Math.max(1, Math.round(num("vwQ")));
    const cm3 = num("vwL") * num("vwW") * num("vwH") * q;
    const m3 = cm3 / 1e6;
    const vw = cm3 / div;
    const aw = num("vwA") * q;
    $("vwVol").textContent = fmt(m3, 3) + " m³";
    $("vwVw").textContent = fmt(vw, 1) + " kg";
    $("vwAw").textContent = fmt(aw, 1) + " kg";
    $("vwCw").textContent = fmt(Math.max(vw, aw), 1) + " kg";
    $("vwNote").textContent = notes[div] + " Your quote confirms the exact rule for your route.";
  }
  ["vwL", "vwW", "vwH", "vwQ", "vwA"].forEach((id) => $(id).addEventListener("input", calcVW));
  calcVW();

  /* ---------- CBM ---------- */
  const rows = $("cbmRows");
  const unitSel = segment($("cbmUnit"), () => {
    rows.querySelectorAll(".u").forEach((s) => (s.textContent = unit()));
    calcCBM();
  });
  const unit = () => unitSel().dataset.u;
  let n = 0;
  function addRow(l = "", w = "", h = "", q = 1) {
    n++;
    const r = document.createElement("div");
    r.className = "fields";
    r.style.gridTemplateColumns = "repeat(4, 1fr) auto";
    r.style.alignItems = "end";
    r.innerHTML = `
      <label><span>Length (<span class="u">${unit()}</span>)</span><input class="in" type="number" min="0" step="0.1" inputmode="decimal" value="${l}"></label>
      <label><span>Width (<span class="u">${unit()}</span>)</span><input class="in" type="number" min="0" step="0.1" inputmode="decimal" value="${w}"></label>
      <label><span>Height (<span class="u">${unit()}</span>)</span><input class="in" type="number" min="0" step="0.1" inputmode="decimal" value="${h}"></label>
      <label><span>Quantity</span><input class="in" type="number" min="1" step="1" inputmode="numeric" value="${q}"></label>
      <button type="button" class="btn btn-outline btn-sm" aria-label="Remove item ${n}" style="height:46px">✕</button>`;
    r.querySelector("button").addEventListener("click", () => {
      if (rows.children.length > 1) r.remove();
      calcCBM();
    });
    r.addEventListener("input", calcCBM);
    rows.appendChild(r);
    calcCBM();
  }
  function calcCBM() {
    const f = unit() === "in" ? 2.54 : 1;
    let m3 = 0;
    rows.querySelectorAll(".fields").forEach((r) => {
      const [l, w, h, q] = [...r.querySelectorAll("input")].map((i) => Math.max(0, parseFloat(i.value) || 0));
      m3 += (l * f * w * f * h * f * Math.max(1, Math.round(q))) / 1e6;
    });
    $("cbmTot").textContent = fmt(m3, 3) + " m³";
    $("cbmFt").textContent = fmt(m3 * 35.3147, 1) + " ft³";
    const pct = (cap) => (m3 ? Math.round((m3 / cap) * 100) + "%" : "–");
    $("cbm20").textContent = pct(28);
    $("cbm40").textContent = pct(58);
  }
  $("cbmAdd").addEventListener("click", () => addRow());
  addRow(120, 80, 100, 4);

  /* ---------- highlight current section in side menu ---------- */
  const links = [...document.querySelectorAll(".side-nav a")];
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (en) =>
        en.forEach((e) => {
          if (e.isIntersecting)
            links.forEach((a) => a.classList.toggle("on", a.getAttribute("href") === "#" + e.target.id));
        }),
      { rootMargin: "-40% 0px -55% 0px" },
    );
    links.forEach((a) => {
      const t = document.querySelector(a.getAttribute("href"));
      if (t) io.observe(t);
    });
  }
})();
