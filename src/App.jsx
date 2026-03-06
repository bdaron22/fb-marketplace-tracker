import React, { useState, useEffect } from 'react';
import {
  Car, BarChart2, Search, Users, Settings, Zap,
  Menu, X, AlertTriangle
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import Scraper from './components/Scraper';
import LeadTracker from './components/LeadTracker';
import VehicleAnalysis from './components/VehicleAnalysis';
import SettingsPanel from './components/Settings';
import { loadVehicles, upsertVehicle } from './lib/storage';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
  { id: 'scraper', label: 'Marketplace', icon: Search },
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'analysis', label: 'AI Analysis', icon: Zap },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setVehicles(loadVehicles());
  }, []);

  // Follow-up alerts count
  const followUpCount = vehicles.filter((v) => {
    if (!v.follow_up_date) return false;
    const today = new Date().toISOString().split('T')[0];
    return (
      v.follow_up_date <= today &&
      v.lead_status !== 'purchased' &&
      v.lead_status !== 'passed'
    );
  }).length;

  const addOrUpdateVehicles = (newVehicles) => {
    let current = loadVehicles();
    newVehicles.forEach((v) => {
      const idx = current.findIndex(
        (x) => x.id === v.id || (v.fb_url && x.fb_url === v.fb_url)
      );
      if (idx >= 0) {
        current[idx] = { ...current[idx], ...v };
      } else {
        current = [v, ...current];
      }
    });
    // Persist and update state
    current.forEach(upsertVehicle);
    setVehicles(loadVehicles());
  };

  const handleSelectVehicleFromDash = (v) => {
    setSelectedVehicle(v);
    setActiveTab('leads');
    setSidebarOpen(false);
  };

  const navigateTo = (tabId) => {
    setActiveTab(tabId);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30
          w-64 bg-gray-900 text-white flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="p-5 border-b border-gray-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg shrink-0">
              <Car size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">AutoScout</h1>
              <p className="text-xs text-gray-400">Vehicle Sourcing</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const badge = tab.id === 'leads' && followUpCount > 0 ? followUpCount : null;

            return (
              <button
                key={tab.id}
                onClick={() => navigateTo(tab.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-colors relative
                  ${isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }
                `}
              >
                <Icon size={17} className="shrink-0" />
                {tab.label}
                {badge && (
                  <span className="ml-auto bg-amber-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700/50">
          <div className="text-xs text-gray-500 space-y-0.5">
            <p className="font-medium text-gray-400">{vehicles.length} vehicles tracked</p>
            {followUpCount > 0 && (
              <p className="text-amber-400 flex items-center gap-1">
                <AlertTriangle size={11} />
                {followUpCount} follow-up{followUpCount !== 1 ? 's' : ''} due
              </p>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-500 hover:text-gray-700"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <Car size={18} className="text-blue-600" />
            <span className="font-bold text-gray-900">AutoScout</span>
          </div>
          {followUpCount > 0 && (
            <span className="ml-auto bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <AlertTriangle size={10} />
              {followUpCount}
            </span>
          )}
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {activeTab === 'dashboard' && (
            <Dashboard
              vehicles={vehicles}
              onSelectVehicle={handleSelectVehicleFromDash}
            />
          )}
          {activeTab === 'scraper' && (
            <Scraper onVehiclesFound={addOrUpdateVehicles} />
          )}
          {activeTab === 'leads' && (
            <LeadTracker
              vehicles={vehicles}
              setVehicles={(updated) => {
                setVehicles(updated);
              }}
              selectedVehicle={selectedVehicle}
              setSelectedVehicle={setSelectedVehicle}
            />
          )}
          {activeTab === 'analysis' && (
            <VehicleAnalysis
              vehicles={vehicles}
              setVehicles={(updated) => {
                setVehicles(updated);
              }}
            />
          )}
          {activeTab === 'settings' && <SettingsPanel />}
        </main>
      </div>
    </div>
  );
}
