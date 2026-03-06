import React, { useState, useEffect } from 'react';
import { Save, Eye, EyeOff, CheckCircle, XCircle, Loader, Download, Upload, Trash2, ExternalLink, RefreshCw } from 'lucide-react';
import { loadSettings, saveSettings, loadVehicles, saveVehicles, loadFeedback } from '../lib/storage';
import { testPocketBaseConnection } from '../lib/pocketbase';

const FIELD_META = {
  anthropic_key: {
    label: 'Anthropic API Key',
    placeholder: 'sk-ant-api03-...',
    link: 'https://console.anthropic.com/settings/keys',
    linkLabel: 'Get key',
    description: 'Required for Claude Vision analysis, offer suggestions, and screenshot extraction.',
  },
  apify_token: {
    label: 'Apify API Token',
    placeholder: 'apify_api_...',
    link: 'https://console.apify.com/account/integrations',
    linkLabel: 'Get token',
    description: 'Required for Facebook Marketplace scraping via Apify.',
  },
  pocketbase_url: {
    label: 'PocketBase URL',
    placeholder: 'http://127.0.0.1:8090',
    link: 'https://pocketbase.io/docs/',
    linkLabel: 'PocketBase docs',
    description: 'Optional. Self-host PocketBase for persistent cloud storage. Leave blank to use localStorage only.',
    type: 'url',
  },
  accutrade_key: {
    label: 'AccuTrade API Key',
    placeholder: 'Your AccuTrade dealer key',
    link: 'https://www.accutrade.com',
    linkLabel: 'Get AccuTrade',
    description: 'Optional. Requires a dealer account. Leave blank to use the built-in estimate calculator.',
  },
};

