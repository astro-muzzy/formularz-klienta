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
  const btnClear = $("#btnClear");
  const btnAddDebt = $("#btnAddDebt");

  const debtsCards = $("#debtsCards");

  const STORAGE_KEY = "hd_form_wizard_email_v1";
  const TOTAL_STEPS = 2;

  const HANIA_EMAIL = "hania@twojadomena.pl";

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

    if (btnSend) {
      btnSend.classList.toggle("hidden", !isLast);
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

  function buildEmailBody() {
    var lines = [];
    var debts = getFilledDebts();

    function addField(label, value) {
      lines.push(label + ": " + normalizeText(value));
    }

    lines.push("NOWY FORMULARZ KLIENTA");
    lines.push("Data: " + formatDate(new Date()));
    lines.push("");

    lines.push("DANE OSOBOWE");
    addField("Imię i nazwisko", getValue("fullName"));
    addField("Nazwisko panieńskie", getValue("maidenName"));
    addField("Obywatelstwo", getValue("citizenship"));
    addField("PESEL", getValue("pesel"));
    addField("Data urodzenia", getValue("birthDate"));
    addField("Miejsce urodzenia", getValue("birthPlace"));
    addField("Imiona rodziców", getValue("parentsNames"));
    addField("Nazwisko panieńskie mamy", getValue("mothersMaidenName"));
    addField("Dowód osobisty — seria i numer", getValue("idCardNumber"));
    addField("Dowód — data wydania", getValue("idCardIssueDate"));
    addField("Dowód — data ważności", getValue("idCardValidUntil"));
    lines.push("");

    lines.push("STAN CYWILNY");
    addField("Stan cywilny", getValue("civilStatus"));
    addField("Rozdzielność majątkowa", getValue("propertySeparation"));
    lines.push("");

    lines.push("ADRESY I KONTAKT");
    addField("Adres zamieszkania + od kiedy", getValue("addressLiving"));
    addField("Adres zameldowania + od kiedy", getValue("addressRegistered"));
    addField("Adres korespondencyjny", getValue("addressMailing"));
    addField("Status mieszkaniowy", getValue("housingStatus"));
    addField("Telefon komórkowy", getValue("phone"));
    addField("Adres e-mail", getValue("email"));
    lines.push("");

    lines.push("WYKSZTAŁCENIE I PRACA");
    addField("Wykształcenie", getValue("education"));
    addField("Jaki zawód wykonujesz", getValue("jobTitle"));
    addField("Branża", getValue("industry"));
    addField("Całkowity staż pracy", getValue("workTenure"));
    addField("NIP", getValue("nip"));
    addField("Źródło dochodów", getValue("incomeSource"));
    addField("Rodzaj umowy o pracę", getValue("employmentType"));
    addField("Data podpisania pierwszej umowy", getValue("firstContractDate"));
    addField("Dane pracodawcy", getValue("employerDetails"));
    lines.push("");

    lines.push("BANK I INFORMACJE DODATKOWE");
    addField("Rachunek osobisty", getValue("bankAccount"));
    addField("Kredyty — ilość", getValue("creditsCount"));
    addField("Brak zobowiązań", getValue("noCredits"));
    addField("Numer telefonu do osoby sprzedającej", getValue("sellerPhone"));
    lines.push("");

    lines.push("ZOBOWIĄZANIA");

    if (!debts.length) {
      lines.push("Brak zobowiązań.");
    } else {
      debts.forEach(function (debt, index) {
        lines.push("");
        lines.push("Zobowiązanie " + (index + 1));
        lines.push("------------------------------");
        lines.push("Rodzaj: " + normalizeText(debt.type));
        lines.push("Zobowiązanie: " + normalizeText(debt.obligation));
        lines.push("Czyje zobowiązanie: " + normalizeText(debt.owner));
        lines.push("Jaki bank: " + normalizeText(debt.bank));
        lines.push("Kwota początkowa: " + normalizeText(debt.amountStart));
        lines.push("Kwota aktualna: " + normalizeText(debt.amountNow));
        lines.push("Wysokość raty: " + normalizeText(debt.installment));
        lines.push("Data podpisania umowy: " + normalizeText(debt.dateStart));
        lines.push("Data zakończenia: " + normalizeText(debt.dateEnd));
        lines.push("Nr umowy: " + normalizeText(debt.contractNo));
        lines.push("Czy zostanie spłacone: " + normalizeText(debt.willBePaid));
      });
    }

    return lines.join("\n");
  }

  function sendForm() {
    var clientName = normalizeText(getValue("fullName"));
    var subject = "Nowy formularz klienta - " + clientName;
    var body = buildEmailBody();

    var mailtoUrl =
      "mailto:" + encodeURIComponent(HANIA_EMAIL) +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body);

    window.location.href = mailtoUrl;
    showToast("Otwieram wiadomość e-mail.");
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

  if (btnSend) {
    btnSend.addEventListener("click", sendForm);
  }

  if (btnClear) {
    btnClear.addEventListener("click", clearAll);
  }

  setStep(state.step);
})();
