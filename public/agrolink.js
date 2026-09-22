/* AgroLink Ebonyi - backend helpers (database, accounts, orders) */

var SUPABASE_URL = "https://c--cbfaea95-c7ed-46a5-8d5e-0f1b3288ed38-prod.lovable.cloud";
var SUPABASE_KEY = "sb_publishable_E_cwvIteTldrLvXiJKPj7A_JYfK59Tw";

var db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

var currentUser = null;
var currentRoles = [];

function escapeText(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function money(value) {
  return "₦" + Number(value).toLocaleString();
}

function isAdmin() {
  return currentRoles.indexOf("admin") !== -1;
}

/* ---------- Session ---------- */
async function loadSession() {
  var result = await db.auth.getUser();
  currentUser = result.data ? result.data.user : null;
  currentRoles = [];

  if (currentUser) {
    var roles = await db.from("user_roles").select("role").eq("user_id", currentUser.id);
    if (roles.data) {
      for (var i = 0; i < roles.data.length; i++) currentRoles.push(roles.data[i].role);
    }
  }
  paintNav();
}

function paintNav() {
  var nav = document.getElementById("navLinks");
  if (!nav) return;

  var old = nav.querySelectorAll(".auth-link");
  for (var i = 0; i < old.length; i++) old[i].remove();

  function addLink(text, href, onClick) {
    var a = document.createElement("a");
    a.className = "auth-link";
    a.textContent = text;
    a.href = href || "#";
    if (onClick) a.onclick = onClick;
    nav.appendChild(a);
  }

  if (currentUser) {
    addLink("My Account", "account.html");
    if (isAdmin()) addLink("Admin", "admin.html");
    addLink("Log Out", "#", function (e) {
      e.preventDefault();
      signOut();
    });
  } else {
    addLink("Sign In / Register", "auth.html");
  }
}

async function signOut() {
  await db.auth.signOut();
  window.location.href = "index.html";
}

/* ---------- Register / Login ---------- */
async function handleRegister(event) {
  event.preventDefault();
  var box = document.getElementById("authMessage");
  var form = event.target;

  var response = await db.auth.signUp({
    email: form.email.value.trim(),
    password: form.password.value,
    options: {
      emailRedirectTo: window.location.origin + "/auth.html",
      data: {
        full_name: form.fullName.value.trim(),
        phone: form.phone.value.trim(),
        role: form.role.value
      }
    }
  });

  if (response.error) {
    box.textContent = response.error.message;
    box.className = "error-message";
    return;
  }

  if (response.data.session) {
    window.location.href = "account.html";
  } else {
    box.textContent = "Account created. Please check your email to confirm, then log in.";
    box.className = "success-message";
  }
}

async function handleLogin(event) {
  event.preventDefault();
  var box = document.getElementById("authMessage");
  var form = event.target;

  var response = await db.auth.signInWithPassword({
    email: form.email.value.trim(),
    password: form.password.value
  });

  if (response.error) {
    box.textContent = response.error.message;
    box.className = "error-message";
    return;
  }
  window.location.href = "account.html";
}

/* ---------- Images ---------- */
async function signImage(path) {
  if (!path) return null;
  var signed = await db.storage.from("produce-images").createSignedUrl(path, 3600);
  return signed.data ? signed.data.signedUrl : null;
}

/* ---------- Save produce (with photo) ---------- */
async function submitProduce(event) {
  event.preventDefault();
  var form = event.target;
  var box = document.getElementById("produceMessage");
  var button = form.querySelector("button[type=submit]");

  if (!currentUser) {
    window.location.href = "auth.html";
    return;
  }

  button.disabled = true;
  button.textContent = "Saving...";

  var imagePath = null;
  var file = form.image.files[0];

  if (file) {
    var safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    var path = currentUser.id + "/" + Date.now() + "_" + safeName;
    var upload = await db.storage.from("produce-images").upload(path, file);
    if (upload.error) {
      box.textContent = "Photo upload failed: " + upload.error.message;
      box.className = "error-message";
      button.disabled = false;
      button.textContent = "Submit Produce";
      return;
    }
    imagePath = path;
  }

  var insert = await db.from("listings").insert({
    farmer_id: currentUser.id,
    farmer_name: form.farmerName.value.trim(),
    phone: form.phone.value.trim(),
    crop_type: form.cropType.value,
    quantity: Number(form.quantity.value),
    unit: form.unit.value,
    price: Number(form.price.value),
    lga: form.lga.value,
    harvest_date: form.harvestDate.value || null,
    description: form.description.value.trim(),
    image_url: imagePath
  });

  button.disabled = false;
  button.textContent = "Submit Produce";

  if (insert.error) {
    box.textContent = insert.error.message;
    box.className = "error-message";
    return;
  }

  form.reset();
  box.textContent = "Saved. Your produce is now live in the marketplace.";
  box.className = "success-message";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- Marketplace ---------- */
async function loadMarketplace() {
  var grid = document.getElementById("listingGrid");
  if (!grid) return;

  var result = await db
    .from("listings")
    .select("*")
    .eq("status", "available")
    .order("created_at", { ascending: false });

  if (result.error || !result.data || result.data.length === 0) {
    grid.innerHTML = "";
    var empty = document.getElementById("noResults");
    if (empty) empty.style.display = "block";
    return;
  }

  var html = "";
  for (var i = 0; i < result.data.length; i++) {
    var item = result.data[i];
    var imageUrl = await signImage(item.image_url);
    if (!imageUrl) imageUrl = "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=600&q=60";

    var crop = escapeText(item.crop_type);
    var farmer = escapeText(item.farmer_name);
    var lga = escapeText(item.lga);
    var qty = escapeText(item.quantity) + " " + escapeText(item.unit);
    var priceText = money(item.price) + " / " + escapeText(item.unit);

    html +=
      '<div class="card listing" data-category="' + crop.toLowerCase() + '"' +
      ' data-lga="' + lga + '"' +
      ' data-name="' + crop + " from " + farmer + '"' +
      ' data-id="' + escapeText(item.id) + '"' +
      ' data-quantity="' + qty + ' available"' +
      ' data-price="' + priceText + '"' +
      ' data-unitprice="' + escapeText(item.price) + '"' +
      ' data-farmer="' + farmer + '"' +
      ' data-location="' + lga + ', Ebonyi State"' +
      ' data-harvest="' + escapeText(item.harvest_date || "Not stated") + '"' +
      ' data-contact="' + escapeText(item.phone) + '"' +
      ' data-note="' + escapeText(item.description || "") + '">' +
      '<img src="' + escapeText(imageUrl) + '" alt="' + crop + '" />' +
      '<div class="card-body">' +
      "<h3>" + crop + "</h3>" +
      '<p class="small muted">' + qty + " available</p>" +
      '<p class="price">' + priceText + "</p>" +
      '<p class="small muted">' + lga + ", Ebonyi State<br />Farmer: " + farmer + "</p>" +
      '<button class="btn btn-outline btn-small" onclick="openDetails(this)">View Details</button>' +
      "</div></div>";
  }
  grid.innerHTML = html;
  if (typeof filterListings === "function") filterListings();
}

/* ---------- Orders ---------- */
async function placeOrder() {
  var box = document.getElementById("orderMessage");
  if (!currentUser) {
    window.location.href = "auth.html";
    return;
  }

  var listingId = document.getElementById("orderListingId").value;
  var unitPrice = Number(document.getElementById("orderUnitPrice").value);
  var quantity = Number(document.getElementById("orderQuantity").value);

  if (!quantity || quantity <= 0) {
    box.textContent = "Enter a valid quantity.";
    box.className = "error-message";
    return;
  }

  var profile = await db.from("profiles").select("full_name, phone").eq("id", currentUser.id).maybeSingle();

  var insert = await db.from("orders").insert({
    listing_id: listingId,
    buyer_id: currentUser.id,
    buyer_name: profile.data ? profile.data.full_name : "",
    buyer_phone: profile.data ? profile.data.phone : "",
    quantity: quantity,
    total_price: quantity * unitPrice
  });

  if (insert.error) {
    box.textContent = insert.error.message;
    box.className = "error-message";
    return;
  }
  box.textContent = "Order placed. The farmer will contact you.";
  box.className = "success-message";
}

/* ---------- My account ---------- */
async function loadAccount() {
  if (!document.getElementById("accountBody")) return;
  if (!currentUser) {
    window.location.href = "auth.html";
    return;
  }

  document.getElementById("accountEmail").textContent = currentUser.email;
  document.getElementById("accountRole").textContent = currentRoles.join(", ") || "buyer";

  var listings = await db.from("listings").select("*").eq("farmer_id", currentUser.id).order("created_at", { ascending: false });
  var listHtml = "";
  if (listings.data && listings.data.length) {
    for (var i = 0; i < listings.data.length; i++) {
      var l = listings.data[i];
      listHtml +=
        "<tr><td>" + escapeText(l.crop_type) + "</td><td>" + escapeText(l.quantity) + " " + escapeText(l.unit) +
        "</td><td>" + money(l.price) + "</td><td>" + escapeText(l.lga) + "</td><td>" + escapeText(l.status) + "</td>" +
        '<td><button class="btn btn-danger btn-small" onclick="deleteListing(\'' + escapeText(l.id) + "')\">Delete</button></td></tr>";
    }
  } else {
    listHtml = '<tr><td colspan="6" class="muted">No produce listed yet.</td></tr>';
  }
  document.getElementById("myListings").innerHTML = listHtml;

  /* Orders I placed as a buyer */
  var orders = await db
    .from("orders")
    .select("*, listings(crop_type, unit, farmer_name)")
    .eq("buyer_id", currentUser.id)
    .order("created_at", { ascending: false });
  var orderHtml = "";
  if (orders.data && orders.data.length) {
    for (var j = 0; j < orders.data.length; j++) {
      var o = orders.data[j];
      orderHtml +=
        "<tr><td>" + escapeText(o.listings ? o.listings.crop_type : "-") + "</td><td>" + escapeText(o.quantity) + "</td><td>" +
        money(o.total_price) + "</td><td>" + escapeText(o.status) + "</td><td>" + new Date(o.created_at).toLocaleDateString() + "</td></tr>";
    }
  } else {
    orderHtml = '<tr><td colspan="5" class="muted">No purchases yet.</td></tr>';
  }
  document.getElementById("myOrders").innerHTML = orderHtml;

  /* Orders buyers placed on MY produce - farmer sees the buyer phone number */
  var received = await db
    .from("orders")
    .select("*, listings!inner(crop_type, unit, farmer_id)")
    .eq("listings.farmer_id", currentUser.id)
    .order("created_at", { ascending: false });

  var recHtml = "";
  if (received.data && received.data.length) {
    for (var k = 0; k < received.data.length; k++) {
      var r = received.data[k];
      var phone = r.buyer_phone ? String(r.buyer_phone).trim() : "";
      var phoneCell = phone
        ? '<a href="tel:' + escapeText(phone) + '">' + escapeText(phone) + "</a>"
        : '<span class="muted">Not provided</span>';
      recHtml +=
        "<tr><td>" + escapeText(r.listings ? r.listings.crop_type : "-") + "</td><td>" + escapeText(r.buyer_name || "Buyer") +
        "</td><td>" + phoneCell + "</td><td>" + escapeText(r.quantity) + "</td><td>" + money(r.total_price) +
        "</td><td>" + new Date(r.created_at).toLocaleDateString() + "</td></tr>";
    }
  } else {
    recHtml = '<tr><td colspan="6" class="muted">No buyer requests yet.</td></tr>';
  }
  var recBody = document.getElementById("receivedOrders");
  if (recBody) recBody.innerHTML = recHtml;
}

/* ---------- Delete one of my listings ---------- */
async function deleteListing(id) {
  if (!window.confirm("Remove this produce listing from the marketplace?")) return;
  var result = await db.from("listings").delete().eq("id", id);
  if (result.error) {
    window.alert("Could not delete: " + result.error.message);
    return;
  }
  loadAccount();
}


/* ---------- Admin dashboard ---------- */
async function loadAdmin() {
  if (!document.getElementById("adminBody")) return;
  if (!currentUser) {
    window.location.href = "auth.html";
    return;
  }
  if (!isAdmin()) {
    document.getElementById("adminBody").innerHTML =
      '<div class="demo-note">This page is only available to administrators.</div>';
    return;
  }

  var listings = await db.from("listings").select("*").order("created_at", { ascending: false });
  var rows = "";
  if (listings.data && listings.data.length) {
    for (var i = 0; i < listings.data.length; i++) {
      var l = listings.data[i];
      rows += "<tr><td>" + escapeText(l.crop_type) + "</td><td>" + escapeText(l.farmer_name) + "</td><td>" +
        escapeText(l.quantity) + " " + escapeText(l.unit) + "</td><td>" + money(l.price) + "</td><td>" +
        escapeText(l.lga) + "</td><td>" + new Date(l.created_at).toLocaleDateString() + "</td>" +
        '<td><button class="btn btn-danger btn-small" onclick="adminDeleteListing(\'' + escapeText(l.id) + "')\">Delete</button></td></tr>";
    }
  } else {
    rows = '<tr><td colspan="7" class="muted">No products yet.</td></tr>';
  }
  document.getElementById("adminListings").innerHTML = rows;

  var orders = await db.from("orders").select("*, listings(crop_type, farmer_name)").order("created_at", { ascending: false });
  var orderRows = "";
  var total = 0;
  if (orders.data && orders.data.length) {
    for (var j = 0; j < orders.data.length; j++) {
      var o = orders.data[j];
      total += Number(o.total_price);
      orderRows += "<tr><td>" + escapeText(o.listings ? o.listings.crop_type : "-") + "</td><td>" + escapeText(o.buyer_name) + "</td><td>" +
        escapeText(o.quantity) + "</td><td>" + money(o.total_price) + "</td><td>" + escapeText(o.status) + "</td><td>" +
        new Date(o.created_at).toLocaleDateString() + "</td></tr>";
    }
  } else {
    orderRows = '<tr><td colspan="6" class="muted">No transactions yet.</td></tr>';
  }
  document.getElementById("adminOrders").innerHTML = orderRows;
  document.getElementById("adminTotal").textContent = money(total);

  loadAdminMessages();
  loadAdminPrices();
}

/* Admin removes any product */
async function adminDeleteListing(id) {
  if (!window.confirm("Delete this product from the marketplace?")) return;
  var result = await db.from("listings").delete().eq("id", id);
  if (result.error) {
    window.alert("Could not delete: " + result.error.message);
    return;
  }
  loadAdmin();
}

/* ---------- Contact form -> inbox ---------- */
async function submitContact(event) {
  event.preventDefault();
  var form = event.target;
  var box = document.getElementById("contactSuccess");
  var button = form.querySelector("button[type=submit]");

  button.disabled = true;
  button.textContent = "Sending...";

  function fieldValue(id) {
    var el = document.getElementById(id);
    return el ? String(el.value).trim() : "";
  }

  var insert = await db.from("contact_messages").insert({
    name: fieldValue("name"),
    organization: fieldValue("organization"),
    email: fieldValue("email"),
    phone: fieldValue("contactPhone"),
    partnership_type: fieldValue("partnershipType"),
    message: fieldValue("message")
  });

  button.disabled = false;
  button.textContent = "Send Message";

  if (insert.error) {
    box.textContent = "Could not send: " + insert.error.message;
    box.className = "error-message";
    return;
  }
  form.reset();
  box.textContent = "Thank you — your message has been sent to the AgroLink team.";
  box.className = "success-message";
}

/* ---------- Admin inbox ---------- */
async function loadAdminMessages() {
  var body = document.getElementById("adminMessages");
  if (!body) return;

  var result = await db.from("contact_messages").select("*").order("created_at", { ascending: false });
  var html = "";
  var unread = 0;

  if (result.data && result.data.length) {
    for (var i = 0; i < result.data.length; i++) {
      var m = result.data[i];
      if (!m.is_read) unread++;
      var phone = m.phone ? '<a href="tel:' + escapeText(m.phone) + '">' + escapeText(m.phone) + "</a>" : '<span class="muted">-</span>';
      html +=
        '<tr style="' + (m.is_read ? "" : "font-weight:600") + '">' +
        "<td>" + new Date(m.created_at).toLocaleDateString() + "</td>" +
        "<td>" + escapeText(m.name) + (m.organization ? '<br /><span class="small muted">' + escapeText(m.organization) + "</span>" : "") + "</td>" +
        '<td><a href="mailto:' + escapeText(m.email) + '">' + escapeText(m.email) + "</a><br />" + phone + "</td>" +
        "<td>" + escapeText(m.partnership_type) + "</td>" +
        "<td>" + escapeText(m.message) + "</td>" +
        '<td><button class="btn btn-outline btn-small" onclick="markMessageRead(\'' + escapeText(m.id) + '\')">' +
        (m.is_read ? "Read" : "Mark read") + "</button> " +
        '<button class="btn btn-danger btn-small" onclick="deleteMessage(\'' + escapeText(m.id) + "')\">Delete</button></td></tr>";
    }
  } else {
    html = '<tr><td colspan="6" class="muted">No messages yet.</td></tr>';
  }
  body.innerHTML = html;
  var counter = document.getElementById("adminUnread");
  if (counter) counter.textContent = unread;
}

async function markMessageRead(id) {
  await db.from("contact_messages").update({ is_read: true }).eq("id", id);
  loadAdminMessages();
}

async function deleteMessage(id) {
  if (!window.confirm("Delete this message?")) return;
  await db.from("contact_messages").delete().eq("id", id);
  loadAdminMessages();
}

/* ---------- Market prices ---------- */
function trendMark() {
  if (trend === "up") return '<span class="up">↑</span>';
  if (trend === "down") return '<span class="down">↓</span>';
  return '<span class="same">→</span>';
}

async function loadPrices() {
  var body = document.getElementById("priceRows");
  if (!body) return;

  var result = await db.from("market_prices").select("*").order("crop", { ascending: true });
  if (result.error || !result.data || !result.data.length) return;

  var html = "";
  for (var i = 0; i < result.data.length; i++) {
    var p = result.data[i];
    html +=
      '<tr data-crop="' + escapeText(p.crop) + '" data-market="' + escapeText(p.market) + '" data-price="' + escapeText(p.price) + '">' +
      "<td>" + escapeText(p.crop) + "</td><td>" + escapeText(p.market) + "</td>" +
      '<td class="price">' + money(p.price) + "</td><td>" + escapeText(p.unit) + "</td>" +
      "<td>" + trendMark(p.trend) + "</td>" +
      '<td class="small muted">' + new Date(p.updated_at).toLocaleDateString() + "</td></tr>";
  }
  body.innerHTML = html;
  if (typeof filterPrices === "function") filterPrices();
}

async function loadAdminPrices() {
  var body = document.getElementById("adminPrices");
  if (!body) return;

  var result = await db.from("market_prices").select("*").order("crop", { ascending: true });
  var html = "";
  if (result.data && result.data.length) {
    for (var i = 0; i < result.data.length; i++) {
      var p = result.data[i];
      html +=
        "<tr><td>" + escapeText(p.crop) + "</td><td>" + escapeText(p.market) + "</td><td>" + money(p.price) +
        "</td><td>" + escapeText(p.unit) + "</td><td>" + trendMark(p.trend) + "</td><td>" +
        new Date(p.updated_at).toLocaleDateString() + "</td>" +
        '<td><button class="btn btn-outline btn-small" onclick="editPrice(\'' + escapeText(p.id) + "', " + Number(p.price) + ')">New price</button> ' +
        '<button class="btn btn-danger btn-small" onclick="deletePrice(\'' + escapeText(p.id) + "')\">Delete</button></td></tr>";
    }
  } else {
    html = '<tr><td colspan="7" class="muted">No prices yet.</td></tr>';
  }
  body.innerHTML = html;
}

async function addPrice(event) {
  event.preventDefault();
  var form = event.target;
  var box = document.getElementById("priceMessage");

  var insert = await db.from("market_prices").insert({
    crop: form.crop.value.trim(),
    market: form.market.value.trim(),
    price: Number(form.price.value),
    unit: form.unit.value.trim(),
    trend: form.trend.value,
    updated_at: new Date().toISOString()
  });

  if (insert.error) {
    box.textContent = insert.error.message;
    box.className = "error-message";
    return;
  }
  form.reset();
  box.textContent = "Price added. It is now live on the Market Prices page.";
  box.className = "success-message";
  loadAdminPrices();
}

async function editPrice(id, current) {
  var value = window.prompt("Enter the new price in Naira:", current);
  if (value === null) return;
  var amount = Number(value);
  if (!amount || amount <= 0) {
    window.alert("Please enter a valid amount.");
    return;
  }
  var update = await db.from("market_prices").update({ price: amount, updated_at: new Date().toISOString() }).eq("id", id);
  if (update.error) {
    window.alert("Could not update: " + update.error.message);
    return;
  }
  loadAdminPrices();
}

async function deletePrice(id) {
  if (!window.confirm("Delete this price entry?")) return;
  await db.from("market_prices").delete().eq("id", id);
  loadAdminPrices();
}

/* ---------- Start ---------- */
document.addEventListener("DOMContentLoaded", async function () {
  await loadSession();
  loadMarketplace();
  loadAccount();
  loadAdmin();
  loadPrices();
});
