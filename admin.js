// Admin system using localStorage
// - one main admin (id: admin, pass default 'aadil0113')
// - admin can create users (user id, password, role) and toggle active/inactive
// - products stored same as earlier

// --------- Helper storage functions ----------
function readUsers(){ return JSON.parse(localStorage.getItem('nockd_users')||'[]'); }
function saveUsers(arr){ localStorage.setItem('nockd_users', JSON.stringify(arr)); }

function readProducts(){ return JSON.parse(localStorage.getItem('nockd_products')||'[]'); }
function saveProducts(arr){ localStorage.setItem('nockd_products', JSON.stringify(arr)); }

// Ensure default admin exists
(function ensureAdmin(){
  let users = readUsers();
  const hasAdmin = users.some(u=>u.id==='admin');
  if(!hasAdmin){
    users.push({ id: 'admin', pass: localStorage.getItem('admin_pass') || 'aadil0113', role: 'admin', active: true });
    saveUsers(users);
  } else {
    // if localStorage admin_pass changed, update stored admin pass
    const idx = users.findIndex(u=>u.id==='admin');
    if(idx>=0){
      const stored = localStorage.getItem('admin_pass');
      if(stored) { users[idx].pass = stored; saveUsers(users); }
    }
  }
})();

// ---------------- LOGIN PAGE LOGIC ----------------
if(document.getElementById('loginBtn')){
  const uidEl = document.getElementById('userid');
  const passEl = document.getElementById('password');
  const err = document.getElementById('error');
  const remember = document.getElementById('remember');

  // autofill remembered id
  const rem = localStorage.getItem('nockd_remember_id');
  if(rem) uidEl.value = rem;

  document.getElementById('loginBtn').onclick = () => {
    const id = uidEl.value.trim();
    const pass = passEl.value.trim();
    if(!id || !pass){ err.textContent='Enter both fields'; err.style.display='block'; setTimeout(()=>err.style.display='none',2000); return; }

    const users = readUsers();
    const user = users.find(u=>u.id===id);
    if(!user){ err.textContent='User not found'; err.style.display='block'; setTimeout(()=>err.style.display='none',2000); return; }
    if(!user.active){ err.textContent='User is inactive'; err.style.display='block'; setTimeout(()=>err.style.display='none',2000); return; }
    if(user.pass !== pass){ err.textContent='Invalid password'; err.style.display='block'; setTimeout(()=>err.style.display='none',2000); return; }

    // success
    localStorage.setItem('nockd_user', user.id);
    localStorage.setItem('nockd_role', user.role);
    if(remember.checked) localStorage.setItem('nockd_remember_id', user.id);
    else localStorage.removeItem('nockd_remember_id');

    if(user.role === 'admin') {
      // go to admin dashboard
      location = 'dashboard.html';
    } else {
      // normal user -> go to site (index)
      alert('Login successful. Redirecting to site.');
      location = '../index.html';
    }
  };

  // forgot password - allow reset only if user exists (this is client-side)
  document.getElementById('forgot').onclick = (e) => {
    e.preventDefault();
    const id = prompt('Enter your user id to reset password:');
    if(!id) return;
    let users = readUsers();
    const idx = users.findIndex(u=>u.id===id);
    if(idx === -1){ alert('User not found'); return; }
    const newp = prompt('Enter new password (min 4 chars):');
    if(!newp || newp.length < 4){ alert('Password too short'); return; }
    users[idx].pass = newp;
    saveUsers(users);
    // also save admin_pass if admin changed
    if(id === 'admin') localStorage.setItem('admin_pass', newp);
    alert('Password updated. Use new password to login.');
  };
}