export default function Settings() {
  const [keys, setKeys] = useState({
    anthropic_key: '',
    apify_token: '',
    pocketbase_url: '',
    accutrade_key: '',
  });
  const [show, setShow] = useState({});
  const [testing, setTesting] = useState({});
  const [testResults, setTestResults] = useState({});
  const [saved, setSaved] = useState(false);
  const [importError, setImportError] = useState('');

  useEffect(() => {
    const stored = loadSettings();
    setKeys({
      anthropic_key: stored.anthropic_key || localStorage.getItem('autoscout:anthropic_key') || '',
      apify_token: stored.apify_token || localStorage.getItem('autoscout:apify_token') || '',
      pocketbase_url: stored.pocketbase_url || '',
      accutrade_key: stored.accutrade_key || localStorage.getItem('autoscout:accutrade_key') || '',
    });
  }, []);

  const handleSave = () => {
    saveSettings(keys);
    // Also write to individual localStorage keys for libs that read directly
    if (keys.anthropic_key) localStorage.setItem('autoscout:anthropic_key', keys.anthropic_key);
    if (keys.apify_token) localStorage.setItem('autoscout:apify_token', keys.apify_token);
    if (keys.accutrade_key) localStorage.setItem('autoscout:accutrade_key', keys.accutrade_key);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const testClaude = async () => {
    if (!keys.anthropic_key) return;
    setTesting((t) => ({ ...t, anthropic_key: true }));
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': keys.anthropic_key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      });
      setTestResults((r) => ({ ...r, anthropic_key: res.ok ? 'ok' : 'fail' }));
    } catch {
      setTestResults((r) => ({ ...r, anthropic_key: 'fail' }));
    } finally {
      setTesting((t) => ({ ...t, anthropic_key: false }));
    }
  };

  const testPB = async () => {
    if (!keys.pocketbase_url) return;
    setTesting((t) => ({ ...t, pocketbase_url: true }));
    const { ok, error } = await testPocketBaseConnection(keys.pocketbase_url);
    setTestResults((r) => ({ ...r, pocketbase_url: ok ? 'ok' : 'fail' }));
    setTesting((t) => ({ ...t, pocketbase_url: false }));
  };

  const testApify = async () => {
    if (!keys.apify_token) return;
    setTesting((t) => ({ ...t, apify_token: true }));
    try {
      const res = await fetch(`https://api.apify.com/v2/users/me?token=${keys.apify_token}`);
      setTestResults((r) => ({ ...r, apify_token: res.ok ? 'ok' : 'fail' }));
    } catch {
      setTestResults((r) => ({ ...r, apify_token: 'fail' }));
    } finally {
      setTesting((t) => ({ ...t, apify_token: false }));
    }
  };

  const testFns = {
    anthropic_key: testClaude,
    pocketbase_url: testPB,
    apify_token: testApify,
  };

  // Export data
  const exportData = () => {
    const data = {
      vehicles: loadVehicles(),
      feedback: loadFeedback(),
      exported_at: new Date().toISOString(),
      version: '1.0',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `autoscout-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.vehicles) {
          saveVehicles(data.vehicles);
          alert(`Imported ${data.vehicles.length} vehicles. Refresh the page to see them.`);
        }
        setImportError('');
      } catch {
        setImportError('Invalid file format. Please use an AutoScout export file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const clearAllData = () => {
    if (!window.confirm('Delete ALL vehicles and feedback? This cannot be undone.')) return;
    saveVehicles([]);
    localStorage.removeItem('autoscout:feedback');
    alert('All data cleared. Refresh the page.');
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500 mt-1">Configure API keys and manage your data</p>
      </div>

      {/* API Keys */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-4">API Keys</h3>
        <div className="space-y-5">
          {Object.entries(FIELD_META).map(([key, meta]) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">{meta.label}</label>
                <a
                  href={meta.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <ExternalLink size={11} />
                  {meta.linkLabel}
                </a>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type={show[key] ? 'text' : 'password'}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm pr-10 font-mono focus:ring-2 focus:ring-blue-500"
                    placeholder={meta.placeholder}
                    value={keys[key]}
                    onChange={(e) => {
                      setKeys({ ...keys, [key]: e.target.value });
                      setTestResults((r) => ({ ...r, [key]: null }));
                    }}
                  />
                  <button
                    onClick={() => setShow((s) => ({ ...s, [key]: !s[key] }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {show[key] ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {testFns[key] && keys[key] && (
                  <button
                    onClick={testFns[key]}
                    disabled={testing[key]}
                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50 shrink-0"
                  >
                    {testing[key] ? (
                      <Loader size={12} className="animate-spin" />
                    ) : testResults[key] === 'ok' ? (
                      <CheckCircle size={12} className="text-green-500" />
                    ) : testResults[key] === 'fail' ? (
                      <XCircle size={12} className="text-red-500" />
                    ) : (
                      <RefreshCw size={12} />
                    )}
                    {testing[key] ? 'Testing…' : testResults[key] === 'ok' ? 'Connected' : testResults[key] === 'fail' ? 'Failed' : 'Test'}
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">{meta.description}</p>
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          className={`mt-5 flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            saved ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {saved ? <CheckCircle size={15} /> : <Save size={15} />}
          {saved ? 'Settings Saved!' : 'Save Settings'}
        </button>
      </div>

      {/* PocketBase setup guide */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-3">PocketBase Setup</h3>
        <div className="text-sm text-gray-600 space-y-2">
          <p>For persistent storage across devices, set up PocketBase:</p>
          <ol className="list-decimal list-inside space-y-1.5 text-gray-600">
            <li>Download PocketBase from <a href="https://pocketbase.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">pocketbase.io</a></li>
            <li>Run <code className="bg-gray-100 px-1 rounded text-xs">./pocketbase serve</code></li>
            <li>Open the admin UI and create two collections:</li>
          </ol>
          <div className="bg-gray-50 rounded-lg p-3 mt-2 text-xs font-mono space-y-1">
            <p className="text-gray-700 font-semibold">Collections needed:</p>
            <p className="text-blue-600">autoscout_vehicles</p>
            <p className="text-blue-600">autoscout_feedback</p>
          </div>
          <p className="text-xs text-gray-400">
            All vehicle fields are stored as JSON — no schema setup required if you use the "json" field type for the full record.
          </p>
        </div>
      </div>

      {/* Data management */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Data Management</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Export Data</p>
              <p className="text-xs text-gray-400">Download all vehicles and feedback as JSON</p>
            </div>
            <button
              onClick={exportData}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Download size={14} /> Export
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Import Data</p>
              <p className="text-xs text-gray-400">Restore from a previous AutoScout export</p>
            </div>
            <label className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">
              <Upload size={14} /> Import
              <input type="file" accept=".json" onChange={importData} className="hidden" />
            </label>
          </div>
          {importError && (
            <p className="text-xs text-red-600">{importError}</p>
          )}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div>
              <p className="text-sm font-medium text-red-600">Clear All Data</p>
              <p className="text-xs text-gray-400">Permanently delete all vehicles and feedback</p>
            </div>
            <button
              onClick={clearAllData}
              className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-colors"
            >
              <Trash2 size={14} /> Clear
            </button>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-2">About AutoScout</h3>
        <div className="text-sm text-gray-500 space-y-1">
          <p>Version 1.0 · Vehicle Sourcing Tool</p>
          <p>Built with React + Vite + Tailwind CSS + PocketBase</p>
          <p>AI powered by Claude (Anthropic) · Scraping by Apify · VIN data from NHTSA</p>
        </div>
      </div>
    </div>
  );
}
