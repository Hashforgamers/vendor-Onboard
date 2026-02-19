'use client';

import React, { useState } from 'react';

type Step = 'input' | 'confirm' | 'loading' | 'success' | 'error';
type NotifyStatus = 'idle' | 'sending' | 'sent' | 'failed';

const VendorDeboard: React.FC = () => {
  const [vendorId, setVendorId]         = useState('');
  const [step, setStep]                 = useState<Step>('input');
  const [errorMsg, setErrorMsg]         = useState('');
  const [notifyStatus, setNotifyStatus] = useState<NotifyStatus>('idle');
  const [notifyError, setNotifyError]   = useState('');

  // ── Notify vendor via real endpoint ──────────────────────────────────────
  const handleNotify = async () => {
    if (!vendorId || isNaN(Number(vendorId))) return;
    setNotifyStatus('sending');
    setNotifyError('');
    try {
      const res = await fetch(
        `https://hfg-onboard.onrender.com/api/vendor/notify/${vendorId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setNotifyError(data?.message || 'Failed to send notification.');
        setNotifyStatus('failed');
        return;
      }
      setNotifyStatus('sent');
    } catch (err: any) {
      setNotifyError(err.message || 'Network error. Could not send notification.');
      setNotifyStatus('failed');
    }
  };

  // ── Proceed to confirmation ───────────────────────────────────────────────
  const handleProceed = () => {
    if (!vendorId || isNaN(Number(vendorId))) return;
    setStep('confirm');
  };

  // ── Call deboard DELETE endpoint ──────────────────────────────────────────
  const handleDeboard = async () => {
    setStep('loading');
    try {
      const res = await fetch(
        `https://hfg-onboard.onrender.com/api/deboard/${vendorId}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data?.error || data?.message || 'An unknown error occurred.');
        setStep('error');
        return;
      }
      setStep('success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error. Please try again.');
      setStep('error');
    }
  };

  // ── Reset all state ───────────────────────────────────────────────────────
  const handleReset = () => {
    setVendorId('');
    setStep('input');
    setErrorMsg('');
    setNotifyStatus('idle');
    setNotifyError('');
  };

  // ── What gets deleted — shown on confirm screen ───────────────────────────
  const deletionItems = [
    'Bookings, transactions & payment mappings',
    'Slots, available games & console associations',
    'Cafe passes & user passes',
    'Amenities, opening days & timing',
    'Documents, address & contact info',
    'Vendor PIN & business registration',
    'Dynamic vendor-specific tables',
  ];

  return (
    <div className="flex items-start justify-center pt-16 px-4 min-h-[80vh]">
      <div className="w-full max-w-lg bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl p-8">

        {/* ── Header ── */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Vendor Deboard</h2>
          <p className="text-slate-400 text-sm mt-1">
            Permanently removes all records associated with a vendor.
          </p>
          <div className="mt-3 h-px bg-slate-700" />
        </div>

        {/* ══════════════ STEP: INPUT ══════════════ */}
        {step === 'input' && (
          <div className="space-y-5">

            {/* Vendor ID field */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Vendor ID
              </label>
              <input
                type="number"
                value={vendorId}
                onChange={(e) => {
                  setVendorId(e.target.value);
                  setNotifyStatus('idle');
                  setNotifyError('');
                }}
                placeholder="Enter numeric Vendor ID"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            {/* Notify button */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Notify Vendor{' '}
                <span className="text-slate-500 font-normal">(recommended before deboarding)</span>
              </label>
              <button
                onClick={handleNotify}
                disabled={
                  !vendorId ||
                  isNaN(Number(vendorId)) ||
                  notifyStatus === 'sending' ||
                  notifyStatus === 'sent'
                }
                className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all border
                  ${notifyStatus === 'sent'
                    ? 'bg-green-900/40 border-green-700 text-green-400 cursor-default'
                    : notifyStatus === 'sending'
                    ? 'bg-slate-800 border-slate-600 text-slate-400 cursor-wait'
                    : notifyStatus === 'failed'
                    ? 'bg-red-950/40 border-red-700 text-red-400 hover:bg-red-900/40'
                    : !vendorId || isNaN(Number(vendorId))
                    ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed opacity-50'
                    : 'bg-slate-800 border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white'
                  }`}
              >
                {notifyStatus === 'sending' && (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    Sending Notification...
                  </span>
                )}
                {notifyStatus === 'sent'   && '✓ Notification Sent'}
                {notifyStatus === 'failed' && '↺ Retry Notification'}
                {notifyStatus === 'idle'   && '🔔 Notify Vendor'}
              </button>

              {/* Status messages below notify button */}
              {notifyStatus === 'sent' && (
                <p className="text-xs text-green-500 mt-1.5 pl-1">
                  Vendor #{vendorId} has been notified about the upcoming deboard.
                </p>
              )}
              {notifyStatus === 'failed' && notifyError && (
                <p className="text-xs text-red-400 mt-1.5 pl-1">
                  ✕ {notifyError}
                </p>
              )}
              {notifyStatus === 'idle' && vendorId && (
                <p className="text-xs text-slate-500 mt-1.5 pl-1">
                  You can deboard without notifying, but it is not recommended.
                </p>
              )}
            </div>

            <div className="h-px bg-slate-700" />

            {/* Proceed button */}
            <button
              onClick={handleProceed}
              disabled={!vendorId || isNaN(Number(vendorId))}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
            >
              Proceed to Deboard
            </button>
          </div>
        )}

        {/* ══════════════ STEP: CONFIRM ══════════════ */}
        {step === 'confirm' && (
          <div className="space-y-5">
            <div className="bg-red-950/60 border border-red-800 rounded-xl p-4 space-y-3">
              <p className="text-red-400 font-semibold text-sm flex items-center gap-2">
                <span>⚠️</span> This action is irreversible
              </p>
              <p className="text-slate-300 text-sm">
                The following will be <strong className="text-white">permanently deleted</strong> for{' '}
                <span className="text-red-400 font-bold">Vendor #{vendorId}</span>:
              </p>
              <ul className="space-y-1.5">
                {deletionItems.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-400">
                    <span className="text-red-500 mt-0.5 shrink-0">✕</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {notifyStatus === 'sent' ? (
              <p className="text-xs text-green-500 bg-green-950/30 border border-green-900 rounded-lg px-3 py-2">
                ✓ Vendor #{vendorId} was notified before this action.
              </p>
            ) : (
              <p className="text-xs text-yellow-500 bg-yellow-950/30 border border-yellow-900 rounded-lg px-3 py-2">
                ⚠ Vendor was not notified. Consider notifying before proceeding.
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleReset}
                className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeboard}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
              >
                Confirm Deboard
              </button>
            </div>
          </div>
        )}

        {/* ══════════════ STEP: LOADING ══════════════ */}
        {step === 'loading' && (
          <div className="flex flex-col items-center gap-4 py-10">
            <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Deboarding Vendor #{vendorId}...</p>
            <p className="text-slate-600 text-xs">Removing all associated records. Please wait.</p>
          </div>
        )}

        {/* ══════════════ STEP: SUCCESS ══════════════ */}
        {step === 'success' && (
          <div className="text-center space-y-4 py-8">
            <div className="w-16 h-16 rounded-full bg-green-900/40 border border-green-700 flex items-center justify-center mx-auto text-3xl">
              ✓
            </div>
            <div>
              <p className="text-green-400 font-semibold text-lg">Deboarded Successfully</p>
              <p className="text-slate-400 text-sm mt-1">
                Vendor <span className="text-white font-semibold">#{vendorId}</span> and all associated records have been removed.
              </p>
            </div>
            <button
              onClick={handleReset}
              className="mt-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 text-sm px-6 py-2.5 rounded-lg transition-colors"
            >
              Deboard Another Vendor
            </button>
          </div>
        )}

        {/* ══════════════ STEP: ERROR ══════════════ */}
        {step === 'error' && (
          <div className="text-center space-y-4 py-8">
            <div className="w-16 h-16 rounded-full bg-red-900/40 border border-red-700 flex items-center justify-center mx-auto text-3xl">
              ✕
            </div>
            <div>
              <p className="text-red-400 font-semibold text-lg">Deboarding Failed</p>
              <p className="text-slate-500 text-xs mt-2 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-left break-words">
                {errorMsg}
              </p>
            </div>
            <button
              onClick={handleReset}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 text-sm px-6 py-2.5 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default VendorDeboard;
