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
  const inputNotes = document.getElementById('sale-notes');
  const monthInput = document.getElementById('report-month');
  const vehicleDatalist = document.getElementById('vehicle-list');
  const filterStatus = document.getElementById('filter-status');

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
      const arr = raw ? JSON.parse(raw) : [];
      let changed = false;
      const normalized = arr.map(item => {
        const it = Object.assign({}, item);
        // mapeamentos possíveis para nomes em versões antigas
        const mapKeys = {
          date: ['date','data','data_venda','vendadate','dataVenda'],
          brand: ['brand','marca','brandName','marca_nome'],
          vehicle: ['vehicle','veiculo','modelo','model','vehicleModel','modelo_veiculo'],
          seller: ['seller','vendedor','sellerName','vendedor_nome'],
          notes: ['notes','observacoes','observacao','observacoesVenda','observacoes_venda'],
          price: ['price','preco','valor','valor_venda','preco_valor'],
          qty: ['qty','quantidade','quantity','quantidade_venda'],
          plateSold: ['plateSold','plate_venda','placa','plate','placa_venda','placa_vendida'],
          plateCaptured: ['plateCaptured','plate_capturada','placa_captada','placa_capturada'],
          client: ['client','cliente','nome_cliente'],
          days: ['days','dias','dias_estoque','diasEstoque'],
          payment: ['payment','forma_pagamento','formaPagamento'],
          fipe: ['fipe','percent_fipe','porcentagem_fipe','porc_fipe'] ,
          bdc: ['bdc'],
          captacao: ['captacao','captação','captacao_flag'],
          status: ['status','estado','situacao']
        };
        Object.keys(mapKeys).forEach(k => {
          if(typeof it[k] === 'undefined'){
            for(const alt of mapKeys[k]){
              if(typeof it[alt] !== 'undefined'){
                it[k] = it[alt];
                changed = true;
                break;
              }
            }
          }
        });
        // conversões e defaults
        if(typeof it.price === 'string'){
          it.price = parseMoneyFromInput(it.price);
          changed = true;
        }
        if(typeof it.qty === 'string'){
          it.qty = Number(it.qty) || 1; changed = true;
        }
        if(typeof it.days === 'string'){
          it.days = Number(it.days) || 0; changed = true;
        }
        if(typeof it.fipe === 'string'){
          it.fipe = parseFloat(String(it.fipe).replace(/[^0-9.,-]/g,'')) || 0; changed = true;
        }
        // garantir campos mínimos
        if(typeof it.date === 'undefined') it.date = '';
        if(typeof it.brand === 'undefined') it.brand = '';
        if(typeof it.vehicle === 'undefined') it.vehicle = '';
        if(typeof it.seller === 'undefined') it.seller = '';
        if(typeof it.notes === 'undefined') it.notes = '';
        if(typeof it.price === 'undefined') it.price = 0;
        if(typeof it.qty === 'undefined') it.qty = 1;
        if(typeof it.plateSold === 'undefined') it.plateSold = '';
        if(typeof it.plateCaptured === 'undefined') it.plateCaptured = '';
        if(typeof it.client === 'undefined') it.client = '';
        if(typeof it.status === 'undefined') it.status = 'Pendente';
        // criar id se ausente
        if(!it.id){ it.id = (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8)); changed = true; }
        return it;
      });
      if(changed){ try{ save(normalized); }catch(e){} }
      return normalized;
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
    const allData = load();
    console.debug('render() called. total records:', allData.length, 'month:', month, 'statusFilter:', filterStatus?.value);
    const data = allData;
    const monthFiltered = month ? data.filter(s => s.date.startsWith(month)) : data;
    const statusFilter = filterStatus?.value || 'Todos';
    const filtered = (statusFilter && statusFilter !== 'Todos') ? monthFiltered.filter(s => (s.status||'Pendente') === statusFilter) : monthFiltered;
    tableBody.innerHTML = '';
    let totalCount = 0, revenue = 0;
    filtered.forEach((s, idx) =>{
      console.debug('render item', idx, s);
       const tr = document.createElement('tr');
       const total = Number(s.price) * Number(s.qty);
       totalCount += Number(s.qty);
       revenue += total;
       // renderizar célula de status como select editável
       const statusVal = s.status || 'Pendente';
       // adicionar classe para colorir o status cell
       const statusClass = statusVal === 'Faturado' ? 'status-faturado' : (statusVal === 'Entregue' ? 'status-entregue' : 'status-pendente');
      // garantir que cada campo existirá como string antes de montar o HTML
      const dateText = s.date || '';
      const vehicleText = s.vehicle || '';
      const brandText = s.brand || '';
      const priceText = 'R$ ' + formatMoney(s.price);
      const qtyText = s.qty != null ? String(s.qty) : '';
      const bdcText = s.bdc || 'Não';
      const captacaoText = s.captacao || 'Não';
      const plateSoldText = s.plateSold || '';
      const plateCapturedText = s.plateCaptured || '';
      const clientText = s.client || '';
      const daysText = s.days != null ? String(s.days) : '';
      const paymentText = s.payment || '';
      const fipeText = s.fipe != null ? String(s.fipe) : '';
      const sellerText = s.seller || '';
      const totalText = 'R$ ' + formatMoney(total);
       tr.innerHTML = `<td>${dateText}</td><td>${vehicleText}</td><td>${brandText}</td><td>${priceText}</td><td>${qtyText}</td><td>${bdcText}</td><td>${captacaoText}</td><td>${plateSoldText}</td><td>${plateCapturedText}</td><td>${clientText}</td><td>${daysText}</td><td>${paymentText}</td><td>${fipeText}</td><td>${sellerText}</td><td class="status-cell ${statusClass}"><select class="status-select" data-id="${s.id}"><option${statusVal==='Pendente'?' selected':''}>Pendente</option><option${statusVal==='Faturado'?' selected':''}>Faturado</option><option${statusVal==='Entregue'?' selected':''}>Entregue</option></select></td><td>${totalText}</td><td><button type="button" data-id="${s.id}" class="btn btn--muted remove">Remover</button></td>`;
       // anexar a linha ao tbody antes de registrar listeners
       tableBody.appendChild(tr);
       // incluir data-idx para fallback quando não houver id consistente
        // configurar botão Remover diretamente na linha (mais robusto que seleção global depois)
        const removeBtn = tr.querySelector('.remove');
        if(removeBtn){
          removeBtn.setAttribute('type','button');
          // garantir índice para fallback em registros antigos
          removeBtn.dataset.idx = String(idx);
          removeBtn.addEventListener('click', function(e){
            const btn = e.currentTarget;
            const id = btn.dataset.id;
            const idxAttr = btn.dataset.idx;
            const d = load();
            if(!confirm('Remover este registro?')) return;
            // remover por id
            if(id){
              const pos = d.findIndex(x => x.id === id);
              if(pos >= 0){ d.splice(pos,1); save(d); render(month); return; }
            }
            // fallback por índice no filtro
            if(typeof idxAttr !== 'undefined'){
              const idxNum = Number(idxAttr);
              if(month){
                const filteredAll = d.filter(s=>s.date.startsWith(month));
                const item = filteredAll[idxNum];
                const pos = d.indexOf(item);
                if(pos >= 0){ d.splice(pos,1); save(d); render(month); return; }
              } else {
                if(!isNaN(idxNum) && idxNum >= 0 && idxNum < d.length){ d.splice(idxNum,1); save(d); render(month); return; }
              }
            }
            // última tentativa: comparar conteúdo da linha (data, marca, preço, vendedor)
            const trRow = btn.closest('tr');
            if(trRow){
              const cells = Array.from(trRow.children).map(td=>td.textContent.trim());
              const pos2 = d.findIndex(item => {
                return cells[0] === (item.date||'') &&
                       cells[2] === (item.brand||'') &&
                       cells[3].replace(/^R\$\s*/,'') === formatMoney(item.price).toString() &&
                       cells[13] === (item.seller||'');
              });
              if(pos2 >= 0){ d.splice(pos2,1); save(d); render(month); return; }
            }
            console.warn('Registro para remoção não localizado.');
          });
        }
        // anexar listener para alterar status após lançamento
        const sel = tr.querySelector('.status-select');
        if(sel){
          sel.addEventListener('change', (e)=>{
            const newStatus = e.target.value;
            const id = e.target.dataset.id;
            const all = load();
            const pos = all.findIndex(x => x.id === id);
            if(pos >= 0){ all[pos].status = newStatus; save(all); render(month); }
          });
        }
        // se houver observações, adicionar uma linha abaixo com colspan para exibir o texto
        if(s.notes){
          const trNotes = document.createElement('tr');
          trNotes.className = 'sale-notes-row';
          trNotes.innerHTML = `<td colspan="17" class="sale-notes-cell">${String(s.notes).replace(/\n/g,'<br>')}</td>`;
          tableBody.appendChild(trNotes);
        }
      });
    summaryCount.textContent = totalCount;
    if(summaryTotal) summaryTotal.textContent = formatMoney(revenue);
    if(summaryAvg) summaryAvg.textContent = totalCount ? formatMoney(revenue/totalCount) : '0,00';
  }

  // aplicar filtro quando o select de status mudar
  filterStatus?.addEventListener('change', ()=> render(monthInput.value));

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
     // ler valores diretamente do DOM para evitar referências inválidas
     const date = (document.getElementById('sale-date')?.value || '').trim();
     const vehicle = (document.getElementById('sale-vehicle')?.value || '').trim();
     const brand = (document.getElementById('sale-brand')?.value || '').trim();
     const price = parseMoneyFromInput(document.getElementById('sale-price')?.value || '0');
     const qty = parseInt(document.getElementById('sale-qty')?.value) || 1;
     const seller = (document.getElementById('sale-seller')?.value || '').trim();
     const notes = (document.getElementById('sale-notes')?.value || '').trim();
     const status = 'Pendente';
     const bdc = (document.getElementById('sale-bdc')?.value) || 'Não';
     const captacao = (document.getElementById('sale-captacao')?.value) || 'Não';
     const placa = (document.getElementById('sale-placa')?.value) || '';
     const plateSold = (document.getElementById('sale-plate-sold')?.value || '').trim();
     const plateCaptured = (document.getElementById('sale-plate-captured')?.value || '').trim();
     const client = (document.getElementById('sale-client')?.value || '').trim();
     const days = parseInt(document.getElementById('sale-days')?.value) || 0;
     const payment = (document.getElementById('sale-payment')?.value) || '';
     const fipe = parseFloat(document.getElementById('sale-fipe')?.value) || 0;
     if(!date||!brand||!seller) return alert('Preencha data, marca e vendedor.');
     const data = load();
     // criar id único para permitir operações confiáveis
     const id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8);
     const record = { id, date, vehicle, brand, price, qty, seller, bdc, captacao, placa, plateSold, plateCaptured, client, days, payment, fipe, notes, status };
     console.debug('Saving record:', record);
     data.push(record);
     save(data);
     form.reset();
     // após salvar, renderizar mês atualmente selecionado (ou mês do registro se quiser)
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
    const monthFiltered = month ? data.filter(s => s.date.startsWith(month)) : data;
    const statusFilter = filterStatus?.value || 'Todos';
    const filtered = (statusFilter && statusFilter !== 'Todos') ? monthFiltered.filter(s => (s.status||'Pendente') === statusFilter) : monthFiltered;
     if(!filtered.length) return alert('Nenhum registro para exportar neste período.');
     const rows = [ ['Data','Veículo','Marca','Preço','Quantidade','Vendedor','Status','Total','Observações'] ];
     filtered.forEach(r=> rows.push([r.date, r.vehicle, r.brand, r.price, r.qty, r.seller, r.status || 'Pendente', (r.price*r.qty).toFixed(2), r.notes || '']));
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

  // também formatar ao mudar (change) e ao pressionar Enter (comportamento simples)
  if(inputPrice){
    inputPrice.addEventListener('blur', (e)=>{ try{ const v = parseMoneyFromInput(e.target.value); e.target.value = formatMoney(v); }catch(e){} });
    inputPrice.addEventListener('change', (e)=>{ try{ e.target.value = formatMoney(parseMoneyFromInput(e.target.value)); }catch(e){} });
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
  }

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
      console.info('Listeners de preço anexados após DOMContentLoaded');
    });
  }

})();
