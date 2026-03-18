'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  BadgeCheck,
  Building2,
  ClipboardCheck,
  Handshake,
  Package,
  RefreshCcw,
  Settings2,
  UserPlus,
  Wallet,
} from 'lucide-react';

type ModuleId =
  | 'onboard'
  | 'cafes'
  | 'verification'
  | 'settlements'
  | 'collaborators'
  | 'products'
  | 'subscriptions';

type ApiError = { message?: string; error?: string; details?: unknown };

type VendorRow = {
  vendor_id: number;
  cafe_name: string;
  owner_name: string;
  status: string;
  email?: string;
  phone?: string;
  documents?: {
    total: number;
    verified: number;
    pending: number;
    is_fully_verified: boolean;
  };
  subscription?: {
    status: string;
    is_active: boolean;
    package?: { name?: string; code?: string; pc_limit?: number } | null;
    amount_paid?: number;
    period_end?: string | null;
  };
  credentials?: {
    pin?: string;
    password?: {
      has_password?: boolean;
      masked_preview?: string | null;
      is_hashed?: boolean;
    };
  };
  team_access?: { total: number; active: number };
};

type VendorDetail = {
  vendor_id: number;
  cafe_name: string;
  owner_name: string;
  description?: string;
  status: string;
  account_email?: string | null;
  contact?: { email?: string | null; phone?: string | null };
  address?: {
    addressLine1?: string | null;
    addressLine2?: string | null;
    state?: string | null;
    pincode?: string | null;
    country?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
  credentials?: {
    vendor_pin?: string | null;
    password?: {
      has_password?: boolean;
      is_hashed?: boolean;
      masked_preview?: string | null;
    };
  };
  documents: Array<{
    id: number;
    document_type: string;
    document_url: string;
    status: string;
    uploaded_at?: string;
  }>;
  subscriptions?: Array<{
    id: number;
    status: string;
    amount_paid: number;
    period_start: string;
    period_end: string;
    package?: { name?: string; code?: string; pc_limit?: number };
  }>;
  team_access?: {
    available: boolean;
    staff: Array<{
      id: number;
      name: string;
      role: string;
      pin_code?: string;
      is_active: boolean;
      created_at?: string;
    }>;
    role_permissions?: Record<string, string[]>;
  };
};

type Collaborator = {
  collaborator_id: string;
  name: string;
  brand_name: string;
  email: string;
  phone?: string;
  commission_type: string;
  commission_value: string;
  min_order_quantity: number;
  status: string;
};

type Product = {
  product_id: string;
  name: string;
  category: string;
  unit_price: string;
  stock_quantity: number;
  min_order_quantity: number;
  status: string;
  description?: string;
  image_url?: string;
  sku?: string;
};

const emptySettlementSummary = {
  vendors: 0,
  total_app_collected: 0,
  total_pending_settlement: 0,
  total_already_settled: 0,
};

const weekDays = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
] as const;

const navItems: Array<{ id: ModuleId; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { id: 'onboard', label: 'Onboard New Cafe', icon: UserPlus },
  { id: 'cafes', label: 'Cafe Registry', icon: Building2 },
  { id: 'verification', label: 'Verification Desk', icon: ClipboardCheck },
  { id: 'settlements', label: 'Day-End Settlements', icon: Wallet },
  { id: 'collaborators', label: 'Collaborators', icon: Handshake },
  { id: 'products', label: 'Collaborator Products', icon: Package },
  { id: 'subscriptions', label: 'Subscriptions', icon: Settings2 },
];

