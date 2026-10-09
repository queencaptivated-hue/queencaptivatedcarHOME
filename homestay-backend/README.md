# Queen Captivated Homestays — Production Application

A real, working homestay booking platform: a Node.js/Express API backed by SQLite,
and a static frontend that talks to it. This replaces the earlier prototype (which
only worked inside a Claude.ai chat) with something you can actually host on
queencaptivated.in.

```
/backend    → Node.js/Express API + SQLite database + file uploads
/frontend   → index.html (the customer / host / admin web app)
```

## What it does

- **Guests** register, browse listings, and book online. Host contact details are
  never shown to guests.
- **Hosts (landlords)** register, list rooms with up to 10 photos each, and see a
  wallet balance. Every confirmed booking deducts a 20% platform commission
  (configurable) from that wallet. If the balance goes negative, that host's
  listings are automatically blocked from new bookings until they pay — hosts
  settle by scanning your QR code and submitting a settlement request, which you
  approve from the admin dashboard.
- **Admin (you)** logs in with `executive@queencaptivated.in`, and can add/edit/
  delete hosts, manually adjust any wallet, approve/reject settlements, view every
  booking and listing, upload your payment QR code, and change the commission rate.

Passwords are hashed with bcrypt, sessions use signed JWTs, and all monetary values
are stored as whole rupees in a real SQLite database — no data disappears when you
close a browser tab.

---

## 1. Running it locally (to try it out first)

**Requirements:** Node.js 18 or later.

```bash
cd backend
npm install
cp .env.example .env
# open .env and set a real JWT_SECRET (see the comment in that file for how to generate one)
npm start
```

You should see:
```
Queen Captivated Homestays API listening on port 4000
```

The very first time it starts, it prints an initial admin password — log in with
`executive@queencaptivated.in` and that password, then change it immediately from
Admin → Payment QR & settings.

Now open `frontend/index.html` directly in your browser (double-click it, or use
any static file server). It's already configured to talk to `http://localhost:4000`.
Try registering as a host, adding a listing, then registering as a guest and booking it.

---

## 2. Deploying to production

You need two things live on the internet: the **backend** (a always-on Node process)
and the **frontend** (static files, which can even sit inside your existing
queencaptivated.in site).

### Backend — pick one:

**Option A: Render / Railway (easiest)**
1. Push the `backend` folder to a GitHub repo.
2. Create a new "Web Service" on Render.com or Railway.app, point it at that repo.
3. Set the build command to `npm install` and the start command to `npm start`.
4. Add environment variables from `.env.example` in the host's dashboard —
   generate a real `JWT_SECRET`, set `ADMIN_INITIAL_PASSWORD`, and set
   `ALLOWED_ORIGIN` to your actual site URL (e.g. `https://queencaptivated.in`).
5. **Important:** SQLite data lives on disk. On Render, add a persistent Disk
   (Render → your service → Disks) mounted at e.g. `/data`, and set
   `DATABASE_PATH=/data/data.sqlite` so your bookings survive redeploys.
6. Deploy. Note the URL Render/Railway gives you (e.g. `https://qc-api.onrender.com`).

**Option B: Your own VPS (DigitalOcean, AWS Lightsail, etc.)**
1. `git clone` the backend onto the server, `npm install`, copy `.env.example` to
   `.env` and fill it in.
2. Run it with a process manager so it restarts automatically:
   ```bash
   npm install -g pm2
   pm2 start src/server.js --name qc-api
   pm2 save && pm2 startup
   ```
3. Put Nginx in front of it as a reverse proxy, and use Certbot for free HTTPS:
   ```nginx
   server {
     server_name api.queencaptivated.in;
     location / {
       proxy_pass http://localhost:4000;
       proxy_set_header Host $host;
     }
   }
   ```
   ```bash
   sudo certbot --nginx -d api.queencaptivated.in
   ```

Either way, **the API must be served over HTTPS** in production — browsers will
block a plain-HTTP API from an HTTPS site, and you're handling passwords.

### Frontend

Upload `frontend/index.html` to your web host (or your existing site's file
manager) exactly as-is. Then open it and change one line near the top of the
`<script>` block:

```js
const API_BASE = window.QC_API_BASE || 'http://localhost:4000';
```

Change `'http://localhost:4000'` to your real backend URL, e.g.
`'https://api.queencaptivated.in'`. Re-upload the file. That's it — the whole
site is one HTML file plus your API.

To embed it inside an existing page instead of a standalone page, use an iframe:
```html
<iframe src="https://queencaptivated.in/booking/index.html" style="width:100%;height:900px;border:0;"></iframe>
```

---

## 3. Backing up your data

Everything lives in one SQLite file (`backend/data.sqlite` by default, or wherever
`DATABASE_PATH` points). Back it up regularly:

```bash
cp data.sqlite backups/data-$(date +%F).sqlite
```

Uploaded photos and your QR code live in `backend/uploads/` — back that up too.
For real scale (hundreds of listings), consider moving uploads to a service like
Cloudflare R2 or AWS S3 instead of local disk — ask me if you'd like help with that
migration later.

---

## 4. Things to do before taking real bookings

- [ ] Change the admin password immediately after first login.
- [ ] Set a strong, random `JWT_SECRET` (never use the example value).
- [ ] Set `ALLOWED_ORIGIN` to your real domain — don't leave it as `*` in production.
- [ ] Upload your real payment QR code from Admin → Payment QR & settings.
- [ ] Set up automated backups of `data.sqlite` and the `uploads/` folder.
- [ ] Serve everything over HTTPS.

## 5. Known limitations / good next steps

- Payments are manual: guests and hosts settle money outside the app (cash, UPI,
  bank transfer), and admin just records/approves it. If you want automatic online
  payment collection and verification, integrate a gateway like Razorpay or Cashfree
  — happy to help wire that in.
- The commission logic assumes the host is paid by the guest directly and owes the
  platform its cut. If you'd rather the platform collect full payment and pay hosts
  out, that's a different flow — let me know and I can adjust it.
- There's no email/SMS notifications yet (booking confirmations, payment reminders).
  Worth adding once you're live.
