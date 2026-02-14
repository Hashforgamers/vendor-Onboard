'use client';

import { useEffect, useState } from 'react';
import { Upload, Clock, MapPin, Phone, Building, FileText, GamepadIcon, Check, X, User, Lock, Key } from 'lucide-react';

const VendorOnboardingForm = () => {
  const [formData, setFormData] = useState({
    cafe_name: '',
    owner_name: '',
    vendor_account_email: '',
    vendor_pin: '',
    vendor_password: '',
    contact_info: {
      email: '',
      phone: '',
      website: ''
    },
    physicalAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    business_registration_details: {
      registration_number: '',
      business_type: '',
      tax_id: ''
    },
    timing: {
      mon: { open: '09:00', close: '22:00', closed: false },
      tue: { open: '09:00', close: '22:00', closed: false },
      wed: { open: '09:00', close: '22:00', closed: false },
      thu: { open: '09:00', close: '22:00', closed: false },
      fri: { open: '09:00', close: '22:00', closed: false },
      sat: { open: '09:00', close: '23:00', closed: false },
      sun: { open: '10:00', close: '22:00', closed: false }
    },
    opening_day: '',
    available_games: []
  });

  const [documents, setDocuments] = useState({
    business_registration: null,
    owner_identification_proof: null,
    tax_identification_number: null,
    bank_acc_details: null
  });

  const [documentSubmitted, setDocumentSubmitted] = useState({
    business_registration: false,
    owner_identification_proof: false,
    tax_identification_number: false,
    bank_acc_details: false
  });

  const [games, setGames] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const gameOptions = [
    'pc','ps5','xbox','vr'
  ];

  // ✅ UPDATED: Use abbreviated day names to match backend
  const weekDays = [
    { key: 'mon', label: 'Monday' },
    { key: 'tue', label: 'Tuesday' },
    { key: 'wed', label: 'Wednesday' },
    { key: 'thu', label: 'Thursday' },
    { key: 'fri', label: 'Friday' },
    { key: 'sat', label: 'Saturday' },
    { key: 'sun', label: 'Sunday' }
  ];

  const convertTo12HourFormat = (time24) => {
    if (!time24 || time24 === '') {
      return null;
    }
    
    try {
      const [hours, minutes] = time24.split(':');
      const hour = parseInt(hours, 10);
      
      if (isNaN(hour) || hour < 0 || hour > 23) {
        console.error('Invalid hour:', hours);
        return null;
      }
      
      const period = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const paddedHour = hour12.toString().padStart(2, '0'); // ✅ Zero-padded
      
      return `${paddedHour}:${minutes} ${period}`;
    } catch (error) {
      console.error('Error converting time:', time24, error);
      return null;
    }
  };

  const validateForm = () => {
    const errors = [];
    
    if (!formData.cafe_name.trim()) errors.push('Cafe name is required');
    if (!formData.owner_name.trim()) errors.push('Owner name is required');
    if (!formData.vendor_account_email.trim()) errors.push('Account email is required');
    if (!formData.contact_info.email.trim()) errors.push('Contact email is required');
    if (!formData.contact_info.phone.trim()) errors.push('Phone is required');
    if (!formData.opening_day) errors.push('Opening date is required');
    if (!formData.physicalAddress.street.trim()) errors.push('Street address is required');
    if (!formData.physicalAddress.city.trim()) errors.push('City is required');
    if (!formData.physicalAddress.state.trim()) errors.push('State is required');
    if (!formData.physicalAddress.zipCode.trim()) errors.push('ZIP code is required');
    if (!formData.physicalAddress.country.trim()) errors.push('Country is required');
    if (!formData.business_registration_details.registration_number.trim()) errors.push('Registration number is required');
    if (!formData.business_registration_details.business_type) errors.push('Business type is required');
    if (!formData.business_registration_details.tax_id.trim()) errors.push('Tax ID is required');
    
    // ✅ UPDATED: Validate 4-digit PIN
    if (formData.vendor_pin && formData.vendor_pin.trim()) {
      if (!/^\d{4}$/.test(formData.vendor_pin.trim())) {
        errors.push('PIN must be exactly 4 digits');
      }
    }
    
    // ✅ Validate password if provided
    if (formData.vendor_password && formData.vendor_password.trim()) {
      if (formData.vendor_password.trim().length < 6) {
        errors.push('Password must be at least 6 characters');
      }
    }
    
    // ✅ UPDATED: Check abbreviated day names
    const hasOpenDays = weekDays.some(day => !formData.timing[day.key].closed);
    if (!hasOpenDays) errors.push('At least one day must be open');
    
    weekDays.forEach(day => {
      const timing = formData.timing[day.key];
      if (!timing.closed) {
        if (!timing.open) errors.push(`${day.label}: Opening time is required`);
        if (!timing.close) errors.push(`${day.label}: Closing time is required`);
        if (timing.open && timing.close && timing.open >= timing.close) {
          errors.push(`${day.label}: Opening time must be before closing time`);
        }
      }
    });
    
    if (games.length === 0) errors.push('At least one game must be added');
    
    games.forEach((game, index) => {
      if (!game.name) errors.push(`Game ${index + 1}: Name is required`);
      if (!game.total_slot || game.total_slot <= 0) errors.push(`Game ${index + 1}: Total slots must be greater than 0`);
      if (!game.rate_per_slot || game.rate_per_slot <= 0) errors.push(`Game ${index + 1}: Rate per slot must be greater than 0`);
    });
    
    const requiredDocs = Object.keys(documents);
    requiredDocs.forEach(docType => {
      if (!documents[docType]) {
        const docName = docType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        errors.push(`${docName} is required`);
      }
    });
    
    return errors;
  };

  useEffect(()=>{
     console.log(process.env.VENDOR_ONBOARD_URL)
  },[])

  const handleInputChange = (section, field, value) => {
    if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleTimingChange = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      timing: {
        ...prev.timing,
        [day]: {
          ...prev.timing[day],
          [field]: value
        }
      }
    }));
  };

  const handleFileChange = (docType, file) => {
    setDocuments(prev => ({
      ...prev,
      [docType]: file
    }));
    setDocumentSubmitted(prev => ({
      ...prev,
      [docType]: !!file
    }));
  };

  const addGame = () => {
    setGames(prev => [...prev, {
      name: '',
      total_slot: '',
      rate_per_slot: '',
      gaming_type: 'PC'
    }]);
  };

  const updateGame = (index, field, value) => {
    setGames(prev => prev.map((game, i) => 
      i === index ? { ...game, [field]: value } : game
    ));
  };

  const removeGame = (index) => {
    setGames(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setFormData({
      cafe_name: '',
      owner_name: '',
      vendor_account_email: '',
      vendor_pin: '',
      vendor_password: '',
      contact_info: { email: '', phone: '', website: '' },
      physicalAddress: { street: '', city: '', state: '', zipCode: '', country: '' },
      business_registration_details: { registration_number: '', business_type: '', tax_id: '' },
      timing: {
        mon: { open: '09:00', close: '22:00', closed: false },
        tue: { open: '09:00', close: '22:00', closed: false },
        wed: { open: '09:00', close: '22:00', closed: false },
        thu: { open: '09:00', close: '22:00', closed: false },
        fri: { open: '09:00', close: '22:00', closed: false },
        sat: { open: '09:00', close: '23:00', closed: false },
        sun: { open: '10:00', close: '22:00', closed: false }
      },
      opening_day: '',
      available_games: []
    });
    setGames([]);
    setDocuments({
      business_registration: null,
      owner_identification_proof: null,
      tax_identification_number: null,
      bank_acc_details: null
    });
    setDocumentSubmitted({
      business_registration: false,
      owner_identification_proof: false,
      tax_identification_number: false,
      bank_acc_details: false
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setSubmitStatus({ 
        type: 'error', 
        message: `Please fix the following errors:\n• ${validationErrors.join('\n• ')}` 
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const formDataToSend = new FormData();
      
      const processedTiming = {};
      
      // ✅ UPDATED: Use abbreviated day names
      weekDays.forEach(day => {
        const dayTiming = formData.timing[day.key];
        
        if (dayTiming.closed) {
          processedTiming[day.key] = {
            open: null,
            close: null,
            closed: true
          };
        } else {
          const openTime = convertTo12HourFormat(dayTiming.open);
          const closeTime = convertTo12HourFormat(dayTiming.close);
          
          processedTiming[day.key] = {
            open: openTime,
            close: closeTime,
            closed: false
          };
          
          if (!openTime || !closeTime) {
            throw new Error(`Invalid timing for ${day.label}: open=${dayTiming.open}, close=${dayTiming.close}`);
          }
        }
      });
      
      const jsonData = {
        cafe_name: formData.cafe_name.trim(),
        owner_name: formData.owner_name.trim(),
        vendor_account_email: formData.vendor_account_email.trim(),
        vendor_pin: formData.vendor_pin.trim() || null,
        vendor_password: formData.vendor_password.trim() || null,
        contact_info: {
          email: formData.contact_info.email.trim(),
          phone: formData.contact_info.phone.trim(),
          website: formData.contact_info.website.trim() || null
        },
        physicalAddress: {
          street: formData.physicalAddress.street.trim(),
          city: formData.physicalAddress.city.trim(),
          state: formData.physicalAddress.state.trim(),
          zipCode: formData.physicalAddress.zipCode.trim(),
          country: formData.physicalAddress.country.trim()
        },
        business_registration_details: {
          registration_number: formData.business_registration_details.registration_number.trim(),
          business_type: formData.business_registration_details.business_type,
          tax_id: formData.business_registration_details.tax_id.trim()
        },
        timing: processedTiming,
        opening_day: formData.opening_day,
        available_games: games.map(game => ({
          name: game.name,
          total_slot: parseInt(game.total_slot, 10),
          rate_per_slot: parseFloat(game.rate_per_slot),
          gaming_type: game.gaming_type || 'PC'
        })),
        document_submitted: documentSubmitted
      };

      console.log('Processed timing data:', processedTiming);
      console.log('Complete form data being sent:', jsonData);

      formDataToSend.append('json', JSON.stringify(jsonData));

      Object.entries(documents).forEach(([docType, file]) => {
        if (file) {
          formDataToSend.append(docType, file);
        }
      });

      console.log('Files being sent:', Object.keys(documents).filter(key => documents[key]));

      const response = await fetch(`https://hfg-onboard.onrender.com/api/onboard`, {
        method: 'POST',
        body: formDataToSend
      });

      const result = await response.json();
      console.log('Response from server:', result);

      if (response.ok) {
        setSubmitStatus({ 
          type: 'success', 
          message: 'Vendor onboarded successfully! Check your email for credentials and further instructions.' 
        });
        
        resetForm();
        
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
        
      } else {
        setSubmitStatus({ 
          type: 'error', 
          message: result.message || result.error || 'Failed to onboard vendor. Please try again.' 
        });
      }
    } catch (error) {
      console.error('Submission error:', error);
      setSubmitStatus({ 
        type: 'error', 
        message: `Error: ${error.message}. Please check your data and try again.` 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 py-6">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-2">
            <GamepadIcon className="h-8 w-8 text-blue-400 mr-2" />
            <h1 className="text-2xl font-bold text-white">Hash for Gamers</h1>
          </div>
          <p className="text-slate-400 text-sm">Vendor Onboarding Portal</p>
        </div>

        {submitStatus && (
          <div className={`mb-4 p-3 rounded-lg ${submitStatus.type === 'success' ? 'bg-green-900 border border-green-600' : 'bg-red-900 border border-red-600'}`}>
            <div className="flex items-start">
              {submitStatus.type === 'success' ? (
                <Check className="h-4 w-4 mr-2 text-green-400 flex-shrink-0 mt-0.5" />
              ) : (
                <X className="h-4 w-4 mr-2 text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <div className={`text-sm ${submitStatus.type === 'success' ? 'text-green-200' : 'text-red-200'}`}>
                <pre className="whitespace-pre-wrap font-sans">{submitStatus.message}</pre>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Account Information Section */}
          <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center mb-3">
              <User className="h-5 w-5 text-blue-400 mr-2" />
              <h2 className="text-lg font-semibold text-white">Account Information</h2>
            </div>
            <div className="bg-blue-900/20 border border-blue-700/50 rounded p-3 mb-3">
              <p className="text-blue-300 text-xs">
                <strong>Account Email:</strong> This email will be used for login and managing multiple cafes. 
                If you already have an account, use the same email to link this cafe to your existing account.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-3">
                <label className="block mb-1 text-white text-sm font-medium">Account Email (Login) *</label>
                <input
                  type="email"
                  required
                  value={formData.vendor_account_email}
                  onChange={(e) => handleInputChange(null, 'vendor_account_email', e.target.value)}
                  className="w-full p-2 text-sm rounded border border-slate-700 bg-slate-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter account email for login"
                />
                <p className="text-xs text-slate-400 mt-1">Use existing email to link multiple cafes to one account</p>
              </div>

              {/* ✅ UPDATED: 4-digit PIN */}
              <div>
                <label className="block mb-1 text-white text-sm font-medium">
                  <div className="flex items-center">
                    <Key className="h-3 w-3 mr-1" />
                    Vendor PIN (Optional - 4 digits)
                  </div>
                </label>
                <input
                  type="text"
                  maxLength="4"
                  pattern="\d{4}"
                  value={formData.vendor_pin}
                  onChange={(e) => handleInputChange(null, 'vendor_pin', e.target.value.replace(/\D/g, ''))}
                  className="w-full p-2 text-sm rounded border border-slate-700 bg-slate-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter 4-digit PIN"
                />
                <p className="text-xs text-slate-400 mt-1">Leave empty to auto-generate</p>
              </div>

              {/* Optional Password Field */}
              <div className="md:col-span-2">
                <label className="block mb-1 text-white text-sm font-medium">
                  <div className="flex items-center">
                    <Lock className="h-3 w-3 mr-1" />
                    Vendor Password (Optional - min 6 chars)
                  </div>
                </label>
                <input
                  type="text"
                  value={formData.vendor_password}
                  onChange={(e) => handleInputChange(null, 'vendor_password', e.target.value)}
                  className="w-full p-2 text-sm rounded border border-slate-700 bg-slate-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter password (min 6 characters)"
                />
                <p className="text-xs text-slate-400 mt-1">Leave empty to auto-generate</p>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center mb-3">
              <Building className="h-5 w-5 text-blue-400 mr-2" />
              <h2 className="text-lg font-semibold text-white">Basic Information</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block mb-1 text-white text-sm font-medium">Cafe Name *</label>
                <input
                  type="text"
                  required
                  value={formData.cafe_name}
                  onChange={(e) => handleInputChange(null, 'cafe_name', e.target.value)}
                  className="w-full p-2 text-sm rounded border border-slate-700 bg-slate-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter cafe name"
                />
              </div>
              <div>
                <label className="block mb-1 text-white text-sm font-medium">Owner Name *</label>
                <input
                  type="text"
                  required
                  value={formData.owner_name}
                  onChange={(e) => handleInputChange(null, 'owner_name', e.target.value)}
                  className="w-full p-2 text-sm rounded border border-slate-700 bg-slate-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter owner name"
                />
              </div>
              <div>
                <label className="block mb-1 text-white text-sm font-medium">Opening Date *</label>
                <input
                  type="date"
                  required
                  value={formData.opening_day}
                  onChange={(e) => handleInputChange(null, 'opening_day', e.target.value)}
                  className="w-full p-2 text-sm rounded border border-slate-700 bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center mb-3">
              <Phone className="h-5 w-5 text-blue-400 mr-2" />
              <h2 className="text-lg font-semibold text-white">Contact Information</h2>
            </div>
            <div className="bg-amber-900/20 border border-amber-700/50 rounded p-3 mb-3">
              <p className="text-amber-300 text-xs">
                <strong>Contact Email:</strong> This is the operational email for this specific cafe (can be different from account email).
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block mb-1 text-white text-sm font-medium">Contact Email *</label>
                <input
                  type="email"
                  required
                  value={formData.contact_info.email}
                  onChange={(e) => handleInputChange('contact_info', 'email', e.target.value)}
                  className="w-full p-2 text-sm rounded border border-slate-700 bg-slate-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Operational contact email"
                />
              </div>
              <div>
                <label className="block mb-1 text-white text-sm font-medium">Phone *</label>
                <input
                  type="tel"
                  required
                  value={formData.contact_info.phone}
                  onChange={(e) => handleInputChange('contact_info', 'phone', e.target.value)}
                  className="w-full p-2 text-sm rounded border border-slate-700 bg-slate-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter phone"
                />
              </div>
              <div>
                <label className="block mb-1 text-white text-sm font-medium">Website</label>
                <input
                  type="url"
                  value={formData.contact_info.website}
                  onChange={(e) => handleInputChange('contact_info', 'website', e.target.value)}
                  className="w-full p-2 text-sm rounded border border-slate-700 bg-slate-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Website (optional)"
                />
              </div>
            </div>
          </div>

          {/* Physical Address */}
          <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center mb-3">
              <MapPin className="h-5 w-5 text-blue-400 mr-2" />
              <h2 className="text-lg font-semibold text-white">Physical Address</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block mb-1 text-white text-sm font-medium">Street Address *</label>
                <input
                  type="text"
                  required
                  value={formData.physicalAddress.street}
                  onChange={(e) => handleInputChange('physicalAddress', 'street', e.target.value)}
                  className="w-full p-2 text-sm rounded border border-slate-700 bg-slate-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter street address"
                />
              </div>
              <div>
                <label className="block mb-1 text-white text-sm font-medium">City *</label>
                <input
                  type="text"
                  required
                  value={formData.physicalAddress.city}
                  onChange={(e) => handleInputChange('physicalAddress', 'city', e.target.value)}
                  className="w-full p-2 text-sm rounded border border-slate-700 bg-slate-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="City"
                />
              </div>
              <div>
                <label className="block mb-1 text-white text-sm font-medium">State *</label>
                <input
                  type="text"
                  required
                  value={formData.physicalAddress.state}
                  onChange={(e) => handleInputChange('physicalAddress', 'state', e.target.value)}
                  className="w-full p-2 text-sm rounded border border-slate-700 bg-slate-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="State"
                />
              </div>
              <div>
                <label className="block mb-1 text-white text-sm font-medium">ZIP Code *</label>
                <input
                  type="text"
                  required
                  value={formData.physicalAddress.zipCode}
                  onChange={(e) => handleInputChange('physicalAddress', 'zipCode', e.target.value)}
                  className="w-full p-2 text-sm rounded border border-slate-700 bg-slate-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ZIP"
                />
              </div>
              <div>
                <label className="block mb-1 text-white text-sm font-medium">Country *</label>
                <input
                  type="text"
                  required
                  value={formData.physicalAddress.country}
                  onChange={(e) => handleInputChange('physicalAddress', 'country', e.target.value)}
                  className="w-full p-2 text-sm rounded border border-slate-700 bg-slate-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Country"
                />
              </div>
            </div>
          </div>

          {/* Business Registration */}
          <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center mb-3">
              <FileText className="h-5 w-5 text-blue-400 mr-2" />
              <h2 className="text-lg font-semibold text-white">Business Registration</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block mb-1 text-white text-sm font-medium">Registration Number *</label>
                <input
                  type="text"
                  required
                  value={formData.business_registration_details.registration_number}
                  onChange={(e) => handleInputChange('business_registration_details', 'registration_number', e.target.value)}
                  className="w-full p-2 text-sm rounded border border-slate-700 bg-slate-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Registration number"
                />
              </div>
              <div>
                <label className="block mb-1 text-white text-sm font-medium">Business Type *</label>
                <select
                  required
                  value={formData.business_registration_details.business_type}
                  onChange={(e) => handleInputChange('business_registration_details', 'business_type', e.target.value)}
                  className="w-full p-2 text-sm rounded border border-slate-700 bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select type</option>
                  <option value="Gaming Cafe">Gaming Cafe</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 text-white text-sm font-medium">Tax ID *</label>
                <input
                  type="text"
                  required
                  value={formData.business_registration_details.tax_id}
                  onChange={(e) => handleInputChange('business_registration_details', 'tax_id', e.target.value)}
                  className="w-full p-2 text-sm rounded border border-slate-700 bg-slate-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tax ID"
                />
              </div>
            </div>
          </div>

          {/* ✅ UPDATED: Operating Hours with abbreviated day names */}
          <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center mb-3">
              <Clock className="h-5 w-5 text-blue-400 mr-2" />
              <h2 className="text-lg font-semibold text-white">Operating Hours</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {weekDays.map((day) => (
                <div key={day.key} className="flex items-center justify-between p-2 bg-slate-800 rounded border border-slate-700">
                  <div className="flex items-center space-x-2">
                    <span className="text-white text-sm w-16">{day.label}</span>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.timing[day.key].closed}
                        onChange={(e) => handleTimingChange(day.key, 'closed', e.target.checked)}
                        className="mr-1 w-3 h-3 text-blue-600 rounded border-slate-600 bg-slate-700"
                      />
                      <span className="text-slate-400 text-xs">Closed</span>
                    </label>
                  </div>
                  {!formData.timing[day.key].closed && (
                    <div className="flex items-center space-x-1">
                      <input
                        type="time"
                        value={formData.timing[day.key].open}
                        onChange={(e) => handleTimingChange(day.key, 'open', e.target.value)}
                        className="p-1 text-xs bg-slate-700 border border-slate-600 rounded text-white w-20"
                        required={!formData.timing[day.key].closed}
                      />
                      <span className="text-slate-400 text-xs">to</span>
                      <input
                        type="time"
                        value={formData.timing[day.key].close}
                        onChange={(e) => handleTimingChange(day.key, 'close', e.target.value)}
                        className="p-1 text-xs bg-slate-700 border border-slate-600 rounded text-white w-20"
                        required={!formData.timing[day.key].closed}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Available Games */}
          <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <GamepadIcon className="h-5 w-5 text-blue-400 mr-2" />
                <h2 className="text-lg font-semibold text-white">Available Games</h2>
              </div>
              <button
                type="button"
                onClick={addGame}
                className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
              >
                Add Game
              </button>
            </div>
            <div className="space-y-2">
              {games.map((game, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 p-2 bg-slate-800 rounded border border-slate-700">
                  <div>
                    <label className="block mb-1 text-white text-xs">Game *</label>
                    <select
                      value={game.name}
                      onChange={(e) => updateGame(index, 'name', e.target.value)}
                      className="w-full p-1 text-xs rounded border border-slate-600 bg-slate-700 text-white"
                      required
                    >
                      <option value="">Select game</option>
                      {gameOptions.map(gameName => (
                        <option key={gameName} value={gameName}>{gameName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 text-white text-xs">Slots *</label>
                    <input
                      type="number"
                      min="1"
                      value={game.total_slot}
                      onChange={(e) => updateGame(index, 'total_slot', e.target.value)}
                      className="w-full p-1 text-xs rounded border border-slate-600 bg-slate-700 text-white"
                      placeholder="Number"
                      required
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-white text-xs">Rate (₹/hr) *</label>
                    <input
                      type="number"
                      min="1"
                      value={game.rate_per_slot}
                      onChange={(e) => updateGame(index, 'rate_per_slot', e.target.value)}
                      className="w-full p-1 text-xs rounded border border-slate-600 bg-slate-700 text-white"
                      placeholder="Price"
                      required
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeGame(index)}
                      className="w-full p-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Document Upload */}
          <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center mb-3">
              <Upload className="h-5 w-5 text-blue-400 mr-2" />
              <h2 className="text-lg font-semibold text-white">Required Documents</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.keys(documents).map((docType) => (
                <div key={docType}>
                  <label className="block mb-1 text-white text-sm font-medium">
                    {docType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} *
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={(e) => handleFileChange(docType, e.target.files[0])}
                      className="hidden"
                      id={docType}
                      required
                    />
                    <label
                      htmlFor={docType}
                      className="flex-1 p-2 text-sm bg-slate-800 border border-slate-700 rounded text-slate-400 cursor-pointer hover:border-blue-500 truncate"
                    >
                      {documents[docType] ? documents[docType].name : 'Choose file...'}
                    </label>
                    {documents[docType] && (
                      <Check className="h-4 w-4 text-green-400" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">PDF, JPG, PNG, DOC, DOCX (Max 10MB)</p>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="text-center pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </span>
              ) : (
                'Submit Application'
              )}
            </button>
            <div className="text-center text-slate-400 text-xs mt-2">
              <p>By submitting, you agree to our terms and conditions.</p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VendorOnboardingForm;
