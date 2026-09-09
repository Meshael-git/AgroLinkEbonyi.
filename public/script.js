/* AgroLink Ebonyi - simple vanilla JavaScript */

/* ---------- 1. Mobile navigation ---------- */
function toggleMenu() {
  var links = document.getElementById("navLinks");
  if (links) {
    links.classList.toggle("open");
  }
}

/* ---------- 2. Marketplace search + category filter ---------- */
function filterListings() {
  var searchBox = document.getElementById("searchInput");
  var lgaSelect = document.getElementById("lgaFilter");
  var cards = document.querySelectorAll(".listing");
  var activeChip = document.querySelector(".chip.active");

  var text = searchBox ? searchBox.value.toLowerCase() : "";
  var lga = lgaSelect ? lgaSelect.value : "all";
  var category = activeChip ? activeChip.getAttribute("data-category") : "all";
  var visible = 0;

  for (var i = 0; i < cards.length; i++) {
    var card = cards[i];
    var name = card.getAttribute("data-name").toLowerCase();
    var cardCategory = card.getAttribute("data-category");
    var cardLga = card.getAttribute("data-lga");

    var matchText = name.indexOf(text) !== -1;
    var matchCategory = category === "all" || category === cardCategory;
    var matchLga = lga === "all" || lga === cardLga;

    if (matchText && matchCategory && matchLga) {
      card.style.display = "block";
      visible++;
    } else {
      card.style.display = "none";
    }
  }

  var empty = document.getElementById("noResults");
  if (empty) {
    empty.style.display = visible === 0 ? "block" : "none";
  }
}

function selectCategory(button) {
  var chips = document.querySelectorAll(".chip");
  for (var i = 0; i < chips.length; i++) {
    chips[i].classList.remove("active");
  }
  button.classList.add("active");
  filterListings();
}

/* ---------- 3. Listing details modal ---------- */
function openDetails(button) {
  var card = button.closest(".listing");
  document.getElementById("modalTitle").textContent = card.getAttribute("data-name");
  document.getElementById("modalBody").innerHTML =
    "<p><strong>Quantity:</strong> " + card.getAttribute("data-quantity") + "</p>" +
    "<p><strong>Price:</strong> " + card.getAttribute("data-price") + "</p>" +
    "<p><strong>Farmer:</strong> " + card.getAttribute("data-farmer") + "</p>" +
    "<p><strong>Location:</strong> " + card.getAttribute("data-location") + "</p>" +
    "<p><strong>Harvested:</strong> " + card.getAttribute("data-harvest") + "</p>" +
    "<p><strong>Contact (demo):</strong> " + card.getAttribute("data-contact") + "</p>" +
    "<p class='muted small'>" + card.getAttribute("data-note") + "</p>";
  var idField = document.getElementById("orderListingId");
  if (idField) {
    idField.value = card.getAttribute("data-id") || "";
    document.getElementById("orderUnitPrice").value = card.getAttribute("data-unitprice") || "0";
    document.getElementById("orderQuantity").value = 1;
    var msg = document.getElementById("orderMessage");
    msg.textContent = "";
    msg.className = "";
  }
  document.getElementById("detailsModal").classList.remove("hidden");
}

function closeDetails() {
  document.getElementById("detailsModal").classList.add("hidden");
}

