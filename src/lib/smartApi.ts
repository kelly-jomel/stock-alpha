// Angel One SmartAPI Service Adapter
// Completely Free Indian Market Data & Execution Integration with Auto-Fallback

export interface SmartApiCredentials {
  apiKey: string;
  clientCode: string;
  pin: string;
  totpSecret?: string;
  jwtToken?: string;
  refreshToken?: string;
  feedToken?: string;
}

export interface SmartApiCandleRequest {
  symbolToken: string;
  exchange?: 'NSE' | 'BSE' | 'NFO' | 'MCX';
  interval: 'ONE_MINUTE' | 'FIVE_MINUTE' | 'FIFTEEN_MINUTE' | 'ONE_HOUR' | 'ONE_DAY';
  fromDate: string; // 'YYYY-MM-DD HH:mm'
  toDate: string;   // 'YYYY-MM-DD HH:mm'
}

// Popular Instrument Token Map for NSE Cash
export const POPULAR_NSE_TOKENS: Record<string, string> = {
  'RELIANCE.NS': '2885',
  'TCS.NS': '11536',
  'HDFCBANK.NS': '1333',
  'INFY.NS': '1594',
  'ICICIBANK.NS': '4963',
  'SBIN.NS': '3045',
  'BHARTIARTL.NS': '10604',
  'TATAMOTORS.NS': '3456',
  'ITC.NS': '1660',
  'LT.NS': '11483',
  'BAJFINANCE.NS': '317',
  'MARUTI.NS': '10999',
  'ASIANPAINT.NS': '236',
  'AXISBANK.NS': '5900',
  'WIPRO.NS': '3787',
  'HCLTECH.NS': '7229',
  'SUNPHARMA.NS': '3351',
  'TITAN.NS': '3506',
  'KOTAKBANK.NS': '1922',
  'NIFTY50': '99926000',
  'BANKNIFTY': '99926009'
};

class SmartApiService {
  private baseUrl = 'https://apiconnect.angelone.in';
  private session: SmartApiCredentials | null = null;
  private isConfigured = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('smart_api_config');
        if (stored) {
          this.session = JSON.parse(stored);
          this.isConfigured = !!(this.session?.apiKey && this.session?.clientCode);
        }
      } catch (e) {
        console.warn('SmartAPI: could not read local session', e);
      }
    }
  }

  public getStatus(): { isConfigured: boolean; clientCode: string | null; isConnected: boolean } {
    return {
      isConfigured: this.isConfigured,
      clientCode: this.session?.clientCode || null,
      isConnected: !!(this.session?.jwtToken)
    };
  }

  public saveCredentials(creds: Partial<SmartApiCredentials>) {
    this.session = { ...(this.session || { apiKey: '', clientCode: '', pin: '' }), ...creds };
    this.isConfigured = !!(this.session.apiKey && this.session.clientCode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('smart_api_config', JSON.stringify(this.session));
    }
  }

  public clearCredentials() {
    this.session = null;
    this.isConfigured = false;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('smart_api_config');
    }
  }

  // Connect & Login via SmartAPI
  public async login(totpCode?: string): Promise<{ success: boolean; message: string }> {
    if (!this.session?.apiKey || !this.session?.clientCode || !this.session?.pin) {
      return { success: false, message: 'Missing API Key, Client Code, or PIN' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/rest/auth/angelbroking/user/v1/loginByPassword`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-PrivateKey': this.session.apiKey,
        },
        body: JSON.stringify({
          clientcode: this.session.clientCode,
          password: this.session.pin,
          totp: totpCode || '123456'
        })
      });

      const data = await response.json();
      if (data.status && data.data) {
        this.session.jwtToken = data.data.jwtToken;
        this.session.refreshToken = data.data.refreshToken;
        this.session.feedToken = data.data.feedToken;
        this.saveCredentials(this.session);
        return { success: true, message: 'Connected to Angel One SmartAPI Feed!' };
      } else {
        return { success: false, message: data.message || 'Login failed - check credentials' };
      }
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error connecting to SmartAPI' };
    }
  }

  // Fetch Candle Data from SmartAPI
  public async getCandles(params: SmartApiCandleRequest) {
    if (!this.session?.jwtToken || !this.session?.apiKey) {
      throw new Error('SmartAPI not authenticated');
    }

    const response = await fetch(`${this.baseUrl}/rest/secure/angelbroking/historical/v1/getCandleData`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-UserType': 'USER',
        'X-SourceID': 'WEB',
        'X-PrivateKey': this.session.apiKey,
        'Authorization': `Bearer ${this.session.jwtToken}`
      },
      body: JSON.stringify({
        exchange: params.exchange || 'NSE',
        symboltoken: params.symbolToken,
        interval: params.interval,
        fromdate: params.fromDate,
        todate: params.toDate
      })
    });

    const result = await response.json();
    return result;
  }
}

export const smartApi = new SmartApiService();
