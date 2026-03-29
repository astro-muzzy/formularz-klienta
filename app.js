(function () {
  const $ = function (sel) {
    return document.querySelector(sel);
  };

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

    var firstField = printArea.querySelector(".step-" + step + " input, .step-" + step + " select");
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

  function pdfSafe(value) {
    var text = String(value == null ? "" : value).trim();
    if (!text) {
      return '<span class="pdf-field-value empty">—</span>';
    }
    return '<span class="pdf-field-value">' + escapeHtml(text) + '</span>';
  }

  function pdfField(label, value) {
    return (
      '<div class="pdf-field">' +
        '<span class="pdf-field-label">' + escapeHtml(label) + '</span>' +
        pdfSafe(value) +
      '</div>'
    );
  }

  function pdfDebtCard(debt, index) {
    return (
      '<div class="pdf-debt-card">' +
        '<h4 class="pdf-debt-title">Zobowiązanie ' + (index + 1) + '</h4>' +
        '<div class="pdf-grid-2">' +
          pdfField("Rodzaj zobowiązania", debt.type) +
          pdfField("Zobowiązanie", debt.obligation) +
          pdfField("Czyje zobowiązanie", debt.owner) +
          pdfField("Jaki bank", debt.bank) +
          pdfField("Kwota początkowa", debt.amountStart) +
          pdfField("Kwota aktualna", debt.amountNow) +
          pdfField("Wysokość raty", debt.installment) +
          pdfField("Nr umowy", debt.contractNo) +
          pdfField("Data podpisania umowy", debt.dateStart) +
          pdfField("Data zakończenia", debt.dateEnd) +
          pdfField("Czy zostanie spłacone", debt.willBePaid) +
        '</div>' +
      '</div>'
    );
  }

  function buildPdfDocument() {
    var debtsHtml = "";

    if (!state.debts || state.debts.length === 0) {
      debtsHtml =
        '<div class="pdf-debt-card">' +
          '<h4 class="pdf-debt-title">Brak zobowiązań</h4>' +
          '<div class="pdf-grid-1">' +
            pdfField("Informacja", "Klient nie posiada zobowiązań lub sekcja nie została uzupełniona.") +
          '</div>' +
        '</div>';
    } else {
      debtsHtml = state.debts.map(function (debt, index) {
        return pdfDebtCard(debt, index);
      }).join("");
    }

    return (
      '<div class="pdf-document">' +

        '<section class="pdf-page">' +
          '<header class="pdf-header">' +
            '<div class="pdf-header-top">Formularz operacyjny klienta</div>' +
            '<div class="pdf-header-grid">' +
              '<div>' +
                '<h1 class="pdf-title">Formularz klienta</h1>' +
                '<p class="pdf-subtitle">Dane osobowe i zobowiązania finansowe w uporządkowanym, eleganckim układzie dokumentowym. Wersja PDF przeznaczona do wydruku, podpisu i archiwizacji.</p>' +
              '</div>' +
              '<div class="pdf-meta">' +
                '<div class="pdf-meta-row">' +
                  '<span class="pdf-meta-label">Data</span>' +
                  '<span class="pdf-meta-value">' + escapeHtml(formatDate(new Date())) + '</span>' +
                '</div>' +
                '<div class="pdf-meta-row">' +
                  '<span class="pdf-meta-label">Wersja</span>' +
                  '<span class="pdf-meta-value">2.0</span>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</header>' +

          '<section class="pdf-section">' +
            '<div class="pdf-section-header">' +
              '<div>' +
                '<div class="pdf-section-kicker">Sekcja 1</div>' +
                '<h2 class="pdf-section-title">Dane osobowe</h2>' +
              '</div>' +
              '<div class="pdf-section-note">Podstawowe dane identyfikacyjne klienta.</div>' +
            '</div>' +
            '<div class="pdf-card">' +
              '<div class="pdf-grid-2">' +
                pdfField("Imię i nazwisko", getValue("fullName")) +
                pdfField("Nazwisko panieńskie", getValue("maidenName")) +
                pdfField("Obywatelstwo", getValue("citizenship")) +
                pdfField("PESEL", getValue("pesel")) +
                pdfField("Data urodzenia", getValue("birthDate")) +
                pdfField("Miejsce urodzenia", getValue("birthPlace")) +
                pdfField("Imiona rodziców", getValue("parentsNames")) +
                pdfField("Nazwisko panieńskie mamy", getValue("mothersMaidenName")) +
                pdfField("Dowód osobisty — seria i numer", getValue("idCardNumber")) +
                pdfField("Dowód — data wydania", getValue("idCardIssueDate")) +
                pdfField("Dowód — data ważności", getValue("idCardValidUntil")) +
              '</div>' +
            '</div>' +
          '</section>' +

          '<section class="pdf-section">' +
            '<div class="pdf-section-header">' +
              '<div>' +
                '<div class="pdf-section-kicker">Sekcja 2</div>' +
                '<h2 class="pdf-section-title">Stan cywilny</h2>' +
              '</div>' +
              '<div class="pdf-section-note">Informacje potrzebne do oceny sytuacji majątkowej.</div>' +
            '</div>' +
            '<div class="pdf-card">' +
              '<div class="pdf-grid-2">' +
                pdfField("Stan cywilny", getValue("civilStatus")) +
                pdfField("Rozdzielność majątkowa", getValue("propertySeparation")) +
              '</div>' +
            '</div>' +
          '</section>' +

          '<section class="pdf-section">' +
            '<div class="pdf-section-header">' +
              '<div>' +
                '<div class="pdf-section-kicker">Sekcja 3</div>' +
                '<h2 class="pdf-section-title">Adresy i kontakt</h2>' +
              '</div>' +
              '<div class="pdf-section-note">Dane kontaktowe i adresowe klienta.</div>' +
            '</div>' +
            '<div class="pdf-card">' +
              '<div class="pdf-grid-2">' +
                pdfField("Adres zamieszkania + od kiedy", getValue("addressLiving")) +
                pdfField("Adres zameldowania + od kiedy", getValue("addressRegistered")) +
                pdfField("Adres korespondencyjny", getValue("addressMailing")) +
                pdfField("Status mieszkaniowy", getValue("housingStatus")) +
                pdfField("Telefon komórkowy", getValue("phone")) +
                pdfField("Adres e-mail", getValue("email")) +
              '</div>' +
            '</div>' +
          '</section>' +

          '<div class="pdf-footer">Strona 1/2 • Dane klienta</div>' +
        '</section>' +

        '<section class="pdf-page">' +
          '<section class="pdf-section">' +
            '<div class="pdf-section-header">' +
              '<div>' +
                '<div class="pdf-section-kicker">Sekcja 4</div>' +
                '<h2 class="pdf-section-title">Wykształcenie i praca</h2>' +
              '</div>' +
              '<div class="pdf-section-note">Źródło dochodu i aktualna sytuacja zawodowa.</div>' +
            '</div>' +
            '<div class="pdf-card">' +
              '<div class="pdf-grid-2">' +
                pdfField("Wykształcenie", getValue("education")) +
                pdfField("Jaki zawód wykonujesz", getValue("jobTitle")) +
                pdfField("Branża", getValue("industry")) +
                pdfField("Całkowity staż pracy", getValue("workTenure")) +
                pdfField("NIP (jeśli prowadzisz działalność)", getValue("nip")) +
                pdfField("Źródło dochodów", getValue("incomeSource")) +
                pdfField("Rodzaj umowy o pracę", getValue("employmentType")) +
                pdfField("Data podpisania pierwszej umowy", getValue("firstContractDate")) +
              '</div>' +
              '<div class="pdf-grid-1" style="margin-top:3.5mm;">' +
                pdfField("Dane pracodawcy (nazwa, adres, tel, ilość osób)", getValue("employerDetails")) +
              '</div>' +
            '</div>' +
          '</section>' +

          '<section class="pdf-section">' +
            '<div class="pdf-section-header">' +
              '<div>' +
                '<div class="pdf-section-kicker">Sekcja 5</div>' +
                '<h2 class="pdf-section-title">Bank i informacje dodatkowe</h2>' +
              '</div>' +
              '<div class="pdf-section-note">Informacje uzupełniające do procesu finansowego.</div>' +
            '</div>' +
            '<div class="pdf-card">' +
              '<div class="pdf-grid-2">' +
                pdfField("Rachunek osobisty (numer konta, nazwa banku)", getValue("bankAccount")) +
                pdfField("Kredyty — ilość", getValue("creditsCount")) +
                pdfField("Brak zobowiązań", getValue("noCredits")) +
                pdfField("Numer telefonu do osoby sprzedającej", getValue("sellerPhone")) +
              '</div>' +
            '</div>' +
          '</section>' +

          '<section class="pdf-section">' +
            '<div class="pdf-section-header">' +
              '<div>' +
                '<div class="pdf-section-kicker">Sekcja 6</div>' +
                '<h2 class="pdf-section-title">Zestawienie zobowiązań</h2>' +
              '</div>' +
              '<div class="pdf-section-note">Kredyty, limity, karty, leasing i inne zobowiązania.</div>' +
            '</div>' +
            '<div class="pdf-debt-list">' +
              debtsHtml +
            '</div>' +
          '</section>' +

          '<section class="pdf-section pdf-signature">' +
            '<div class="pdf-section-header">' +
              '<div>' +
                '<div class="pdf-section-kicker">Sekcja 7</div>' +
                '<h2 class="pdf-section-title">Podpis klienta</h2>' +
              '</div>' +
              '<div class="pdf-section-note">Miejsce na podpis po wydruku dokumentu.</div>' +
            '</div>' +
            '<div class="pdf-signature-line">Czytelny podpis klienta</div>' +
          '</section>' +

          '<div class="pdf-footer">Strona 2/2 • Dane zawodowe i zobowiązania</div>' +
        '</section>' +

      '</div>'
    );
  }

  function savePdf() {
    if (typeof html2pdf === "undefined") {
      alert("Biblioteka PDF nie została załadowana.");
      return;
    }

    var host = document.createElement("div");
    host.className = "pdf-export-host";
    host.innerHTML = buildPdfDocument();

    document.body.appendChild(host);

    var pdfRoot = host.firstElementChild;

    var options = {
      margin: 0,
      filename: "formularz_klienta_" + formatDate(new Date()) + ".pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff"
      },
      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "portrait"
      },
      pagebreak: {
        mode: ["css", "legacy"]
      }
    };

    html2pdf()
      .set(options)
      .from(pdfRoot)
      .save()
      .then(function () {
        showToast("PDF został zapisany.");
      })
      .finally(function () {
        host.remove();
      });
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
