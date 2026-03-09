import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, X, SlidersHorizontal } from 'lucide-react';
import VehicleCard from './VehicleCard';
import VehicleDetail from './VehicleDetail';
import { blankVehicle, generateId, upsertVehicle, deleteVehicle } from '../lib/storage';

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'purchased', label: 'Purchased' },
  { value: 'passed', label: 'Passed' },
];

export default function LeadTracker({ vehicles, setVehicles, selectedVehicle, setSelectedVehicle }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [detailVehicle, setDetailVehicle] = useState(selectedVehicle || null);

  const [addForm, setAddForm] = useState({
    title: '',
    seller_name: '',
    price: '',
    fb_url: '',
    mileage: '',
    year: '',
    make: '',
    model: '',
    trim: '',
    vin: '',
    location: '',
    notes: '',
    lead_status: 'new',
    follow_up_date: '',
  });

  // Sync selectedVehicle from parent
  useEffect(() => {
    if (selectedVehicle) {
      setDetailVehicle(selectedVehicle);
      setSelectedVehicle(null);
    }
  }, [selectedVehicle]);

  const filtered = vehicles
    .filter((v) => {
      if (statusFilter !== 'all' && v.lead_status !== statusFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          (v.title || '').toLowerCase().includes(q) ||
          (v.make || '').toLowerCase().includes(q) ||
          (v.model || '').toLowerCase().includes(q) ||
          (v.seller_name || '').toLowerCase().includes(q) ||
          (v.location || '').toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.scraped_at) - new Date(a.scraped_at);
      if (sortBy === 'price_asc') return (a.price || 0) - (b.price || 0);
      if (sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
      if (sortBy === 'score') return (b.ai_analysis?.condition_score || 0) - (a.ai_analysis?.condition_score || 0);
      return 0;
    });

  const statusCounts = vehicles.reduce((acc, v) => {
    acc[v.lead_status] = (acc[v.lead_status] || 0) + 1;
    return acc;
  }, {});
  const counts = STATUS_FILTERS.reduce((acc, f) => {
    acc[f.value] = f.value === 'all' ? vehicles.length : (statusCounts[f.value] || 0);
    return acc;
  }, {});

  const handleAdd = () => {
    if (!addForm.title && !addForm.make) {
      alert('Enter at least a title or make/model');
      return;
    }
    const v = blankVehicle({
      id: generateId(),
      title: addForm.title || `${addForm.year} ${addForm.make} ${addForm.model}`.trim(),
      seller_name: addForm.seller_name,
      price: addForm.price ? parseFloat(addForm.price) : 0,
      fb_url: addForm.fb_url,
      mileage: addForm.mileage ? parseInt(addForm.mileage) : 0,
      year: addForm.year,
      make: addForm.make,
      model: addForm.model,
      trim: addForm.trim,
      vin: addForm.vin,
      location: addForm.location,
      notes: addForm.notes,
      lead_status: addForm.lead_status,
      follow_up_date: addForm.follow_up_date,
      source: 'manual',
    });
    const updated = upsertVehicle(v);
    setVehicles(updated);
    setShowAddForm(false);
    setAddForm({
      title: '', seller_name: '', price: '', fb_url: '', mileage: '',
      year: '', make: '', model: '', trim: '', vin: '', location: '',
      notes: '', lead_status: 'new', follow_up_date: '',
    });
    setDetailVehicle(v);
  };

  const handleVehicleUpdate = (updatedVehicle) => {
    const updated = upsertVehicle(updatedVehicle);
    setVehicles(updated);
    setDetailVehicle(updatedVehicle);
  };

  const handleVehicleDelete = (id) => {
    const updated = deleteVehicle(id);
    setVehicles(updated);
    setDetailVehicle(null);
  };

  return (
    <div className="flex h-full">
      {/* Left panel */}
      <div className={`${detailVehicle ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-96 border-r border-gray-200 bg-white`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">Lead Tracker</h2>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus size={15} /> Add
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              placeholder="Search vehicles, sellers…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={14} className="text-gray-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 text-gray-600"
            >
              <option value="newest">Newest first</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="score">AI score: high to low</option>
            </select>
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex overflow-x-auto border-b border-gray-200 px-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`shrink-0 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                statusFilter === f.value
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {f.label} <span className="ml-1 text-gray-400">({counts[f.value]})</span>
            </button>
          ))}
        </div>

        {/* Vehicle list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Filter size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No vehicles match your filters</p>
            </div>
          ) : (
            filtered.map((v) => (
              <VehicleCard
                key={v.id}
                vehicle={v}
                compact
                onClick={() => setDetailVehicle(v)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right panel — Vehicle Detail */}
      <div className={`${detailVehicle ? 'flex' : 'hidden lg:flex'} flex-1 flex-col overflow-auto`}>
        {detailVehicle ? (
          <VehicleDetail
            vehicle={detailVehicle}
            onUpdate={handleVehicleUpdate}
            onDelete={handleVehicleDelete}
            onBack={() => setDetailVehicle(null)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-50">
            <div className="text-center">
              <Filter size={48} className="mx-auto mb-3 opacity-20" />
              <p className="text-lg font-medium">Select a vehicle to view details</p>
              <p className="text-sm mt-1">Or add a new lead with the + button</p>
            </div>
          </div>
        )}
      </div>

      {/* Add Vehicle Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Add Vehicle Manually</h3>
                <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Listing Title</label>
                  <input
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 2018 Toyota Camry SE"
                    value={addForm.title}
                    onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
                  <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="2018" value={addForm.year} onChange={(e) => setAddForm({ ...addForm, year: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Make</label>
                  <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Toyota" value={addForm.make} onChange={(e) => setAddForm({ ...addForm, make: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Model</label>
                  <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Camry" value={addForm.model} onChange={(e) => setAddForm({ ...addForm, model: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Trim</label>
                  <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="SE" value={addForm.trim} onChange={(e) => setAddForm({ ...addForm, trim: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Asking Price</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input className="w-full pl-6 pr-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="12500" value={addForm.price} onChange={(e) => setAddForm({ ...addForm, price: e.target.value })} type="number" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Mileage</label>
                  <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="85000" value={addForm.mileage} onChange={(e) => setAddForm({ ...addForm, mileage: e.target.value })} type="number" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Seller Name</label>
                  <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="John Doe" value={addForm.seller_name} onChange={(e) => setAddForm({ ...addForm, seller_name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
                  <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Orlando, FL" value={addForm.location} onChange={(e) => setAddForm({ ...addForm, location: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">VIN</label>
                  <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono" placeholder="1HGCM82633A123456" value={addForm.vin} onChange={(e) => setAddForm({ ...addForm, vin: e.target.value.toUpperCase() })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" value={addForm.lead_status} onChange={(e) => setAddForm({ ...addForm, lead_status: e.target.value })}>
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="negotiating">Negotiating</option>
                    <option value="purchased">Purchased</option>
                    <option value="passed">Passed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Follow-up Date</label>
                  <input type="date" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" value={addForm.follow_up_date} onChange={(e) => setAddForm({ ...addForm, follow_up_date: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">FB Marketplace URL</label>
                  <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="https://facebook.com/marketplace/item/..." value={addForm.fb_url} onChange={(e) => setAddForm({ ...addForm, fb_url: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                  <textarea className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" rows="3" placeholder="Seller notes, conversation details…" value={addForm.notes} onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={handleAdd} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">Save Vehicle</button>
                <button onClick={() => setShowAddForm(false)} className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
