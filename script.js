document.getElementById("year").textContent = new Date().getFullYear();

/* ---------- Portfolio Calculator ---------- */
// Get your free API key at https://finnhub.io (no credit card needed) and paste it below.
const FINNHUB_KEY = d9e49dpr01qh241acor0d9e49dpr01qh241acorg ;

const calcState = []; // { ticker, name, price, changePct, pe, low52, high52, allocation }

const calcBudgetInput = document.getElementById("calc-budget");
const calcTickerInput = document.getElementById("calc-ticker");
const calcAddBtn = document.getElementById("calc-add");
const calcError = document.getElementById("calc-error");
const calcTbody = document.getElementById("calc-tbody");
const calcBudgetDisplay = document.getElementById("calc-budget-display");
const calcAllocatedDisplay = document.getElementById("calc-allocated");
const calcRemainingDisplay = document.getElementById("calc-remaining");

function fmtMoney(n) {
  return "$" + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function getBudget() {
  return Number(calcBudgetInput && calcBudgetInput.value) || 0;
}

async function fetchStock(ticker) {
  const base = "https://finnhub.io/api/v1";
  const [quoteRes, profileRes, metricRes] = await Promise.all([
    fetch(`${base}/quote?symbol=${ticker}&token=${FINNHUB_KEY}`),
    fetch(`${base}/stock/profile2?symbol=${ticker}&token=${FINNHUB_KEY}`),
    fetch(`${base}/stock/metric?symbol=${ticker}&metric=all&token=${FINNHUB_KEY}`),
  ]);
  const quote = await quoteRes.json();
  const profile = await profileRes.json();
  const metric = await metricRes.json();

  if (!quote || !quote.c) {
    throw new Error("Ticker not found. Check the symbol and try again.");
  }

  return {
    ticker: ticker.toUpperCase(),
    name: profile && profile.name ? profile.name : ticker.toUpperCase(),
    price: quote.c,
    changePct: quote.dp,
    pe: metric && metric.metric && metric.metric.peTTM ? metric.metric.peTTM : null,
    low52: metric && metric.metric ? metric.metric["52WeekLow"] : null,
    high52: metric && metric.metric ? metric.metric["52WeekHigh"] : null,
  };
}

function redistributeEqual() {
  const budget = getBudget();
  if (calcState.length === 0) return;
  const each = budget / calcState.length;
  calcState.forEach((s) => (s.allocation = each));
}

function renderCalc() {
  calcTbody.innerHTML = "";
  const budget = getBudget();
  calcBudgetDisplay.textContent = fmtMoney(budget);

  let allocatedTotal = 0;

  calcState.forEach((s, idx) => {
    allocatedTotal += s.allocation || 0;
    const shares = s.price > 0 ? Math.floor((s.allocation || 0) / s.price) : 0;
    const changeClass = s.changePct > 0 ? "calc-gain" : s.changePct < 0 ? "calc-loss" : "";
    const range = s.low52 && s.high52 ? `${s.low52.toFixed(2)} – ${s.high52.toFixed(2)}` : "—";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${s.ticker}</td>
      <td>$${s.price.toFixed(2)}</td>
      <td class="${changeClass}">${s.changePct > 0 ? "+" : ""}${s.changePct.toFixed(2)}%</td>
      <td>${s.pe ? s.pe.toFixed(1) : "—"}</td>
      <td>${range}</td>
      <td><input type="number" class="calc-alloc-input" min="0" step="1" value="${Math.round(s.allocation || 0)}" data-idx="${idx}"></td>
      <td>${shares}</td>
      <td><button class="calc-remove" data-idx="${idx}" type="button" aria-label="Remove ${s.ticker}">✕</button></td>
    `;
    calcTbody.appendChild(row);
  });

  calcAllocatedDisplay.textContent = fmtMoney(allocatedTotal);
  calcRemainingDisplay.textContent = fmtMoney(budget - allocatedTotal);

  calcTbody.querySelectorAll(".calc-alloc-input").forEach((input) => {
    input.addEventListener("input", (e) => {
      const idx = Number(e.target.dataset.idx);
      calcState[idx].allocation = Number(e.target.value) || 0;
      renderCalc();
    });
  });

  calcTbody.querySelectorAll(".calc-remove").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = Number(e.currentTarget.dataset.idx);
      calcState.splice(idx, 1);
      renderCalc();
    });
  });
}

if (calcAddBtn) {
  calcAddBtn.addEventListener("click", async () => {
    const ticker = (calcTickerInput.value || "").trim().toUpperCase();
    calcError.textContent = "";

    if (!ticker) {
      calcError.textContent = "Enter a ticker symbol first.";
      return;
    }
    if (calcState.some((s) => s.ticker === ticker)) {
      calcError.textContent = `${ticker} is already added.`;
      return;
    }
    if (FINNHUB_KEY === "YOUR_FINNHUB_API_KEY_HERE") {
      calcError.textContent = "Add your free Finnhub API key in script.js to enable live data.";
      return;
    }

    calcAddBtn.disabled = true;
    calcAddBtn.textContent = "Loading...";
    try {
      const stock = await fetchStock(ticker);
      stock.allocation = 0;
      calcState.push(stock);
      redistributeEqual();
      renderCalc();
      calcTickerInput.value = "";
    } catch (err) {
      calcError.textContent = err.message || "Couldn't fetch that ticker.";
    } finally {
      calcAddBtn.disabled = false;
      calcAddBtn.textContent = "Add Stock";
    }
  });
}

if (calcBudgetInput) {
  calcBudgetInput.addEventListener("input", () => {
    redistributeEqual();
    renderCalc();
  });
}

if ("IntersectionObserver" in window) {
  const revealEls = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach((el) => observer.observe(el));
} else {
  document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
}

