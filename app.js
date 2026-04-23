(function(){
  const KEY = 'car-sales-v1';
  const form = document.getElementById('sale-form');
  const inputDate = document.getElementById('sale-date');
  const inputBrand = document.getElementById('sale-brand');
  const inputPrice = document.getElementById('sale-price');
  const inputQty = document.getElementById('sale-qty');
  const inputSeller = document.getElementById('sale-seller');
  const inputBdc = document.getElementById('sale-bdc');
  const inputCaptacao = document.getElementById('sale-captacao');
  const inputPlaca = document.getElementById('sale-placa');
  const inputPlateSold = document.getElementById('sale-plate-sold');
  const inputPlateCaptured = document.getElementById('sale-plate-captured');
  const inputVehicle = document.getElementById('sale-vehicle');
  const inputClient = document.getElementById('sale-client');
  const inputDays = document.getElementById('sale-days');
  const inputPayment = document.getElementById('sale-payment');
  const inputFipe = document.getElementById('sale-fipe');
  const clearBtn = document.getElementById('clear-all');
  const monthInput = document.getElementById('report-month');
  const vehicleDatalist = document.getElementById('vehicle-list');

  // Inicializa formatação do campo de preço de forma simples e confiável
  function initPriceFormatting(){
    const ip = document.getElementById('sale-price');
    if(!ip){ console.warn('initPriceFormatting: campo #sale-price não encontrado'); return; }
    if(ip._priceFormattingInitialized) return;
    ip._priceFormattingInitialized = true;

    // enquanto digita: apenas limpar caracteres inválidos e preservar cursor
    ip.addEventListener('input', (e)=>{
      try{
        const el = e.target;
        const old = String(el.value);
        const sel = el.selectionStart || 0;
        const cleaned = old.replace(/[^0-9.,]/g, '');
        if(cleaned === old) return;
        const diff = old.length - cleaned.length;
        el.value = cleaned;
        try{ el.setSelectionRange(Math.max(0, sel - diff), Math.max(0, sel - diff)); }catch(e){}
      }catch(err){ console.error('initPriceFormatting input error', err); }
    });

    // ao sair do campo / mudar / colar / Enter / submit -> formatar para pt-BR
    ip.addEventListener('blur', (e)=>{ try{ e.target.value = formatMoney(parseMoneyFromInput(e.target.value)); }catch(e){} });
    ip.addEventListener('change', (e)=>{ try{ e.target.value = formatMoney(parseMoneyFromInput(e.target.value)); }catch(e){} });
    ip.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter'){
        e.preventDefault();
        try{ e.target.value = formatMoney(parseMoneyFromInput(e.target.value)); }catch(err){}
        const formElements = Array.from(document.querySelectorAll('input, select, textarea, button'));
        const idx = formElements.indexOf(e.target);
        if(idx >= 0 && idx < formElements.length - 1) formElements[idx+1].focus();
      }
    });
    ip.addEventListener('paste', (e)=>{ setTimeout(()=>{ try{ const el = e.target; el.value = formatMoney(parseMoneyFromInput(el.value)); }catch(e){} },0); });
    console.info('initPriceFormatting: listeners anexados ao #sale-price (modo fácil)');
  }

  // chamar imediatamente e garantir no DOMContentLoaded
  try{ initPriceFormatting(); }catch(e){}
  document.addEventListener('DOMContentLoaded', initPriceFormatting);

   if(!inputPrice){
     console.error('Campo #sale-price não encontrado. Verifique o id no HTML.');
   } else {
     console.info('Campo #sale-price encontrado. Listeners de formatação de preço ativados.');
   }

  const summaryCount = document.getElementById('summary-count');
  const summaryTotal = document.getElementById('summary-total');
  const summaryAvg = document.getElementById('summary-avg');
  const tableBody = document.querySelector('#sales-table tbody');

  // mapeamento simples de marcas -> modelos (amostra); pode ser estendido
  const brandModels = {
    'Toyota': ['Corolla','Corolla Altis','Corolla XEI','Hilux','Yaris','Etios','RAV4','SW4','Prius'],
    'Volkswagen': ['Gol','Polo','Virtus','T-Cross','Nivus','Tiguan','Golf','Saveiro'],
    'Chevrolet': ['Onix','Cruze','Tracker','S10','Montana','Spin'],
    'Fiat': ['Uno','Mobi','Argo','Toro','Strada','Cronos','Fiat 500'],
    'Ford': ['Ka','EcoSport','Ranger','Fiesta'],
    'Renault': ['Logan','Sandero','Duster','Captur','Kwid'],
    'Honda': ['Civic','Fit','HR-V','City','WR-V'],
    'Hyundai': ['HB20','Creta','Tucson','Santa Fe','Elantra'],
    'Nissan': ['Kicks','Versa','Sentra','Frontier'],
    'Jeep': ['Renegade','Compass','Wrangler'],
    'Peugeot': ['208','2008','3008'],
    'Citroën': ['C3','C4 Cactus','Aircross'],
    'Mercedes-Benz': ['C180','C200','GLA'],
    'BMW': ['320i','X1','X3'],
    'Audi': ['A3','Q3','A4']
  };

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
      s = s.replace(/[^0-9,.-]/g, '');
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
      tr.innerHTML = `<td>${s.date}</td><td>${s.vehicle||''}</td><td>${s.brand||''}</td><td>R$ ${formatMoney(s.price)}</td><td>${s.qty}</td><td>${s.bdc||'Não'}</td><td>${s.captacao||'Não'}</td><td>${s.plateSold||''}</td><td>${s.plateCaptured||''}</td><td>${s.client||''}</td><td>${s.days||''}</td><td>${s.payment||''}</td><td>${s.fipe||''}</td><td>${s.seller}</td><td>R$ ${formatMoney(total)}</td><td><button data-idx="${idx}" class="btn btn--muted remove">Remover</button></td>`;
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

  // popula datalist de veículos quando a marca muda
  function populateVehiclesForBrand(brand){
    vehicleDatalist.innerHTML = '';
    const models = brandModels[brand];
    if(!models || !models.length) return;
    // mostrar apenas os modelos mais comuns (top 6)
    const topModels = models.slice(0,6);
    topModels.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      vehicleDatalist.appendChild(opt);
    });
  }

  inputBrand?.addEventListener('change', (e)=>{
    populateVehiclesForBrand(e.target.value);
  });

  form.addEventListener('submit', e =>{
    e.preventDefault();
    // garantir formatação do preço antes de salvar
    try{ inputPrice.value = formatMoney(parseMoneyFromInput(inputPrice.value)); }catch(e){}
    const date = inputDate.value;
    const vehicle = inputVehicle.value.trim();
    const brand = inputBrand.value.trim();
    const price = parseMoneyFromInput(inputPrice.value);
    const qty = parseInt(inputQty.value) || 1;
    const seller = inputSeller.value.trim();
    const bdc = inputBdc.value || 'Não';
    const captacao = inputCaptacao.value || 'Não';
    const placa = inputPlaca?.value || '';
    const plateSold = inputPlateSold.value.trim() || '';
    const plateCaptured = inputPlateCaptured.value.trim() || '';
    const client = inputClient.value.trim() || '';
    const days = parseInt(inputDays.value) || 0;
    const payment = inputPayment.value || '';
    const fipe = parseFloat(inputFipe.value) || 0;
    if(!date||!brand||!seller) return alert('Preencha data, marca e vendedor.');
    const data = load();
    data.push({ date, vehicle, brand, price, qty, seller, bdc, captacao, placa, plateSold, plateCaptured, client, days, payment, fipe });
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
    const rows = [ ['Data','Veículo','Marca','Preço','Quantidade','Vendedor','Total'] ];
    filtered.forEach(r=> rows.push([r.date, r.vehicle, r.brand, r.price, r.qty, r.seller, (r.price*r.qty).toFixed(2)]));
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
      console.debug('price formatted on blur:', e.target.value);
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

  // Formatação em tempo real com preservação do cursor
  inputPrice.addEventListener('input', (e)=>{
    try{
      const el = e.target;
      const old = String(el.value);
      const caret = el.selectionStart || old.length;
      // contar dígitos à direita do cursor (0-9)
      const rightDigits = (old.slice(caret).match(/\d/g) || []).length;
      const n = parseMoneyFromInput(old);
      const formatted = formatMoney(n);
      if(formatted === old) return;
      el.value = formatted;
      // posicionar o cursor de forma que haja same number of digits à direita
      let pos = formatted.length;
      let count = 0;
      for(let i = formatted.length - 1; i >= 0; i--){
        if(/\d/.test(formatted[i])) count++;
        if(count === rightDigits){ pos = i; break; }
      }
      // colocar cursor logo após o dígito encontrado
      try{ el.setSelectionRange(Math.min(pos+1, formatted.length), Math.min(pos+1, formatted.length)); }catch(e){}
    }catch(err){ console.error('Erro formatação em tempo real:', err); }
  });

  // limpeza rápida do campo marca
  document.querySelector('.clear-brand')?.addEventListener('click', ()=>{
    if(document.getElementById('sale-brand')) document.getElementById('sale-brand').value = '';
    if(document.getElementById('sale-vehicle')) document.getElementById('sale-vehicle').value = '';
    vehicleDatalist.innerHTML = '';
  });

  // ao focar no campo marca, mostrar sugestões (re-popular por precaução)
  document.getElementById('sale-brand')?.addEventListener('focus', (e)=>{
    const val = e.target.value;
    if(val) populateVehiclesForBrand(val);
  });

  // re-aplicar formatação automática de preço imediatamente e ao colar
  if(inputPrice){
    inputPrice.addEventListener('paste', (e)=>{
      setTimeout(()=>{ try{
        const el = e.target;
        const v = parseMoneyFromInput(el.value);
        el.value = formatMoney(v);
      }catch(e){}}, 0);
    });
  }

  // Se o campo não existia (por carregamento antecipado), tentar anexar listeners após DOMContentLoaded
  if(!inputPrice){
    document.addEventListener('DOMContentLoaded', ()=>{
      const ip = document.getElementById('sale-price');
      if(!ip){ console.error('Campo #sale-price ainda não encontrado após DOMContentLoaded.'); return; }
      // blur
      ip.addEventListener('blur', (e)=>{
        try{ const v = parseMoneyFromInput(e.target.value); e.target.value = formatMoney(v); console.debug('price formatted on blur after DOMContentLoaded:', e.target.value);}catch(e){}
      });
      // change
      ip.addEventListener('change', (e)=>{ try{ e.target.value = formatMoney(parseMoneyFromInput(e.target.value)); }catch(e){} });
      // keydown Enter
      ip.addEventListener('keydown', (e)=>{
        if(e.key === 'Enter'){
          e.preventDefault();
          try{ e.target.value = formatMoney(parseMoneyFromInput(e.target.value)); }catch(err){}
          const formElements = Array.from(form.querySelectorAll('input, select, textarea, button'));
          const idx = formElements.indexOf(e.target);
          if(idx >= 0 && idx < formElements.length - 1) formElements[idx+1].focus();
        }
      });
      // Formatação em tempo real com preservação do cursor (fallback)
      ip.addEventListener('input', (e)=>{
        try{
          const el = e.target;
          const old = String(el.value);
          const caret = el.selectionStart || old.length;
          const rightDigits = (old.slice(caret).match(/\d/g) || []).length;
          const n = parseMoneyFromInput(old);
          const formatted = formatMoney(n);
          if(formatted === old) return;
          el.value = formatted;
          let pos = formatted.length;
          let count = 0;
          for(let i = formatted.length - 1; i >= 0; i--){
            if(/\d/.test(formatted[i])) count++;
            if(count === rightDigits){ pos = i; break; }
          }
          try{ el.setSelectionRange(Math.min(pos+1, formatted.length), Math.min(pos+1, formatted.length)); }catch(e){}
        }catch(err){ console.error('Erro formatação em tempo real (DOMContentLoaded):', err); }
      });
      // paste
      ip.addEventListener('paste', (e)=>{ setTimeout(()=>{ try{ const el = e.target; const v = parseMoneyFromInput(el.value); el.value = formatMoney(v);}catch(e){} },0); });
      console.info('Listeners de preço anexados após DOMContentLoaded');
    });
  }

})();