/* ---------- 4. Form validation + success messages ---------- */
function handleProduceForm(event) {
  event.preventDefault();
  document.getElementById("produceForm").reset();
  document.getElementById("produceSuccess").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function handleContactForm(event) {
  event.preventDefault();
  document.getElementById("contactForm").reset();
  document.getElementById("contactSuccess").classList.remove("hidden");
}

/* ---------- 5. Market price filtering + sorting ---------- */
function filterPrices() {
  var cropValue = document.getElementById("cropFilter").value;
  var marketValue = document.getElementById("marketFilter").value;
  var rows = document.querySelectorAll("#priceTable tbody tr");

  for (var i = 0; i < rows.length; i++) {
    var crop = rows[i].getAttribute("data-crop");
    var market = rows[i].getAttribute("data-market");
    var show = (cropValue === "all" || cropValue === crop) &&
      (marketValue === "all" || marketValue === market);
    rows[i].style.display = show ? "" : "none";
  }
}

function sortPrices() {
  var order = document.getElementById("sortPrices").value;
  var tbody = document.querySelector("#priceTable tbody");
  var rows = Array.prototype.slice.call(tbody.querySelectorAll("tr"));

  rows.sort(function (a, b) {
    var priceA = Number(a.getAttribute("data-price"));
    var priceB = Number(b.getAttribute("data-price"));
    if (order === "low") return priceA - priceB;
    if (order === "high") return priceB - priceA;
    return a.getAttribute("data-crop").localeCompare(b.getAttribute("data-crop"));
  });

  for (var i = 0; i < rows.length; i++) {
    tbody.appendChild(rows[i]);
  }
}

/* ---------- 6. Directory filter ---------- */
function filterDirectory() {
  var text = document.getElementById("dirSearch").value.toLowerCase();
  var lga = document.getElementById("dirLga").value;
  var cards = document.querySelectorAll(".dir-card");
  var visible = 0;

  for (var i = 0; i < cards.length; i++) {
    var name = cards[i].getAttribute("data-name").toLowerCase();
    var cardLga = cards[i].getAttribute("data-lga");
    var show = name.indexOf(text) !== -1 && (lga === "all" || lga === cardLga);
    cards[i].style.display = show ? "block" : "none";
    if (show) visible++;
  }

  var empty = document.getElementById("dirEmpty");
  if (empty) empty.style.display = visible === 0 ? "block" : "none";
}

/* ---------- 7. Weather fetch (Open-Meteo, no API key needed) ---------- */
/* If you use a provider that needs a key, replace this placeholder: */
var WEATHER_API_KEY = "YOUR_API_KEY_HERE"; // placeholder only - never put a real secret here

var WEATHER_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=6.3249&longitude=8.1137" +
  "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,precipitation" +
  "&daily=precipitation_probability_max&timezone=Africa%2FLagos";

var fallbackWeather = {
  temperature: 29,
  humidity: 78,
  wind: 11,
  rainChance: 65,
  code: 61
};

function weatherText(code) {
  if (code === 0) return { icon: "☀️", text: "Clear sky" };
  if (code <= 3) return { icon: "⛅", text: "Partly cloudy" };
  if (code <= 48) return { icon: "🌫️", text: "Foggy" };
  if (code <= 67) return { icon: "🌧️", text: "Rain" };
  if (code <= 82) return { icon: "🌦️", text: "Rain showers" };
  if (code <= 99) return { icon: "⛈️", text: "Thunderstorm" };
  return { icon: "🌤️", text: "Mixed conditions" };
}

function showWeather(data, isDemo) {
  var info = weatherText(data.code);
  document.getElementById("weatherIcon").textContent = info.icon;
  document.getElementById("weatherTemp").textContent = data.temperature + "°C";
  document.getElementById("weatherCondition").textContent = info.text;
  document.getElementById("weatherHumidity").textContent = data.humidity + "%";
  document.getElementById("weatherWind").textContent = data.wind + " km/h";
  document.getElementById("weatherRain").textContent = data.rainChance + "%";
  document.getElementById("weatherSource").textContent = isDemo
    ? "Live weather is unavailable right now, so demo sample data is shown."
    : "Live data from the free Open-Meteo weather service.";

  showAdvisory(data.rainChance);
}

/* Simple rule-based planting advisory */
function showAdvisory(rainChance) {
  var title = document.getElementById("advisoryTitle");
  var body = document.getElementById("advisoryText");
  if (!title) return;

  if (rainChance >= 50) {
    title.textContent = "🌧️ Good Planting Window";
    body.textContent =
      "Rain is expected in the coming days. Conditions may be favorable for planting moisture-dependent crops such as rice and vegetables.";
  } else if (rainChance >= 25) {
    title.textContent = "⛅ Mixed Conditions";
    body.textContent =
      "Some rainfall is possible but not certain. Farmers should monitor the forecast before planting or applying fertiliser.";
  } else {
    title.textContent = "☀️ Dry Spell Ahead";
    body.textContent =
      "Limited rainfall is expected. Farmers should consider water availability before planting, and prioritise drought-tolerant crops like cassava.";
  }
}

function loadWeather() {
  if (!document.getElementById("weatherTemp")) return;

  fetch(WEATHER_URL)
    .then(function (response) {
      if (!response.ok) throw new Error("Weather request failed");
      return response.json();
    })
    .then(function (json) {
      showWeather(
        {
          temperature: Math.round(json.current.temperature_2m),
          humidity: json.current.relative_humidity_2m,
          wind: Math.round(json.current.wind_speed_10m),
          rainChance: json.daily.precipitation_probability_max[0],
          code: json.current.weather_code
        },
        false
      );
    })
    .catch(function () {
      showWeather(fallbackWeather, true);
    });
}

document.addEventListener("DOMContentLoaded", loadWeather);
