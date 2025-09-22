'use client';

import React, { useState, useEffect } from 'react';

interface Collaborator {
  collaborator_id: string;
  name: string;
  brand_name: string;
  email: string;
  phone?: string;
  address?: string;
  website?: string;
  commission_type: string;
  commission_value: string;
  min_order_quantity: number;
  status: string;
}

const Collaborators: React.FC = () => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [form, setForm] = useState({
    name: '', brand_name: '', email: '', phone: '', address: '', website: '',
    commission_type: 'percentage', commission_value: '10.0', min_order_quantity: 1, status: 'active'
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchCollaborators();
  }, []);

  const fetchCollaborators = async () => {
    try {
      const res = await fetch(`https://hfg-onboard-hqqb.onrender.com/api/collaborators`);
      if (!res.ok) throw new Error('Failed to fetch collaborators');
      const data = await res.json();
      setCollaborators(data);
    } catch {
      setError('Unable to load collaborators');
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const resetForm = () => {
    setForm({
      name: '', brand_name: '', email: '', phone: '', address: '', website: '',
      commission_type: 'percentage', commission_value: '10.0', min_order_quantity: 1, status: 'active'
    });
    setEditingId(null);
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    if (!form.name || !form.brand_name || !form.email) {
      setError('Name, Brand Name, and Email are required');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        ...form,
        commission_value: parseFloat(form.commission_value),
        min_order_quantity: parseInt(form.min_order_quantity.toString(), 10),
      };

      const url = editingId 
        ? `https://hfg-onboard-hqqb.onrender.com/api/collaborators/${editingId}`
        : 'https://hfg-onboard-hqqb.onrender.com/api/collaborators';
      
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to ${editingId ? 'update' : 'create'} collaborator`);
      }

      resetForm();
      fetchCollaborators();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (collaborator: Collaborator) => {
    setForm({
      name: collaborator.name,
      brand_name: collaborator.brand_name,
      email: collaborator.email,
      phone: collaborator.phone || '',
      address: collaborator.address || '',
      website: collaborator.website || '',
      commission_type: collaborator.commission_type,
      commission_value: collaborator.commission_value,
      min_order_quantity: collaborator.min_order_quantity,
      status: collaborator.status
    });
    setEditingId(collaborator.collaborator_id);
    setError(null);
  };

  const handleDelete = async (collaboratorId: string) => {
    if (!window.confirm('Are you sure you want to delete this collaborator? This action cannot be undone.')) {
      return;
    }

    setDeleting(collaboratorId);
    try {
      const res = await fetch(`https://hfg-onboard-hqqb.onrender.com/api/collaborators/${collaboratorId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete collaborator');
      }

      fetchCollaborators();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto text-white min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent mb-2">
          Collaborators Management
        </h1>
        <p className="text-slate-400">Manage your business partners and their commission structures</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-300">
          <div className="flex items-center">
            <span className="mr-2">⚠️</span>
            {error}
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      <div className="mb-8 bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-xl">
        <div className="p-6 border-b border-slate-700/50">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <span className="mr-2">{editingId ? '✏️' : '➕'}</span>
            {editingId ? 'Edit Collaborator' : 'Add New Collaborator'}
          </h2>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Full Name <span className="text-red-400">*</span>
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleInput}
                placeholder="Enter full name"
                className="w-full p-3 rounded-lg bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              />
            </div>

            {/* Brand Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Brand Name <span className="text-red-400">*</span>
              </label>
              <input
                name="brand_name"
                value={form.brand_name}
                onChange={handleInput}
                placeholder="Enter brand name"
                className="w-full p-3 rounded-lg bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email Address <span className="text-red-400">*</span>
              </label>
              <input
                name="email"
                value={form.email}
                onChange={handleInput}
                placeholder="Enter email address"
                type="email"
                className="w-full p-3 rounded-lg bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Phone Number
              </label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleInput}
                placeholder="Enter phone number"
                className="w-full p-3 rounded-lg bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Website URL
              </label>
              <input
                name="website"
                value={form.website}
                onChange={handleInput}
                placeholder="https://example.com"
                className="w-full p-3 rounded-lg bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              />
            </div>

            {/* Commission Type */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Commission Type
              </label>
              <select
                name="commission_type"
                value={form.commission_type}
                onChange={handleInput}
                className="w-full p-3 rounded-lg bg-slate-700/50 border border-slate-600/50 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
              </select>
            </div>

            {/* Commission Value */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Commission Value
              </label>
              <input
                name="commission_value"
                value={form.commission_value}
                onChange={handleInput}
                placeholder="10.0"
                type="number"
                min={0}
                step="0.01"
                className="w-full p-3 rounded-lg bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              />
            </div>

            {/* Min Order Quantity */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Minimum Order Quantity
              </label>
              <input
                name="min_order_quantity"
                value={form.min_order_quantity}
                onChange={handleInput}
                placeholder="1"
                type="number"
                min={1}
                className="w-full p-3 rounded-lg bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Status
              </label>
              <select
                name="status"
                value={form.status}
                onChange={handleInput}
                className="w-full p-3 rounded-lg bg-slate-700/50 border border-slate-600/50 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Address - Full width */}
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Address
              </label>
              <textarea
                name="address"
                value={form.address}
                onChange={handleInput}
                placeholder="Enter full address"
                rows={3}
                className="w-full p-3 rounded-lg bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all resize-vertical"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t border-slate-700/50">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-medium rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {editingId ? 'Updating...' : 'Adding...'}
                </span>
              ) : (
                editingId ? '✏️ Update Collaborator' : '➕ Add Collaborator'
              )}
            </button>
            
            {editingId && (
              <button
                onClick={resetForm}
                className="flex-1 sm:flex-none px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white font-medium rounded-lg transition-all duration-200"
              >
                ❌ Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Collaborators List */}
      <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-xl">
        <div className="p-6 border-b border-slate-700/50">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <span className="mr-2">👥</span>
            Existing Collaborators ({collaborators.length})
          </h2>
        </div>

        <div className="p-6">
          {collaborators.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-slate-400 text-lg">No collaborators found</p>
              <p className="text-slate-500">Add your first collaborator to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {collaborators.map((collaborator) => (
                <div
                  key={collaborator.collaborator_id}
                  className="bg-slate-700/30 rounded-lg border border-slate-600/30 p-6 hover:bg-slate-700/50 transition-all duration-200"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {collaborator.name}
                      </h3>
                      <p className="text-blue-400 font-medium mb-2">
                        {collaborator.brand_name}
                      </p>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          collaborator.status === 'active' 
                            ? 'bg-green-900/30 text-green-300 border border-green-500/30' 
                            : 'bg-red-900/30 text-red-300 border border-red-500/30'
                        }`}>
                          {collaborator.status === 'active' ? '✅ Active' : '❌ Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center text-slate-300">
                      <span className="mr-2">📧</span>
                      <span className="truncate">{collaborator.email}</span>
                    </div>
                    {collaborator.phone && (
                      <div className="flex items-center text-slate-300">
                        <span className="mr-2">📱</span>
                        <span>{collaborator.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center text-slate-300">
                      <span className="mr-2">💰</span>
                      <span>
                        {collaborator.commission_value}{collaborator.commission_type === 'percentage' ? '%' : ' ₹'} 
                        ({collaborator.commission_type})
                      </span>
                    </div>
                    <div className="flex items-center text-slate-300">
                      <span className="mr-2">📦</span>
                      <span>Min Order: {collaborator.min_order_quantity} units</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(collaborator)}
                      className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors duration-200"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(collaborator.collaborator_id)}
                      disabled={deleting === collaborator.collaborator_id}
                      className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white text-sm font-medium rounded-md transition-colors duration-200 disabled:cursor-not-allowed"
                    >
                      {deleting === collaborator.collaborator_id ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Deleting...
                        </span>
                      ) : (
                        '🗑️ Delete'
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Collaborators;
