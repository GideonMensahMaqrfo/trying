/* Contact page: office cards and the quote request form */
(function () {
  const C = window.CBFL;
  const esc = C.esc;
  const mail = (email, label) =>
    `<a href="mailto:${email}">${email}</a>${label ? `<br><small style="color:var(--muted)">${label}</small>` : ""}`;

  document.getElementById("offices").innerHTML = [
    ...C.OFFICES.map(
      (office) => `
      <div class="office">
        <span class="tag">Head office</span>
        <h3>${esc(office.name)}</h3>
        <p>${esc([office.address, office.country].filter(Boolean).join(", "))}</p>
        ${office.phone ? `<p>${esc(office.phone)}</p>` : ""}
        <p>${mail(C.EMAIL_INFO)}</p>
      </div>
    `,
    ),
    `
      <div class="office" style="border-top-color:var(--navy)">
        <span class="tag">Email us</span>
        <h3>General enquiries</h3>
        <p>${mail(C.EMAIL_INFO, "Quotes, bookings and tracking")}</p>
        <p>${mail(C.EMAIL_CONTACT, C.CONTACT_NAME)}</p>
      </div>
    `,
  ].join("");

  const form = document.getElementById("quoteForm");
  const status = document.getElementById("qstatus");
  const v = (id) => document.getElementById(id).value.trim();

  // Prefill from the home page quick-quote box (?from=…&to=…&mode=…)
  const p = new URLSearchParams(location.search);
  if (p.get("from")) document.getElementById("qfrom").value = p.get("from");
  if (p.get("to")) document.getElementById("qto").value = p.get("to");
  if (p.get("mode")) {
    const r = form.querySelector(`input[name="mode"][value="${CSS.escape(p.get("mode"))}"]`);
    if (r) r.checked = true;
  }
  if ([...p.keys()].length) document.getElementById("quote").scrollIntoView();

  const say = (cls, html) =>
    (status.innerHTML = `<span class="msg ${cls}" style="display:inline-block">${html}</span>`);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    // Spam trap: real visitors never see or fill this field
    if (document.getElementById("qwebsite").value) {
      form.reset();
      return say("ok", "Thank you. We have received your request and will reply by email.");
    }
    const missing = ["qname", "qemail", "qfrom", "qto"].filter((id) => !v(id));
    if (missing.length) {
      document.getElementById(missing[0]).focus();
      return say("bad", "Please fill in the fields marked *.");
    }
    if (!document.getElementById("qemail").checkValidity()) {
      document.getElementById("qemail").focus();
      return say("bad", "Please enter a valid email address.");
    }
    if (!document.getElementById("qconsent").checked) {
      return say("bad", "Please tick the box to agree to us using your details.");
    }

    const mode = form.querySelector('input[name="mode"]:checked').value;
    const extras = [...form.querySelectorAll('input[name="extra"]:checked')].map((x) => x.value);
    const lines = [
      ["Company", v("qcompany")],
      ["Collection", v("qpickup")],
      ["Delivery", v("qdelivery")],
      ["Cargo type", v("qtype")],
      ["Load", v("qload")],
      ["Pieces", v("qpieces")],
      ["Total weight (kg)", v("qweight")],
      ["Size / volume", v("qsize")],
      ["Ready from", v("qdate")],
      ["Cargo value", v("qvalue")],
      ["Incoterm", v("qinco")],
      ["Extra services", extras.join(", ")],
    ]
      .filter((l) => l[1])
      .map((l) => `${l[0]}: ${l[1]}`);
    const message = [...lines, "", v("qmsg") || "(no extra message)"].join("\n").slice(0, 4000);

    const row = {
      name: v("qname"),
      email: v("qemail"),
      phone: v("qphone"),
      service: mode,
      origin: v("qfrom"),
      destination: v("qto"),
      message,
    };

    if (!C.db) {
      const body = [
        `Name: ${row.name}`,
        `Email: ${row.email}`,
        `Phone: ${row.phone}`,
        `Transport: ${row.service}`,
        `From: ${row.origin}`,
        `To: ${row.destination}`,
        "",
        message,
      ].join("\n");
      const subject = encodeURIComponent(`Quote request – ${row.service}`);
      location.href = `mailto:${C.EMAIL_INFO}?subject=${subject}&body=${encodeURIComponent(body)}`;
      return say("info", `Your email app should open. If not, email us at <b>${C.EMAIL_INFO}</b>.`);
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    status.textContent = "Sending…";
    const { error } = await C.db.from("contact_messages").insert(row);
    btn.disabled = false;
    if (error) return say("bad", `Could not send. Please email ${C.EMAIL_INFO} instead.`);

    form.reset();
    say("ok", "Thank you. We have received your request and will reply by email.");
  });
})();
