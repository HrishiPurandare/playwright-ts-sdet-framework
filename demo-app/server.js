// Small dependency-free app under test, so the suite never relies on third-party sites.
const http = require('http');

const PORT = Number(process.env.PORT || 3100);
const VALID = { username: 'demo', password: 'demo-password' };
const users = new Map();
let nextId = 1;

const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Demo App</title></head>
<body>
  <h1>Sign in</h1>
  <form id="login">
    <label>Username <input name="username" required></label>
    <label>Password <input name="password" type="password" required></label>
    <button type="submit">Sign in</button>
  </form>
  <p role="alert" hidden></p>
  <ul aria-label="Users" hidden></ul>
  <script>
    const form = document.getElementById('login');
    const alertBox = document.querySelector('[role=alert]');
    const list = document.querySelector('ul');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      if (!res.ok) {
        alertBox.textContent = 'Invalid username or password';
        alertBox.hidden = false;
        return;
      }
      alertBox.hidden = true;
      form.hidden = true;
      document.querySelector('h1').textContent = 'Users';
      for (const user of await (await fetch('/api/users')).json()) {
        const item = document.createElement('li');
        item.textContent = user.name;
        list.append(item);
      }
      list.hidden = false;
    });
  </script>
</body></html>`;

function readJson(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'));
      } catch {
        resolve(null);
      }
    });
  });
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

http
  .createServer(async (req, res) => {
    const { method, url } = req;
    if (method === 'GET' && url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(page);
    }
    if (method === 'POST' && url === '/api/login') {
      const body = await readJson(req);
      const ok = body && body.username === VALID.username && body.password === VALID.password;
      return ok ? send(res, 200, { ok: true }) : send(res, 401, { error: 'invalid credentials' });
    }
    if (method === 'GET' && url === '/api/users') return send(res, 200, [...users.values()]);
    if (method === 'POST' && url === '/api/users') {
      const body = await readJson(req);
      if (!body || !body.name) return send(res, 400, { error: 'name is required' });
      const user = { id: nextId++, name: body.name };
      users.set(user.id, user);
      return send(res, 201, user);
    }
    const match = url.match(/^\/api\/users\/(\d+)$/);
    if (method === 'GET' && match) {
      const user = users.get(Number(match[1]));
      return user ? send(res, 200, user) : send(res, 404, { error: 'not found' });
    }
    return send(res, 404, { error: 'not found' });
  })
  .listen(PORT, () => console.log(`Demo app on http://localhost:${PORT}`));