function to12h(time24: string) {
  const [h, m] = (time24 || '').split(':');
  const hour = Number(h);
  if (Number.isNaN(hour)) return '';
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(h12).padStart(2, '0')}:${m || '00'} ${period}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/backend/${path}`, {
    ...init,
    cache: 'no-store',
  });

  const text = await response.text();
  const data = text ? (() => {
    try {
      return JSON.parse(text);
    } catch {
      return { message: text };
    }
  })() : {};

  if (!response.ok) {
    const err = data as ApiError;
    throw new Error(err.message || err.error || `Request failed (${response.status})`);
  }

  return data as T;
}

function ErrorBanner({ message }: { message: string }) {
  return <div className="error-banner">{message}</div>;
}

function LoadingRow({ text = 'Loading...' }: { text?: string }) {
  return <div className="muted-line">{text}</div>;
}

function SectionHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="section-header">
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <div className="section-actions">{actions}</div> : null}
    </div>
  );
}

function OnboardPanel() {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [games, setGames] = useState([
    { name: 'pc', total_slot: '4', rate_per_slot: '120' },
    { name: 'ps5', total_slot: '2', rate_per_slot: '180' },
  ]);

  const [form, setForm] = useState({
    cafe_name: '',
    owner_name: '',
    vendor_account_email: '',
    vendor_pin: '',
    vendor_password: '',
    contact_email: '',
    contact_phone: '',
    website: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'India',
    registration_number: '',
    business_type: 'private_limited',
    tax_id: '',
    opening_day: todayIso(),
    slot_duration: '30',
  });

  const [timings, setTimings] = useState<Record<string, { open: string; close: string; closed: boolean }>>(
    Object.fromEntries(weekDays.map((d) => [d.key, { open: '09:00', close: '23:00', closed: false }]))
  );

  const [files, setFiles] = useState<Record<string, File | null>>({
    business_registration: null,
    owner_identification_proof: null,
    tax_identification_number: null,
    bank_acc_details: null,
  });

  const [amenities, setAmenities] = useState<Record<string, boolean>>({
    parking: false,
    seating_area: true,
    sound_system: false,
    washroom: true,
    air_conditioner: true,
    food: false,
    '24/7': false,
  });

  const addGame = () => {
    setGames((prev) => [...prev, { name: 'xbox', total_slot: '1', rate_per_slot: '150' }]);
  };

  const removeGame = (index: number) => {
    setGames((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = async () => {
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      if (!form.cafe_name || !form.owner_name || !form.vendor_account_email || !form.contact_email) {
        throw new Error('Cafe name, owner name and emails are required');
      }

      if (!/^\d{4}$/.test(form.vendor_pin || '')) {
        throw new Error('Vendor PIN must be exactly 4 digits');
      }

      if (!/^\d{10}$/.test((form.contact_phone || '').replace(/\D/g, ''))) {
        throw new Error('Contact phone must be exactly 10 digits');
      }

      const available_games = games
        .filter((g) => Number(g.total_slot) > 0 && Number(g.rate_per_slot) > 0)
        .map((g) => ({
          name: g.name,
          total_slot: Number(g.total_slot),
          rate_per_slot: Number(g.rate_per_slot),
        }));

      if (!available_games.length) {
        throw new Error('Add at least one valid inventory game row');
      }

      const payload = {
        cafe_name: form.cafe_name,
        owner_name: form.owner_name,
        vendor_account_email: form.vendor_account_email.toLowerCase(),
        vendor_pin: form.vendor_pin,
        vendor_password: form.vendor_password || undefined,
        contact_info: {
          email: form.contact_email.toLowerCase(),
          phone: form.contact_phone.replace(/\D/g, ''),
          website: form.website || undefined,
        },
        physicalAddress: {
          street: form.street,
          city: form.city,
          state: form.state,
          zipCode: form.zipCode,
          country: form.country,
        },
        business_registration_details: {
          registration_number: form.registration_number,
          business_type: form.business_type,
          tax_id: form.tax_id,
          registration_date: form.opening_day,
        },
        document_submitted: Object.fromEntries(
          Object.entries(files).map(([k, v]) => [k, Boolean(v)])
        ),
        timing: Object.fromEntries(
          Object.entries(timings).map(([day, value]) => [day, {
            open: to12h(value.open),
            close: to12h(value.close),
            closed: value.closed,
          }])
        ),
        opening_day: form.opening_day,
        slot_duration: Number(form.slot_duration),
        amenities,
        available_games,
      };

      const body = new FormData();
      body.append('json', JSON.stringify(payload));
      for (const [key, file] of Object.entries(files)) {
        if (file) body.append(key, file);
      }

      const response = await apiRequest<{ message?: string; vendor_id?: number }>('onboard', {
        method: 'POST',
        body,
      });

      setMessage(response.message || 'Cafe onboarded successfully.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to onboard cafe');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="panel">
      <div className="onboard-logo-banner">
        <Image
          src="/hash-logo.png"
          alt="Hash For Gamers Logo"
          width={56}
          height={56}
          className="hash-logo hash-logo-lg"
          priority
        />
        <div>
          <strong>Hash For Gamers</strong>
          <small>New Vendor Onboarding</small>
        </div>
      </div>

      <SectionHeader
        title="Onboard New Cafe"
        subtitle="Create a new vendor with inventory, operating hours, amenities, and documents."
        actions={<button className="btn-primary" onClick={submit} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Onboarding'}</button>}
      />

      {error ? <ErrorBanner message={error} /> : null}
      {message ? <div className="success-banner">{message}</div> : null}

      <div className="form-grid">
        <label>
          Cafe Name
          <input value={form.cafe_name} onChange={(e) => setForm((p) => ({ ...p, cafe_name: e.target.value }))} />
        </label>
        <label>
          Owner Name
          <input value={form.owner_name} onChange={(e) => setForm((p) => ({ ...p, owner_name: e.target.value }))} />
        </label>
        <label>
          Parent Account Email
          <input type="email" value={form.vendor_account_email} onChange={(e) => setForm((p) => ({ ...p, vendor_account_email: e.target.value }))} />
        </label>
        <label>
          Contact Email
          <input type="email" value={form.contact_email} onChange={(e) => setForm((p) => ({ ...p, contact_email: e.target.value }))} />
        </label>
        <label>
          Contact Phone (10 digits)
          <input value={form.contact_phone} maxLength={10} onChange={(e) => setForm((p) => ({ ...p, contact_phone: e.target.value.replace(/\D/g, '') }))} />
        </label>
        <label>
          Vendor PIN
          <input value={form.vendor_pin} maxLength={4} onChange={(e) => setForm((p) => ({ ...p, vendor_pin: e.target.value.replace(/\D/g, '') }))} />
        </label>
        <label>
          Temporary Password (optional)
          <input type="text" value={form.vendor_password} onChange={(e) => setForm((p) => ({ ...p, vendor_password: e.target.value }))} />
        </label>
        <label>
          Website
          <input value={form.website} onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))} />
        </label>
        <label>
          Street
          <input value={form.street} onChange={(e) => setForm((p) => ({ ...p, street: e.target.value }))} />
        </label>
        <label>
          City
          <input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
        </label>
        <label>
          State
          <input value={form.state} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))} />
        </label>
        <label>
          Pincode
          <input value={form.zipCode} onChange={(e) => setForm((p) => ({ ...p, zipCode: e.target.value.replace(/\D/g, '') }))} />
        </label>
        <label>
          Country
          <input value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} />
        </label>
        <label>
          Opening Date
          <input type="date" value={form.opening_day} onChange={(e) => setForm((p) => ({ ...p, opening_day: e.target.value }))} />
        </label>
        <label>
          Slot Duration (min)
          <select value={form.slot_duration} onChange={(e) => setForm((p) => ({ ...p, slot_duration: e.target.value }))}>
            <option value="30">30</option>
            <option value="60">60</option>
          </select>
        </label>
        <label>
          Registration Number
          <input value={form.registration_number} onChange={(e) => setForm((p) => ({ ...p, registration_number: e.target.value }))} />
        </label>
        <label>
          Business Type
          <select value={form.business_type} onChange={(e) => setForm((p) => ({ ...p, business_type: e.target.value }))}>
            <option value="private_limited">Private Limited</option>
            <option value="sole_proprietorship">Sole Proprietorship</option>
            <option value="partnership">Partnership</option>
            <option value="llp">LLP</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>
          Tax ID / GST
          <input value={form.tax_id} onChange={(e) => setForm((p) => ({ ...p, tax_id: e.target.value }))} />
        </label>
      </div>

      <div className="subsection">
        <h3>Inventory Setup</h3>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Count</th>
                <th>Rate / Slot</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {games.map((game, idx) => (
                <tr key={idx}>
                  <td>
                    <select value={game.name} onChange={(e) => setGames((prev) => prev.map((g, i) => i === idx ? { ...g, name: e.target.value } : g))}>
                      <option value="pc">PC</option>
                      <option value="ps5">PS5</option>
                      <option value="xbox">Xbox</option>
                      <option value="vr">VR</option>
                    </select>
                  </td>
                  <td><input value={game.total_slot} onChange={(e) => setGames((prev) => prev.map((g, i) => i === idx ? { ...g, total_slot: e.target.value.replace(/\D/g, '') } : g))} /></td>
                  <td><input value={game.rate_per_slot} onChange={(e) => setGames((prev) => prev.map((g, i) => i === idx ? { ...g, rate_per_slot: e.target.value.replace(/[^0-9.]/g, '') } : g))} /></td>
                  <td><button className="btn-ghost" onClick={() => removeGame(idx)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn-secondary" onClick={addGame}>Add Inventory Row</button>
      </div>

      <div className="subsection">
        <h3>Operating Hours</h3>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Day</th>
                <th>Closed</th>
                <th>Open</th>
                <th>Close</th>
              </tr>
            </thead>
            <tbody>
              {weekDays.map((day) => (
                <tr key={day.key}>
                  <td>{day.label}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={timings[day.key]?.closed || false}
                      onChange={(e) => setTimings((prev) => ({ ...prev, [day.key]: { ...prev[day.key], closed: e.target.checked } }))}
                    />
                  </td>
                  <td>
                    <input
                      type="time"
                      value={timings[day.key]?.open || '09:00'}
                      disabled={timings[day.key]?.closed}
                      onChange={(e) => setTimings((prev) => ({ ...prev, [day.key]: { ...prev[day.key], open: e.target.value } }))}
                    />
                  </td>
                  <td>
                    <input
                      type="time"
                      value={timings[day.key]?.close || '23:00'}
                      disabled={timings[day.key]?.closed}
                      onChange={(e) => setTimings((prev) => ({ ...prev, [day.key]: { ...prev[day.key], close: e.target.value } }))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="subsection">
        <h3>Amenities</h3>
        <div className="chip-grid">
          {Object.entries(amenities).map(([key, value]) => (
            <label key={key} className="chip">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => setAmenities((prev) => ({ ...prev, [key]: e.target.checked }))}
              />
              <span>{key}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="subsection">
        <h3>Documents</h3>
        <div className="form-grid">
          {Object.keys(files).map((docType) => (
            <label key={docType}>
              {docType.replaceAll('_', ' ')}
              <input
                type="file"
                onChange={(e) => setFiles((prev) => ({ ...prev, [docType]: e.target.files?.[0] || null }))}
              />
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}

function VendorsPanel({ verificationOnly = false }: { verificationOnly?: boolean }) {
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(verificationOnly ? 'pending_verification' : '');
  const [subscriptionState, setSubscriptionState] = useState('');

  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [vendorDetail, setVendorDetail] = useState<VendorDetail | null>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);
  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] = useState('staff');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: '1', per_page: '100' });
      if (search.trim()) params.set('search', search.trim());
      if (status) params.set('status', status);
      if (subscriptionState) params.set('subscription_state', subscriptionState);
      if (verificationOnly) params.set('verified_only', 'false');

      const data = await apiRequest<{ vendors: VendorRow[] }>(`admin/vendors?${params.toString()}`);
      setVendors(data.vendors || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch vendors');
    } finally {
      setLoading(false);
    }
  }, [search, status, subscriptionState, verificationOnly]);

  const loadDetail = useCallback(async (vendorId: number) => {
    setDetailLoading(true);
    setSelectedVendorId(vendorId);
    setSelectedDocIds([]);
    try {
      const data = await apiRequest<{ vendor: VendorDetail }>(`admin/vendors/${vendorId}`);
      setVendorDetail(data.vendor);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch vendor detail');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const refreshDetail = useCallback(async () => {
    if (!selectedVendorId) return;
    await loadDetail(selectedVendorId);
    await load();
  }, [selectedVendorId, loadDetail, load]);

  const updateStatus = async (vendorId: number, nextStatus: string) => {
    try {
      await apiRequest(`admin/vendors/${vendorId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      await load();
      if (selectedVendorId === vendorId) await refreshDetail();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update vendor status');
    }
  };

  const verifyDocs = async (statusValue: 'verified' | 'rejected' | 'unverified') => {
    if (!selectedVendorId || !selectedDocIds.length) return;
    try {
      await apiRequest(`admin/vendors/${selectedVendorId}/documents/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_ids: selectedDocIds, status: statusValue }),
      });
      await refreshDetail();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to verify documents');
    }
  };

  const resetPin = async () => {
    if (!selectedVendorId) return;
    const customPin = window.prompt('Enter new 4-digit PIN (leave blank for auto-generated):') || '';
    try {
      await apiRequest(`admin/vendors/${selectedVendorId}/credentials/reset-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: customPin || undefined }),
      });
      await refreshDetail();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reset pin');
    }
  };

  const resetPassword = async () => {
    if (!selectedVendorId) return;
    const customPassword = window.prompt('Enter temporary password (leave blank for auto-generated):') || '';
    try {
      const response = await apiRequest<{ data?: { temporary_password?: string } }>(
        `admin/vendors/${selectedVendorId}/credentials/reset-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: customPassword || undefined, notify: true }),
        }
      );
      const pwd = response.data?.temporary_password;
      if (pwd) {
        window.alert(`Temporary password set: ${pwd}`);
      }
      await refreshDetail();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reset password');
    }
  };

  const addStaff = async () => {
    if (!selectedVendorId) return;
    if (!staffName.trim()) return;

    try {
      await apiRequest(`admin/vendors/${selectedVendorId}/team-access/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: staffName.trim(), role: staffRole, is_active: true }),
      });
      setStaffName('');
      await refreshDetail();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add staff member');
    }
  };

  const toggleStaff = async (staffId: number, isActive: boolean) => {
    if (!selectedVendorId) return;
    try {
      await apiRequest(`admin/vendors/${selectedVendorId}/team-access/staff/${staffId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      });
      await refreshDetail();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update staff');
    }
  };

  const deleteStaff = async (staffId: number) => {
    if (!selectedVendorId) return;
    try {
      await apiRequest(`admin/vendors/${selectedVendorId}/team-access/staff/${staffId}`, {
        method: 'DELETE',
      });
      await refreshDetail();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove staff');
    }
  };

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => vendors.filter((v) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return [v.cafe_name, v.owner_name, v.email, String(v.vendor_id)].join(' ').toLowerCase().includes(q);
    }),
    [vendors, search]
  );

  return (
    <section className="panel">
      <SectionHeader
        title={verificationOnly ? 'Verification Desk' : 'Cafe Registry'}
        subtitle={verificationOnly
          ? 'Review uploaded documents and approve/reject onboarding.'
          : 'Manage all onboarded cafes, credentials, status and team access.'}
        actions={<button className="btn-secondary" onClick={load}><RefreshCcw size={14} /> Refresh</button>}
      />

      {error ? <ErrorBanner message={error} /> : null}

      <div className="toolbar">
        <input placeholder="Search cafe, owner, email, id..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="pending_verification">pending_verification</option>
          <option value="active">active</option>
          <option value="inactive">inactive</option>
          <option value="rejected">rejected</option>
          <option value="suspended">suspended</option>
        </select>
        <select value={subscriptionState} onChange={(e) => setSubscriptionState(e.target.value)}>
          <option value="">All Subscriptions</option>
          <option value="active">Active Subscriptions</option>
          <option value="inactive">Inactive Subscriptions</option>
        </select>
      </div>

      {loading ? <LoadingRow text="Loading cafes..." /> : null}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Cafe</th>
              <th>Status</th>
              <th>Subscription</th>
              <th>Docs</th>
              <th>Credentials</th>
              <th>Team</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => (
              <tr key={v.vendor_id}>
                <td>#{v.vendor_id}</td>
                <td>
                  <div>{v.cafe_name}</div>
                  <small>{v.owner_name}</small>
                </td>
                <td><span className={`pill ${v.status === 'active' ? 'pill-green' : 'pill-muted'}`}>{v.status}</span></td>
                <td>
                  <div>{v.subscription?.package?.name || 'No Plan'}</div>
                  <small>{v.subscription?.is_active ? 'active' : 'inactive'}</small>
                </td>
                <td>
                  <small>{v.documents?.verified ?? 0}/{v.documents?.total ?? 0} verified</small>
                </td>
                <td>
                  <small>PIN: {v.credentials?.pin || '-'}</small>
                  <br />
                  <small>{v.credentials?.password?.has_password ? (v.credentials?.password?.masked_preview || 'set') : 'not set'}</small>
                </td>
                <td><small>{v.team_access?.active ?? 0}/{v.team_access?.total ?? 0}</small></td>
                <td>
                  <div className="row-actions">
                    <button className="btn-ghost" onClick={() => loadDetail(v.vendor_id)}>View</button>
                    <button className="btn-ghost" onClick={() => updateStatus(v.vendor_id, 'active')}>Activate</button>
                    <button className="btn-ghost" onClick={() => updateStatus(v.vendor_id, 'inactive')}>Inactivate</button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && !loading ? (
              <tr>
                <td colSpan={8}><small>No cafes found.</small></td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="divider" />

      {selectedVendorId ? (
        <div className="detail-grid">
          <div>
            <SectionHeader
              title={`Vendor #${selectedVendorId} Detail`}
              subtitle="Documents, credentials, subscriptions, and team access"
              actions={detailLoading ? <small>Loading...</small> : null}
            />

            {vendorDetail ? (
              <>
                <div className="meta-grid">
                  <div><strong>Cafe:</strong> {vendorDetail.cafe_name}</div>
                  <div><strong>Owner:</strong> {vendorDetail.owner_name}</div>
                  <div><strong>Status:</strong> {vendorDetail.status}</div>
                  <div><strong>Account:</strong> {vendorDetail.account_email || '-'}</div>
                  <div><strong>Phone:</strong> {vendorDetail.contact?.phone || '-'}</div>
                  <div><strong>Email:</strong> {vendorDetail.contact?.email || '-'}</div>
                </div>

                <div className="row-actions">
                  <button className="btn-secondary" onClick={resetPin}>Reset PIN</button>
                  <button className="btn-secondary" onClick={resetPassword}>Reset Password</button>
                </div>

                <div className="subsection">
                  <h3>Documents</h3>
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Select</th>
                          <th>Type</th>
                          <th>Status</th>
                          <th>Preview</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vendorDetail.documents.map((doc) => (
                          <tr key={doc.id}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedDocIds.includes(doc.id)}
                                onChange={(e) => {
                                  setSelectedDocIds((prev) => e.target.checked ? [...prev, doc.id] : prev.filter((id) => id !== doc.id));
                                }}
                              />
                            </td>
                            <td>{doc.document_type}</td>
                            <td>{doc.status}</td>
                            <td><a href={doc.document_url} target="_blank" rel="noreferrer">Open</a></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="row-actions">
                    <button className="btn-primary" onClick={() => verifyDocs('verified')}>Mark Verified</button>
                    <button className="btn-secondary" onClick={() => verifyDocs('rejected')}>Mark Rejected</button>
                    <button className="btn-secondary" onClick={() => verifyDocs('unverified')}>Mark Unverified</button>
                  </div>
                </div>

                <div className="subsection">
                  <h3>Team Access</h3>
                  {!vendorDetail.team_access?.available ? (
                    <small>Team table not available in this environment.</small>
                  ) : (
                    <>
                      <div className="toolbar">
                        <input placeholder="Staff name" value={staffName} onChange={(e) => setStaffName(e.target.value)} />
                        <select value={staffRole} onChange={(e) => setStaffRole(e.target.value)}>
                          <option value="staff">staff</option>
                          <option value="manager">manager</option>
                          <option value="owner">owner</option>
                        </select>
                        <button className="btn-primary" onClick={addStaff}>Add Staff</button>
                      </div>
                      <div className="table-wrap">
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Role</th>
                              <th>PIN</th>
                              <th>Status</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(vendorDetail.team_access?.staff || []).map((staff) => (
                              <tr key={staff.id}>
                                <td>{staff.name}</td>
                                <td>{staff.role}</td>
                                <td>{staff.pin_code || '-'}</td>
                                <td>{staff.is_active ? 'active' : 'inactive'}</td>
                                <td>
                                  <div className="row-actions">
                                    <button className="btn-ghost" onClick={() => toggleStaff(staff.id, staff.is_active)}>
                                      {staff.is_active ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <button className="btn-ghost" onClick={() => deleteStaff(staff.id)}>Delete</button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : null}
          </div>

          <div>
            <SectionHeader title="Subscription History" />
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Package</th>
                    <th>Amount</th>
                    <th>Period</th>
                  </tr>
                </thead>
                <tbody>
                  {(vendorDetail?.subscriptions || []).map((sub) => (
                    <tr key={sub.id}>
                      <td>{sub.status}</td>
                      <td>{sub.package?.name || sub.package?.code || '-'}</td>
                      <td>{sub.amount_paid}</td>
                      <td>
                        <small>{sub.period_start ? new Date(sub.period_start).toLocaleDateString() : '-'} → {sub.period_end ? new Date(sub.period_end).toLocaleDateString() : '-'}</small>
                      </td>
                    </tr>
                  ))}
                  {!(vendorDetail?.subscriptions || []).length ? (
                    <tr><td colSpan={4}><small>No subscription rows.</small></td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <small>Select a cafe row and click “View”.</small>
      )}
    </section>
  );
}

function SettlementsPanel() {
  const [dateValue, setDateValue] = useState(todayIso());
  const [rows, setRows] = useState<Array<{
    vendor_id: number;
    cafe_name: string;
    booking_count: number;
    transaction_count: number;
    app_collected: number;
    pending_settlement: number;
    already_settled: number;
  }>>([]);
  const [summary, setSummary] = useState(emptySettlementSummary);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest<{ summary: typeof summary; rows: typeof rows }>(
        `admin/settlements/daily?date=${encodeURIComponent(dateValue)}`
      );
      setRows(data.rows || []);
      setSummary(data.summary || emptySettlementSummary);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load settlements');
    } finally {
      setLoading(false);
    }
  }, [dateValue]);

  const settleVendor = async (vendorId: number) => {
    try {
      await apiRequest('admin/settlements/daily/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: vendorId, date: dateValue, actor: 'super_admin_dashboard' }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to settle vendor');
    }
  };

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="panel">
      <SectionHeader
        title="Day-End Payout & Settlement"
        subtitle="Track app-collected payments and settle vendor dues for selected day."
        actions={<button className="btn-secondary" onClick={load}><RefreshCcw size={14} /> Refresh</button>}
      />

      {error ? <ErrorBanner message={error} /> : null}

      <div className="toolbar">
        <label>
          Date
          <input type="date" value={dateValue} onChange={(e) => setDateValue(e.target.value)} />
        </label>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><span>Vendors</span><strong>{summary.vendors}</strong></div>
        <div className="stat-card"><span>App Collected</span><strong>₹{summary.total_app_collected.toFixed(2)}</strong></div>
        <div className="stat-card"><span>Pending Settlement</span><strong>₹{summary.total_pending_settlement.toFixed(2)}</strong></div>
        <div className="stat-card"><span>Already Settled</span><strong>₹{summary.total_already_settled.toFixed(2)}</strong></div>
      </div>

      {loading ? <LoadingRow text="Loading settlement report..." /> : null}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Bookings</th>
              <th>Transactions</th>
              <th>App Collected</th>
              <th>Pending</th>
              <th>Settled</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.vendor_id}>
                <td>#{row.vendor_id} · {row.cafe_name}</td>
                <td>{row.booking_count}</td>
                <td>{row.transaction_count}</td>
                <td>₹{row.app_collected.toFixed(2)}</td>
                <td>₹{row.pending_settlement.toFixed(2)}</td>
                <td>₹{row.already_settled.toFixed(2)}</td>
                <td>
                  <button className="btn-primary" disabled={row.pending_settlement <= 0} onClick={() => settleVendor(row.vendor_id)}>
                    Settle Day
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && !loading ? (
              <tr><td colSpan={7}><small>No settlement rows for this date.</small></td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CollaboratorsPanel() {
  const [rows, setRows] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    brand_name: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    commission_type: 'percentage',
    commission_value: '10',
    min_order_quantity: '1',
    status: 'active',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest<Collaborator[]>('collaborators');
      setRows(data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load collaborators');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const reset = () => {
    setEditingId(null);
    setForm({
      name: '', brand_name: '', email: '', phone: '', address: '', website: '',
      commission_type: 'percentage', commission_value: '10', min_order_quantity: '1', status: 'active',
    });
  };

  const submit = async () => {
    try {
      const payload = {
        ...form,
        commission_value: Number(form.commission_value),
        min_order_quantity: Number(form.min_order_quantity),
      };

      await apiRequest(editingId ? `collaborators/${editingId}` : 'collaborators', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      reset();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save collaborator');
    }
  };

  const edit = (row: Collaborator) => {
    setEditingId(row.collaborator_id);
    setForm({
      name: row.name,
      brand_name: row.brand_name,
      email: row.email,
      phone: row.phone || '',
      address: '',
      website: '',
      commission_type: row.commission_type,
      commission_value: String(row.commission_value),
      min_order_quantity: String(row.min_order_quantity),
      status: row.status,
    });
  };

  const remove = async (id: string) => {
    try {
      await apiRequest(`collaborators/${id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete collaborator');
    }
  };

  return (
    <section className="panel">
      <SectionHeader
        title="Collaborator Management"
        subtitle="Create and manage your product partners."
        actions={<button className="btn-secondary" onClick={load}><RefreshCcw size={14} /> Refresh</button>}
      />
      {error ? <ErrorBanner message={error} /> : null}

      <div className="form-grid">
        <label>Name<input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></label>
        <label>Brand Name<input value={form.brand_name} onChange={(e) => setForm((p) => ({ ...p, brand_name: e.target.value }))} /></label>
        <label>Email<input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} /></label>
        <label>Phone<input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} /></label>
        <label>Commission Type
          <select value={form.commission_type} onChange={(e) => setForm((p) => ({ ...p, commission_type: e.target.value }))}>
            <option value="percentage">percentage</option>
            <option value="fixed">fixed</option>
          </select>
        </label>
        <label>Commission Value<input value={form.commission_value} onChange={(e) => setForm((p) => ({ ...p, commission_value: e.target.value }))} /></label>
        <label>Min Order Qty<input value={form.min_order_quantity} onChange={(e) => setForm((p) => ({ ...p, min_order_quantity: e.target.value }))} /></label>
        <label>Status
          <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </select>
        </label>
      </div>

      <div className="row-actions">
        <button className="btn-primary" onClick={submit}>{editingId ? 'Update Collaborator' : 'Add Collaborator'}</button>
        {editingId ? <button className="btn-ghost" onClick={reset}>Cancel Edit</button> : null}
      </div>

      {loading ? <LoadingRow text="Loading collaborators..." /> : null}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Brand</th>
              <th>Email</th>
              <th>Commission</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.collaborator_id}>
                <td>{row.name}</td>
                <td>{row.brand_name}</td>
                <td>{row.email}</td>
                <td>{row.commission_type} · {row.commission_value}</td>
                <td>{row.status}</td>
                <td>
                  <div className="row-actions">
                    <button className="btn-ghost" onClick={() => edit(row)}>Edit</button>
                    <button className="btn-ghost" onClick={() => remove(row.collaborator_id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && !loading ? <tr><td colSpan={6}><small>No collaborators yet.</small></td></tr> : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ProductsPanel() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [selectedCollaborator, setSelectedCollaborator] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
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

  const loadCollaborators = useCallback(async () => {
    try {
      const data = await apiRequest<Collaborator[]>('collaborators');
      setCollaborators(data || []);
      if ((data || []).length && !selectedCollaborator) {
        setSelectedCollaborator(data[0].collaborator_id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load collaborators');
    }
  }, [selectedCollaborator]);

  const loadProducts = useCallback(async (collabId: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest<Product[]>(`collaborators/${collabId}/products`);
      setProducts(data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCollaborators();
  }, [loadCollaborators]);

  useEffect(() => {
    if (selectedCollaborator) void loadProducts(selectedCollaborator);
  }, [selectedCollaborator, loadProducts]);

  const reset = () => {
    setEditingId(null);
    setForm({
      name: '', category: 'other', unit_price: '', sku: '', stock_quantity: '', min_order_quantity: '1',
      status: 'active', description: '', image_file: null,
    });
  };

  const submit = async () => {
    if (!selectedCollaborator) return;
    try {
      if (editingId) {
        await apiRequest(`products/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            stock_quantity: Number(form.stock_quantity),
            min_order_quantity: Number(form.min_order_quantity),
            unit_price: Number(form.unit_price),
          }),
        });
      } else {
        const body = new FormData();
        body.append('name', form.name);
        body.append('category', form.category);
        body.append('unit_price', form.unit_price);
        body.append('sku', form.sku);
        body.append('stock_quantity', form.stock_quantity);
        body.append('min_order_quantity', form.min_order_quantity);
        body.append('status', form.status);
        body.append('description', form.description);
        if (form.image_file) body.append('image', form.image_file);

        await apiRequest(`collaborators/${selectedCollaborator}/products`, {
          method: 'POST',
          body,
        });
      }

      reset();
      await loadProducts(selectedCollaborator);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save product');
    }
  };

  const edit = (row: Product) => {
    setEditingId(row.product_id);
    setForm({
      name: row.name,
      category: row.category,
      unit_price: row.unit_price,
      sku: row.sku || '',
      stock_quantity: String(row.stock_quantity),
      min_order_quantity: String(row.min_order_quantity),
      status: row.status,
      description: row.description || '',
      image_file: null,
    });
  };

  const remove = async (id: string) => {
    try {
      await apiRequest(`products/${id}`, { method: 'DELETE' });
      if (selectedCollaborator) await loadProducts(selectedCollaborator);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete product');
    }
  };

  return (
    <section className="panel">
      <SectionHeader
        title="Collaborator Product Management"
        subtitle="Manage collaborator inventory and product catalog."
        actions={<button className="btn-secondary" onClick={() => selectedCollaborator && loadProducts(selectedCollaborator)}><RefreshCcw size={14} /> Refresh</button>}
      />
      {error ? <ErrorBanner message={error} /> : null}

      <div className="toolbar">
        <label>
          Collaborator
          <select value={selectedCollaborator} onChange={(e) => setSelectedCollaborator(e.target.value)}>
            <option value="">Select collaborator</option>
            {collaborators.map((c) => <option key={c.collaborator_id} value={c.collaborator_id}>{c.brand_name}</option>)}
          </select>
        </label>
      </div>

      <div className="form-grid">
        <label>Name<input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></label>
        <label>Category
          <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
            <option value="energy_drink">energy_drink</option>
            <option value="energy_bar">energy_bar</option>
            <option value="mouse">mouse</option>
            <option value="keyboard">keyboard</option>
            <option value="mousepad">mousepad</option>
            <option value="other">other</option>
          </select>
        </label>
        <label>Unit Price<input value={form.unit_price} onChange={(e) => setForm((p) => ({ ...p, unit_price: e.target.value }))} /></label>
        <label>Stock<input value={form.stock_quantity} onChange={(e) => setForm((p) => ({ ...p, stock_quantity: e.target.value }))} /></label>
        <label>Min Order Qty<input value={form.min_order_quantity} onChange={(e) => setForm((p) => ({ ...p, min_order_quantity: e.target.value }))} /></label>
        <label>Status
          <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </select>
        </label>
        <label>SKU<input value={form.sku} onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))} /></label>
        <label>
          Image
          <input type="file" onChange={(e) => setForm((p) => ({ ...p, image_file: e.target.files?.[0] || null }))} />
        </label>
      </div>

      <label>
        Description
        <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} />
      </label>

      <div className="row-actions">
        <button className="btn-primary" onClick={submit}>{editingId ? 'Update Product' : 'Add Product'}</button>
        {editingId ? <button className="btn-ghost" onClick={reset}>Cancel Edit</button> : null}
      </div>

      {loading ? <LoadingRow text="Loading products..." /> : null}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.product_id}>
                <td>{p.name}</td>
                <td>{p.category}</td>
                <td>{p.unit_price}</td>
                <td>{p.stock_quantity}</td>
                <td>{p.status}</td>
                <td>
                  <div className="row-actions">
                    <button className="btn-ghost" onClick={() => edit(p)}>Edit</button>
                    <button className="btn-ghost" onClick={() => remove(p.product_id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {!products.length && !loading ? <tr><td colSpan={6}><small>No products found.</small></td></tr> : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SubscriptionsPanel() {
  const [rows, setRows] = useState<Array<{
    id: number;
    vendor_id: number;
    cafe_name: string;
    owner_name: string;
    status: string;
    amount_paid: number;
    package?: { code?: string; name?: string; pc_limit?: number };
    period_start?: string;
    period_end?: string;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [packageCode, setPackageCode] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: '1', per_page: '100' });
      if (search.trim()) params.set('search', search.trim());
      if (status) params.set('status', status);
      const data = await apiRequest<{ subscriptions: typeof rows }>(`admin/subscriptions?${params.toString()}`);
      setRows(data.subscriptions || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const changePackage = async (vendorId: number) => {
    const code = (packageCode[vendorId] || '').trim().toLowerCase();
    if (!code) {
      setError('Enter package code first (example: base, pro).');
      return;
    }
    try {
      await apiRequest(`admin/vendors/${vendorId}/subscriptions/change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_code: code, immediate: true }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to change package');
    }
  };

  const provisionDefault = async (vendorId: number) => {
    try {
      await apiRequest(`admin/vendors/${vendorId}/subscriptions/provision-default`, { method: 'POST' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to provision default plan');
    }
  };

  return (
    <section className="panel">
      <SectionHeader
        title="Subscription Management"
        subtitle="Track package history and manage active subscription plans."
        actions={<button className="btn-secondary" onClick={load}><RefreshCcw size={14} /> Refresh</button>}
      />

      {error ? <ErrorBanner message={error} /> : null}

      <div className="toolbar">
        <input placeholder="Search by cafe, owner, vendor id" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">active</option>
          <option value="trialing">trialing</option>
          <option value="past_due">past_due</option>
          <option value="expired">expired</option>
          <option value="canceled">canceled</option>
        </select>
        <button className="btn-primary" onClick={load}>Apply</button>
      </div>

      {loading ? <LoadingRow text="Loading subscription inventory..." /> : null}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Status</th>
              <th>Package</th>
              <th>Amount</th>
              <th>Period</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>#{row.vendor_id} · {row.cafe_name}</td>
                <td>{row.status}</td>
                <td>{row.package?.name || row.package?.code || '-'}</td>
                <td>₹{Number(row.amount_paid || 0).toFixed(2)}</td>
                <td>
                  <small>
                    {row.period_start ? new Date(row.period_start).toLocaleDateString() : '-'} → {row.period_end ? new Date(row.period_end).toLocaleDateString() : '-'}
                  </small>
                </td>
                <td>
                  <div className="row-actions">
                    <input
                      placeholder="package code"
                      value={packageCode[row.vendor_id] || ''}
                      onChange={(e) => setPackageCode((p) => ({ ...p, [row.vendor_id]: e.target.value }))}
                    />
                    <button className="btn-ghost" onClick={() => changePackage(row.vendor_id)}>Change</button>
                    <button className="btn-ghost" onClick={() => provisionDefault(row.vendor_id)}>Default</button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && !loading ? <tr><td colSpan={6}><small>No subscriptions found.</small></td></tr> : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function HomePage() {
  const [module, setModule] = useState<ModuleId>('onboard');

  const CurrentModule = useMemo(() => {
    if (module === 'onboard') return <OnboardPanel />;
    if (module === 'cafes') return <VendorsPanel />;
    if (module === 'verification') return <VendorsPanel verificationOnly />;
    if (module === 'settlements') return <SettlementsPanel />;
    if (module === 'collaborators') return <CollaboratorsPanel />;
    if (module === 'products') return <ProductsPanel />;
    return <SubscriptionsPanel />;
  }, [module]);

  return (
    <div className="app-shell">
      <aside className="side-nav">
        <div className="brand-row">
          <Image
            src="/hash-logo.png"
            alt="Hash For Gamers Logo"
            width={40}
            height={40}
            className="hash-logo"
            priority
          />
          <div>
            <strong>Hash Super Admin</strong>
            <small>Vendor Control Center</small>
          </div>
        </div>

        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-btn ${module === item.id ? 'active' : ''}`}
                onClick={() => setModule(item.id)}
              >
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="side-note">
          <BadgeCheck size={14} />
          <small>Prod-safe flow: API proxy + server-side admin key injection.</small>
        </div>
      </aside>

      <main className="content-area">
        <header className="page-topbar">
          <div>
            <h1>Super Admin Dashboard</h1>
            <p>Onboarding, verification, payouts, collaborators, products, and subscription lifecycle in one place.</p>
          </div>
        </header>

        {CurrentModule}
      </main>
    </div>
  );
}
