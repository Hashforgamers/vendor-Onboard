'use client';

import React, { useState, useEffect, ChangeEvent } from 'react';
import Image from 'next/image';

interface Collaborator {
  collaborator_id: string;
  brand_name: string;
}

interface Product {
  product_id: string;
  name: string;
  category: string;
  unit_price: string;
  sku?: string;
  stock_quantity: number;
  min_order_quantity: number;
  status: string;
  description?: string;
  image_url?: string;
}

const Products: React.FC = () => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [selectedCollaborator, setSelectedCollaborator] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({
    name: '',
    category: 'other',
    unit_price: '',
    sku: '',
    stock_quantity: '',
    min_order_quantity: '1',
    status: 'active',
    description: '',
    image_file: null as File | null,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCollaborators();
  }, []);

  useEffect(() => {
    if (selectedCollaborator) fetchProducts(selectedCollaborator);
    else setProducts([]);
  }, [selectedCollaborator]);

  const fetchCollaborators = async () => {
    try {
      const res = await fetch(`https://hfg-onboard-hqqb.onrender.com/api/collaborators`);
      if (!res.ok) throw new Error('Failed to fetch collaborators');
      const data = await res.json();
      setCollaborators(data);
      if (data.length > 0) setSelectedCollaborator(data[0].collaborator_id);
    } catch {
      setError('Unable to load collaborators');
    }
  };

  const fetchProducts = async (collabId: string) => {
    try {
      const res = await fetch(`https://hfg-onboard-hqqb.onrender.com/api/collaborators/${collabId}/products`);
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = await res.json();
      setProducts(data);
    } catch {
      setError('Unable to load products');
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

 const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    setForm(prev => ({ ...prev, image_file: file }));
  }
};



  const resetForm = () => {
    setForm({
      name: '',
      category: 'other',
      unit_price: '',
      sku: '',
      stock_quantity: '',
      min_order_quantity: '1',
      status: 'active',
      description: '',
      image_file: null,
    });
    setEditingId(null);
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    if (!form.name || !form.unit_price || !form.stock_quantity) {
      setError('Name, Price and Stock are required');
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('category', form.category);
      formData.append('unit_price', form.unit_price);
      formData.append('sku', form.sku);
      formData.append('stock_quantity', form.stock_quantity);
      formData.append('min_order_quantity', form.min_order_quantity);
      formData.append('status', form.status);
      formData.append('description', form.description);
      if (form.image_file) formData.append('image', form.image_file);

      const url = editingId 
        ? `https://hfg-onboard-hqqb.onrender.com/api/products/${editingId}`
        : `https://hfg-onboard-hqqb.onrender.com/api/collaborators/${selectedCollaborator}/products`;
      
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        body: editingId ? JSON.stringify({
          name: form.name,
          category: form.category,
          unit_price: form.unit_price,
          sku: form.sku,
          stock_quantity: form.stock_quantity,
          min_order_quantity: form.min_order_quantity,
          status: form.status,
          description: form.description,
        }) : formData,
        headers: editingId ? { 'Content-Type': 'application/json' } : undefined,
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Server returned invalid JSON: ${text}`);
      }

      if (!res.ok) {
        throw new Error(data.error || `Failed to ${editingId ? 'update' : 'add'} product`);
      }

      resetForm();
      fetchProducts(selectedCollaborator);
    } catch (err) {
       if (err instanceof Error){
      setError(err.message);
       }else {
    setError('Something went wrong');
  }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product: Product) => {
    setForm({
      name: product.name,
      category: product.category,
      unit_price: product.unit_price,
      sku: product.sku || '',
      stock_quantity: product.stock_quantity.toString(),
      min_order_quantity: product.min_order_quantity.toString(),
      status: product.status,
      description: product.description || '',
      image_file: null,
    });
    setEditingId(product.product_id);
    setError(null);
  };

  const handleDelete = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    setDeleting(productId);
    try {
      const res = await fetch(`https://hfg-onboard-hqqb.onrender.com/api/products/${productId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete product');
      }

      fetchProducts(selectedCollaborator);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto text-white min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent mb-2">
          Products Management
        </h1>
        <p className="text-slate-400">Manage collaborator products and inventory</p>
      </div>

      {/* Collaborator Selection */}
      <div className="mb-8 bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-xl">
        <div className="p-6">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Select Collaborator <span className="text-red-400">*</span>
          </label>
          <select
            value={selectedCollaborator}
            onChange={e => setSelectedCollaborator(e.target.value)}
            className="w-full p-3 rounded-lg bg-slate-700/50 border border-slate-600/50 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
          >
            {collaborators.map(c => (
              <option key={c.collaborator_id} value={c.collaborator_id}>
                {c.brand_name}
              </option>
            ))}
          </select>
        </div>
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
            <span className="mr-2">{editingId ? '✏️' : '📦'}</span>
            {editingId ? 'Edit Product' : 'Add New Product'}
          </h2>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Product Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Product Name <span className="text-red-400">*</span>
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleInputChange}
                placeholder="Enter product name"
                className="w-full p-3 rounded-lg bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Category
              </label>
              <select
                name="category"
                value={form.category}
                onChange={handleInputChange}
                className="w-full p-3 rounded-lg bg-slate-700/50 border border-slate-600/50 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              >
                <option value="energy_drink">🥤 Energy Drink</option>
                <option value="energy_bar">🍫 Energy Bar</option>
                <option value="mouse">🖱️ Mouse</option>
                <option value="keyboard">⌨️ Keyboard</option>
                <option value="mousepad">🖱️ Mousepad</option>
                <option value="other">📦 Other</option>
              </select>
            </div>

            {/* Unit Price */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Unit Price (₹) <span className="text-red-400">*</span>
              </label>
              <input
                name="unit_price"
                value={form.unit_price}
                onChange={handleInputChange}
                placeholder="0.00"
                type="number"
                step="0.01"
                min="0"
                className="w-full p-3 rounded-lg bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              />
            </div>

            {/* SKU */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                SKU (Stock Keeping Unit)
              </label>
              <input
                name="sku"
                value={form.sku}
                onChange={handleInputChange}
                placeholder="Optional SKU code"
                className="w-full p-3 rounded-lg bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              />
            </div>

            {/* Stock Quantity */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Stock Quantity <span className="text-red-400">*</span>
              </label>
              <input
                name="stock_quantity"
                value={form.stock_quantity}
                onChange={handleInputChange}
                placeholder="Available quantity"
                type="number"
                min="0"
                className="w-full p-3 rounded-lg bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
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
                onChange={handleInputChange}
                placeholder="Minimum order"
                type="number"
                min="1"
                className="w-full p-3 rounded-lg bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
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
                onChange={handleInputChange}
                className="w-full p-3 rounded-lg bg-slate-700/50 border border-slate-600/50 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              >
                <option value="active">✅ Active</option>
                <option value="inactive">❌ Inactive</option>
              </select>
            </div>

            {/* Product Image */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Product Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full p-3 rounded-lg bg-slate-700/50 border border-slate-600/50 text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              />
            </div>

            {/* Description - Full width */}
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Product Description
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleInputChange}
                placeholder="Enter product description (optional)"
                rows={3}
                className="w-full p-3 rounded-lg bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all resize-vertical"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t border-slate-700/50">
            <button
              onClick={handleSubmit}
              disabled={loading || !selectedCollaborator}
              className="flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-medium rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
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
                editingId ? '✏️ Update Product' : '📦 Add Product'
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

      {/* Products List */}
      <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-xl">
        <div className="p-6 border-b border-slate-700/50">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <span className="mr-2">🛍️</span>
            Products ({products.length})
          </h2>
        </div>

        <div className="p-6">
          {products.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-slate-400 text-lg">No products found</p>
              <p className="text-slate-500">Add products to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <div
                  key={product.product_id}
                  className="bg-slate-700/30 rounded-lg border border-slate-600/30 overflow-hidden hover:bg-slate-700/50 transition-all duration-200 group"
                >
                  {/* Product Image */}
                  <div className="relative h-40 bg-slate-600/30">
                  {/**   <img
                      src={product.image_url || '/placeholder.png'}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    /> **/}

                    <Image
  src={product.image_url || '/placeholder.png'}
  alt={product.name}
  width={500} // ← replace with your actual size
  height={300} // ← replace with your actual size
  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"

/>
                    <div className="absolute top-2 right-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        product.status === 'active' 
                          ? 'bg-green-900/70 text-green-300 border border-green-500/30' 
                          : 'bg-red-900/70 text-red-300 border border-red-500/30'
                      }`}>
                        {product.status === 'active' ? '✅' : '❌'}
                      </span>
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-white mb-1 line-clamp-2">
                      {product.name}
                    </h3>
                    
                    <div className="space-y-1 text-sm mb-3">
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Category:</span>
                        <span className="text-emerald-300">{product.category}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Price:</span>
                        <span className="text-emerald-300 font-medium">₹{parseFloat(product.unit_price).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Stock:</span>
                        <span className={`${product.stock_quantity < 10 ? 'text-red-300' : 'text-slate-300'}`}>
                          {product.stock_quantity}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Min Order:</span>
                        <span>{product.min_order_quantity}</span>
                      </div>
                      {product.sku && (
                        <div className="flex items-center justify-between text-slate-300">
                          <span>SKU:</span>
                          <span className="text-xs bg-slate-600/50 px-2 py-1 rounded">{product.sku}</span>
                        </div>
                      )}
                    </div>

                    {product.description && (
                      <p className="text-slate-400 text-xs mb-3 line-clamp-2">
                        {product.description}
                      </p>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors duration-200"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDelete(product.product_id)}
                        disabled={deleting === product.product_id}
                        className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white text-sm font-medium rounded-md transition-colors duration-200 disabled:cursor-not-allowed"
                      >
                        {deleting === product.product_id ? (
                          <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          </span>
                        ) : (
                          '🗑️ Delete'
                        )}
                      </button>
                    </div>
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

export default Products;
