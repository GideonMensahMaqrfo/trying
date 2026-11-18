/* Help centre: live search through the questions */
(function () {
  const input = document.getElementById("faqSearch");
  const groups = [...document.querySelectorAll(".faq-group")];
  const empty = document.getElementById("faqEmpty");
  input.addEventListener("input", () => {
    const words = input.value.toLowerCase().split(/\s+/).filter(Boolean);
    let shown = 0;
    groups.forEach((g) => {
      let any = 0;
      g.querySelectorAll("details").forEach((d) => {
        const hit = words.every((w) => d.textContent.toLowerCase().includes(w));
        d.hidden = !hit;
        d.open = words.length > 0 && hit;
        if (hit) any++;
      });
      g.hidden = !any;
      shown += any;
    });
    empty.hidden = shown > 0;
  });
  // Open a question linked with #hash
  if (location.hash) {
    const t = document.querySelector(location.hash + " details");
    if (t) t.open = true;
  }
})();
