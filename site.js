/* Shared header, footer and helpers for every page. */
(function () {
  const C = window.CBFL;
  const page = document.body.dataset.page || "";
  const nav = [
    ["index.html", "Home", "home"],
    ["services.html", "Services", "services"],
    ["industries.html", "Industries", "industries"],
    ["tools.html", "Shipping Tools", "tools"],
    ["help.html", "Help", "help"],
    ["about.html", "About Us", "about"],
    ["contact.html", "Contact", "contact"],
  ];

  const header = `
  <a class="skip" href="#main">Skip to content</a>
  <div class="topbar"><div class="wrap">
    <span>Since ${C.FOUNDED} · Amsterdam · United Kingdom · Worldwide freight</span>
    <span class="links"><a href="mailto:${C.EMAIL_INFO}">${C.EMAIL_INFO}</a><a href="help.html">Help centre</a><a href="fraud.html">Fraud awareness</a></span>
  </div></div>
  <header class="site"><div class="wrap">
    <a class="brand" href="index.html" aria-label="${C.COMPANY} home"><img src="logo.png" alt="${C.COMPANY}" width="900" height="547"></a>
    <button class="menu-toggle" aria-label="Open menu" aria-expanded="false">☰</button>
    <nav class="main" aria-label="Main">
      ${nav.map((n) => `<a href="${n[0]}" class="${page === n[2] ? "on" : ""}"${page === n[2] ? ' aria-current="page"' : ""}>${n[1]}</a>`).join("")}
      <a class="btn btn-primary" href="track.html">Track</a>
    </nav>
  </div></header>`;

  const offices = C.OFFICES.map(
    (o) =>
      `<li><b style="color:#fff">${o.name}</b><br>${[o.address, o.country].filter(Boolean).join(", ")}${o.phone ? "<br>" + o.phone : ""}</li>`,
  ).join("");
  const footer = `
  <footer class="site"><div class="wrap">
    <div class="cols">
      <div style="display:grid;gap:14px;align-content:start"><a class="brand brand-footer" href="index.html"><img src="logo.png" alt="${C.COMPANY}" width="900" height="547" loading="lazy"></a>
        <span class="since">Moving cargo since ${C.FOUNDED}</span>
        <p>Ocean, air and road freight connecting Europe with Africa and the world, managed from our head offices in Amsterdam and the United Kingdom.</p></div>
      <div><h4>Services</h4><ul><li><a href="services.html#ocean">Ocean freight</a></li><li><a href="services.html#air">Air freight</a></li><li><a href="services.html#road">Road transport</a></li><li><a href="services.html#warehouse">Warehousing</a></li><li><a href="services.html#customs">Customs clearance</a></li><li><a href="services.html#door">Door-to-door</a></li></ul></div>
      <div><h4>Customer help</h4><ul><li><a href="track.html">Track a shipment</a></li><li><a href="contact.html#quote">Request a quote</a></li><li><a href="tools.html">Shipping tools</a></li><li><a href="help.html">Help centre &amp; FAQ</a></li><li><a href="fraud.html">Fraud awareness</a></li></ul></div>
      <div><h4>Company</h4><ul><li><a href="about.html">About us</a></li><li><a href="industries.html">Industries</a></li><li><a href="contact.html">Contact</a></li><li><a href="admin.html">Staff login</a></li></ul></div>
      <div><h4>Head offices</h4><ul>${offices}<li><a href="mailto:${C.EMAIL_INFO}">${C.EMAIL_INFO}</a></li></ul></div>
    </div>
    <div class="legal"><span>© ${C.FOUNDED}–${new Date().getFullYear()} ${C.COMPANY}. All rights reserved.</span><span class="links"><a href="privacy.html">Privacy policy</a><a href="terms.html">Terms &amp; conditions</a><a href="fraud.html">Fraud awareness</a></span></div>
  </div></footer>`;

  document.getElementById("site-header").outerHTML = header;
  document.getElementById("site-footer").outerHTML = footer;

  const whatsappNumber = String(C.WHATSAPP_NUMBER || "").replace(/\D/g, "");
  if (page !== "admin" && whatsappNumber) {
    if (/^\d{8,15}$/.test(whatsappNumber)) {
      const message = encodeURIComponent(
        "Hello, I have a question about your freight services.",
      );
      const chat = document.createElement("a");
      chat.className = "whatsapp-chat";
      chat.href = `https://wa.me/${whatsappNumber}?text=${message}`;
      chat.target = "_blank";
      chat.rel = "noopener noreferrer";
      chat.setAttribute(
        "aria-label",
        "Chat with us on WhatsApp (opens in a new tab)",
      );
      chat.textContent = "Chat on WhatsApp";
      document.body.appendChild(chat);
    } else {
      console.error(
        "CBFL.WHATSAPP_NUMBER must include 8–15 digits in international format.",
      );
    }
  }

  // Header shadow, back-to-top button and scroll-in animations
  const hdr = document.querySelector("header.site");
  const top = document.createElement("button");
  top.className = "to-top";
  top.setAttribute("aria-label", "Back to top");
  top.innerHTML =
    '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  top.addEventListener("click", () => window.scrollTo({ top: 0 }));
  document.body.appendChild(top);
  const onScroll = () => {
    const y = window.scrollY;
    if (hdr) hdr.classList.toggle("scrolled", y > 10);
    top.classList.toggle("show", y > 700);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("shown");
            io.unobserve(en.target);
          }
        }),
      { rootMargin: "0px 0px -8% 0px" },
    );
    document
      .querySelectorAll(
        "main .section-head, main .card, main .feature, main .stepc, main .tile, main .stat, main .split > *, main .office, main .calc",
      )
      .forEach((el) => {
        el.classList.add("reveal");
        io.observe(el);
      });
  }

  // Years in business, worked out from the founding year
  document.querySelectorAll("[data-years]").forEach((el) => {
    const y = new Date().getFullYear() - Number(C.FOUNDED || 2011);
    el.dataset.count = y;
    el.textContent = y + (el.dataset.suffix || "");
  });
  document.querySelectorAll("[data-founded]").forEach((el) => (el.textContent = C.FOUNDED));

  // Tabs (home page action panel)
  document.querySelectorAll('[role="tablist"]').forEach((list) => {
    const tabs = [...list.querySelectorAll('[role="tab"]')];
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", on);
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => select(t));
      t.addEventListener("keydown", (e) => {
        const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (d) select(tabs[(i + d + tabs.length) % tabs.length], true);
      });
    });
  });

  // Count-up numbers in the stats band
  document.querySelectorAll("[data-count]").forEach((el) => {
    const end = Number(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = end + suffix;
      return;
    }
    const start = Number(el.dataset.from || 0);
    const io2 = new IntersectionObserver((en) => {
      if (!en[0].isIntersecting) return;
      io2.disconnect();
      const t0 = performance.now();
      const step = (t) => {
        const p = Math.min(1, (t - t0) / 1200);
        el.textContent = Math.round(start + (end - start) * (1 - Math.pow(1 - p, 3))) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    io2.observe(el);
  });

  document.addEventListener("click", (e) => {
    const t = e.target.closest(".menu-toggle");
    if (!t) return;
    const n = document.querySelector("nav.main");
    const open = n.classList.toggle("open");
    t.setAttribute("aria-expanded", open);
  });

  // Database connection (null = website still in demo mode)
  const ready =
    C.SUPABASE_URL.startsWith("https://") &&
    !C.SUPABASE_KEY.startsWith("PASTE") &&
    window.supabase;
  window.CBFL.db = ready
    ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_KEY)
    : null;

  window.CBFL.esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  window.CBFL.fdate = (d, withTime) =>
    d
      ? new Date(d).toLocaleString(
          "en-GB",
          withTime
            ? {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }
            : { day: "numeric", month: "short", year: "numeric" },
        )
      : "—";
  window.CBFL.STATUSES = [
    "Received",
    "In Transit",
    "At Port",
    "Customs Clearance",
    "Out for Delivery",
    "Delivered",
  ];
  window.CBFL.toast = (t) => {
    let el = document.querySelector(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = t;
    el.hidden = false;
    clearTimeout(el._t);
    el._t = setTimeout(() => (el.hidden = true), 3000);
  };
})();
