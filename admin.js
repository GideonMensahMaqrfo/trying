/* Staff admin: sign in, create shipments, add location updates, read quote requests */
(function () {
  const C = window.CBFL,
    esc = C.esc,
    db = C.db,
    $ = (id) => document.getElementById(id);
  let shipments = [],
    openId = null;

  if (!db) {
    $("setupNote").hidden = false;
    return;
  }

  async function start() {
    const { data } = await db.auth.getSession();
    if (data.session) showApp(data.session.user);
    else $("loginForm").hidden = false;
  }
  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("lerr").hidden = true;
    const { data, error } = await db.auth.signInWithPassword({
      email: $("lemail").value.trim(),
      password: $("lpass").value,
    });
    if (error) {
      $("lerr").textContent = "Wrong email or password.";
      $("lerr").hidden = false;
      return;
    }
    showApp(data.user);
  });
  $("logout").addEventListener("click", async () => {
    await db.auth.signOut();
    location.reload();
  });

  async function showApp(user) {
    $("loginForm").hidden = true;
    $("app").hidden = false;
    $("who").textContent = user.email;
    await loadShipments();
    startAlerts();
  }

  // ---- tabs
  document.querySelectorAll("[data-tab]").forEach((b) =>
    b.addEventListener("click", () => {
      document
        .querySelectorAll("[data-tab]")
        .forEach((x) => x.classList.toggle("on", x === b));
      document
        .querySelectorAll("[data-pane]")
        .forEach((p) => (p.hidden = p.dataset.pane !== b.dataset.tab));
      $("detail").hidden = true;
      if (b.dataset.tab === "msgs") loadMessages();
    }),
  );

  // ---- list
  async function loadShipments() {
    const { data, error } = await db
      .from("shipments")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) {
      $("rows").innerHTML =
        `<tr><td colspan="6"><div class="msg bad">${error.message.includes("row-level") || error.code === "42501" ? "This account is not on the admin list. See README step 3.5." : esc(error.message)}</div></td></tr>`;
      return;
    }
    shipments = data;
    drawRows();
  }
  function drawRows() {
    const q = $("filter").value.trim().toLowerCase();
    const list = shipments.filter(
      (s) => !q || JSON.stringify(s).toLowerCase().includes(q),
    );
    $("rows").innerHTML = list.length
      ? list
          .map(
            (s) =>
              `<tr class="click" data-id="${s.id}" tabindex="0"><td><b>${esc(s.tracking_code)}</b></td><td>${esc(s.receiver_name || "—")}</td><td>${esc(s.origin || "")} → ${esc(s.destination || "")}</td><td><span class="pill ${s.status === "Delivered" ? "ok" : ""}">${esc(s.status)}</span></td><td>${esc(s.current_location || "—")}</td><td>${C.fdate(s.updated_at, true)}</td></tr>`,
          )
          .join("")
      : `<tr><td colspan="6" style="color:var(--muted)">${shipments.length ? "No match." : "No shipments yet. Click “+ New shipment”."}</td></tr>`;
  }
  $("exportShipments").addEventListener("click", async () => {
    const button = $("exportShipments");
    button.disabled = true;
    button.textContent = "Preparing CSV…";
    try {
      const allShipments = [];
      const pageSize = 1000;
      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await db
          .from("shipments")
          .select("*")
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
          .range(offset, offset + pageSize - 1);
        if (error) throw error;
        allShipments.push(...data);
        if (data.length < pageSize) break;
      }
      const historyByShipment = new Map();
      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await db
          .from("tracking_events")
          .select("id,shipment_id,location,status,note,event_time")
          .order("shipment_id", { ascending: true })
          .order("event_time", { ascending: true })
          .order("id", { ascending: true })
          .range(offset, offset + pageSize - 1);
        if (error) throw error;
        data.forEach((event) => {
          if (!historyByShipment.has(event.shipment_id))
            historyByShipment.set(event.shipment_id, []);
          historyByShipment
            .get(event.shipment_id)
            .push(
              [event.event_time, event.status, event.location, event.note]
                .filter(Boolean)
                .join(" | "),
            );
        });
        if (data.length < pageSize) break;
      }
      const columns = [
        ["Tracking number", "tracking_code"],
        ["Sender name", "sender_name"],
        ["Receiver name", "receiver_name"],
        ["Customer email", "receiver_email"],
        ["Receiver phone", "receiver_phone"],
        ["Origin", "origin"],
        ["Destination", "destination"],
        ["Description", "description"],
        ["Status", "status"],
        ["Current location", "current_location"],
        ["Estimated delivery", "eta"],
        ["Created at", "created_at"],
        ["Last updated", "updated_at"],
        ["Tracking history", "tracking_history"],
      ];
      const csvCell = (value) => {
        let text = String(value ?? "");
        if (/^[\u0000-\u0020]*[=+\-@]/.test(text)) text = `'${text}`;
        return `"${text.replace(/"/g, '""')}"`;
      };
      const csv = [
        columns.map(([label]) => csvCell(label)).join(","),
        ...allShipments.map((shipment) =>
          columns
            .map(([, key]) =>
              csvCell(
                key === "tracking_history"
                  ? (historyByShipment.get(shipment.id) || []).join("\n")
                  : shipment[key],
              ),
            )
            .join(","),
        ),
      ].join("\r\n");
      const url = URL.createObjectURL(
        new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `shipments-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      C.toast(
        `Exported ${allShipments.length} shipment${allShipments.length === 1 ? "" : "s"}`,
      );
    } catch (error) {
      C.toast("Could not export shipments: " + error.message);
    } finally {
      button.disabled = false;
      button.textContent = "Export CSV";
    }
  });
  $("filter").addEventListener("input", drawRows);
  $("rows").addEventListener("click", (e) => {
    const r = e.target.closest("tr[data-id]");
    if (r) openShipment(r.dataset.id);
  });
  $("rows").addEventListener("keydown", (e) => {
    const r = e.target.closest("tr[data-id]");
    if (r && e.key === "Enter") openShipment(r.dataset.id);
  });

  // ---- create
  $("newForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const v = (id) => $(id).value.trim();
    const whatsappWindow = window.open("about:blank", "_blank");
    const customerEmail = v("nemail");
    const receiverPhone = v("nphone");
    const { data: s, error } = await db
      .from("shipments")
      .insert({
        sender_name: v("nsender"),
        receiver_name: v("nreceiver"),
        receiver_email: customerEmail,
        receiver_phone: receiverPhone,
        description: v("ndesc"),
        origin: v("norigin"),
        destination: v("ndest"),
        eta: v("neta") || null,
      })
      .select()
      .single();
    if (error) {
      if (whatsappWindow) whatsappWindow.close();
      return C.toast("Could not create: " + error.message);
    }
    const { error: eventError } = await db
      .from("tracking_events")
      .insert({
        shipment_id: s.id,
        location: v("nloc"),
        status: "Received",
        note: "Shipment received.",
      });
    if (eventError) {
      if (whatsappWindow) whatsappWindow.close();
      e.target.reset();
      C.toast(
        `Created ${s.tracking_code}, but its first tracking update failed: ${eventError.message}`,
      );
      await loadShipments();
      return;
    }
    const trackingUrl = new URL(
      "track.html?code=" + encodeURIComponent(s.tracking_code),
      location.href,
    ).toString();
    const whatsappMessage = [
      `Hello ${v("nreceiver")}, your shipment is ready to track.`,
      `Tracking number: ${s.tracking_code}`,
      `From: ${v("norigin")}`,
      `To: ${v("ndest")}`,
      `Current location: ${v("nloc")}`,
      v("neta") ? `Estimated delivery: ${v("neta")}` : "",
      `Track your shipment: ${trackingUrl}`,
    ]
      .filter(Boolean)
      .join("\n");
    const phoneDigits = receiverPhone.replace(/\D/g, "");
    const whatsappUrl = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(whatsappMessage)}`;
    let whatsappOpened = false;
    if (whatsappWindow && !whatsappWindow.closed) {
      whatsappWindow.location.href = whatsappUrl;
      whatsappOpened = true;
    } else {
      whatsappOpened = Boolean(window.open(whatsappUrl, "_blank"));
    }
    const { error: emailError } = await db.functions.invoke(
      "send-shipment-email",
      { body: { shipment_id: s.id } },
    );
    e.target.reset();
    const notificationStatus = emailError
      ? ` Email could not be sent: ${emailError.message}`
      : ` Email notification queued for ${customerEmail}.`;
    const whatsappStatus = whatsappOpened
      ? " Review the WhatsApp message and tap Send."
      : " Your browser blocked the WhatsApp window; allow pop-ups and use Copy customer link.";
    C.toast(
      `Created ${s.tracking_code}.${notificationStatus}${whatsappStatus}`,
    );
    await loadShipments();
    document.querySelector('[data-tab="list"]').click();
    openShipment(s.id);
  });

  // ---- detail + add update
  async function openShipment(id) {
    openId = id;
    const s = shipments.find((x) => x.id === id);
    if (!s) return;
    const { data: ev } = await db
      .from("tracking_events")
      .select("*")
      .eq("shipment_id", id)
      .order("event_time", { ascending: false });
    const link =
      location.origin +
      location.pathname.replace(/admin\.html$/, "") +
      "track.html?code=" +
      s.tracking_code;
    const d = $("detail");
    d.hidden = false;
    d.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px"><div><small style="color:var(--muted)">Tracking number</small><div class="code" style="font:800 24px var(--display);color:var(--navy)">${esc(s.tracking_code)}</div>
        <div style="color:var(--muted)">${esc(s.origin)} → ${esc(s.destination)} · Receiver: ${esc(s.receiver_name || "—")} ${s.receiver_phone ? "· " + esc(s.receiver_phone) : ""}</div></div>
        <div style="display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap"><button class="btn btn-outline" id="copyLink" style="padding:7px 14px">Copy customer link</button><button class="btn btn-outline" id="deleteShipment" style="padding:7px 14px;color:var(--bad)">Delete shipment</button><button class="btn btn-outline" id="closeD" style="padding:7px 14px">Close</button></div></div>
      <form class="form" id="evForm" style="background:var(--bg);padding:16px;border-radius:10px">
        <h3 class="full">Add a location update</h3>
        <label>New location<input class="in" id="elocation" required placeholder="e.g. Tema Port, Ghana"></label>
        <label>Status<select class="in" id="estatus">${C.STATUSES.concat([
          "On Hold",
        ])
          .map(
            (x) => `<option ${x === s.status ? "selected" : ""}>${x}</option>`,
          )
          .join("")}</select></label>
        <label class="full">Note for the customer (optional)<input class="in" id="enote" placeholder="e.g. Arrived, waiting for customs"></label>
        <div class="full"><button class="btn btn-primary" type="submit">Save update</button></div>
      </form>
      <form class="form" id="shipmentForm" style="background:var(--bg);padding:16px;border-radius:10px">
        <h3 class="full">Edit shipment details</h3>
        <label>Sender name<input class="in" id="editSender" value="${esc(s.sender_name || "")}"></label>
        <label>Receiver name<input class="in" id="editReceiver" value="${esc(s.receiver_name || "")}" required></label>
        <label>Customer email<input class="in" id="editEmail" type="email" value="${esc(s.receiver_email || "")}"></label>
        <label>Receiver phone<input class="in" id="editPhone" type="tel" value="${esc(s.receiver_phone || "")}"></label>
        <label>Description of goods<input class="in" id="editDescription" value="${esc(s.description || "")}"></label>
        <label>From (origin)<input class="in" id="editOrigin" value="${esc(s.origin || "")}" required></label>
        <label>To (destination)<input class="in" id="editDestination" value="${esc(s.destination || "")}" required></label>
        <label>Estimated delivery<input class="in" id="editEta" type="date" value="${esc(s.eta || "")}"></label>
        <div class="full"><button class="btn btn-primary" type="submit">Save shipment details</button></div>
      </form>
      <div><h3 style="margin-bottom:12px">History</h3><ol class="timeline">${(ev || []).map((e) => `<li><div><b>${esc(e.status)}</b> · ${esc(e.location)}<br>${e.note ? esc(e.note) + "<br>" : ""}<small>${C.fdate(e.event_time, true)}</small> <button class="btn" data-del="${e.id}" style="padding:2px 8px;font-size:12px;color:var(--bad)">Delete</button></div></li>`).join("") || "<li><div>No updates yet.</div></li>"}</ol></div>`;
    d.scrollIntoView({ behavior: "smooth", block: "start" });
    $("closeD").onclick = () => (d.hidden = true);
    $("copyLink").onclick = async () => {
      try {
        await navigator.clipboard.writeText(link);
        C.toast("Link copied");
      } catch (x) {
        prompt("Copy this link", link);
      }
    };
    $("deleteShipment").onclick = async () => {
      if (
        !confirm(
          `Delete shipment ${s.tracking_code} and all its tracking updates? This cannot be undone.`,
        )
      )
        return;
      const { data, error } = await db
        .from("shipments")
        .delete()
        .eq("id", id)
        .select("id")
        .maybeSingle();
      if (error) return C.toast("Could not delete shipment: " + error.message);
      if (!data)
        return C.toast(
          "Shipment was not deleted. Check that your account has admin permission.",
        );
      d.hidden = true;
      await loadShipments();
      C.toast(`Deleted ${s.tracking_code}`);
    };
    $("shipmentForm").onsubmit = async (e) => {
      e.preventDefault();
      const { data, error } = await db
        .from("shipments")
        .update({
          sender_name: $("editSender").value.trim() || null,
          receiver_name: $("editReceiver").value.trim(),
          receiver_email: $("editEmail").value.trim(),
          receiver_phone: $("editPhone").value.trim() || null,
          description: $("editDescription").value.trim() || null,
          origin: $("editOrigin").value.trim(),
          destination: $("editDestination").value.trim(),
          eta: $("editEta").value || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("id")
        .maybeSingle();
      if (error) return C.toast("Could not update shipment: " + error.message);
      if (!data)
        return C.toast(
          "Shipment was not updated. Check that your account has admin permission.",
        );
      C.toast("Shipment details saved");
      await loadShipments();
      openShipment(id);
    };
    $("evForm").onsubmit = async (e) => {
      e.preventDefault();
      const { error } = await db
        .from("tracking_events")
        .insert({
          shipment_id: id,
          location: $("elocation").value.trim(),
          status: $("estatus").value,
          note: $("enote").value.trim() || null,
        });
      if (error) return C.toast("Could not save: " + error.message);
      C.toast("Update saved");
      await loadShipments();
      openShipment(id);
    };
    d.querySelectorAll("[data-del]").forEach(
      (b) =>
        (b.onclick = async () => {
          if (b.dataset.sure !== "1") {
            b.dataset.sure = "1";
            b.textContent = "Click again to delete";
            return;
          }
          await db.from("tracking_events").delete().eq("id", b.dataset.del);
          openShipment(id);
        }),
    );
  }

  // ---- quote requests
  let messages = [],
    mfilter = "all",
    readSupported = true,
    lastId = 0;
  const baseTitle = document.title;

  function setUnread(n) {
    const badge = $("unreadCount");
    badge.textContent = n > 99 ? "99+" : n;
    badge.hidden = !n;
    document.title = n ? `(${n}) ${baseTitle}` : baseTitle;
  }

  async function refreshUnread() {
    const { count, error } = await db
      .from("contact_messages")
      .select("id", { count: "exact", head: true })
      .eq("is_read", false);
    if (error) {
      // The notifications SQL (README) has not been run yet
      readSupported = false;
      $("markAll").hidden = true;
      return;
    }
    setUnread(count || 0);
  }

  async function loadMessages() {
    const { data, error } = await db
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      $("mrows").innerHTML = `<tr><td colspan="6"><div class="msg bad">${esc(error.message)}</div></td></tr>`;
      return;
    }
    messages = data;
    if (data.length) lastId = Math.max(lastId, ...data.map((m) => Number(m.id)));
    drawMessages();
  }

  function drawMessages() {
    const list = messages.filter((m) => mfilter === "all" || m.is_read === false);
    $("mrows").innerHTML = list.length
      ? list
          .map((m) => {
            const unread = m.is_read === false;
            const subject = encodeURIComponent(
              `Your quote request${m.origin ? ` – ${m.origin} to ${m.destination || ""}` : ""}`,
            );
            return `<tr class="${unread ? "unread" : ""}" data-id="${m.id}">
              <td>${unread ? '<span class="pill-new">New</span><br>' : ""}${C.fdate(m.created_at, true)}</td>
              <td>${unread ? `<b>${esc(m.name)}</b>` : esc(m.name)}</td>
              <td><a href="mailto:${esc(m.email)}">${esc(m.email)}</a><br>${esc(m.phone || "")}</td>
              <td>${esc(m.service || "")}<br>${esc(m.origin || "")} → ${esc(m.destination || "")}</td>
              <td style="white-space:pre-wrap;max-width:380px">${esc(m.message)}</td>
              <td><div class="row-actions">
                <a class="btn btn-primary btn-sm" data-reply="${m.id}" href="mailto:${esc(m.email)}?subject=${subject}">Reply</a>
                ${readSupported ? `<button class="btn btn-outline btn-sm" type="button" data-read="${m.id}" data-to="${unread}">${unread ? "Mark read" : "Mark unread"}</button>` : ""}
                <button class="btn btn-sm btn-danger" type="button" data-mdel="${m.id}">Delete</button>
              </div></td></tr>`;
          })
          .join("")
      : `<tr><td colspan="6" style="color:var(--muted)">${mfilter === "unread" ? "No unread requests." : "No requests yet."}</td></tr>`;
  }

  async function setRead(ids, value) {
    if (!readSupported || !ids.length) return;
    const { error } = await db.from("contact_messages").update({ is_read: value }).in("id", ids);
    if (error) return C.toast("Could not update: " + error.message);
    messages.forEach((m) => {
      if (ids.includes(m.id)) m.is_read = value;
    });
    drawMessages();
    refreshUnread();
  }

  async function deleteMessage(b) {
    // First click asks for confirmation, second click deletes
    if (b.dataset.confirm !== "1") {
      b.dataset.confirm = "1";
      b.textContent = "Click again to delete";
      setTimeout(() => {
        if (b.isConnected) {
          b.dataset.confirm = "";
          b.textContent = "Delete";
        }
      }, 4000);
      return;
    }
    const id = Number(b.dataset.mdel);
    b.disabled = true;
    const { error } = await db.from("contact_messages").delete().eq("id", id);
    if (error) {
      b.disabled = false;
      return C.toast("Could not delete: " + error.message);
    }
    messages = messages.filter((m) => m.id !== id);
    drawMessages();
    refreshUnread();
    C.toast("Quote request deleted");
  }

  $("mrows").addEventListener("click", (e) => {
    const del = e.target.closest("[data-mdel]");
    if (del) return deleteMessage(del);
    const r = e.target.closest("[data-read]");
    if (r) return setRead([Number(r.dataset.read)], r.dataset.to === "true");
    const rep = e.target.closest("[data-reply]");
    if (rep) {
      const m = messages.find((x) => x.id === Number(rep.dataset.reply));
      if (m && m.is_read === false) setRead([m.id], true);
    }
  });
  $("markAll").addEventListener("click", () =>
    setRead(messages.filter((m) => m.is_read === false).map((m) => m.id), true),
  );
  document.querySelectorAll("[data-mfilter]").forEach((b) =>
    b.addEventListener("click", () => {
      mfilter = b.dataset.mfilter;
      document
        .querySelectorAll("[data-mfilter]")
        .forEach((x) => x.setAttribute("aria-pressed", x === b));
      drawMessages();
    }),
  );

  // ---- alerts for new requests (live, with a once-a-minute check as backup)
  const canNotify = "Notification" in window;
  function drawAlertsBtn() {
    const b = $("alertsBtn");
    if (!canNotify) return (b.hidden = true);
    if (Notification.permission === "granted") {
      b.textContent = "🔔 Desktop alerts on";
      b.disabled = true;
    } else if (Notification.permission === "denied") {
      b.textContent = "🔕 Alerts blocked in browser settings";
      b.disabled = true;
    }
  }
  $("alertsBtn").addEventListener("click", async () => {
    if (canNotify) await Notification.requestPermission();
    drawAlertsBtn();
    beep();
  });

  let audio;
  function beep() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.18].forEach((t) => {
        const o = audio.createOscillator(),
          g = audio.createGain();
        o.frequency.value = 880;
        g.gain.setValueAtTime(0.0001, audio.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.25, audio.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + t + 0.15);
        o.connect(g).connect(audio.destination);
        o.start(audio.currentTime + t);
        o.stop(audio.currentTime + t + 0.16);
      });
    } catch {}
  }

  const seen = new Set();
  function announce(m) {
    if (!m || seen.has(m.id)) return;
    seen.add(m.id);
    lastId = Math.max(lastId, Number(m.id));
    const text = `${m.name || "Someone"} – ${m.service || "quote"}${m.origin ? `, ${m.origin} → ${m.destination || ""}` : ""}`;
    C.toast("New quote request: " + text);
    beep();
    if (canNotify && Notification.permission === "granted") {
      const n = new Notification("New quote request", { body: text, icon: "favicon.png", tag: "req-" + m.id });
      n.onclick = () => {
        window.focus();
        document.querySelector('[data-tab="msgs"]').click();
        n.close();
      };
    }
    if (!document.querySelector('[data-pane="msgs"]').hidden) loadMessages();
    refreshUnread();
  }

  async function poll() {
    const { data } = await db
      .from("contact_messages")
      .select("*")
      .gt("id", lastId)
      .order("id", { ascending: true })
      .limit(20);
    (data || []).forEach(announce);
  }

  async function startAlerts() {
    drawAlertsBtn();
    // remember the newest request so only later ones raise an alert
    const { data } = await db
      .from("contact_messages")
      .select("id")
      .order("id", { ascending: false })
      .limit(1);
    lastId = Math.max(lastId, data && data[0] ? Number(data[0].id) : 0);
    await refreshUnread();
    db.channel("quote-requests")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "contact_messages" }, (p) =>
        announce(p.new),
      )
      .subscribe();
    setInterval(poll, 60000);
  }

  start();
})();
