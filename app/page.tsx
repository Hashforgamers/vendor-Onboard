'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  BarChart3,
  BadgeCheck,
  Building2,
  ClipboardCheck,
  ExternalLink,
  Handshake,
  Package,
  RefreshCcw,
  Settings2,
  UserPlus,
  Wallet,
  X,
} from 'lucide-react';

type ModuleId =
  | 'onboard'
  | 'cafes'
  | 'verification'
  | 'settlements'
  | 'analytics_ops'
  | 'analytics_user'
  | 'collaborators'
  | 'products'
  | 'subscription_models'
  | 'cafe_subscriptions';

type ApiError = { message?: string; error?: string; details?: unknown };
type DeactivationNotifyResponse = {
  success?: boolean;
  message?: string;
  data?: {
    sent_to?: string;
    mail_subject?: string;
    html_enabled?: boolean;
  };
};

type PromotionNotifyResponse = {
  success?: boolean;
  message?: string;
  data?: {
    sent_to?: string;
    mail_subject?: string;
    expires_at?: string;
    login_email?: string;
    temporary_password?: string;
    pin_code?: string;
    dashboard_url?: string;
  };
};

type VendorRow = {
  vendor_id: number;
  cafe_name: string;
  owner_name: string;
  account_id?: number | null;
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
    inactive_for_days?: number | null;
    inactive_over_90_days?: boolean;
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
  deactivation_notifications?: {
    sent_count: number;
    last_sent_at?: string | null;
  };
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

type PlanTier = {
  code: string;
  name: string;
  enabled: boolean;
  pc_limit: number;
  monthly: number;
  quarterly: number;
  yearly: number;
  onboarding_offer?: string;
  features: string[];
};

const PLAN_STORAGE_KEY = 'hash_superadmin_plan_catalog_v2';

const DEFAULT_PLAN_CATALOG: PlanTier[] = [
  {
    code: 'early_onboard',
    name: 'Early Bird',
    enabled: true,
    pc_limit: 20,
    monthly: 0,
    quarterly: 0,
    yearly: 0,
    onboarding_offer: 'Free for first 2 months, then auto-migrate to Base with 20% first-year discount',
    features: ['All core booking + inventory', 'Owner dashboard', '1 staff login', 'Email support']
  },
  {
    code: 'base',
    name: 'Base',
    enabled: true,
    pc_limit: 25,
    monthly: 1999,
    quarterly: 5399,
    yearly: 19999,
    features: ['Realtime bookings', '1 kiosk mapping', 'Basic reports', '2 staff logins']
  },
  {
    code: 'grow',
    name: 'Grow',
    enabled: true,
    pc_limit: 60,
    monthly: 4999,
    quarterly: 13499,
    yearly: 49999,
    features: ['Multi-kiosk + sockets', 'Advanced reports', 'Priority support', '10 staff logins']
  },
  {
    code: 'elite',
    name: 'Elite',
    enabled: true,
    pc_limit: 150,
    monthly: 8999,
    quarterly: 24299,
    yearly: 89999,
    features: ['Multi-branch ops', 'Premium analytics', 'Dedicated manager', 'Unlimited staff logins']
  }
];

const navItems: Array<{ id: ModuleId; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { id: 'onboard', label: 'Onboard New Cafe', icon: UserPlus },
  { id: 'cafes', label: 'Cafe Registry', icon: Building2 },
  { id: 'verification', label: 'Verification Desk', icon: ClipboardCheck },
  { id: 'settlements', label: 'Day-End Settlements', icon: Wallet },
  { id: 'analytics_ops', label: 'Analytics (Ops)', icon: BarChart3 },
  { id: 'analytics_user', label: 'Analytics (Users)', icon: BarChart3 },
  { id: 'subscription_models', label: 'Subscription Models', icon: Settings2 },
  { id: 'cafe_subscriptions', label: 'Cafe Subscriptions', icon: Settings2 },
  { id: 'collaborators', label: 'Collaborators', icon: Handshake },
  { id: 'products', label: 'Collaborator Products', icon: Package },
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
  const toCleanMessage = (raw: string): string => {
    const compact = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return compact || raw.trim();
  };
  const data = text ? (() => {
    try {
      return JSON.parse(text);
    } catch {
      return { message: toCleanMessage(text) };
    }
  })() : {};

  if (!response.ok) {
    const err = data as ApiError;
    throw new Error(err.message || err.error || `Request failed (${response.status})`);
  }

  return data as T;
}

async function optionalApiRequest<T>(path: string, fallback: T): Promise<T> {
  try {
    return await apiRequest<T>(path);
  } catch {
    return fallback;
  }
}

function normalizePlanModels(models: Array<Record<string, unknown>> | undefined | null): PlanTier[] {
  return (models || [])
    .map((item) => {
      const normalizedCodeRaw = String(item.code || '').toLowerCase();
      const normalizedCode = normalizedCodeRaw === 'pro' ? 'grow' : normalizedCodeRaw;
      const rawFeatures = Array.isArray(item.plan_features)
        ? item.plan_features
        : Array.isArray(item.features)
          ? item.features
          : Array.isArray((item.features as Record<string, unknown> | undefined)?.plan_features)
            ? ((item.features as Record<string, unknown>).plan_features as unknown[])
            : [];
      return {
        code: normalizedCode,
        name: String(item.name || ''),
        enabled: Boolean(item.active ?? item.enabled ?? true),
        pc_limit: Number(item.pc_limit || 0),
        monthly: Number(item.monthly || (item.features as Record<string, unknown> | undefined)?.price_inr || 0),
        quarterly: Number(item.quarterly || (item.features as Record<string, unknown> | undefined)?.quarterly_price_inr || 0),
        yearly: Number(item.yearly || (item.features as Record<string, unknown> | undefined)?.yearly_price_inr || 0),
        onboarding_offer: String(item.onboarding_offer || (item.features as Record<string, unknown> | undefined)?.onboarding_offer || ''),
        features: rawFeatures.map((feature) => String(feature)).filter(Boolean),
      };
    })
    .filter((item) => Boolean(item.code && item.name));
}

function usePlanCatalogState() {
  const [planCatalog, setPlanCatalog] = useState<PlanTier[]>(DEFAULT_PLAN_CATALOG);
  const [catalogMessage, setCatalogMessage] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setCatalogLoading(true);
    const load = async () => {
      try {
        const payload = await apiRequest<{ models: Array<Record<string, unknown>> }>('admin/subscription-models');
        const mapped = normalizePlanModels(payload.models);
        if (active && mapped.length) {
          setPlanCatalog(mapped);
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(mapped));
          }
          setCatalogLoading(false);
          return;
        }
      } catch {
        // fallback to local cache below
      }
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem(PLAN_STORAGE_KEY) : null;
      if (!stored) {
        if (active) setCatalogLoading(false);
        return;
      }
      try {
        const parsed = JSON.parse(stored) as Array<Record<string, unknown>>;
        const mapped = normalizePlanModels(parsed);
        if (active && mapped.length) {
          setPlanCatalog(mapped);
        }
      } catch {
        // ignore malformed cache
      } finally {
        if (active) setCatalogLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const savePlanCatalog = useCallback(async () => {
    try {
      const payload = {
        models: planCatalog.map((plan) => ({
          code: plan.code,
          name: plan.name,
          enabled: plan.enabled,
          pc_limit: plan.pc_limit,
          monthly: plan.monthly,
          quarterly: plan.quarterly,
          yearly: plan.yearly,
          onboarding_offer: plan.onboarding_offer,
          features: plan.features,
        })),
      };
      const response = await apiRequest<{ models?: Array<Record<string, unknown>> }>('admin/subscription-models', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.models && response.models.length) {
        const mapped = normalizePlanModels(response.models);
        setPlanCatalog(mapped.length ? mapped : planCatalog);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(mapped.length ? mapped : planCatalog));
        }
      }
      setCatalogMessage('Subscription catalog saved in backend.');
    } catch {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(planCatalog));
      }
      setCatalogMessage('Backend save failed. Saved local fallback only.');
    }
  }, [planCatalog]);

  return { planCatalog, setPlanCatalog, catalogMessage, savePlanCatalog, catalogLoading };
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
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(verificationOnly ? 'pending_verification' : '');
  const [subscriptionState, setSubscriptionState] = useState('');
  const [inactiveOver90Only, setInactiveOver90Only] = useState(false);

  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [vendorDetail, setVendorDetail] = useState<VendorDetail | null>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; type: string } | null>(null);
  const [ownerPinInput, setOwnerPinInput] = useState('');
  const [ownerPasswordInput, setOwnerPasswordInput] = useState('');
  const [staffPinDraft, setStaffPinDraft] = useState<Record<number, string>>({});
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
      if (inactiveOver90Only) params.set('inactive_over_days', '90');
      if (verificationOnly) params.set('verified_only', 'false');

      const data = await apiRequest<{ vendors: VendorRow[] }>(`admin/vendors?${params.toString()}`);
      setVendors(data.vendors || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch vendors');
    } finally {
      setLoading(false);
    }
  }, [search, status, subscriptionState, inactiveOver90Only, verificationOnly]);

  const loadDetail = useCallback(async (vendorId: number) => {
    setDetailLoading(true);
    setSelectedVendorId(vendorId);
    setSelectedDocIds([]);
    setOwnerPinInput('');
    setOwnerPasswordInput('');
    setStaffPinDraft({});
    try {
      const data = await apiRequest<{ vendor: VendorDetail }>(`admin/vendors/${vendorId}`);
      setVendorDetail(data.vendor);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch vendor detail');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const openDetail = useCallback(async (vendorId: number) => {
    setDetailOpen(true);
    await loadDetail(vendorId);
  }, [loadDetail]);

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
    setPreviewDoc(null);
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

  const notifyVendorDeactivation = async (vendor: VendorRow) => {
    const reason = (window.prompt('Optional reason for notification email:') || '').trim();
    try {
      setError('');
      const response = await apiRequest<DeactivationNotifyResponse>(`admin/vendors/${vendor.vendor_id}/notifications/deactivation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, sent_by: 'super_admin_dashboard' }),
      });

      const recipient = response?.data?.sent_to || vendor.email || 'vendor email';
      const subject = response?.data?.mail_subject || 'subject unavailable';
      setNotice(
        `Notify sent to ${recipient}. Subject: ${subject}`
      );
      await load();
    } catch (e) {
      setNotice('');
      setError(e instanceof Error ? e.message : 'Failed to send notification');
    }
  };

  const notifyVendorPromotion = async (vendor: VendorRow) => {
    const confirmed = window.confirm(
      `Send Early Onboard (1 month free) promotion mail to ${vendor.cafe_name}? This will generate a one-time avail link and reset temporary credentials.`
    );
    if (!confirmed) return;
    try {
      setError('');
      const response = await apiRequest<PromotionNotifyResponse>(
        `admin/vendors/${vendor.vendor_id}/notifications/promotion/early-onboard`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sent_by: 'super_admin_dashboard' }),
        }
      );
      const recipient = response?.data?.sent_to || vendor.email || 'vendor email';
      const expiresAt = response?.data?.expires_at
        ? new Date(response.data.expires_at).toLocaleString()
        : 'N/A';
      setNotice(`Promotion mail sent to ${recipient}. Link expiry: ${expiresAt}`);
      await load();
    } catch (e) {
      setNotice('');
      setError(e instanceof Error ? e.message : 'Failed to send promotion mail');
    }
  };

  const deactivateVendor = async (vendor: VendorRow) => {
    await updateStatus(vendor.vendor_id, 'inactive');
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
    const customPin = ownerPinInput.trim();
    if (customPin && !/^\d{4}$/.test(customPin)) {
      setError('Owner PIN must be exactly 4 digits.');
      return;
    }
    try {
      await apiRequest(`admin/vendors/${selectedVendorId}/credentials/reset-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: customPin || undefined }),
      });
      setOwnerPinInput('');
      await refreshDetail();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reset pin');
    }
  };

  const resetPassword = async () => {
    if (!selectedVendorId) return;
    const customPassword = ownerPasswordInput.trim();
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
      setOwnerPasswordInput('');
      if (pwd) {
        window.alert(`Temporary password set: ${pwd}`);
      }
      await refreshDetail();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reset password');
    }
  };

  const resetStaffPin = async (staffId: number) => {
    if (!selectedVendorId) return;
    const pin = (staffPinDraft[staffId] || '').trim();
    if (!/^\d{4}$/.test(pin)) {
      setError('Staff PIN must be exactly 4 digits.');
      return;
    }

    const attempts: Array<{ path: string; method: 'POST' | 'PATCH'; body: Record<string, unknown> }> = [
      {
        path: `admin/vendors/${selectedVendorId}/team-access/staff/${staffId}/reset-pin`,
        method: 'POST',
        body: { pin },
      },
      {
        path: `admin/vendors/${selectedVendorId}/team-access/staff/${staffId}`,
        method: 'PATCH',
        body: { pin_code: pin },
      },
      {
        path: `admin/vendors/${selectedVendorId}/team-access/staff/${staffId}`,
        method: 'PATCH',
        body: { pin },
      },
    ];

    let lastError = '';
    for (const attempt of attempts) {
      try {
        await apiRequest(attempt.path, {
          method: attempt.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(attempt.body),
        });
        setStaffPinDraft((prev) => ({ ...prev, [staffId]: '' }));
        await refreshDetail();
        return;
      } catch (e) {
        lastError = e instanceof Error ? e.message : 'Failed to update staff PIN';
      }
    }
    setError(lastError || 'Failed to update staff PIN');
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

  const groupedVendors = useMemo(() => {
    const groups = new Map<string, { key: string; title: string; subtitle: string; vendors: VendorRow[] }>();
    for (const vendor of filtered) {
      const emailKey = (vendor.email || '').trim().toLowerCase();
      const phoneKey = (vendor.phone || '').replace(/\D/g, '');
      const ownerKey = (vendor.owner_name || '').trim().toLowerCase();
      const accountKey = vendor.account_id ? `account:${vendor.account_id}` : '';
      const key = accountKey || (emailKey ? `email:${emailKey}` : '') || (phoneKey ? `phone:${phoneKey}` : '') || `owner:${ownerKey}` || `vendor:${vendor.vendor_id}`;

      if (!groups.has(key)) {
        const title = vendor.owner_name || vendor.email || vendor.phone || `Owner Group ${groups.size + 1}`;
        const subtitleParts = [
          accountKey ? `Account #${vendor.account_id}` : null,
          vendor.email ? `Email: ${vendor.email}` : null,
          vendor.phone ? `Phone: ${vendor.phone}` : null,
        ].filter(Boolean);
        groups.set(key, {
          key,
          title,
          subtitle: subtitleParts.join(' · '),
          vendors: [],
        });
      }
      groups.get(key)!.vendors.push(vendor);
    }

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        vendors: group.vendors.sort((a, b) => a.vendor_id - b.vendor_id),
      }))
      .sort((a, b) => {
        const av = a.vendors[0]?.vendor_id || 0;
        const bv = b.vendors[0]?.vendor_id || 0;
        return av - bv;
      });
  }, [filtered]);

  const linkedStores = useMemo(() => {
    if (!vendorDetail) return [] as VendorRow[];
    const keys = new Set(
      [vendorDetail.account_email, vendorDetail.contact?.email, vendorDetail.contact?.phone]
        .filter((value): value is string => Boolean(value))
        .map((value) => value.trim().toLowerCase())
    );
    if (!keys.size) return [] as VendorRow[];

    return vendors.filter((vendor) => {
      if (vendor.vendor_id === vendorDetail.vendor_id) return false;
      const lookup = [vendor.email, vendor.phone]
        .filter((value): value is string => Boolean(value))
        .map((value) => value.trim().toLowerCase());
      return lookup.some((value) => keys.has(value));
    });
  }, [vendorDetail, vendors]);

  return (
    <section className="panel">
      <SectionHeader
        title={verificationOnly ? 'Verification Desk' : 'Cafe Registry'}
        subtitle={verificationOnly
          ? 'Focused queue for pending verification: validate docs, approve or reject quickly.'
          : 'Operations cockpit for active/inactive cafes: credentials, team access, subscriptions and linked stores.'}
        actions={<button className="btn-secondary" onClick={load}><RefreshCcw size={14} /> Refresh</button>}
      />

      {error ? <ErrorBanner message={error} /> : null}
      {notice ? <div className="success-banner">{notice}</div> : null}
      <div className="info-banner">
        {verificationOnly
          ? 'Verification Desk = onboarding compliance gate. Cafe Registry = day-to-day operational management.'
          : 'Cafe Registry = operational control center. Use Verification Desk when you only want pending onboarding checks.'}
      </div>

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
        <label className="inline-check">
          <input type="checkbox" checked={inactiveOver90Only} onChange={(e) => setInactiveOver90Only(e.target.checked)} />
          Inactive &gt; 90 days
        </label>
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
              <th>Notices</th>
              <th>Credentials</th>
              <th>Team</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {groupedVendors.map((group) => (
              <Fragment key={`group-${group.key}`}>
                <tr className="table-group-row">
                  <td colSpan={9}>
                    <strong>{group.title}</strong>
                    <small>{group.subtitle || 'Linked cafes under same owner identity'}</small>
                  </td>
                </tr>
                {group.vendors.map((v) => (
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
                      {v.subscription?.inactive_over_90_days ? (
                        <>
                          <br />
                          <small>inactive {v.subscription?.inactive_for_days || 0}d</small>
                        </>
                      ) : null}
                    </td>
                    <td>
                      <small>{v.documents?.verified ?? 0}/{v.documents?.total ?? 0} verified</small>
                    </td>
                    <td>
                      <small>sent: {v.deactivation_notifications?.sent_count ?? 0}</small>
                      <br />
                      <small>{v.deactivation_notifications?.last_sent_at ? new Date(v.deactivation_notifications.last_sent_at).toLocaleDateString() : '-'}</small>
                    </td>
                    <td>
                      <small>PIN: {v.credentials?.pin || '-'}</small>
                      <br />
                      <small>{v.credentials?.password?.has_password ? (v.credentials?.password?.masked_preview || 'set') : 'not set'}</small>
                    </td>
                    <td><small>{v.team_access?.active ?? 0}/{v.team_access?.total ?? 0}</small></td>
                    <td>
                      <div className="row-actions">
                        <button className="btn-ghost" onClick={() => openDetail(v.vendor_id)}>View</button>
                        <button className="btn-ghost" onClick={() => updateStatus(v.vendor_id, 'active')}>Activate</button>
                        <button className="btn-ghost" onClick={() => notifyVendorPromotion(v)}>Notify Promotion</button>
                        <button className="btn-ghost" onClick={() => notifyVendorDeactivation(v)}>Notify</button>
                        <button className="btn-ghost" onClick={() => deactivateVendor(v)}>Deactivate</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
            {!groupedVendors.length && !loading ? (
              <tr>
                <td colSpan={9}><small>No cafes found.</small></td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="divider" />
      <small>Click “View” to open cafe detail in overlay (no bottom-scroll needed).</small>

      {detailOpen ? (
        <div className="overlay-backdrop" onClick={closeDetail}>
          <div className="overlay-panel" onClick={(e) => e.stopPropagation()}>
            <div className="overlay-header">
              <div>
                <h3>{selectedVendorId ? `Vendor #${selectedVendorId} Detail` : 'Vendor Detail'}</h3>
                <p>Documents, credentials, team access, linked stores, and subscription history.</p>
              </div>
              <button className="btn-ghost" onClick={closeDetail}><X size={16} /> Close</button>
            </div>

            {detailLoading && !vendorDetail ? <LoadingRow text="Loading vendor detail..." /> : null}

            {vendorDetail ? (
              <div className="detail-grid">
                <div>
                  <div className="meta-grid">
                    <div><strong>Cafe:</strong> {vendorDetail.cafe_name}</div>
                    <div><strong>Owner:</strong> {vendorDetail.owner_name}</div>
                    <div><strong>Status:</strong> {vendorDetail.status}</div>
                    <div><strong>Account:</strong> {vendorDetail.account_email || '-'}</div>
                    <div><strong>Phone:</strong> {vendorDetail.contact?.phone || '-'}</div>
                    <div><strong>Email:</strong> {vendorDetail.contact?.email || '-'}</div>
                  </div>

                  <div className="subsection">
                    <h3>Credentials & Security</h3>
                    <div className="toolbar compact-toolbar">
                      <label>
                        Owner PIN (4 digits)
                        <input
                          value={ownerPinInput}
                          onChange={(e) => setOwnerPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="Auto if blank"
                          maxLength={4}
                        />
                      </label>
                      <label>
                        Temporary Password
                        <input
                          type="text"
                          value={ownerPasswordInput}
                          onChange={(e) => setOwnerPasswordInput(e.target.value)}
                          placeholder="Auto if blank"
                        />
                      </label>
                      <div className="row-actions">
                        <button className="btn-secondary" onClick={resetPin}>Update Owner PIN</button>
                        <button className="btn-secondary" onClick={resetPassword}>Reset Password</button>
                      </div>
                    </div>
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
                              <td>
                                <div className="row-actions">
                                  <button
                                    className="btn-ghost"
                                    onClick={() => setPreviewDoc({ url: doc.document_url, type: doc.document_type })}
                                  >
                                    Preview
                                  </button>
                                  <a href={doc.document_url} target="_blank" rel="noreferrer" className="btn-ghost">
                                    <ExternalLink size={14} />
                                    Open
                                  </a>
                                </div>
                              </td>
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
                        <div className="toolbar compact-toolbar">
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
                                <th>Set PIN</th>
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
                                  <td>
                                    <div className="row-actions">
                                      <input
                                        placeholder="4-digit"
                                        value={staffPinDraft[staff.id] || ''}
                                        onChange={(e) =>
                                          setStaffPinDraft((prev) => ({ ...prev, [staff.id]: e.target.value.replace(/\D/g, '').slice(0, 4) }))
                                        }
                                      />
                                      <button className="btn-ghost" onClick={() => resetStaffPin(staff.id)}>Update</button>
                                    </div>
                                  </td>
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
                </div>

                <div>
                  <div className="subsection">
                    <h3>Linked Stores (Same Owner)</h3>
                    <div className="table-wrap">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Vendor</th>
                            <th>Cafe</th>
                            <th>Status</th>
                            <th>Plan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {linkedStores.map((store) => (
                            <tr key={store.vendor_id}>
                              <td>#{store.vendor_id}</td>
                              <td>{store.cafe_name}</td>
                              <td>{store.status}</td>
                              <td>{store.subscription?.package?.name || '-'}</td>
                            </tr>
                          ))}
                          {!linkedStores.length ? <tr><td colSpan={4}><small>No linked stores found.</small></td></tr> : null}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="subsection">
                    <h3>Subscription History</h3>
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
                          {(vendorDetail.subscriptions || []).map((sub) => (
                            <tr key={sub.id}>
                              <td>{sub.status}</td>
                              <td>{sub.package?.name || sub.package?.code || '-'}</td>
                              <td>₹{Number(sub.amount_paid || 0).toFixed(2)}</td>
                              <td>
                                <small>{sub.period_start ? new Date(sub.period_start).toLocaleDateString() : '-'} → {sub.period_end ? new Date(sub.period_end).toLocaleDateString() : '-'}</small>
                              </td>
                            </tr>
                          ))}
                          {!vendorDetail.subscriptions?.length ? <tr><td colSpan={4}><small>No subscription rows.</small></td></tr> : null}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {previewDoc ? (
        <div className="overlay-backdrop" onClick={() => setPreviewDoc(null)}>
          <div className="overlay-panel preview-overlay" onClick={(e) => e.stopPropagation()}>
            <div className="overlay-header">
              <div>
                <h3>{previewDoc.type} Preview</h3>
                <p>Inline frame preview for faster verification.</p>
              </div>
              <button className="btn-ghost" onClick={() => setPreviewDoc(null)}><X size={16} /> Close</button>
            </div>
            <iframe src={previewDoc.url} title={previewDoc.type} className="preview-frame" />
          </div>
        </div>
      ) : null}
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

function AnalyticsPanel({ userCentric = false }: { userCentric?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [vendorRows, setVendorRows] = useState<VendorRow[]>([]);
  const [subscriptionRows, setSubscriptionRows] = useState<Array<{
    id: number;
    vendor_id: number;
    cafe_name: string;
    status: string;
    amount_paid: number;
    package?: { code?: string; name?: string };
  }>>([]);
  const [settlementSummary, setSettlementSummary] = useState(emptySettlementSummary);
  const [channelRows, setChannelRows] = useState<Array<{
    channel: string;
    bookings: number;
    revenue: number;
    app_revenue: number;
    dashboard_revenue: number;
    pay_at_cafe_pending: number;
    pay_at_cafe_completed: number;
    status_breakdown?: Record<string, number>;
    payment_mode_breakdown?: Record<string, number>;
    booking_type_breakdown?: Record<string, number>;
    new_users?: number;
    conversions?: number;
    avg_time_to_book_min?: number;
  }>>([]);
  const [recentVendorBookings, setRecentVendorBookings] = useState<Array<{
    vendor_id: number;
    cafe_name: string;
    channel: string;
    booking_count: number;
    amount: number;
  }>>([]);
  const [vendorFirstSeenChannel, setVendorFirstSeenChannel] = useState<Array<{
    vendor_id: number;
    cafe_name: string;
    first_seen_channel: string;
  }>>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [vendorsData, subscriptionsData, settlementData, channelData, recentData, firstSeenData] = await Promise.all([
        apiRequest<{ vendors: VendorRow[] }>('admin/vendors?page=1&per_page=300'),
        apiRequest<{ subscriptions: Array<{
          id: number;
          vendor_id: number;
          cafe_name: string;
          status: string;
          amount_paid: number;
          package?: { code?: string; name?: string };
        }> }>('admin/subscriptions?page=1&per_page=500'),
        apiRequest<{ summary: typeof emptySettlementSummary }>(`admin/settlements/daily?date=${todayIso()}`),
        optionalApiRequest<{ rows: typeof channelRows }>(`admin/analytics/channel-overview?date=${todayIso()}`, { rows: [] }),
        optionalApiRequest<{ rows: typeof recentVendorBookings }>(`admin/analytics/recent-bookings-by-vendor?date=${todayIso()}`, { rows: [] }),
        optionalApiRequest<{ rows: typeof vendorFirstSeenChannel }>('admin/analytics/vendor-first-seen-channel', { rows: [] }),
      ]);

      setVendorRows(vendorsData.vendors || []);
      setSubscriptionRows(subscriptionsData.subscriptions || []);
      setSettlementSummary(settlementData.summary || emptySettlementSummary);
      setChannelRows(channelData.rows || []);
      setRecentVendorBookings(recentData.rows || []);
      setVendorFirstSeenChannel(firstSeenData.rows || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeVendors = vendorRows.filter((vendor) => vendor.status === 'active').length;
  const pendingVerification = vendorRows.filter((vendor) => vendor.status === 'pending_verification').length;
  const activeSubscriptions = subscriptionRows.filter((row) => ['active', 'trialing'].includes(row.status)).length;
  const subscriptionCollected = subscriptionRows
    .filter((row) => ['active', 'trialing'].includes(row.status))
    .reduce((sum, row) => sum + Number(row.amount_paid || 0), 0);

  const planDistribution = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of subscriptionRows) {
      const key = row.package?.name || row.package?.code || 'unassigned';
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [subscriptionRows]);

  const topBars = planDistribution.slice(0, 5);
  const maxBarCount = Math.max(...topBars.map((bar) => bar.count), 1);

  const channelSummary = useMemo(() => {
    return channelRows.reduce(
      (acc, row) => {
        acc.bookings += Number(row.bookings || 0);
        acc.appRevenue += Number(row.app_revenue || 0);
        acc.dashboardRevenue += Number(row.dashboard_revenue || 0);
        acc.payAtCafePending += Number(row.pay_at_cafe_pending || 0);
        acc.payAtCafeCompleted += Number(row.pay_at_cafe_completed || 0);
        acc.newUsers += Number(row.new_users || 0);
        acc.conversions += Number(row.conversions || 0);
        return acc;
      },
      { bookings: 0, appRevenue: 0, dashboardRevenue: 0, payAtCafePending: 0, payAtCafeCompleted: 0, newUsers: 0, conversions: 0 }
    );
  }, [channelRows]);

  const conversionRate = channelSummary.newUsers > 0
    ? (channelSummary.conversions / channelSummary.newUsers) * 100
    : 0;

  return (
    <section className="panel">
      <SectionHeader
        title={userCentric ? 'User & Channel Analytics' : 'Operations Analytics'}
        subtitle={userCentric
          ? 'New users, conversion, time-to-book, and channel-level performance.'
          : 'Daily channel overview, booking/revenue breakdown, pay-at-cafe pipeline, and vendor operations.'}
        actions={<button className="btn-secondary" onClick={load}><RefreshCcw size={14} /> Refresh</button>}
      />

      {error ? <ErrorBanner message={error} /> : null}
      {loading ? <LoadingRow text="Refreshing analytics..." /> : null}
      {!channelRows.length ? <div className="info-banner">Channel analytics API not wired yet. UI is ready for `admin/analytics/*` endpoints.</div> : null}

      {!userCentric ? (
        <>
          <div className="stats-grid">
            <div className="stat-card"><span>Total Cafes</span><strong>{vendorRows.length}</strong></div>
            <div className="stat-card"><span>Active Cafes</span><strong>{activeVendors}</strong></div>
            <div className="stat-card"><span>Pending Verification</span><strong>{pendingVerification}</strong></div>
            <div className="stat-card"><span>Active/Trial Subscriptions</span><strong>{activeSubscriptions}</strong></div>
            <div className="stat-card"><span>App vs Dashboard Revenue</span><strong>₹{channelSummary.appRevenue.toFixed(2)} / ₹{channelSummary.dashboardRevenue.toFixed(2)}</strong></div>
            <div className="stat-card"><span>Pay-at-Cafe Health</span><strong>{channelSummary.payAtCafeCompleted} done / {channelSummary.payAtCafePending} pending</strong></div>
            <div className="stat-card"><span>Today Pending Settlements</span><strong>₹{settlementSummary.total_pending_settlement.toFixed(2)}</strong></div>
            <div className="stat-card"><span>Subscription Revenue (captured)</span><strong>₹{subscriptionCollected.toFixed(2)}</strong></div>
          </div>

          <div className="subsection">
            <h3>Daily Channel Overview</h3>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Channel</th>
                    <th>Bookings</th>
                    <th>Revenue</th>
                    <th>Payment Modes</th>
                    <th>Booking Types</th>
                    <th>Status by Channel</th>
                  </tr>
                </thead>
                <tbody>
                  {channelRows.map((row) => (
                    <tr key={row.channel}>
                      <td>{row.channel}</td>
                      <td>{row.bookings}</td>
                      <td>₹{Number(row.revenue || 0).toFixed(2)}</td>
                      <td><small>{Object.entries(row.payment_mode_breakdown || {}).map(([k, v]) => `${k}:${v}`).join(' · ') || '-'}</small></td>
                      <td><small>{Object.entries(row.booking_type_breakdown || {}).map(([k, v]) => `${k}:${v}`).join(' · ') || '-'}</small></td>
                      <td><small>{Object.entries(row.status_breakdown || {}).map(([k, v]) => `${k}:${v}`).join(' · ') || '-'}</small></td>
                    </tr>
                  ))}
                  {!channelRows.length ? <tr><td colSpan={6}><small>No channel rows yet.</small></td></tr> : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="subsection">
            <h3>Vendor Daily by Channel / Recent Bookings Grouped by Vendor</h3>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Channel</th>
                    <th>Booking Count</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentVendorBookings.map((row) => (
                    <tr key={`${row.vendor_id}-${row.channel}`}>
                      <td>#{row.vendor_id} · {row.cafe_name}</td>
                      <td>{row.channel}</td>
                      <td>{row.booking_count}</td>
                      <td>₹{Number(row.amount || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                  {!recentVendorBookings.length ? <tr><td colSpan={4}><small>No grouped bookings rows yet.</small></td></tr> : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="subsection">
            <h3>Vendor First Seen Channel</h3>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>First Seen Channel</th>
                  </tr>
                </thead>
                <tbody>
                  {vendorFirstSeenChannel.map((row) => (
                    <tr key={`${row.vendor_id}-${row.first_seen_channel}`}>
                      <td>#{row.vendor_id} · {row.cafe_name}</td>
                      <td>{row.first_seen_channel}</td>
                    </tr>
                  ))}
                  {!vendorFirstSeenChannel.length ? <tr><td colSpan={2}><small>No first-seen data yet.</small></td></tr> : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="subsection">
            <h3>Plan Adoption</h3>
            <div className="analytics-bars">
              {topBars.map((bar) => (
                <div key={bar.name} className="bar-row">
                  <div className="bar-label">{bar.name}</div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${(bar.count / maxBarCount) * 100}%` }} />
                  </div>
                  <div className="bar-value">{bar.count}</div>
                </div>
              ))}
              {!topBars.length ? <small>No subscription plan data available yet.</small> : null}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card"><span>New Users (Channel)</span><strong>{channelSummary.newUsers}</strong></div>
            <div className="stat-card"><span>Conversions</span><strong>{channelSummary.conversions}</strong></div>
            <div className="stat-card"><span>Conversion Rate</span><strong>{conversionRate.toFixed(1)}%</strong></div>
            <div className="stat-card"><span>Avg Time to Book</span><strong>{channelRows.length ? (channelRows.reduce((sum, row) => sum + Number(row.avg_time_to_book_min || 0), 0) / channelRows.length).toFixed(1) : '0'} min</strong></div>
          </div>

          <div className="subsection">
            <h3>Booking Status by Channel</h3>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Channel</th>
                    <th>Bookings</th>
                    <th>Status Mix</th>
                    <th>Revenue (App / Dashboard)</th>
                  </tr>
                </thead>
                <tbody>
                  {channelRows.map((row) => (
                    <tr key={`user-${row.channel}`}>
                      <td>{row.channel}</td>
                      <td>{row.bookings}</td>
                      <td><small>{Object.entries(row.status_breakdown || {}).map(([k, v]) => `${k}:${v}`).join(' · ') || '-'}</small></td>
                      <td>₹{Number(row.app_revenue || 0).toFixed(2)} / ₹{Number(row.dashboard_revenue || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                  {!channelRows.length ? <tr><td colSpan={4}><small>No channel data yet.</small></td></tr> : null}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function SubscriptionsPanel({ modelsOnly = false }: { modelsOnly?: boolean }) {
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
  const [historyVendorId, setHistoryVendorId] = useState<number | null>(null);
  const { planCatalog, setPlanCatalog, catalogMessage, savePlanCatalog, catalogLoading } = usePlanCatalogState();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: '1', per_page: '500' });
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

  const enabledPlans = planCatalog.filter((plan) => plan.enabled);

  const groupedByVendor = useMemo(() => {
    const map = new Map<number, { current: (typeof rows)[number]; history: (typeof rows) }>();
    for (const row of rows) {
      const existing = map.get(row.vendor_id);
      if (!existing) {
        map.set(row.vendor_id, { current: row, history: [row] });
        continue;
      }
      existing.history.push(row);
      const existingTime = new Date(existing.current.period_end || existing.current.period_start || 0).getTime();
      const rowTime = new Date(row.period_end || row.period_start || 0).getTime();
      const currentIsLessRelevant = existing.current.status !== 'active' && row.status === 'active';
      if (currentIsLessRelevant || rowTime > existingTime || row.id > existing.current.id) {
        existing.current = row;
      }
    }
    return Array.from(map.values());
  }, [rows]);

  const selectedHistory = useMemo(
    () => groupedByVendor.find((item) => item.current.vendor_id === historyVendorId)?.history || [],
    [groupedByVendor, historyVendorId]
  );

  const planStats = useMemo(() => {
    const countByPlan = new Map<string, number>();
    for (const row of groupedByVendor) {
      const code = (row.current.package?.code || row.current.package?.name || 'unassigned').toLowerCase();
      countByPlan.set(code, (countByPlan.get(code) || 0) + 1);
    }
    return planCatalog.map((plan) => ({ ...plan, assigned: countByPlan.get(plan.code) || 0 }));
  }, [groupedByVendor, planCatalog]);

  const changePackage = async (vendorId: number) => {
    const code = (packageCode[vendorId] || '').trim().toLowerCase();
    if (!code) {
      setError('Select package first.');
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
        title={modelsOnly ? 'Subscription Models' : 'Cafe Subscriptions'}
        subtitle={modelsOnly
          ? 'Define what plans are offered globally (including Early Bird toggle).'
          : 'One row per cafe/owner with current subscription + quick history access.'}
        actions={<button className="btn-secondary" onClick={load}><RefreshCcw size={14} /> Refresh</button>}
      />

      {error ? <ErrorBanner message={error} /> : null}
      {catalogMessage ? <div className="success-banner">{catalogMessage}</div> : null}
      {catalogLoading ? <LoadingRow text="Loading subscription models..." /> : null}

      {modelsOnly ? (
        <>
          <div className="subsection">
            <h3>Hash Subscription Catalog</h3>
            <small>
              Suggested India benchmark range informed by SMB billing/POS pricing bands and adjusted for gaming-cafe specific realtime stack.
            </small>
            <div className="row-actions">
              <a href="https://cafesynk.com/pricing-new" target="_blank" rel="noreferrer">Cafe Synk pricing benchmark</a>
              <a href="https://www.restogro.com/pricing/" target="_blank" rel="noreferrer">Restogro annual plans</a>
              <a href="https://mybillbook.in/s/billing-app/" target="_blank" rel="noreferrer">myBillBook SMB pricing</a>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Enabled</th>
                    <th>PC Limit</th>
                    <th>Monthly (₹)</th>
                    <th>Quarterly (₹)</th>
                    <th>Yearly (₹)</th>
                    <th>Discounts</th>
                    <th>Offer / Features</th>
                    <th>Assigned Cafes</th>
                  </tr>
                </thead>
                <tbody>
                  {planStats.map((plan) => (
                    <tr key={plan.code}>
                      <td>
                        <strong>{plan.name}</strong>
                        <br />
                        <small>{plan.code}</small>
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={plan.enabled}
                          onChange={(e) => {
                            setPlanCatalog((prev) => prev.map((item) => item.code === plan.code ? { ...item, enabled: e.target.checked } : item));
                          }}
                        />
                      </td>
                      <td><input value={plan.pc_limit} onChange={(e) => setPlanCatalog((prev) => prev.map((item) => item.code === plan.code ? { ...item, pc_limit: Math.max(0, Number(e.target.value || 0)) } : item))} /></td>
                      <td><input value={plan.monthly} onChange={(e) => setPlanCatalog((prev) => prev.map((item) => item.code === plan.code ? { ...item, monthly: Math.max(0, Number(e.target.value || 0)) } : item))} /></td>
                      <td><input value={plan.quarterly} onChange={(e) => setPlanCatalog((prev) => prev.map((item) => item.code === plan.code ? { ...item, quarterly: Math.max(0, Number(e.target.value || 0)) } : item))} /></td>
                      <td><input value={plan.yearly} onChange={(e) => setPlanCatalog((prev) => prev.map((item) => item.code === plan.code ? { ...item, yearly: Math.max(0, Number(e.target.value || 0)) } : item))} /></td>
                      <td>
                        <small>Qtr: {plan.monthly > 0 ? Math.max(0, Math.round((1 - (plan.quarterly / (plan.monthly * 3))) * 100)) : 0}% off</small>
                        <br />
                        <small>Yr: {plan.monthly > 0 ? Math.max(0, Math.round((1 - (plan.yearly / (plan.monthly * 12))) * 100)) : 0}% off</small>
                      </td>
                      <td><small>{plan.onboarding_offer || '—'}</small><br /><small>{(Array.isArray(plan.features) ? plan.features : []).join(' • ')}</small></td>
                      <td><strong>{plan.assigned}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="row-actions">
              <button className="btn-primary" onClick={() => void savePlanCatalog()}>Save Subscription Models</button>
              <small>Disable Early Bird anytime using the Enabled toggle.</small>
            </div>
          </div>
        </>
      ) : (
        <>
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

          {loading ? <LoadingRow text="Loading subscriptions..." /> : null}

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Owner</th>
                  <th>Current Status</th>
                  <th>Current Plan</th>
                  <th>Amount</th>
                  <th>Period</th>
                  <th>History</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {groupedByVendor.map(({ current, history }) => (
                  <tr key={current.vendor_id}>
                    <td>#{current.vendor_id} · {current.cafe_name}</td>
                    <td>{current.owner_name || '-'}</td>
                    <td>{current.status}</td>
                    <td>{current.package?.name || current.package?.code || '-'}</td>
                    <td>₹{Number(current.amount_paid || 0).toFixed(2)}</td>
                    <td><small>{current.period_start ? new Date(current.period_start).toLocaleDateString() : '-'} → {current.period_end ? new Date(current.period_end).toLocaleDateString() : '-'}</small></td>
                    <td><button className="btn-ghost" onClick={() => setHistoryVendorId(current.vendor_id)}>View ({history.length})</button></td>
                    <td>
                      <div className="row-actions">
                        <select value={packageCode[current.vendor_id] || ''} onChange={(e) => setPackageCode((p) => ({ ...p, [current.vendor_id]: e.target.value }))}>
                          <option value="">select plan</option>
                          {enabledPlans.map((plan) => <option key={plan.code} value={plan.code}>{plan.name}</option>)}
                        </select>
                        <button className="btn-ghost" onClick={() => changePackage(current.vendor_id)}>Change</button>
                        <button className="btn-ghost" onClick={() => provisionDefault(current.vendor_id)}>Default</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!groupedByVendor.length && !loading ? <tr><td colSpan={8}><small>No cafes found.</small></td></tr> : null}
              </tbody>
            </table>
          </div>

          {historyVendorId ? (
            <div className="overlay-backdrop" onClick={() => setHistoryVendorId(null)}>
              <div className="overlay-panel" onClick={(e) => e.stopPropagation()}>
                <div className="overlay-header">
                  <div>
                    <h3>Subscription History · Vendor #{historyVendorId}</h3>
                    <p>Quick history overlay so no long scrolling is needed.</p>
                  </div>
                  <button className="btn-ghost" onClick={() => setHistoryVendorId(null)}><X size={16} /> Close</button>
                </div>
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
                      {selectedHistory.map((row) => (
                        <tr key={row.id}>
                          <td>{row.status}</td>
                          <td>{row.package?.name || row.package?.code || '-'}</td>
                          <td>₹{Number(row.amount_paid || 0).toFixed(2)}</td>
                          <td><small>{row.period_start ? new Date(row.period_start).toLocaleDateString() : '-'} → {row.period_end ? new Date(row.period_end).toLocaleDateString() : '-'}</small></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
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
    if (module === 'analytics_ops') return <AnalyticsPanel />;
    if (module === 'analytics_user') return <AnalyticsPanel userCentric />;
    if (module === 'subscription_models') return <SubscriptionsPanel modelsOnly />;
    if (module === 'cafe_subscriptions') return <SubscriptionsPanel />;
    if (module === 'collaborators') return <CollaboratorsPanel />;
    if (module === 'products') return <ProductsPanel />;
    return <OnboardPanel />;
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
            <p>Onboarding, verification, payouts, analytics, collaborators, products, and subscription lifecycle in one place.</p>
          </div>
        </header>

        {CurrentModule}
      </main>
    </div>
  );
}
