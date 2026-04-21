(function(){
  const KEY = 'car-sales-v1';
  const form = document.getElementById('sale-form');
  const inputDate = document.getElementById('sale-date');
  const inputModel = document.getElementById('sale-model');
  const inputPrice = document.getElementById('sale-price');
  const inputQty = document.getElementById('sale-qty');
  const inputSeller = document.getElementById('sale-seller');
  const inputBdc = document.getElementById('sale-bdc');
  const inputCaptacao = document.getElementById('sale-captacao');
  const inputPlaca = document.getElementById('sale-placa');
  const clearBtn = document.getElementById('clear-all');
  const monthInput = document.getElementById('report-month');

  const summaryCount = document.getElementById('summary-count');
  const summaryTotal = document.getElementById('summary-total');
  const summaryAvg = document.getElementById('summary-avg');
  const tableBody = document.querySelector('#sales-table tbody');

  function load(){
    try{
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    }catch(e){return []}
  }
  function save(data){ localStorage.setItem(KEY, JSON.stringify(data)); }

  // formata valores em padrão brasileiro (ex.: 185.900,00)
  function formatMoney(v){
    const n = Number(v) || 0;
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  }

  // converte entrada do usuário (aceita '185.900,00' ou '185900.00' ou '185900') para número
  function parseMoneyFromInput(raw){
    if (typeof raw === 'number') return raw;
    try{
      let s = String(raw).trim();
      if(!s) return 0;
      // remove símbolos e letras
      s = s.replace(/[^0-9,.-]/g, '');
      // se usar vírgula como decimal (pt-BR), transformar para ponto; remover pontos de milhares
      // ex: '185.900,00' -> '185900,00' -> '185900.00'
      if (s.indexOf(',') !== -1 && s.indexOf('.') !== -1) {
        s = s.replace(/\./g, '');
        s = s.replace(/,/g, '.');
      } else if (s.indexOf(',') !== -1 && s.indexOf('.') === -1) {
        s = s.replace(/,/g, '.');
      }
      const n = parseFloat(s);
      return isNaN(n) ? 0 : n;
    }catch(e){return 0}
  }

  function render(month){
    const data = load();
    const filtered = month ? data.filter(s => s.date.startsWith(month)) : data;
    tableBody.innerHTML = '';
    let totalCount = 0, revenue = 0;
    filtered.forEach((s, idx) =>{
      const tr = document.createElement('tr');
      const total = Number(s.price) * Number(s.qty);
      totalCount += Number(s.qty);
      revenue += total;
      tr.innerHTML = `<td>${s.date}</td><td>${s.model}</td><td>R$ ${formatMoney(s.price)}</td><td>${s.qty}</td><td>${s.bdc || 'Não'}</td><td>${s.captacao || 'Não'}</td><td>${s.placa || 'Não'}</td><td>${s.seller}</td><td>R$ ${formatMoney(total)}</td><td><button data-idx="${idx}" class="btn btn--muted remove">Remover</button></td>`;
      tableBody.appendChild(tr);
    });
    summaryCount.textContent = totalCount;
    summaryTotal.textContent = formatMoney(revenue);
    summaryAvg.textContent = totalCount ? formatMoney(revenue/totalCount) : '0,00';
    // attach remove handlers
    document.querySelectorAll('.remove').forEach(b=>b.addEventListener('click', e=>{
      const idx = Number(e.target.dataset.idx);
      const d = load();
      // need to remove the correct item across full dataset: if month filtered, idx refers to filtered array
      if(month){
        const filteredAll = d.filter(s=>s.date.startsWith(month));
        const item = filteredAll[idx];
        const pos = d.findIndex(x => x === item);
        if(pos>=0) d.splice(pos,1);
      } else d.splice(idx,1);
      save(d);
      render(month);
    }));
  }

  form.addEventListener('submit', e =>{
    e.preventDefault();
    const date = inputDate.value;
    const model = inputModel.value.trim();
    const price = parseMoneyFromInput(inputPrice.value);
    const qty = parseInt(inputQty.value) || 1;
    const seller = inputSeller.value.trim();
    const bdc = inputBdc.value || 'Não';
    const captacao = inputCaptacao.value || 'Não';
    const placa = inputPlaca.value || 'Não';
    if(!date||!model||!seller) return alert('Preencha data, modelo e vendedor.');
    const data = load();
    data.push({ date, model, price, qty, seller, bdc, captacao, placa });
    save(data);
    form.reset();
    render(monthInput.value);
  });

  clearBtn.addEventListener('click', ()=>{
    if(!confirm('Apagar todos os registros?')) return;
    localStorage.removeItem(KEY);
    render(monthInput.value);
  });

  monthInput.addEventListener('change', ()=> render(monthInput.value));

  // definir mês atual como padrão
  const now = new Date();
  monthInput.value = now.toISOString().slice(0,7);

  // colocar ano atual no rodapé
  document.getElementById('year').textContent = now.getFullYear();

  // tentar aplicar imagem de fundo dinâmica (se existir na pasta ../imagens)
  (function applyBackground(){
    try{
      const candidate = '../imagens/people-meeting-seminar-office-concept-1.jpg';
      fetch(candidate, { method: 'HEAD' }).then(res => {
        if(res.ok){
          document.body.style.backgroundImage = `url('${candidate}')`;
          document.body.style.backgroundSize = 'cover';
          document.body.style.backgroundPosition = 'center';
        }
      }).catch(()=>{});
    }catch(e){}
  })();

  // botão exportar CSV
  function exportCSV(month){
    const data = load();
    const filtered = month ? data.filter(s => s.date.startsWith(month)) : data;
    if(!filtered.length) return alert('Nenhum registro para exportar neste período.');
    const rows = [ ['Data','Modelo','Preço','Quantidade','Vendedor','Total'] ];
    filtered.forEach(r=> rows.push([r.date, r.model, r.price, r.qty, r.seller, (r.price*r.qty).toFixed(2)]));
    const csv = rows.map(r=> r.map(cell=> '"'+String(cell).replace(/"/g,'""')+'"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendas-${month||'todas'}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  document.getElementById('export-csv')?.addEventListener('click', ()=> exportCSV(monthInput.value));

  render(monthInput.value);

  // formatar campo price ao perder foco (format br)
  inputPrice.addEventListener('blur', (e)=>{
    try{
      const v = parseMoneyFromInput(e.target.value);
      e.target.value = formatMoney(v);
    }catch(e){}
  });

  // também formatar ao mudar (change) e ao pressionar Enter (substitui envio imediato)
  inputPrice.addEventListener('change', (e)=>{
    try{ e.target.value = formatMoney(parseMoneyFromInput(e.target.value)); }catch(e){}
  });
  inputPrice.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){
      e.preventDefault();
      try{ e.target.value = formatMoney(parseMoneyFromInput(e.target.value)); }catch(err){}
      // move focus para próximo elemento do formulário
      const formElements = Array.from(form.querySelectorAll('input, select, textarea, button'));
      const idx = formElements.indexOf(e.target);
      if(idx >= 0 && idx < formElements.length - 1) formElements[idx+1].focus();
    }
  });

  // permitir digitação com vírgula/ponto e impedir caracteres inválidos
  inputPrice.addEventListener('input', (e)=>{
    // apenas números, ponto, vírgula
    e.target.value = e.target.value.replace(/[^0-9.,]/g, '');
  });
})();
