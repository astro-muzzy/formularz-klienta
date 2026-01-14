(function(){
  const $ = (sel) => document.querySelector(sel);

  const printArea = $("#printArea");
  const today = $("#today");

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

  const STORAGE_KEY = "hd_form_wizard_v1";
  const TOTAL_STEPS = 2;

  const state = {
    step: 1,
    person: {},
    debts: []
  };

  function pad2(n){ return String(n).padStart(2, "0"); }
  function formatDate(d){
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  }

  function setToday(){
    today.textContent = formatDate(new Date());
  }

  function escapeHtml(s){
    return String(s ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function loadState(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return;
      const parsed = JSON.parse(raw);
      if(parsed && typeof parsed === "object"){
        state.step = clampStep(parsed.step || 1);
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

  function clampStep(n){
    const x = Number(n);
    if(!Number.isFinite(x)) return 1;
    return Math.min(TOTAL_STEPS, Math.max(1, Math.trunc(x)));
  }

  function setStep(n){
    state.step = clampStep(n);
    document.body.setAttribute("data-step", String(state.step));
    stepNum.textContent = String(state.step);

    pill1.classList.toggle("active", state.step === 1);
    pill2.classList.toggle("active", state.step === 2);

    btnBack.disabled = state.step === 1;

    // Na kroku 2 pokazujemy akcje końcowe
    const last = state.step === TOTAL_STEPS;
    btnNext.classList.toggle("hidden", last);
    btnSavePdf.classList.toggle("hidden", !last);
    btnPrint.classList.toggle("hidden", !last);

    saveState();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function bindPersonInputs(){
    const inputs = printArea.querySelectorAll('.step-1 input[name]');
    inputs.forEach((inp) => {
      const name = inp.name;

      // init
      if(typeof state.person[name] === "string"){
        inp.value = state.person[name];
      }

      inp.addEventListener("input", () => {
        state.person[name] = inp.value;
        saveState();
      });
      inp.addEventListener("change", () => {
        state.person[name] = inp.value;
        saveState();
      });
    });

    const radios = printArea.querySelectorAll('.step-1 input[type="radio"][name]');
    radios.forEach((r) => {
      const name = r.name;
      if(state.person[name] && state.person[name] === r.value){
        r.checked = true;
      }
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

  function debtCard(debt, idx){
    const el = document.createElement("div");
    el.className = "card";
    el.innerHTML = `
      <div class="card-grid">
        <label><span>Rodzaj</span><input data-k="type" value="${escapeHtml(debt.type)}"></label>
        <label><span>Zobowiązanie</span><input data-k="obligation" value="${escapeHtml(debt.obligation)}"></label>

        <label><span>Czyje zobowiązanie</span><input data-k="owner" value="${escapeHtml(debt.owner)}"></label>
        <label><span>Jaki bank</span><input data-k="bank" value="${escapeHtml(debt.bank)}"></label>

        <label><span>Kwota początkowa</span><input data-k="amountStart" inputmode="decimal" value="${escapeHtml(debt.amountStart)}"></label>
        <label><span>Kwota aktualna</span><input data-k="amountNow" inputmode="decimal" value="${escapeHtml(debt.amountNow)}"></label>

        <label><span>Wysokość raty</span><input data-k="installment" inputmode="decimal" value="${escapeHtml(debt.installment)}"></label>
        <label><span>Nr umowy</span><input data-k="contractNo" value="${escapeHtml(debt.contractNo)}"></label>

        <label><span>Data podpisania umowy</span><input data-k="dateStart" type="date" value="${escapeHtml(debt.dateStart)}"></label>
        <label><span>Data zakończenia</span><input data-k="dateEnd" type="date" value="${escapeHtml(debt.dateEnd)}"></label>

        <label><span>Czy zostanie spłacone (T/N)</span>
          <select data-k="willBePaid">
            <option value="" ${debt.willBePaid===""?"selected":""}></option>
            <option value="TAK" ${debt.willBePaid==="TAK"?"selected":""}>TAK</option>
            <option value="NIE" ${debt.willBePaid==="NIE"?"selected":""}>NIE</option>
          </select>
        </label>
      </div>
      <div class="card-actions">
        <button class="btn small danger" data-remove="${idx}" type="button">Usuń</button>
      </div>
    `;

    el.querySelectorAll("input[data-k], select[data-k]").forEach((field) => {
      const key = field.getAttribute("data-k");
      const handler = () => {
        state.debts[idx][key] = field.value;
        saveState();
        renderDebtsTable();
      };
      field.addEventListener("input", handler);
      field.addEventListener("change", handler);
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
        <td>${escapeHtml(d.obligation)}</td>
        <td>${escapeHtml(d.owner)}</td>
        <td>${escapeHtml(d.bank)}</td>
        <td>${escapeHtml(d.amountStart)}</td>
        <td>${escapeHtml(d.amountNow)}</td>
        <td>${escapeHtml(d.installment)}</td>
        <td>${escapeHtml(d.dateStart)}</td>
        <td>${escapeHtml(d.dateEnd)}</td>
        <td>${escapeHtml(d.contractNo)}</td>
        <td>${escapeHtml(d.willBePaid)}</td>
      `;
      debtsTbody.appendChild(tr);
    });
  }

  function savePdf(){
    const opt = {
      margin:       6,
      filename:     `formularz_klienta_${formatDate(new Date())}.pdf`,
      image:        { type: "jpeg", quality: 0.95 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak:    { mode: ["css", "legacy"] }
    };

    document.body.classList.add("force-print");
    return html2pdf().set(opt).from(printArea).save().finally(() => {
      document.body.classList.remove("force-print");
    });
  }

  function clearAll(){
    if(!confirm("Wyczyścić wszystkie pola?")) return;
    localStorage.removeItem(STORAGE_KEY);
    state.step = 1;
    state.person = {};
    state.debts = [];
    location.reload();
  }

  function goNext(){
    if(state.step < TOTAL_STEPS){
      setStep(state.step + 1);
    }
  }

  function goBack(){
    if(state.step > 1){
      setStep(state.step - 1);
    }
  }

  // INIT
  setToday();
  loadState();

  // Domyślnie 1 wiersz zobowiązania, żeby było co edytować
  if(state.debts.length === 0){
    state.debts.push(newDebt());
  }

  bindPersonInputs();
  renderDebts();

  // Stepper pills
  pill1.addEventListener("click", () => setStep(1));
  pill2.addEventListener("click", () => setStep(2));

  // Nav
  btnBack.addEventListener("click", goBack);
  btnNext.addEventListener("click", goNext);

  // Actions
  btnAddDebt.addEventListener("click", () => {
    state.debts.push(newDebt());
    saveState();
    renderDebts();
  });

  btnPrint.addEventListener("click", () => window.print());
  btnSavePdf.addEventListener("click", savePdf);
  btnClear.addEventListener("click", clearAll);

  // Apply current step
  setStep(state.step);
})();