// ---------------- DASHBOARD PAGE LOGIC ----------------
if(document.getElementById('addUser') || document.getElementById('saveProd')){
  // protect route: only admin
  if(localStorage.getItem('nockd_role') !== 'admin'){ location = 'admin-login.html'; }

  document.getElementById('signedUser').innerText = localStorage.getItem('nockd_user') || '';

  // USERS: add / list / toggle / delete / change password
  function renderUsers(){
    const users = readUsers();
    const el = document.getElementById('usersList');
    if(!el) return;
    if(users.length === 0){ el.innerHTML = '<p class="small">No users</p>'; return; }
    let html = `<table><thead><tr><th>User ID</th><th>Role</th><th>Active</th><th>Actions</th></tr></thead><tbody>`;
    users.forEach(u=>{
      html += `<tr>
        <td>${u.id}</td>
        <td>${u.role}</td>
        <td>${u.active ? 'Yes' : 'No'}</td>
        <td>
          <button class="btn edit" data-id="${u.id}">Edit</button>
          <button class="btn toggle" data-id="${u.id}">${u.active ? 'Deactivate' : 'Activate'}</button>
          <button class="btn del" data-id="${u.id}">Delete</button>
        </td>
      </tr>`;
    });
    html += `</tbody></table>`;
    el.innerHTML = html;

    // wire buttons
    el.querySelectorAll('.edit').forEach(b=>{
      b.onclick = ()=>{
        const id = b.dataset.id;
        const users = readUsers();
        const u = users.find(x=>x.id===id);
        if(!u) return alert('User not found');
        document.getElementById('new_uid').value = u.id;
        document.getElementById('new_pass').value = u.pass;
        document.getElementById('new_role').value = u.role;
      };
    });
    el.querySelectorAll('.toggle').forEach(b=>{
      b.onclick = ()=>{
        const id = b.dataset.id;
        let users = readUsers();
        users = users.map(u=> u.id===id ? {...u, active: !u.active} : u);
        saveUsers(users);
        renderUsers();
      };
    });
    el.querySelectorAll('.del').forEach(b=>{
      b.onclick = ()=>{
        const id = b.dataset.id;
        if(id === 'admin'){ return alert("Cannot delete main admin"); }
        if(!confirm('Delete user '+id+' ?')) return;
        let users = readUsers().filter(u=>u.id!==id);
        saveUsers(users);
        renderUsers();
      };
    });
  }

  document.getElementById('addUser').onclick = ()=>{
    const id = document.getElementById('new_uid').value.trim();
    const pass = document.getElementById('new_pass').value.trim();
    const role = document.getElementById('new_role').value;
    if(!id || !pass) return alert('User id & password required');
    // ensure alphanumeric user id
    if(!/^[a-zA-Z0-9_-]+$/.test(id)) return alert('User id must be alphanumeric/ _ or -');

    let users = readUsers();
    const idx = users.findIndex(u=>u.id === id);
    if(idx >= 0){
      // update
      users[idx].pass = pass;
      users[idx].role = role;
      users[idx].active = true;
    } else {
      users.push({ id, pass, role, active: true });
    }
    saveUsers(users);
    // keep admin_pass in sync
    if(id === 'admin') localStorage.setItem('admin_pass', pass);
    alert('User saved');
    document.getElementById('new_uid').value=''; document.getElementById('new_pass').value='';
    renderUsers();
  };

  renderUsers();

  // PRODUCTS: same flow as earlier
  function renderList(){
    const list = document.getElementById('prodList');
    if(!list) return;
    const all = readProducts();
    if(all.length === 0){ list.innerHTML = '<p class="small">No products yet</p>'; return; }
    list.innerHTML = all.map(p=>`<div style="padding:8px;border-bottom:1px solid #222"><b>${p.name}</b> • ₹${p.price} • ${p.cat} <button data-id="${p.id}" class="btn delprod" style="margin-left:12px;background:#ff5050;color:#000">Delete</button></div>`).join('');
    document.querySelectorAll('.delprod').forEach(b=>{
      b.onclick = ()=>{
        const id = b.dataset.id;
        const arr = readProducts().filter(x=>x.id!=id);
        saveProducts(arr); renderList();
      };
    });
  }

  document.getElementById('saveProd').onclick = ()=>{
    const name = document.getElementById('p-name').value.trim();
    const price = document.getElementById('p-price').value.trim();
    const desc = document.getElementById('p-desc').value.trim();
    const cat = document.getElementById('p-cat').value;
    const file = document.getElementById('p-img').files[0];
    const role = localStorage.getItem('nockd_role'); // admin only here

    if(!name || !price) return alert('Name & Price required');

    // read file if provided
    if(file){
      const reader = new FileReader();
      reader.onload = ()=>{
        const img = reader.result;
        storeProduct(img);
      };
      reader.readAsDataURL(file);
    } else storeProduct('');

    function storeProduct(img){
      const all = readProducts();
      all.push({ id: Date.now(), name, price, desc, cat, image: img });
      saveProducts(all);
      alert('Product added');
      document.getElementById('p-name').value=''; document.getElementById('p-price').value=''; document.getElementById('p-desc').value=''; document.getElementById('p-img').value='';
      renderList();
    }
  };

  renderList();

  // logout & view site
  document.getElementById('logout').onclick = ()=>{
    localStorage.removeItem('nockd_user');
    localStorage.removeItem('nockd_role');
    location = 'admin-login.html';
  };
  document.getElementById('viewSite').onclick = ()=> location = '../index.html';
}
