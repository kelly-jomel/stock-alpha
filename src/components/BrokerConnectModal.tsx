'use client';

import React, { useState, useEffect } from 'react';
import { smartApi, POPULAR_NSE_TOKENS } from '@/lib/smartApi';
import { Shield, Zap, CheckCircle2, AlertCircle, Key, Lock, User, RefreshCw, ExternalLink } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConnected?: () => void;
}

export default function BrokerConnectModal({ isOpen, onClose, onConnected }: Props) {
  const [selectedBroker, setSelectedBroker] = useState<'ANGEL_ONE' | 'FYERS' | 'UPSTOX'>('ANGEL_ONE');
  const [apiKey, setApiKey] = useState('');
  const [clientCode, setClientCode] = useState('');
  const [pin, setPin] = useState('');
  const [totp, setTotp] = useState('');
  const [status, setStatus] = useState<{ isConnected: boolean; clientCode: string | null }>({
    isConnected: false,
    clientCode: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const s = smartApi.getStatus();
      setStatus({ isConnected: s.isConnected, clientCode: s.clientCode });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    // Save configuration
    smartApi.saveCredentials({ apiKey, clientCode, pin });

    const result = await smartApi.login(totp);
    setIsLoading(false);

    if (result.success) {
      setMessage({ type: 'success', text: result.message });
      setStatus({ isConnected: true, clientCode });
      if (onConnected) onConnected();
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setMessage({ type: 'error', text: result.message });
    }
  };

  const handleDisconnect = () => {
    smartApi.clearCredentials();
    setStatus({ isConnected: false, clientCode: null });
    setApiKey('');
    setClientCode('');
    setPin('');
    setMessage({ type: 'success', text: 'Disconnected from broker feed. Reverted to default continuous NSE feed.' });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2a2e39] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Live Broker Feed Connect</h3>
              <p className="text-[11px] text-[#787b86]">Direct, 100% free high-speed broker exchange data</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#787b86] hover:text-white cursor-pointer text-sm">
            ✕
          </button>
        </div>

        {/* Broker Tabs */}
        <div className="grid grid-cols-3 gap-2 p-1 bg-[#131722] rounded-xl border border-[#2a2e39] text-xs font-semibold">
          <button
            onClick={() => setSelectedBroker('ANGEL_ONE')}
            className={`py-2 rounded-lg cursor-pointer transition-all ${
              selectedBroker === 'ANGEL_ONE'
                ? 'bg-[#2962ff] text-white font-bold shadow-md'
                : 'text-[#787b86] hover:text-white'
            }`}
          >
            Angel One
          </button>
          <button
            onClick={() => setSelectedBroker('FYERS')}
            className={`py-2 rounded-lg cursor-pointer transition-all ${
              selectedBroker === 'FYERS'
                ? 'bg-[#2962ff] text-white font-bold shadow-md'
                : 'text-[#787b86] hover:text-white'
            }`}
          >
            Fyers API
          </button>
          <button
            onClick={() => setSelectedBroker('UPSTOX')}
            className={`py-2 rounded-lg cursor-pointer transition-all ${
              selectedBroker === 'UPSTOX'
                ? 'bg-[#2962ff] text-white font-bold shadow-md'
                : 'text-[#787b86] hover:text-white'
            }`}
          >
            Upstox
          </button>
        </div>

        {/* Status Callout */}
        {status.isConnected ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Connected as {status.clientCode} (Active Live Stream)</span>
            </div>
            <button
              onClick={handleDisconnect}
              className="px-2.5 py-1 rounded bg-[#2a2e39] hover:bg-rose-950 text-rose-400 text-[11px] font-bold cursor-pointer"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-3 flex items-start gap-2.5 text-xs text-[#787b86]">
            <Shield className="w-4 h-4 text-[#2962ff] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white">Zero Subscription Cost: </span>
              Angel One SmartAPI and Fyers provide 100% free developer API access without monthly subscription fees. If not connected, the app uses continuous NSE/Yahoo data automatically.
            </div>
          </div>
        )}

        {/* Form */}
        {!status.isConnected && (
          <form onSubmit={handleConnect} className="flex flex-col gap-3 text-xs">
            <div>
              <label className="text-[#787b86] font-semibold block mb-1">API Key</label>
              <div className="relative">
                <Key className="w-3.5 h-3.5 text-[#787b86] absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="Enter SmartAPI / Developer API Key"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  className="w-full bg-[#131722] border border-[#2a2e39] rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-[#2962ff] font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[#787b86] font-semibold block mb-1">Client Code</label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-[#787b86] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. S123456"
                    value={clientCode}
                    onChange={e => setClientCode(e.target.value)}
                    className="w-full bg-[#131722] border border-[#2a2e39] rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-[#2962ff] font-mono text-xs uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#787b86] font-semibold block mb-1">PIN / Password</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-[#787b86] absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    placeholder="Account MPIN"
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    className="w-full bg-[#131722] border border-[#2a2e39] rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-[#2962ff] font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[#787b86] font-semibold block mb-1">TOTP Code (Google Authenticator)</label>
              <input
                type="text"
                maxLength={6}
                placeholder="6-digit TOTP (e.g. 582910)"
                value={totp}
                onChange={e => setTotp(e.target.value)}
                className="w-full bg-[#131722] border border-[#2a2e39] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#2962ff] font-mono text-xs text-center tracking-widest font-bold"
              />
            </div>

            {message && (
              <div className={`p-2.5 rounded-lg flex items-center gap-2 text-xs font-semibold ${
                message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              }`}>
                {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{message.text}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-[#2a2e39]">
              <a
                href="https://smartapi.angelone.in"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#2962ff] hover:underline flex items-center gap-1"
              >
                <span>Get Free SmartAPI Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded bg-[#2a2e39] hover:bg-slate-700 text-white font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-[#2962ff] hover:bg-[#1e4bd8] text-white font-bold cursor-pointer disabled:opacity-50 shadow-md"
                >
                  {isLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Connect Live Feed</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
