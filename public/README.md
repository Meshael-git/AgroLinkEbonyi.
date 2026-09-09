# AgroLink Ebonyi — How the Site Works

AgroLink Ebonyi is a simple website that connects farmers in Ebonyi State with buyers.
It is built with plain **HTML**, **CSS** and **vanilla JavaScript** — no frameworks.

Open `index.html` in a browser (or visit the site address) to start.

---

## 1. Files in this folder

| File | What it is |
| --- | --- |
| `index.html` | Home page: introduction, statistics, featured crops, how it works |
| `marketplace.html` | Browse produce that farmers have listed |
| `list-produce.html` | Form where a signed-in farmer adds produce + a photo |
| `auth.html` | Register or log in (farmer or buyer) |
| `account.html` | My Account: my produce listings and my orders |
| `admin.html` | Admin only: every product and every transaction |
| `prices.html` | Sample market prices with filtering and sorting |
| `weather.html` | Live Abakaliki weather + simple planting advice |
| `directory.html` | Cooperatives and extension contacts (demo data) |
| `contact.html` | Contact / partnership form |
| `style.css` | All the styling for every page |
| `script.js` | Page behaviour: menu, filters, modal, sorting, weather |
| `agrolink.js` | Accounts, database, photo upload, orders, admin |

Every page loads the same three files at the bottom:

```html
<script src="script.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="agrolink.js"></script>
```

That is why the navigation bar, footer, look and login state are identical everywhere.

---

## 2. How the pages connect

```text
                     index.html (home)
                            |
   ------------------------------------------------------------
   |          |            |          |          |            |
marketplace  prices     weather   directory   contact     auth.html
   |                                                        |
   |  "View Details" -> modal -> Place Order            register / login
   |                                                        |
   |                                                  account.html
list-produce.html  ---- saves produce + photo ---->  (my listings/orders)
                                                          |
                                                     admin.html
                                             (all products + transactions)
```

- The **navigation bar** on every page links to all main pages.
- When you are logged out, the bar shows **Sign In / Register** (`auth.html`).
- When you are logged in, it shows **My Account**, **Log Out**, and **Admin** for administrators.

---

## 3. The main journey

1. **Register** on `auth.html` as a farmer or a buyer.
2. A **farmer** opens `list-produce.html`, fills the form, attaches a photo and submits.
   The photo is uploaded to secure storage and the details are saved in the database.
3. The listing immediately appears on `marketplace.html`, which reads live data from the
   database instead of fixed cards.
4. A **buyer** clicks **View Details**, enters a quantity and clicks **Place Order**.
   The order is saved with the total price.
5. Both people see their activity on `account.html`.
6. An **administrator** sees all products, all orders and the total order value on `admin.html`.

---

## 4. What each script does

**`script.js` (front-end behaviour only)**

- `toggleMenu()` — opens/closes the mobile hamburger menu
- `filterListings()` / `selectCategory()` — marketplace search, crop chips, LGA filter
- `openDetails()` / `closeDetails()` — the listing details pop-up (also fills the order box)
- `filterPrices()` / `sortPrices()` — market price table
- `filterDirectory()` — directory search
- weather functions — fetch live data from Open-Meteo, with demo values as a fallback
- `handleContactForm()` — shows the demo success message on the contact page

**`agrolink.js` (accounts and data)**

- `loadSession()` / `paintNav()` — checks who is logged in and updates the navigation
- `handleRegister()` / `handleLogin()` / `signOut()` — accounts
- `submitProduce()` — uploads the photo and saves the listing
- `loadMarketplace()` — builds the marketplace cards from saved listings
- `placeOrder()` — saves a buyer's order
- `loadAccount()` — my listings and my orders
- `loadAdmin()` — all listings, all orders, total value (admins only)

---

## 5. Data that is still demo only

Market prices, the directory entries, the home page statistics, the contact details and the
weather fallback values are sample content for demonstration. Produce listings, accounts and
orders are real and saved.

Online payment is **not** included yet.

---

## 6. Security notes

- Each person can only see and edit their own listings and orders; administrators see everything.
- Produce photos are stored privately and shown through short-lived signed links.
- Only the public key is used in the browser — no secret keys are in these files.
