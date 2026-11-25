# Stock Alpha (NSE Quantitative Terminal & Portfolio Analyzer)

A high-performance modern web application for Indian stock market investors, uniting quantitative technical screening (KeyStocks principles) with the **5-Gate Multi-Investor Consensus Framework** (Warren Buffett, Stanley Druckenmiller, Ray Dalio, Michael Burry, and Cathie Wood).

---

## 🌟 Key Features

### 1. 🧭 Market Explore (Groww-Style Modern UI)
* **Indian Spot Indices Strip:** Live tracking of **NIFTY 50**, **SENSEX**, **BANK NIFTY**, and **NIFTY IT** with live sparklines.
* **Most Traded on Stock Alpha:** High-velocity turnover leaders.
* **Market Movers:** Tabbed switcher for real-time **Top Gainers** and **Top Losers**.
* **Sector Explorer:** Interactive industry performance cards across Banking, IT, Energy, Auto/EV, Consumer Goods, and Healthcare.

### 2. 💡 5-Gate Recommendations & Portfolio-Aware Sizing
* Master-detail two-column layout ranking securities by their unified 5-gate consensus score.
* Comprehensive investor breakdowns (Buffett Moat, Druckenmiller Trend, Burry Margin of Safety, Dalio All-Weather, and Wood Innovation).
* Execution price guidance: Suggested Entry, Stop-Loss Floor, and Target Price with Risk-to-Reward ratio ($1:2.5$).
* **Smart Buy Sizing:** Calculates recommended accumulation quantities if a stock is already in your portfolio, or starter quantities for new additions.

### 3. 💼 Portfolio Tracker & Statement Import
* Full positions overview with live P&L and risk diagnostics (concentration warnings, trend alignment).
* **Excel & PDF Statement Import:** Directly upload statements from Zerodha, Groww, Upstox, AngelOne, or ICICI Direct (`.xlsx`, `.xls`, `.csv`, `.pdf`).

### 4. 🔍 Dual-Analysis Screener & Live Search
* **Direct Stock Search:** Autocomplete scrip lookup across the entire Indian stock universe.
* **Fundamental Filters:** P/E valuation bands, ROIC hurdle rates ($\ge 15\%$, $\ge 25\%$), and Debt/Equity constraints.
* **Technical Filters:** Moving average energy squeeze ($\le 3.2\%$), 60-day resistance breakouts, double-bottom reversals, and 200 EMA trend regimes.

### 5. 📈 Live Candlestick Charts & Free Technical Indicators
* TradingView-grade interactive candlestick charts.
* Free indicator suite with zero repainting:
  - **EMA (20 / 50)**
  - **SMA (50)**
  - **Bollinger Bands (20, 2)**
  - **SuperTrend (10, 3)**
  - **Volume Bars**
  - **RSI (14) Sub-Chart** with Overbought (70) and Oversold (30) reference lines.

---

## 🛠️ Tech Stack

* **Framework:** Next.js 16 (App Router)
* **Language:** TypeScript
* **Styling:** Tailwind CSS (Modern Light Groww-style UI)
* **Charts:** Lightweight Charts & Custom SVG Mini-Sparklines
* **File Parsing:** `xlsx`
* **Icons:** Lucide React

---

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/kelly-jomel/stock-alpha.git
cd stock-alpha

# Install dependencies
npm install

# Run the development server
npm run dev

# Or build for production
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000) with your browser.
