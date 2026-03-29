(function () {
  const $ = (sel) => document.querySelector(sel);

  const printArea = $("#printArea");
  const today = $("#today");
  const toast = $("#toast");

  const stepNum = $("#stepNum");
  const pill1 = $("#pill1");
  const pill2 = $("#pill2");

  const btnBack = $("#btnBack");
  const btnNext = $("#btnNext");
  const btnSavePdf = $("#btnSavePdf");
  const btnPrint = $("#btnPrint");
  const btnClear = $("#btnClear");
  const btnAddDebt = $("#btnAddDebt");

  const debtsCards = $("#debtsCards");
  const debtsTbody = $("#debtsTbody");

  const STORAGE_KEY = "hd_form_wizard_v2_premium";
  const TOTAL_STEPS = 2;

  const state = {
    step: 1,
    person: {},
    debts: []
  };

  let toastTimer = null;

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function formatDate(d) {
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  function setToday() {
    if (today) {
      today.textContent = formatDate(new Date());
    }
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function showToast(message) {
    if (!toast) {
      return;
    }

    toast.textContent = message;
    toast.classList.add("visible");

    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("visible");
    }, 2200);
  }

  function clampStep(n) {
    var x = Number(n);
    if (!Number.isFinite(x)) {
      return 1;
    }
    return Math.min(TOTAL_STEPS, Math.max(1, Math.trunc(x)));
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }

      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        state.step = clampStep(parsed.step || 1);
        state.person = parsed.person || {};
        state.debts = Array.isArray(parsed.debts) ? parsed.debts : [];
      }
    } catch (error) {
      console.warn("Nie udało się wczytać stanu formularza.", error);
    }
  }

  function updateChipsState() {
    if (!printArea) {
      return;
    }

    printArea.querySelectorAll(".chip").forEach(function (chip) {
      var radio = chip.querySelector('input[type="radio"]');
      chip.classList.toggle("active", Boolean(radio && radio.checked));
    });
  }

  function focusFirstFieldForStep(step) {
    if (!printArea) {
      return;
    }

    var firstField = printArea.querySelector('.step-' + step + ' input, .step-' + step + ' select');
    if (firstField) {
      window.setTimeout(function () {
        try {
          firstField.focus({ preventScroll: true });
        } catch (e) {
          firstField.focus();
        }
      }, 120);
    }
  }

  function setStep(n) {
    state.step = clampStep(n);

    document.body.setAttribute("data-step", String(state.step));

    if (stepNum) {
      stepNum.textContent = String(state.step);
    }

    if (pill1) {
      pill1.classList.toggle("active", state.step === 1);
    }

    if (pill2) {
      pill2.classList.toggle("active", state.step === 2);
    }

    if (btnBack) {
      btnBack.disabled = state.step === 1;
    }

    var isLast = state.step === TOTAL_STEPS;

    if (btnNext) {
      btnNext.classList.toggle("hidden", isLast);
    }

    if (btnSavePdf) {
      btnSavePdf.classList.toggle("hidden", !isLast);
    }

    if (btnPrint) {
      btnPrint.classList.toggle("hidden", !isLast);
    }

    saveState();
    window.scrollTo({ top: 0, behavior: "smooth" });
    focusFirstFieldForStep(state.step);
  }

  function bindPersonInputs() {
    if (!printArea) {
      return;
    }

    var inputs = printArea.querySelectorAll('.step-1 input[name]');
    inputs.forEach(function (input) {
      var name = input.name;

      if (typeof state.person[name] === "string") {
        input.value = state.person[name];
      }

      var save = function () {
        state.person[name] = input.value;
        saveState();
      };

      input.addEventListener("input", save);
      input.addEventListener("change", save);
    });

    var radios = printArea.querySelectorAll('.step-1 input[type="radio"][name]');
    radios.forEach(function (radio) {
      var name = radio.name;

      if (state.person[name] && state.person[name] === radio.value) {
        radio.checked = true;
      }

      radio.addEventListener("change", function () {
        if (radio.checked) {
          state.person[name] = radio.value;
          saveState();
          updateChipsState();
        }
      });
    });

    updateChipsState();
  }

  function newDebt() {
    return {
      type: "",
      obligation: "",
      owner: "",
      bank: "",
      amountStart: "",
      amountNow: "",
      installment: "",
      dateStart: "",
      dateEnd: "",
      contractNo: "",
      willBePaid: ""
    };
  }

  function debtCard(debt, index) {
    var el = document.createElement("div");
    el.className = "card";
    el.innerHTML =
      '<div class="card-header">' +
        '<div class="card-title">Zobowiązanie ' + (index + 1) + '</div>' +
      '</div>' +
      '<div class="card-grid">' +
        '<label><span>Rodzaj</span><input data-k="type" value="' + escapeHtml(debt.type) + '" placeholder="Np. kredyt gotówkowy"></label>' +
        '<label><span>Zobowiązanie</span><input data-k="obligation" value="' + escapeHtml(debt.obligation) + '" placeholder="Opis zobowiązania"></label>' +
        '<label><span>Czyje zobowiązanie</span><input data-k="owner" value="' + escapeHtml(debt.owner) + '" placeholder="Klient / współkredytobiorca"></label>' +
        '<label><span>Jaki bank</span><input data-k="bank" value="' + escapeHtml(debt.bank) + '" placeholder="Nazwa banku"></label>' +
        '<label><span>Kwota początkowa</span><input data-k="amountStart" inputmode="decimal" value="' + escapeHtml(debt.amountStart) + '" placeholder="PLN"></label>' +
        '<label><span>Kwota aktualna</span><input data-k="amountNow" inputmode="decimal" value="' + escapeHtml(debt.amountNow) + '" placeholder="PLN"></label>' +
        '<label><span>Wysokość raty</span><input data-k="installment" inputmode="decimal" value="' + escapeHtml(debt.installment) + '" placeholder="PLN / miesiąc"></label>' +
        '<label><span>Nr umowy</span><input data-k="contractNo" value="' + escapeHtml(debt.contractNo) + '"></label>' +
        '<label><span>Data podpisania umowy</span><input data-k="dateStart" type="date" value="' + escapeHtml(debt.dateStart) + '"></label>' +
        '<label><span>Data zakończenia</span><input data-k="dateEnd" type="date" value="' + escapeHtml(debt.dateEnd) + '"></label>' +
        '<label><span>Czy zostanie spłacone</span>' +
          '<select data-k="willBePaid">' +
            '<option value="" ' + (debt.willBePaid === "" ? "selected" : "") + '></option>' +
            '<option value="TAK" ' + (debt.willBePaid === "TAK" ? "selected" : "") + '>TAK</option>' +
            '<option value="NIE" ' + (debt.willBePaid === "NIE" ? "selected" : "") + '>NIE</option>' +
          '</select>' +
        '</label>' +
      '</div>' +
      '<div class="card-actions">' +
        '<button class="btn btn-danger btn-small" data-remove="' + index + '" type="button">Usuń</button>' +
      '</div>';

    el.querySelectorAll("input[data-k], select[data-k]").forEach(function (field) {
      var key = field.getAttribute("data-k");
      var handler = function () {
        state.debts[index][key] = field.value;
        saveState();
        renderDebtsTable();
      };
      field.addEventListener("input", handler);
      field.addEventListener("change", handler);
    });

    var removeBtn = el.querySelector('[data-remove="' + index + '"]');
    if (removeBtn) {
      removeBtn.addEventListener("click", function () {
        state.debts.splice(index, 1);
        saveState();
        renderDebts();
        showToast("Usunięto zobowiązanie.");
      });
    }

    return el;
  }

  function renderDebts() {
    if (!debtsCards) {
      return;
    }

    debtsCards.innerHTML = "";
    state.debts.forEach(function (debt, index) {
      debtsCards.appendChild(debtCard(debt, index));
    });
    renderDebtsTable();
  }

  function renderDebtsTable() {
    if (!debtsTbody) {
      return;
    }

    debtsTbody.innerHTML = "";
    state.debts.forEach(function (debt) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        '<td>' + escapeHtml(debt.type) + '</td>' +
        '<td>' + escapeHtml(debt.obligation) + '</td>' +
        '<td>' + escapeHtml(debt.owner) + '</td>' +
        '<td>' + escapeHtml(debt.bank) + '</td>' +
        '<td>' + escapeHtml(debt.amountStart) + '</td>' +
        '<td>' + escapeHtml(debt.amountNow) + '</td>' +
        '<td>' + escapeHtml(debt.installment) + '</td>' +
        '<td>' + escapeHtml(debt.dateStart) + '</td>' +
        '<td>' + escapeHtml(debt.dateEnd) + '</td>' +
        '<td>' + escapeHtml(debt.contractNo) + '</td>' +
        '<td>' + escapeHtml(debt.willBePaid) + '</td>';
      debtsTbody.appendChild(tr);
    });
  }

  function getValue(name) {
    return state.person && state.person[name] ? state.person[name] : "";
  }

  function getDebtRows() {
    return (state.debts || []).filter(function (debt) {
      return [
        debt.type,
        debt.obligation,
        debt.owner,
        debt.bank,
        debt.amountStart,
        debt.amountNow,
        debt.installment,
        debt.dateStart,
        debt.dateEnd,
        debt.contractNo,
        debt.willBePaid
      ].some(function (value) {
        return String(value || "").trim() !== "";
      });
    });
  }

  function normalizePdfText(value) {
    var text = String(value == null ? "" : value).trim();
    return text || "—";
  }

  function savePdf() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert("Biblioteka PDF nie została załadowana.");
      return;
    }

    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true
    });

    var pageWidth = 210;
    var pageHeight = 297;
    var marginX = 12;
    var contentWidth = pageWidth - (marginX * 2);
    var y = 12;

    function setTextColor(hex) {
      var clean = String(hex || "000000").replace("#", "");
      if (clean.length !== 6) {
        clean = "000000";
      }
      doc.setTextColor(
        parseInt(clean.substring(0, 2), 16),
        parseInt(clean.substring(2, 4), 16),
        parseInt(clean.substring(4, 6), 16)
      );
    }

    function line(x1, y1, x2, y2, color, width) {
      doc.setDrawColor(color || 220, color || 220, color || 220);
      doc.setLineWidth(width || 0.2);
      doc.line(x1, y1, x2, y2);
    }

    function topAccent() {
      doc.setFillColor(37, 99, 235);
      doc.rect(marginX, 8, contentWidth, 0.9, "F");
    }

    function drawMetaBox(x, yy, label, value, w) {
      doc.setDrawColor(219, 228, 241);
      doc.setFillColor(248, 251, 255);
      doc.roundedRect(x, yy, w, 12, 2, 2, "FD");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      setTextColor("64748b");
      doc.text(String(label).toUpperCase(), x + 2.5, yy + 4);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      setTextColor("0f172a");
      doc.text(normalizePdfText(value), x + 2.5, yy + 8.6);
    }

    function drawFooter(pageNo) {
      line(marginX, 287, pageWidth - marginX, 287, 219, 0.2);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      setTextColor("64748b");
      var footerText = pageNo === 1
        ? "Strona 1/2 • Dane klienta"
        : "Strona 2/2 • Dane zawodowe i zobowiązania";
      doc.text(footerText, marginX, 291.5);
    }

    function drawHeader(pageNo) {
      topAccent();

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      setTextColor("2563eb");
      doc.text("FORMULARZ OPERACYJNY KLIENTA", marginX, 14);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      setTextColor("0f172a");
      doc.text("Formularz klienta", marginX, 21.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.3);
      setTextColor("475569");
      var subtitle = doc.splitTextToSize(
        "Wersja dokumentowa PDF. Układ przygotowany pod zapis i wydruk A4 bez rozsypywania stron.",
        112
      );
      doc.text(subtitle, marginX, 26.5);

      drawMetaBox(162, 17, "Data", formatDate(new Date()), 36);
      drawMetaBox(162, 31, "Wersja", "2.1", 36);

      y = 49;
      drawFooter(pageNo);
    }

    function drawSectionHeader(kicker, title, note) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      setTextColor("2563eb");
      doc.text(String(kicker).toUpperCase(), marginX, y);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      setTextColor("0f172a");
      doc.text(title, marginX, y + 4.6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.8);
      setTextColor("64748b");
      var split = doc.splitTextToSize(note, 58);
      doc.text(split, pageWidth - marginX, y + 3.8, { align: "right" });

      y += 7.5;
    }

    function drawFieldBox(x, yy, w, h, label, value) {
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 251, 255);
      doc.roundedRect(x, yy, w, h, 2.2, 2.2, "FD");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.8);
      setTextColor("64748b");
      doc.text(String(label).toUpperCase(), x + 2, yy + 3.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.3);
      setTextColor(normalizePdfText(value) === "—" ? "94a3b8" : "0f172a");
      var lines = doc.splitTextToSize(normalizePdfText(value), w - 4);
      doc.text(lines.slice(0, 2), x + 2, yy + 8);
    }

    function drawFieldGrid(items, cols) {
      var colGap = 4;
      var rowGap = 3;
      var colWidth = (contentWidth - (colGap * (cols - 1))) / cols;
      var boxHeight = 13;
      var i;

      for (i = 0; i < items.length; i += cols) {
        var row = items.slice(i, i + cols);
        row.forEach(function (item, index) {
          var boxX = marginX + (index * (colWidth + colGap));
          drawFieldBox(boxX, y, colWidth, boxHeight, item.label, item.value);
        });
        y += boxHeight + rowGap;
      }
    }

    function drawWideField(label, value) {
      drawFieldBox(marginX, y, contentWidth, 13, label, value);
      y += 16;
    }

    function drawDebtTable(debts) {
      var headers = ["Rodzaj", "Zobowiązanie", "Bank", "Kwota akt.", "Rata", "Spłata"];
      var widths = [28, 52, 30, 24, 22, 18];
      var x = marginX;
      var i;

      doc.setFillColor(238, 244, 251);
      doc.setDrawColor(216, 225, 238);
      doc.rect(marginX, y, contentWidth, 8, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      setTextColor("0f172a");

      for (i = 0; i < headers.length; i++) {
        doc.text(headers[i], x + 1.8, y + 5.2);
        x += widths[i];
      }

      y += 8;

      if (!debts.length) {
        doc.setDrawColor(216, 225, 238);
        doc.rect(marginX, y, contentWidth, 10, "S");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        setTextColor("64748b");
        doc.text("Brak zobowiązań do wykazania.", marginX + 2, y + 6);
        y += 12;
        return;
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.2);

      debts.slice(0, 8).forEach(function (debt) {
        var values = [
          normalizePdfText(debt.type),
          normalizePdfText(debt.obligation),
          normalizePdfText(debt.bank),
          normalizePdfText(debt.amountNow),
          normalizePdfText(debt.installment),
          normalizePdfText(debt.willBePaid)
        ];

        var rowHeight = 10;
        var xPos = marginX;

        doc.setDrawColor(216, 225, 238);
        doc.rect(marginX, y, contentWidth, rowHeight, "S");

        values.forEach(function (val, index) {
          var cellWidth = widths[index];
          var lines = doc.splitTextToSize(val, cellWidth - 3);
          doc.text(lines.slice(0, 2), xPos + 1.5, y + 4.2);
          xPos += cellWidth;

          if (index < values.length - 1) {
            line(xPos, y, xPos, y + rowHeight, 216, 0.2);
          }
        });

        y += rowHeight;
      });

      if (debts.length > 8) {
        y += 3;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        setTextColor("64748b");
        doc.text("W dokumencie pokazano pierwszych 8 zobowiązań. Pozostałe wymagają osobnego zestawienia.", marginX, y);
        y += 4;
      }
    }

    function drawSignature() {
      y += 6;
      drawSectionHeader("Sekcja 7", "Podpis klienta", "Miejsce na podpis po wydruku dokumentu.");
      line(marginX, y + 10, marginX + 70, y + 10, 15, 0.25);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      setTextColor("64748b");
      doc.text("Czytelny podpis klienta", marginX, y + 15);
    }

    drawHeader(1);

    drawSectionHeader("Sekcja 1", "Dane osobowe", "Podstawowe dane identyfikacyjne klienta.");
    drawFieldGrid([
      { label: "Imię i nazwisko", value: getValue("fullName") },
      { label: "Nazwisko panieńskie", value: getValue("maidenName") },
      { label: "Obywatelstwo", value: getValue("citizenship") },
      { label: "PESEL", value: getValue("pesel") },
      { label: "Data urodzenia", value: getValue("birthDate") },
      { label: "Miejsce urodzenia", value: getValue("birthPlace") },
      { label: "Imiona rodziców", value: getValue("parentsNames") },
      { label: "Nazwisko panieńskie mamy", value: getValue("mothersMaidenName") },
      { label: "Dowód osobisty — seria i numer", value: getValue("idCardNumber") },
      { label: "Dowód — data wydania", value: getValue("idCardIssueDate") },
      { label: "Dowód — data ważności", value: getValue("idCardValidUntil") }
    ], 2);

    y += 2;
    drawSectionHeader("Sekcja 2", "Stan cywilny", "Informacje potrzebne do oceny sytuacji majątkowej.");
    drawFieldGrid([
      { label: "Stan cywilny", value: getValue("civilStatus") },
      { label: "Rozdzielność majątkowa", value: getValue("propertySeparation") }
    ], 2);

    y += 2;
    drawSectionHeader("Sekcja 3", "Adresy i kontakt", "Dane kontaktowe i adresowe klienta.");
    drawFieldGrid([
      { label: "Adres zamieszkania + od kiedy", value: getValue("addressLiving") },
      { label: "Adres zameldowania + od kiedy", value: getValue("addressRegistered") },
      { label: "Adres korespondencyjny", value: getValue("addressMailing") },
      { label: "Status mieszkaniowy", value: getValue("housingStatus") },
      { label: "Telefon komórkowy", value: getValue("phone") },
      { label: "Adres e-mail", value: getValue("email") }
    ], 2);

    doc.addPage();
    drawHeader(2);

    drawSectionHeader("Sekcja 4", "Wykształcenie i praca", "Źródło dochodu i aktualna sytuacja zawodowa.");
    drawFieldGrid([
      { label: "Wykształcenie", value: getValue("education") },
      { label: "Jaki zawód wykonujesz", value: getValue("jobTitle") },
      { label: "Branża", value: getValue("industry") },
      { label: "Całkowity staż pracy", value: getValue("workTenure") },
      { label: "NIP (jeśli prowadzisz działalność)", value: getValue("nip") },
      { label: "Źródło dochodów", value: getValue("incomeSource") },
      { label: "Rodzaj umowy o pracę", value: getValue("employmentType") },
      { label: "Data podpisania pierwszej umowy", value: getValue("firstContractDate") }
    ], 2);

    drawWideField("Dane pracodawcy (nazwa, adres, tel, ilość osób)", getValue("employerDetails"));

    drawSectionHeader("Sekcja 5", "Bank i informacje dodatkowe", "Informacje uzupełniające do procesu finansowego.");
    drawFieldGrid([
      { label: "Rachunek osobisty (numer konta, nazwa banku)", value: getValue("bankAccount") },
      { label: "Kredyty — ilość", value: getValue("creditsCount") },
      { label: "Brak zobowiązań", value: getValue("noCredits") },
      { label: "Numer telefonu do osoby sprzedającej", value: getValue("sellerPhone") }
    ], 2);

    y += 2;
    drawSectionHeader("Sekcja 6", "Zestawienie zobowiązań", "Układ uproszczony dla stabilnego PDF 2-stronicowego.");
    drawDebtTable(getDebtRows());

    drawSignature();

    doc.save("formularz_klienta_" + formatDate(new Date()) + ".pdf");
    showToast("PDF został zapisany.");
  }

  function clearAll() {
    if (!window.confirm("Wyczyścić wszystkie pola?")) {
      return;
    }

    localStorage.removeItem(STORAGE_KEY);
    state.step = 1;
    state.person = {};
    state.debts = [];
    location.reload();
  }

  function goNext() {
    if (state.step < TOTAL_STEPS) {
      setStep(state.step + 1);
    }
  }

  function goBack() {
    if (state.step > 1) {
      setStep(state.step - 1);
    }
  }

  setToday();
  loadState();

  if (state.debts.length === 0) {
    state.debts.push(newDebt());
  }

  bindPersonInputs();
  renderDebts();

  if (pill1) {
    pill1.addEventListener("click", function () {
      setStep(1);
    });
  }

  if (pill2) {
    pill2.addEventListener("click", function () {
      setStep(2);
    });
  }

  if (btnBack) {
    btnBack.addEventListener("click", goBack);
  }

  if (btnNext) {
    btnNext.addEventListener("click", goNext);
  }

  if (btnAddDebt) {
    btnAddDebt.addEventListener("click", function () {
      state.debts.push(newDebt());
      saveState();
      renderDebts();
      showToast("Dodano nowe zobowiązanie.");
    });
  }

  if (btnPrint) {
    btnPrint.addEventListener("click", function () {
      window.print();
    });
  }

  if (btnSavePdf) {
    btnSavePdf.addEventListener("click", savePdf);
  }

  if (btnClear) {
    btnClear.addEventListener("click", clearAll);
  }

  setStep(state.step);
})();
