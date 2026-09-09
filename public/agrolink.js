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
      listHtml += "<tr><td>" + l.crop_type + "</td><td>" + l.quantity + " " + l.unit + "</td><td>" + money(l.price) + "</td><td>" + l.lga + "</td><td>" + l.status + "</td></tr>";
    }
  } else {
    listHtml = '<tr><td colspan="5" class="muted">No produce listed yet.</td></tr>';
  }
  document.getElementById("myListings").innerHTML = listHtml;

  var orders = await db.from("orders").select("*, listings(crop_type, unit, farmer_name)").order("created_at", { ascending: false });
  var orderHtml = "";
  if (orders.data && orders.data.length) {
    for (var j = 0; j < orders.data.length; j++) {
      var o = orders.data[j];
      orderHtml +=
        "<tr><td>" + (o.listings ? o.listings.crop_type : "-") + "</td><td>" + o.quantity + "</td><td>" +
        money(o.total_price) + "</td><td>" + o.status + "</td><td>" + new Date(o.created_at).toLocaleDateString() + "</td></tr>";
    }
  } else {
    orderHtml = '<tr><td colspan="5" class="muted">No orders yet.</td></tr>';
  }
  document.getElementById("myOrders").innerHTML = orderHtml;
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
      rows += "<tr><td>" + l.crop_type + "</td><td>" + l.farmer_name + "</td><td>" + l.quantity + " " + l.unit +
        "</td><td>" + money(l.price) + "</td><td>" + l.lga + "</td><td>" + new Date(l.created_at).toLocaleDateString() + "</td></tr>";
    }
  } else {
    rows = '<tr><td colspan="6" class="muted">No products yet.</td></tr>';
  }
  document.getElementById("adminListings").innerHTML = rows;

  var orders = await db.from("orders").select("*, listings(crop_type, farmer_name)").order("created_at", { ascending: false });
  var orderRows = "";
  var total = 0;
  if (orders.data && orders.data.length) {
    for (var j = 0; j < orders.data.length; j++) {
      var o = orders.data[j];
      total += Number(o.total_price);
      orderRows += "<tr><td>" + (o.listings ? o.listings.crop_type : "-") + "</td><td>" + o.buyer_name + "</td><td>" +
        o.quantity + "</td><td>" + money(o.total_price) + "</td><td>" + o.status + "</td><td>" +
        new Date(o.created_at).toLocaleDateString() + "</td></tr>";
    }
  } else {
    orderRows = '<tr><td colspan="6" class="muted">No transactions yet.</td></tr>';
  }
  document.getElementById("adminOrders").innerHTML = orderRows;
  document.getElementById("adminTotal").textContent = money(total);
}

/* ---------- Start ---------- */
document.addEventListener("DOMContentLoaded", async function () {
  await loadSession();
  loadMarketplace();
  loadAccount();
  loadAdmin();
});
