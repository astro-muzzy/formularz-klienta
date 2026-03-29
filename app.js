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

  function savePdf() {
    if (typeof html2pdf === "undefined" || !printArea) {
      alert("Biblioteka PDF nie została załadowana.");
      return;
    }

    var options = {
      margin: 6,
      filename: "formularz_klienta_" + formatDate(new Date()) + ".pdf",
      image: { type: "jpeg", quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"] }
    };

    document.body.classList.add("force-print");

    html2pdf()
      .set(options)
      .from(printArea)
      .save()
      .then(function () {
        showToast("PDF został zapisany.");
      })
      .finally(function () {
        document.body.classList.remove("force-print");
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
