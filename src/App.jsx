import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ExternalLink, Search, Calendar, Camera } from 'lucide-react';

export default function App() {
  const [leads, setLeads] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    itemName: '',
    seller: '',
    price: '',
    fbLink: '',
    messengerNotes: '',
    status: 'new',
    dateAdded: new Date().toISOString().split('T')[0],
    followUpDate: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const stored = localStorage.getItem('purchase-leads');
      if (stored) {
        setLeads(JSON.parse(stored));
      }
    } catch (error) {
      console.log('No existing data found');
    }
  };

  const saveData = (newLeads) => {
    try {
      localStorage.setItem('purchase-leads', JSON.stringify(newLeads));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  const extractLeadInfo = async (imageFile) => {
    setUploading(true);
    try {
      const base64Image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: imageFile.type,
                  data: base64Image
                }
              },
              {
                type: 'text',
                text: `Analyze this Facebook Messenger screenshot for vehicle purchase leads. Extract and return ONLY a JSON object with these fields:
{
  "leads": [
    {
      "itemName": "YEAR MAKE MODEL (e.g., 2018 Toyota Camry)",
      "seller": "seller name",
      "price": "price as number only, no $ or commas",
      "messengerNotes": "brief summary of conversation"
    }
  ]
}

Rules:
- Extract ALL visible vehicle conversations
- For itemName, use format: YEAR MAKE MODEL
- For price, extract only if clearly stated, otherwise use empty string
- For messengerNotes, include key details like condition, mileage, or important messages
- Return ONLY valid JSON, no explanation or markdown`
              }
            ]
          }]
        })
      });

      const data = await response.json();
      const text = data.content.map(item => item.type === 'text' ? item.text : '').join('').trim();
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
      const extracted = JSON.parse(cleanText);

      if (extracted.leads && extracted.leads.length > 0) {
        const newLeads = extracted.leads.map(lead => ({
          id: Date.now() + Math.random(),
          itemName: lead.itemName || '',
          seller: lead.seller || '',
          price: lead.price ? parseFloat(lead.price) : 0,
          fbLink: '',
          messengerNotes: lead.messengerNotes || '',
          status: 'new',
          dateAdded: new Date().toISOString().split('T')[0],
          followUpDate: ''
        }));

        const updatedLeads = [...leads, ...newLeads];
        setLeads(updatedLeads);
        saveData(updatedLeads);
        
        alert(`Successfully added ${newLeads.length} lead${newLeads.length > 1 ? 's' : ''} from screenshot!`);
      } else {
        alert('No vehicle leads found in the image. Please try another screenshot.');
      }
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Error processing image. Please make sure it\'s a clear screenshot of Facebook Messenger.');
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }
      extractLeadInfo(file);
    }
  };

  const addLead = () => {
    if (!formData.itemName || !formData.seller) {
      alert('Please fill in item name and seller');
      return;
    }

    const newLead = {
      id: Date.now(),
      ...formData,
      price: formData.price ? parseFloat(formData.price) : 0
    };

    const updatedLeads = [...leads, newLead];
    setLeads(updatedLeads);
    saveData(updatedLeads);
    
    setFormData({
      itemName: '',
      seller: '',
      price: '',
      fbLink: '',
      messengerNotes: '',
      status: 'new',
      dateAdded: new Date().toISOString().split('T')[0],
      followUpDate: ''
    });
    setShowForm(false);
  };

  const deleteLead = (id) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      const updatedLeads = leads.filter(lead => lead.id !== id);
      setLeads(updatedLeads);
      saveData(updatedLeads);
    }
  };

  const updateStatus = (id, newStatus) => {
    const updatedLeads = leads.map(lead =>
      lead.id === id ? { ...lead, status: newStatus } : lead
    );
    setLeads(updatedLeads);
    saveData(updatedLeads);
  };

  const updateNotes = (id, notes) => {
    const updatedLeads = leads.map(lead =>
      lead.id === id ? { ...lead, messengerNotes: notes } : lead
    );
    setLeads(updatedLeads);
    saveData(updatedLeads);
  };

  const filteredLeads = leads.filter(lead => {
    const matchesFilter = filter === 'all' || lead.status === filter;
    const matchesSearch = lead.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.seller.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const needsFollowUp = leads.filter(lead => {
    if (!lead.followUpDate) return false;
    const today = new Date().toISOString().split('T')[0];
    return lead.followUpDate <= today && lead.status !== 'purchased' && lead.status !== 'passed';
  });

  const statusColors = {
    new: 'bg-blue-100 text-blue-800',
    contacted: 'bg-yellow-100 text-yellow-800',
    negotiating: 'bg-orange-100 text-orange-800',
    purchased: 'bg-green-100 text-green-800',
    passed: 'bg-gray-100 text-gray-800'
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Purchase Lead Tracker</h1>
            <div className="flex gap-3">
              <label className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${uploading ? 'bg-green-400 cursor-not-allowed opacity-60' : 'bg-green-600 hover:bg-green-700 cursor-pointer'} text-white`}>
                <Camera size={20} />
                {uploading ? 'Processing...' : 'Upload Screenshot'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
              <button
                onClick={() => setShowForm(!showForm)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${showForm ? 'bg-gray-600 hover:bg-gray-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
              >
                <Plus size={20} />
                {showForm ? 'Cancel' : 'Add Manually'}
              </button>
            </div>
          </div>

          {uploading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="text-blue-800 font-medium">Processing screenshot and extracting lead information...</span>
              </div>
            </div>
          )}

          {needsFollowUp.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-red-800 font-semibold mb-2">
                <Calendar size={20} />
                {needsFollowUp.length} Lead{needsFollowUp.length !== 1 ? 's' : ''} Need Follow-Up
              </div>
              <div className="text-sm text-red-700">
                {needsFollowUp.map(lead => lead.itemName).join(', ')}
              </div>
            </div>
          )}

          {showForm && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Add New Lead Manually</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Item Name (e.g., 2018 Toyota Camry) *"
                  value={formData.itemName}
                  onChange={(e) => setFormData({...formData, itemName: e.target.value})}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Seller Name *"
                  value={formData.seller}
                  onChange={(e) => setFormData({...formData, seller: e.target.value})}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="number"
                  placeholder="Price"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="url"
                  placeholder="FB Marketplace Link"
                  value={formData.fbLink}
                  onChange={(e) => setFormData({...formData, fbLink: e.target.value})}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="date"
                  value={formData.followUpDate}
                  onChange={(e) => setFormData({...formData, followUpDate: e.target.value})}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Follow-up Date"
                />
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="new">New Lead</option>
                  <option value="contacted">Contacted</option>
                  <option value="negotiating">Negotiating</option>
                  <option value="purchased">Purchased</option>
                  <option value="passed">Passed</option>
                </select>
              </div>
              <textarea
                placeholder="Messenger conversation notes or details..."
                value={formData.messengerNotes}
                onChange={(e) => setFormData({...formData, messengerNotes: e.target.value})}
                className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="3"
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={addLead}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Save Lead
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search items or sellers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'all', label: 'All' },
                { key: 'new', label: 'New' },
                { key: 'contacted', label: 'Contacted' },
                { key: 'negotiating', label: 'Negotiating' },
                { key: 'purchased', label: 'Purchased' },
                { key: 'passed', label: 'Passed' },
              ].map(({ key, label }) => {
                const count = key === 'all' ? leads.length : leads.filter(l => l.status === key).length;
                return (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`px-4 py-2 rounded-lg transition-colors ${filter === key ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    {label} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {filteredLeads.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center text-gray-500">
              <Camera size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">No leads found</p>
              <p>Upload a screenshot of your Messenger or add leads manually to get started!</p>
            </div>
          ) : (
            filteredLeads.map(lead => (
              <div key={lead.id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{lead.itemName}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[lead.status]}`}>
                        {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                      </span>
                    </div>
                    <div className="text-gray-600 space-y-1">
                      <p>Seller: <span className="font-medium">{lead.seller}</span></p>
                      {lead.price > 0 && <p>Price: <span className="font-medium">${lead.price.toFixed(2)}</span></p>}
                      <p className="text-sm">Added: {lead.dateAdded}</p>
                      {lead.followUpDate && (
                        <p className="text-sm">
                          Follow-up: <span className={lead.followUpDate <= new Date().toISOString().split('T')[0] && lead.status !== 'purchased' && lead.status !== 'passed' ? 'text-red-600 font-semibold' : ''}>{lead.followUpDate}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {lead.fbLink && (
                      <a
                        href={lead.fbLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Open FB Marketplace listing"
                      >
                        <ExternalLink size={20} />
                      </a>
                    )}
                    <button
                      onClick={() => deleteLead(lead.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete lead"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={lead.status}
                    onChange={(e) => updateStatus(lead.id, e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="new">New Lead</option>
                    <option value="contacted">Contacted</option>
                    <option value="negotiating">Negotiating</option>
                    <option value="purchased">Purchased</option>
                    <option value="passed">Passed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Messenger Notes</label>
                  <textarea
                    value={lead.messengerNotes}
                    onChange={(e) => updateNotes(lead.id, e.target.value)}
                    placeholder="Copy and paste messenger conversations or add notes here..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows="3"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}