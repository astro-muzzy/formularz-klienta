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
  const btnSend = $("#btnSend");
  const btnPreview = $("#btnPreview");
  const btnClear = $("#btnClear");
  const btnAddDebt = $("#btnAddDebt");

  const debtsCards = $("#debtsCards");

  const STORAGE_KEY = "hd_form_wizard_session_v14";
  const LEGACY_KEY = "hd_form_wizard_email_v1";
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
    }, 2500);
  }

  function clampStep(n) {
    var x = Number(n);
    if (!Number.isFinite(x)) {
      return 1;
    }
    return Math.min(TOTAL_STEPS, Math.max(1, Math.trunc(x)));
  }

  function saveState() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Nie można zapisać danych w tej karcie.", error);
    }
  }

  function loadState() {
    try {
      // Migracja starszego szkicu: po przeniesieniu usuń trwałą kopię.
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) {
        raw = localStorage.getItem(LEGACY_KEY);
        if (raw) {
          sessionStorage.setItem(STORAGE_KEY, raw);
          localStorage.removeItem(LEGACY_KEY);
        }
      }
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

    if (btnSend) {
      btnSend.classList.toggle("hidden", !isLast);
    }
    if (btnPreview) {
      btnPreview.classList.toggle("hidden", !isLast);
    }

    saveState();
    window.scrollTo({ top: 0, behavior: "smooth" });
    focusFirstFieldForStep(state.step);
  }

  function bindPersonInputs() {
    if (!printArea) {
      return;
    }

    var inputs = printArea.querySelectorAll('.step-1 input[name]:not([type="radio"])');
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
  }

  function getValue(name) {
    return state.person && state.person[name] ? state.person[name] : "";
  }

  function normalizeText(value) {
    var text = String(value == null ? "" : value).trim();
    return text || "—";
  }

  function getFilledDebts() {
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

  // Te same etykiety są używane w PDF i w awaryjnym podglądzie do wydruku.
  const GROUPS = [
    { title: "Identyfikacja", fields: [
      ["Imię i nazwisko", "fullName"], ["Nazwisko panieńskie", "maidenName"],
      ["Obywatelstwo", "citizenship"], ["PESEL", "pesel"],
      ["Data urodzenia", "birthDate"], ["Miejsce urodzenia", "birthPlace"],
      ["Imiona rodziców", "parentsNames"], ["Nazwisko panieńskie mamy", "mothersMaidenName"],
      ["Dowód osobisty — seria i numer", "idCardNumber"],
      ["Dowód — data wydania", "idCardIssueDate"],
      ["Dowód — data ważności", "idCardValidUntil"]
    ]},
    { title: "Stan cywilny", fields: [
      ["Stan cywilny", "civilStatus"], ["Rozdzielność majątkowa", "propertySeparation"]
    ]},
    { title: "Adresy i kontakt", fields: [
      ["Adres zamieszkania + od kiedy", "addressLiving"],
      ["Adres zameldowania + od kiedy", "addressRegistered"],
      ["Adres korespondencyjny", "addressMailing"],
      ["Status mieszkaniowy", "housingStatus"],
      ["Telefon komórkowy", "phone"], ["Adres e-mail", "email"]
    ]},
    { title: "Wykształcenie i praca", fields: [
      ["Wykształcenie", "education"], ["Zawód", "jobTitle"],
      ["Branża", "industry"], ["Całkowity staż pracy", "workTenure"],
      ["NIP", "nip"], ["Źródło dochodów", "incomeSource"],
      ["Rodzaj umowy o pracę", "employmentType"],
      ["Data podpisania pierwszej umowy", "firstContractDate"],
      ["Dane pracodawcy", "employerDetails"]
    ]},
    { title: "Bank i informacje dodatkowe", fields: [
      ["Rachunek osobisty", "bankAccount"],
      ["Kredyty — ilość", "creditsCount"],
      ["Brak zobowiązań", "noCredits"],
      ["Telefon do osoby sprzedającej", "sellerPhone"]
    ]}
  ];

  const DEBT_FIELDS = [
    ["Rodzaj", "type"], ["Opis zobowiązania", "obligation"],
    ["Czyje zobowiązanie", "owner"], ["Bank", "bank"],
    ["Kwota początkowa", "amountStart"],
    ["Kwota aktualna", "amountNow"], ["Wysokość raty", "installment"],
    ["Nr umowy", "contractNo"],
    ["Data podpisania umowy", "dateStart"],
    ["Data zakończenia", "dateEnd"],
    ["Czy zostanie spłacone", "willBePaid"]
  ];

  function displayValue(value, key) {
    var result = String(value == null ? "" : value).trim();
    if (!result) return "";
    if (/^(birthDate|idCardIssueDate|idCardValidUntil|firstContractDate|dateStart|dateEnd)$/.test(key)
        && /^\d{4}-\d{2}-\d{2}$/.test(result)) {
      var bits = result.split("-");
      return bits[2] + "." + bits[1] + "." + bits[0];
    }
    return result;
  }

  function filledFields(definitions, data) {
    return definitions.map(function (item) {
      return { label: item[0], value: displayValue(data[item[1]], item[1]) };
    }).filter(function (item) { return item.value !== ""; });
  }

  function hasContent() {
    return GROUPS.some(function (group) {
      return filledFields(group.fields, state.person).length > 0;
    }) || getFilledDebts().length > 0;
  }

  // Pojedyncza para: etykieta i wartość. Tabela układa się w dwie kolumny na A4.
  function pdfValueCell(field) {
    if (!field) return { text: "" };
    return {
      stack: [
        { text: field.label, color: "#6b7890", fontSize: 8, margin: [0, 0, 0, 3] },
        { text: field.value, color: "#142239", fontSize: 10, lineHeight: 1.12 }
      ],
      margin: [0, 7, 12, 7]
    };
  }

  function pdfFieldsTable(fields, header) {
    var body = [];
    if (header) {
      body.push([
        { text: header, colSpan: 2, bold: true, color: "#2454bd", fontSize: 10,
          fillColor: "#f4f7fd", margin: [8, 8, 0, 8] }, {}
      ]);
    }
    for (var i = 0; i < fields.length; i += 2) {
      body.push([pdfValueCell(fields[i]), pdfValueCell(fields[i + 1])]);
    }
    return {
      table: { widths: ["*", "*"], body: body,
        headerRows: header ? 1 : 0,
        dontBreakRows: true, keepWithHeaderRows: header ? 1 : 0 },
      layout: {
        hLineWidth: function (i) { return i === 0 ? 0 : 0.5; },
        vLineWidth: function () { return 0; },
        hLineColor: function () { return "#e5ebf5"; },
        paddingLeft: function () { return 9; },
        paddingRight: function () { return 0; },
        paddingTop: function () { return 0; },
        paddingBottom: function () { return 0; }
      },
      margin: [0, 3, 0, 16]
    };
  }

  function pdfSectionTitle(title) {
    return {
      text: title, fontSize: 11.5, bold: true, color: "#152a4a",
      margin: [0, 8, 0, 5]
    };
  }

  function makePdfDefinition() {
    var items = [];
    var dateLabel = formatDate(new Date()).split("-").reverse().join(".");
    items.push({ columns: [
      { width: "*", stack: [
        { text: "FORMULARZ KLIENTA", fontSize: 9, bold: true, color: "#2454bd",
          characterSpacing: 1, margin: [0, 0, 0, 5] },
        { text: "Dane do analizy finansowej", fontSize: 17, bold: true,
          color: "#13213a", margin: [0, 0, 0, 5] },
        { text: "Dane klienta i zestawienie zobowiązań", fontSize: 9.5, color: "#708099" }
      ] },
      { width: 108, stack: [
        { text: "DATA DOKUMENTU", fontSize: 8, color: "#8190a6", alignment: "right" },
        { text: dateLabel, fontSize: 10.5, color: "#13213a", alignment: "right", margin: [0, 4, 0, 0] }
      ] }
    ], margin: [0, 0, 0, 18] });
    items.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0,
      lineWidth: 1.1, lineColor: "#2a60d4" }], margin: [0, 0, 0, 13] });

    GROUPS.forEach(function (group) {
      var fields = filledFields(group.fields, state.person);
      if (!fields.length) return;
      items.push(pdfSectionTitle(group.title));
      items.push(pdfFieldsTable(fields));
    });

    var debts = getFilledDebts();
    if (debts.length) {
      items.push(pdfSectionTitle("Zobowiązania finansowe"));
      debts.forEach(function (debt, index) {
        items.push(pdfFieldsTable(filledFields(DEBT_FIELDS, debt), "Zobowiązanie " + (index + 1)));
      });
    }

    return {
      pageSize: "A4",
      pageMargins: [40, 42, 40, 46],
      info: { title: "Formularz klienta — " + (getValue("fullName") || "dane klienta"),
        author: "Formularz klienta", subject: "Dane klienta i zobowiązania" },
      content: items,
      footer: function (currentPage, pageCount) {
        return { columns: [
          { text: "Formularz klienta • dokument wygenerowany lokalnie", color: "#8a96ab", fontSize: 8 },
          { text: "Strona " + currentPage + " / " + pageCount, alignment: "right",
            color: "#8a96ab", fontSize: 8 }
        ], margin: [40, 13, 40, 0] };
      },
      defaultStyle: { font: "Roboto", fontSize: 9.5, color: "#142239" }
    };
  }

  function pdfFileName() {
    var name = getValue("fullName") || "klient";
    var slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/ł/g, "l").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
      .slice(0, 60);
    return "formularz-" + (slug || "klient") + "-" + formatDate(new Date()) + ".pdf";
  }

  function downloadPdf() {
    if (!hasContent()) {
      showToast("Uzupełnij przynajmniej jedno pole formularza.");
      return;
    }
    // Biblioteka pdfMake pobiera plik PDF bezpośrednio, bez serwera aplikacji.
    if (window.pdfMake && window.pdfMake.createPdf && window.pdfMake.vfs) {
      try {
        window.pdfMake.createPdf(makePdfDefinition()).download(pdfFileName());
        showToast("Trwa przygotowywanie pliku PDF…");
      } catch (error) {
        console.error("Błąd tworzenia PDF:", error);
        showToast("Błąd generatora. Otwieram wersję do wydruku.");
        openPrintPreview();
      }
    } else {
      showToast("Generator PDF jest niedostępny. Użyj Drukuj → Zapisz jako PDF.");
      openPrintPreview();
    }
  }

  function previewPdf() {
    if (!hasContent()) {
      showToast("Uzupełnij przynajmniej jedno pole formularza.");
      return;
    }
    openPrintPreview();
  }

  // Awaryjny podgląd PDF nie wymaga żadnej biblioteki z Internetu.
  function printField(field) {
    return '<div class="item"><div class="label">' + escapeHtml(field.label) +
      '</div><div class="value">' + escapeHtml(field.value) + '</div></div>';
  }

  function printSection(title, fields) {
    if (!fields.length) return "";
    return '<section class="section"><h2>' + escapeHtml(title) +
      '</h2><div class="fields">' + fields.map(printField).join("") + '</div></section>';
  }

  function printDocumentHtml() {
    var sections = GROUPS.map(function (group) {
      return printSection(group.title, filledFields(group.fields, state.person));
    }).join("");
    var debts = getFilledDebts();
    if (debts.length) {
      sections += '<section class="section"><h2>Zobowiązania finansowe</h2>';
      debts.forEach(function (debt, index) {
        sections += '<div class="debt"><h3>Zobowiązanie ' + (index + 1) +
          '</h3><div class="fields">' +
          filledFields(DEBT_FIELDS, debt).map(printField).join("") + '</div></div>';
      });
      sections += '</section>';
    }
    var headerDate = formatDate(new Date()).split("-").reverse().join(".");
    return '<!doctype html><html lang="pl"><head><meta charset="utf-8">' +
      '<title>Formularz klienta — podgląd PDF</title><style>' +
      '@page{size:A4;margin:16mm 16mm 18mm}*{box-sizing:border-box}' +
      'body{font:13px/1.4 Arial,sans-serif;color:#16253f;background:#edf2fa;margin:0}' +
      '.toolbar{position:sticky;top:0;background:#101c33;padding:12px;text-align:center}' +
      '.toolbar button{border:0;border-radius:8px;background:#2563eb;color:white;' +
      'font:600 13px Arial,sans-serif;padding:10px 18px;cursor:pointer}' +
      '.sheet{background:white;max-width:794px;min-height:950px;margin:18px auto;' +
      'padding:45px 54px;box-shadow:0 6px 30px #172b4930}' +
      '.head{display:flex;justify-content:space-between;align-items:flex-start;' +
      'border-bottom:2px solid #2563eb;padding-bottom:17px;margin-bottom:22px;gap:15px}' +
      '.kicker{font-size:10px;font-weight:700;letter-spacing:1.4px;color:#2454bd}' +
      'h1{font-size:23px;line-height:1.2;margin:7px 0 5px;font-weight:650}' +
      '.sub{font-size:12px;color:#64748b}.date{text-align:right;white-space:nowrap}' +
      '.date strong{display:block;margin-top:7px;font-size:13px}' +
      '.section{break-inside:avoid-page;margin:0 0 18px}' +
      'h2{font-size:15px;margin:0 0 7px;color:#153153;font-weight:650}' +
      '.fields{display:grid;grid-template-columns:1fr 1fr;gap:0 19px}' +
      '.item{padding:8px 3px 9px;border-bottom:1px solid #e5ebf5;break-inside:avoid}' +
      '.label{font-size:10px;color:#64748b;margin-bottom:3px}' +
      '.value{font-size:12px;color:#142239;overflow-wrap:anywhere;white-space:pre-wrap}' +
      '.debt{margin-top:11px;break-inside:avoid-page}' +
      'h3{background:#f4f7fd;color:#2454bd;padding:9px 10px;margin:0;font-size:12px}' +
      '.foot{margin-top:25px;border-top:1px solid #dce6f4;padding-top:10px;' +
      'font-size:10px;color:#8793aa}' +
      '@media print{body{background:white}.toolbar{display:none}.sheet{' +
      'margin:0;padding:0;max-width:none;min-height:0;box-shadow:none}' +
      '.section{break-inside:auto}h2,h3{break-after:avoid}.debt{break-inside:avoid-page}}' +
      '</style></head><body><div class="toolbar"><button onclick="window.print()">' +
      'Drukuj / Zapisz jako PDF</button></div><main class="sheet">' +
      '<header class="head"><div><div class="kicker">FORMULARZ KLIENTA</div>' +
      '<h1>Dane do analizy finansowej</h1>' +
      '<div class="sub">Dane klienta i zestawienie zobowiązań</div></div>' +
      '<div class="date"><span class="sub">DATA DOKUMENTU</span><strong>' +
      escapeHtml(headerDate) + '</strong></div></header>' + sections +
      '<footer class="foot">Formularz klienta • dokument wygenerowany lokalnie</footer>' +
      '</main></body></html>';
  }

  function openPrintPreview() {
    var win = window.open("", "_blank");
    if (!win) {
      showToast("Zezwól przeglądarce na otwarcie okna podglądu PDF.");
      return;
    }
    win.document.open();
    win.document.write(printDocumentHtml());
    win.document.close();
    win.focus();
  }

  function clearAll() {
    if (!window.confirm("Wyczyścić wszystkie pola?")) {
      return;
    }

    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_KEY);
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

  if (btnSend) {
    btnSend.addEventListener("click", downloadPdf);
  }

  if (btnPreview) {
    btnPreview.addEventListener("click", previewPdf);
  }

  if (btnClear) {
    btnClear.addEventListener("click", clearAll);
  }

  setStep(state.step);
})();
