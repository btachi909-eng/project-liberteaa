// admin.js — client-side admin panel that reads/writes ecommerce_orders in localStorage
(function(){
  const ordersKey = 'ecommerce_orders';

  function readOrders(){ try{ return JSON.parse(localStorage.getItem(ordersKey)||'[]') }catch(e){return[]} }
  function writeOrders(arr){ localStorage.setItem(ordersKey, JSON.stringify(arr)) }

  // view navigation
  document.querySelectorAll('.sidebar nav a').forEach(a=>{
    a.addEventListener('click', e=>{
      e.preventDefault(); document.querySelectorAll('.sidebar nav a').forEach(x=>x.classList.remove('active'));
      a.classList.add('active');
      const v = a.dataset.view; showView(v);
    });
  });

  function showView(name){ document.querySelectorAll('.view').forEach(v=>v.style.display='none');
    document.getElementById(name).style.display='block';
    document.getElementById('viewTitle').textContent = name.charAt(0).toUpperCase() + name.slice(1);
    if(name==='dashboard') renderDashboard();
    if(name==='orders') renderOrders();
    if(name==='customers') renderCustomers();
  }

  // Dashboard
  function formatPrice(p){ return '₱' + Number(p||0).toFixed(2) }
  function renderDashboard(){
    const orders = readOrders();
    const total = orders.reduce((s,o)=> s + (Number(o.total||0)), 0);
    const customers = uniqueCustomers(orders).length;
    document.getElementById('statOrders').textContent = orders.length;
    document.getElementById('statRevenue').textContent = formatPrice(total);
    document.getElementById('statCustomers').textContent = customers;

    const recent = orders.slice().sort((a,b)=> b.createdAt - a.createdAt).slice(0,6);
    const container = document.getElementById('recentOrders'); container.innerHTML='';
    if(!recent.length) { container.innerHTML='<p class="muted">No orders yet.</p>'; return }
    recent.forEach(o=>{
      const d = document.createElement('div'); d.className='order-row';
      const ship = o.shipping || {};
      const addr = ship.address || [ship.address1||'', ship.address2||'', ship.city||'', ship.postal||''].filter(Boolean).join(', ');
      const left = document.createElement('div'); left.innerHTML = '<strong>'+o.id+'</strong><div class="order-meta">'+(ship.name ? escapeHtml(ship.name) + ' • ' + escapeHtml(addr) : '—')+'</div>'
      const right = document.createElement('div'); right.innerHTML = '<div class="small">'+formatPrice(o.total)+' • '+(o.status||'')+'</div>';
      d.appendChild(left); d.appendChild(right); container.appendChild(d);
    });
  }

  // Customers
  function uniqueCustomers(orders){
    const map = {};
    orders.forEach(o=>{
      const s = o.shipping || {};
      const key = (s.name||'').trim() + '|' + (s.phone||'').trim();
      if(!key.trim()) return;
      if(!map[key]) map[key] = { name: s.name||'', phone: s.phone||'', address: s.address||'', orders: [] };
      map[key].orders.push(o.id);
    });
    return Object.values(map);
  }

  function renderCustomers(){
    const orders = readOrders(); const list = uniqueCustomers(orders);
    const container = document.getElementById('customersList'); container.innerHTML='';
    if(!list.length){ container.innerHTML='<p class="muted">No customers found.</p>'; return }
    list.forEach(c=>{
      const el = document.createElement('div'); el.className='cust-row';
      const left = document.createElement('div'); left.className='cust-left'; left.innerHTML = '<strong>'+escapeHtml(c.name||'—')+'</strong><div class="small">'+escapeHtml(c.phone||'')+' • '+escapeHtml(c.address||'')+'</div>';
      const right = document.createElement('div'); right.className='actions'; right.innerHTML = '<a href="#" class="btn" data-cust="'+escapeHtml(c.name||'')+'">View orders</a>';
      el.appendChild(left); el.appendChild(right); container.appendChild(el);
      right.querySelector('a').addEventListener('click', e=>{ e.preventDefault(); showCustomerOrders(c) });
    });
  }

  function showCustomerOrders(customer){
    const orders = readOrders(); const ids = customer.orders || [];
    const html = ids.map(id=>{
      const o = orders.find(x=>x.id===id);
      return '<div style="padding:8px;background:#fff;border-radius:6px;margin-bottom:6px">'<
      +'<strong>'+escapeHtml(o.id)+'</strong> <div class="small">'+formatPrice(o.total)+' • '+(o.status||'')+'</div>'
      +'</div>'
    }).join('');
    alert('Orders for '+(customer.name||'')+'\n\n' + (ids.length? html.replace(/<[^>]+>/g,'') : 'No orders'));
  }

  // Orders view — editable
  function renderOrders(){
    const orders = readOrders().slice().sort((a,b)=> b.createdAt - a.createdAt);
    const container = document.getElementById('ordersList'); container.innerHTML = '';
    if(!orders.length){ container.innerHTML='<p class="muted">No orders yet.</p>'; return }
    orders.forEach(o=>{
      const el = document.createElement('div'); el.className='order-row';
      const ship = o.shipping || {};
      const addr = ship.address || [ship.address1||'', ship.address2||'', ship.city||'', ship.postal||''].filter(Boolean).join(', ');
      const left = document.createElement('div'); left.innerHTML = '<div><strong>'+o.id+'</strong></div><div class="small">'+(ship.name ? escapeHtml(ship.name) : '—')+'</div><div class="small">'+escapeHtml(addr)+'</div>';
      const mid = document.createElement('div'); mid.className='order-meta'; mid.innerHTML = formatPrice(o.total)+'<div class="small">'+new Date(o.createdAt).toLocaleString()+'</div><div class="small">'+escapeHtml(ship.phone||'')+'</div>';
      const right = document.createElement('div'); right.className='actions';
      const select = document.createElement('select'); select.className='select-status'; ['pending_cod','paid','shipped','delivered','cancelled'].forEach(s=>{ const op=document.createElement('option'); op.value=s; op.textContent = s; if(o.status===s) op.selected=true; select.appendChild(op) });
      select.addEventListener('change', function(){ o.status = this.value; const arr = readOrders(); const idx = arr.findIndex(x=>x.id===o.id); if(idx>-1){ arr[idx]=o; writeOrders(arr); renderOrders(); renderDashboard(); } });
      const del = document.createElement('button'); del.className='btn'; del.textContent='Delete'; del.style.background='#c0392b'; del.addEventListener('click', function(){ if(!confirm('Delete order '+o.id+'?')) return; const arr=readOrders(); const idx=arr.findIndex(x=>x.id===o.id); if(idx>-1){ arr.splice(idx,1); writeOrders(arr); renderOrders(); renderDashboard(); } });
      right.appendChild(select); right.appendChild(del);
      el.appendChild(left); el.appendChild(mid); el.appendChild(right); container.appendChild(el);
    });
  }

  // small helpers
  function escapeHtml(s){ return String(s||'').replace(/[&<>'"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[c]) }

  // start on dashboard
  showView('dashboard');
})();
