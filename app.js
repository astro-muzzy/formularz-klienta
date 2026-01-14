(function(){
  const $ = (sel) => document.querySelector(sel);

  const printArea = $("#printArea");
  const today = $("#today");

  const btnPrint = $("#btnPrint");
  const btnSavePdf = $("#btnSavePdf");
  const btnClear = $("#btnClear");
  const btnAddDebt = $("#btnAddDebt");

  const debtsCards = $("#debtsCards");
  const debtsTbody = $("#debtsTbody");

  const STORAGE_KEY = "hd_form_v1";

  const state = {
    person: {},
    debts: []
  };

  function pad2(n){ return String(n).padStart(2, "0"); }
  function formatDate(d){
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  }

  function setToday(){
    const d = new Date();
    today.textContent = formatDate(d);
  }

  function loadState(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return;
      const parsed = JSON.parse(raw);
      if(parsed && typeof parsed === "object"){
        state.person = parsed.person || {};
        state.debts = Array.isArray(parsed.debts) ? parsed.debts : [];
      }
    }catch(e){
      // ignore
    }
  }

  function saveState(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function bindPersonInputs(){
    const inputs = printArea.querySelectorAll("input[name]");
    inputs.forEach((inp) => {
      const name = inp.name;

      // init
      if(typeof state.person[name] === "string") inp.value = state.person[name];

      inp.addEventListener("input", () => {
        state.person[name] = inp.value;
        saveState();
      });
    });

    const radios = printArea.querySelectorAll('input[type="radio"][name]');
    radios.forEach((r) => {
      const name = r.name;
      if(state.person[name] && state.person[name] === r.value) r.checked = true;

      r.addEventListener("change", () => {
        if(r.checked){
          state.person[name] = r.value;
          saveState();
        }
      });
    });
  }

  function newDebt(){
    return {
      type: "",
      owner: "",
      bank: "",
      amountStart: "",
      amountNow: "",
      installment: "",
      dateStart: "",
      dateEnd: "",
      willBePaid: ""
    };
  }

  function debtCard(debt, idx){
    const el = document.createElement("div");
    el.className = "card";
    el.innerHTML = `
      <div class="card-grid">
        <label><span>Rodzaj</span><input data-k="type" value="${escapeHtml(debt.type)}"></label>
        <label><span>Czyje</span><input data-k="owner" value="${escapeHtml(debt.owner)}"></label>
        <label><span>Bank</span><input data-k="bank" value="${escapeHtml(debt.bank)}"></label>
        <label><span>Kwota początkowa</span><input data-k="amountStart" inputmode="decimal" value="${escapeHtml(debt.amountStart)}"></label>
        <label><span>Kwota aktualna</span><input data-k="amountNow" inputmode="decimal" value="${escapeHtml(debt.amountNow)}"></label>
        <label><span>Rata</span><input data-k="installment" inputmode="decimal" value="${escapeHtml(debt.installment)}"></label>
        <label><span>Data umowy</span><input data-k="dateStart" type="date" value="${escapeHtml(debt.dateStart)}"></label>
        <label><span>Koniec</span><input data-k="dateEnd" type="date" value="${escapeHtml(debt.dateEnd)}"></label>
        <label><span>Spłacone (T/N)</span>
          <select data-k="willBePaid">
            <option value="" ${debt.willBePaid===""?"selected":""}></option>
            <option value="TAK" ${debt.willBePaid==="TAK"?"selected":""}>TAK</option>
            <option value="NIE" ${debt.willBePaid==="NIE"?"selected":""}>NIE</option>
          </select>
        </label>
      </div>
      <div class="card-actions">
        <button class="btn small danger" data-remove="${idx}">Usuń</button>
      </div>
    `;

    el.querySelectorAll("input[data-k], select[data-k]").forEach((field) => {
      const key = field.getAttribute("data-k");
      field.addEventListener("input", () => {
        state.debts[idx][key] = field.value;
        saveState();
        renderDebtsTable();
      });
      field.addEventListener("change", () => {
        state.debts[idx][key] = field.value;
        saveState();
        renderDebtsTable();
      });
    });

    el.querySelector(`[data-remove="${idx}"]`).addEventListener("click", () => {
      state.debts.splice(idx, 1);
      saveState();
      renderDebts();
    });

    return el;
  }

  function renderDebts(){
    debtsCards.innerHTML = "";
    state.debts.forEach((d, idx) => debtsCards.appendChild(debtCard(d, idx)));
    renderDebtsTable();
  }

  function renderDebtsTable(){
    debtsTbody.innerHTML = "";
    state.debts.forEach((d) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(d.type)}</td>
        <td>${escapeHtml(d.owner)}</td>
        <td>${escapeHtml(d.bank)}</td>
        <td>${escapeHtml(d.amountStart)}</td>
        <td>${escapeHtml(d.amountNow)}</td>
        <td>${escapeHtml(d.installment)}</td>
        <td>${escapeHtml(d.dateStart)}</td>
        <td>${escapeHtml(d.dateEnd)}</td>
        <td>${escapeHtml(d.willBePaid)}</td>
      `;
      debtsTbody.appendChild(tr);
    });
  }

  function escapeHtml(s){
    return String(s ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function savePdf(){
    // Na czas renderowania PDF ukryjemy topbar (i tak jest no-print)
    const opt = {
      margin:       6,
      filename:     `formularz_klienta_${formatDate(new Date())}.pdf`,
      image:        { type: "jpeg", quality: 0.95 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak:    { mode: ["css", "legacy"] }
    };

    // Wymuś „drukowy” układ podczas generowania PDF
    document.body.classList.add("force-print");
    return html2pdf().set(opt).from(printArea).save().finally(() => {
      document.body.classList.remove("force-print");
    });
  }

  function clearAll(){
    if(!confirm("Wyczyścić wszystkie pola?")) return;
    localStorage.removeItem(STORAGE_KEY);
    state.person = {};
    state.debts = [];
    location.reload();
  }

  // INIT
  setToday();
  loadState();

  if(state.debts.length === 0){
    state.debts.push(newDebt());
  }

  bindPersonInputs();
  renderDebts();

  btnAddDebt.addEventListener("click", () => {
    state.debts.push(newDebt());
    saveState();
    renderDebts();
  });

  btnPrint.addEventListener("click", () => window.print());
  btnSavePdf.addEventListener("click", savePdf);
  btnClear.addEventListener("click", clearAll);
})();
