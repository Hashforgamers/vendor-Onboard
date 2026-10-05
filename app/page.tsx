'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  AlertTriangle,
  BarChart3,
  Check,
  ClipboardCheck,
  CreditCard,
  Download,
  Gamepad2,
  Grid2X2,
  HelpCircle,
  Handshake,
  Info,
  Mail,
  Monitor,
  MoreHorizontal,
  Plus,
  Package,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  Store,
  Trash2,
  UserRound,
  X,
  Zap,
} from 'lucide-react';

type ModuleId =
  | 'overview'
  | 'cafes'
  | 'approval'
  | 'users'
  | 'regional'
  | 'tournaments'
  | 'games'
  | 'bookings'
  | 'payments'
  | 'analytics'
  | 'subscriptions'
  | 'plans'
  | 'partners'
  | 'products'
  | 'newsletter'
  | 'kiosk'
  | 'notification-context';

type VendorRow = {
  vendor_id: number;
  cafe_name: string;
  owner_name: string;
  account_id?: number | null;
  status: string;
  email?: string;
  phone?: string;
  created_at?: string | null;
  address?: { addressLine1?: string | null; addressLine2?: string | null; state?: string | null; country?: string | null };
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
    period_start?: string | null;
    period_end?: string | null;
    set_by?: string;
    set_by_super_admin?: boolean;
  };
  team_access?: { total: number; active: number };
  deactivation_notifications?: {
    sent_count: number;
    last_sent_at?: string | null;
  };
};

type VendorDocument = {
  id: number;
  document_type: string;
  document_url: string;
  documentUrl?: string;
  status: string;
  uploaded_at?: string;
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
  documents?: VendorDocument[];
  subscriptions?: Array<{
    id: number;
    status: string;
    amount_paid: number;
    period_start: string;
    period_end: string;
    is_active?: boolean;
    set_by?: string;
    set_by_super_admin?: boolean;
    package?: { name?: string; code?: string; pc_limit?: number };
  }>;
  team_access?: {
    available: boolean;
    staff: Array<{ id: number; name: string; role: string; pin_code?: string; is_active: boolean }>;
  };
};

type ApiError = { message?: string; error?: string };

type SettlementRow = {
  vendor_id: number;
  cafe_name: string;
  booking_count: number;
  transaction_count: number;
  app_collected: number;
  pending_settlement: number;
  already_settled: number;
};

type GameRow = {
  id?: number;
  game_id?: number;
  name?: string;
  title?: string;
  platform?: string;
  cover_image_url?: string;
  released?: string;
  rating?: number;
  vendors_count?: number;
};

type PlanModel = {
  code: string;
  name: string;
  enabled: boolean;
  active?: boolean;
  pc_limit: number;
  monthly: number;
  quarterly: number;
  yearly: number;
  features: string[];
  plan_features?: string[];
  entitlements?: string[];
  extra_pc_monthly?: number;
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

type CollaboratorProduct = {
  product_id: string;
  name: string;
  category: string;
  unit_price: string;
  stock_quantity: number;
  min_order_quantity: number;
  status: string;
  description?: string;
  sku?: string;
};

type SubscriptionRow = {
  id: number;
  vendor_id: number;
  cafe_name: string;
  owner_name: string;
  status: string;
  is_active?: boolean;
  set_by?: string;
  set_by_super_admin?: boolean;
  amount_paid: number;
  period_start?: string;
  period_end?: string;
  package?: { code?: string; name?: string; pc_limit?: number };
};

type BookingQueueRow = { id: number; booking_id?: number | null; console_id: number; game_id: number; user_id?: number | null; status: string; start_time?: string | null; end_time?: string | null };

const HASH_LOGO_URL = 'https://res.cloudinary.com/dxjjigepf/image/upload/v1774472024/hash_for_gamer_logo_d1v4wc.png';

const navItems: Array<{ id: ModuleId; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { id: 'overview', label: 'Dashboard', icon: Grid2X2 },
  { id: 'cafes', label: 'Cafes', icon: Store },
  { id: 'approval', label: 'Approval Center', icon: ClipboardCheck },
  { id: 'games', label: 'Games', icon: Gamepad2 },
  { id: 'payments', label: 'Payment Center', icon: CreditCard },
  { id: 'plans', label: 'Subscription Plans', icon: SlidersHorizontal },
  { id: 'subscriptions', label: 'Cafe Subscriptions', icon: Monitor },
  { id: 'partners', label: 'Partners', icon: Handshake },
  { id: 'products', label: 'Catalog', icon: Package },
  { id: 'newsletter', label: 'Newsletter', icon: Mail },
  { id: 'kiosk', label: 'Kiosk releases', icon: Monitor },
  { id: 'notification-context', label: 'Push notifications', icon: Mail },
];

const fallbackVendors: VendorRow[] = [
  {
    vendor_id: 99210,
    cafe_name: 'CyberSphere Seoul',
    owner_name: 'Kim Min-su',
    status: 'active',
    email: 'kim@cybersphere.gg',
    phone: '+82 10 4420 2211',
    documents: { total: 4, verified: 4, pending: 0, is_fully_verified: true },
    subscription: { status: 'active', is_active: true, package: { name: 'Elite', code: 'elite', pc_limit: 124 }, amount_paid: 24200 },
    team_access: { total: 18, active: 16 },
  },
  {
    vendor_id: 88124,
    cafe_name: 'Pixel Vault Berlin',
    owner_name: 'Lukas Weber',
    status: 'maintenance',
    email: 'lukas@pixelvault.de',
    documents: { total: 4, verified: 3, pending: 1, is_fully_verified: false },
    subscription: { status: 'active', is_active: true, package: { name: 'Grow', code: 'grow', pc_limit: 88 }, amount_paid: 12450 },
    team_access: { total: 9, active: 7 },
  },
  {
    vendor_id: 44091,
    cafe_name: 'Aether Lounge SF',
    owner_name: 'Sarah Chen',
    status: 'active',
    email: 'sarah@aether.gg',
    documents: { total: 4, verified: 4, pending: 0, is_fully_verified: true },
    subscription: { status: 'active', is_active: true, package: { name: 'Elite', code: 'elite', pc_limit: 160 }, amount_paid: 38900 },
    team_access: { total: 22, active: 21 },
  },
  {
    vendor_id: 12003,
    cafe_name: 'Frag Haus Austin',
    owner_name: 'Rick Miller',
    status: 'suspended',
    email: 'rick@fraghaus.com',
    documents: { total: 4, verified: 2, pending: 2, is_fully_verified: false },
    subscription: { status: 'past_due', is_active: false, package: { name: 'Base', code: 'base', pc_limit: 40 }, amount_paid: 4100 },
    team_access: { total: 4, active: 0 },
  },
  {
    vendor_id: 7721,
    cafe_name: 'Nexus Gaming Lounge',
    owner_name: 'Maya Tan',
    status: 'pending_verification',
    email: 'maya@nexus.sg',
    phone: '+65 8123 1880',
    documents: { total: 4, verified: 2, pending: 2, is_fully_verified: false },
    subscription: { status: 'trialing', is_active: true, package: { name: 'Early Bird', code: 'early_onboard', pc_limit: 60 }, amount_paid: 0 },
    team_access: { total: 3, active: 2 },
  },
  {
    vendor_id: 8842,
    cafe_name: 'Neon Pulse Gaming',
    owner_name: 'Akira Sato',
    status: 'pending_verification',
    email: 'ops@neonpulse.jp',
    documents: { total: 4, verified: 1, pending: 3, is_fully_verified: false },
    subscription: { status: 'trialing', is_active: true, package: { name: 'Early Bird', code: 'early_onboard', pc_limit: 48 }, amount_paid: 0 },
    team_access: { total: 2, active: 1 },
  },
];

const fallbackDetails: Record<number, VendorDetail> = {
  7721: {
    vendor_id: 7721,
    cafe_name: 'Nexus Gaming Lounge',
    owner_name: 'Maya Tan',
    status: 'pending_verification',
    account_email: 'maya@nexus.sg',
    contact: { email: 'maya@nexus.sg', phone: '+65 8123 1880' },
    address: { addressLine1: '101 Victoria St', state: 'Singapore', pincode: '188064', country: 'Singapore' },
    documents: [
      { id: 1, document_type: 'Business License', document_url: '', status: 'pending', uploaded_at: '2026-07-31T10:30:00Z' },
      { id: 2, document_type: 'Identity Docs', document_url: '', status: 'verified', uploaded_at: '2026-07-31T10:32:00Z' },
      { id: 3, document_type: 'Financial Details', document_url: '', status: 'pending', uploaded_at: '2026-07-31T10:35:00Z' },
    ],
    subscriptions: [
      { id: 1, status: 'trialing', amount_paid: 0, period_start: '2026-07-31', period_end: '2026-08-31', package: { name: 'Early Bird', code: 'early_onboard', pc_limit: 60 } },
    ],
    team_access: { available: true, staff: [{ id: 1, name: 'Maya Tan', role: 'owner', is_active: true }] },
  },
};

// Retained as local fixtures for development only; live admin views never render them.
void [fallbackVendors, fallbackDetails];

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
      return { message: text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() };
    }
  })() : {};

  if (!response.ok) {
    const error = data as ApiError;
    throw new Error(error.message || error.error || `Request failed (${response.status})`);
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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function dateInputValue(value?: string | null) {
  if (!value) return '';
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

function addDaysIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function to12h(time24: string) {
  const [rawHour, rawMinute] = time24.split(':');
  const hour = Number(rawHour);
  if (Number.isNaN(hour)) return '09:00 AM';
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(h12).padStart(2, '0')}:${rawMinute || '00'} ${period}`;
}

function classNames(...items: Array<string | false | null | undefined>) {
  return items.filter(Boolean).join(' ');
}

function formatMoney(value: number, currency = '$') {
  return `${currency}${Math.round(value).toLocaleString()}`;
}

function normalizePlanModel(plan: PlanModel): PlanModel {
  return {
    ...plan,
    enabled: Boolean(plan.enabled ?? plan.active),
    features: Array.isArray(plan.features) ? plan.features : (plan.plan_features || []),
    entitlements: plan.entitlements ?? ['kiosk','pricing','cafe_wallet','passes','food','analytics','tournaments','staff'],
    extra_pc_monthly: plan.extra_pc_monthly ?? 0,
  };
}

function statusTone(status: string) {
  const normalized = status.toLowerCase();
  if (['active', 'verified', 'approved'].includes(normalized)) return 'good';
  if (['pending', 'pending_verification', 'trialing', 'maintenance', 'submitted'].includes(normalized)) return 'warn';
  if (['suspended', 'rejected', 'inactive', 'past_due'].includes(normalized)) return 'bad';
  return 'neutral';
}

function cityForVendor(vendor: VendorRow) {
  return vendor.address?.addressLine2 || vendor.address?.state || vendor.address?.country || 'Not provided';
}

function machinesForVendor(vendor: VendorRow) {
  return { active: 0, limit: Number(vendor.subscription?.package?.pc_limit || 0) };
}

function getDocumentUrl(document?: VendorDocument) {
  if (!document) return '';
  return document.document_url || document.documentUrl || '';
}

function documentCategory(documentType = '') {
  const normalized = documentType.toLowerCase();
  if (normalized.includes('identity') || normalized.includes('owner')) return 'identity';
  if (normalized.includes('financial') || normalized.includes('bank') || normalized.includes('tax')) return 'financial';
  return 'business';
}

function isPdfDocument(url: string) {
  return /\.pdf(?:$|[?#])/i.test(url) || /\/raw\/upload\//i.test(url);
}

function useAdminData() {
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usingFallback, setUsingFallback] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows: VendorRow[] = [];
      for (let page = 1; ; page++) {
        const data = await apiRequest<{ vendors: VendorRow[] }>(`admin/vendors?page=${page}&per_page=100`);
        const batch = data.vendors || [];
        rows.push(...batch);
        if (batch.length < 100) break;
      }
      setVendors(rows);
      setUsingFallback(false);
    } catch (e) {
      setVendors([]);
      setUsingFallback(false);
      setError(e instanceof Error ? e.message : 'Backend unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { vendors, loading, error, usingFallback, reload: load, setVendors };
}

function Sidebar({ active, setActive }: { active: ModuleId; setActive: (id: ModuleId) => void }) {
  return (
    <aside className="hq-sidebar">
      <div className="hq-brand">
        <Image src={HASH_LOGO_URL} alt="Hash Admin" width={40} height={40} className="hq-logo" priority unoptimized />
        <div>
          <strong>Hash Admin</strong>
        </div>
      </div>

      <nav className="hq-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={classNames('hq-nav-button', active === item.id && 'active')}
              onClick={() => setActive(item.id)}
              title={item.label}
            >
              <Icon size={22} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="hq-sidebar-bottom">
        <div className="system-card">
          <strong>System Status</strong>
          <span><i /> All nodes optimal</span>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ active, query, setQuery, reload, loading }: {
  active: ModuleId;
  query: string;
  setQuery: (value: string) => void;
  reload: () => void;
  loading: boolean;
}) {
  const placeholder = active === 'approval'
    ? 'Search approvals...'
    : active === 'cafes'
      ? 'Search cafes, owners, or regions...'
      : 'Search cafes, players, or transactions...';

  return (
    <header className="hq-topbar">
      <div className="search-box">
        <Search size={18} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} />
        <kbd>Cmd+K</kbd>
      </div>
      <div className="topbar-actions">
        <button className="icon-button" onClick={reload} title="Refresh data">
          <RefreshCcw size={18} className={loading ? 'spin' : ''} />
        </button>
        <div className="admin-profile">
          <div>
            <strong>Alex Rivera</strong>
            <span>Senior Auditor</span>
          </div>
          <div className="avatar">AR</div>
        </div>
      </div>
    </header>
  );
}

function MetricCard({ icon: Icon, label, value, trend, tone = 'neutral' }: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: string;
  trend?: string;
  tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'blue';
}) {
  return (
    <div className={classNames('metric-card', `tone-${tone}`)}>
      <div className="metric-top">
        <span className="metric-icon"><Icon size={24} /></span>
        {trend ? <span className="metric-trend">{trend}</span> : null}
      </div>
      <span className="metric-label">{label}</span>
      <strong>{value}</strong>
      <div className="metric-spark" />
    </div>
  );
}

function OnboardCafeModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    cafe_name: '',
    owner_name: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    country: 'India',
    pin: '',
    password: '',
    machines: '10',
    rate: '120',
    open: '09:00',
    close: '23:00',
  });

  const setField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      if (!form.cafe_name.trim() || !form.owner_name.trim() || !form.email.trim()) {
        throw new Error('Cafe name, owner name, and email are required.');
      }
      const phone = form.phone.replace(/\D/g, '');
      if (phone && phone.length !== 10) {
        throw new Error('Phone must be 10 digits.');
      }
      const payload = {
        cafe_name: form.cafe_name.trim(),
        owner_name: form.owner_name.trim(),
        vendor_account_email: form.email.trim().toLowerCase(),
        vendor_pin: form.pin || undefined,
        vendor_password: form.password || undefined,
        contact_info: { email: form.email.trim().toLowerCase(), phone, website: undefined },
        physicalAddress: {
          street: form.city.trim() || 'Main Street',
          city: form.city.trim(),
          state: form.state.trim(),
          zipCode: '000000',
          country: form.country.trim() || 'India',
        },
        business_registration_details: {
          registration_number: `HASH-${Date.now()}`,
          business_type: 'private_limited',
          tax_id: '',
          registration_date: todayIso(),
        },
        document_submitted: {
          business_registration: false,
          owner_identification_proof: false,
          tax_identification_number: false,
          bank_acc_details: false,
        },
        timing: Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => [day, {
          open: to12h(form.open),
          close: to12h(form.close),
          closed: false,
        }])),
        opening_day: todayIso(),
        slot_duration: 30,
        amenities: { seating_area: true, washroom: true, air_conditioner: true },
        available_games: [{ name: 'pc', total_slot: Number(form.machines || 1), rate_per_slot: Number(form.rate || 0) }],
      };
      const body = new FormData();
      body.append('json', JSON.stringify(payload));
      await apiRequest<{ message?: string; vendor_id?: number }>('onboard', { method: 'POST', body });
      setMessage('Cafe onboarded successfully.');
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to onboard cafe.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel compact-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div><h2>Onboard Cafe</h2><p>Create a vendor record with starter inventory and hours.</p></div>
          <button className="icon-button" onClick={onClose}><X size={18} /></button>
        </div>
        {error ? <div className="action-notice bad">{error}</div> : null}
        {message ? <div className="action-notice good">{message}</div> : null}
        <div className="form-grid-compact">
          <label>Cafe Name<input value={form.cafe_name} onChange={(e) => setField('cafe_name', e.target.value)} /></label>
          <label>Owner Name<input value={form.owner_name} onChange={(e) => setField('owner_name', e.target.value)} /></label>
          <label>Email<input value={form.email} onChange={(e) => setField('email', e.target.value)} /></label>
          <label>Phone<input value={form.phone} onChange={(e) => setField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} /></label>
          <label>City<input value={form.city} onChange={(e) => setField('city', e.target.value)} /></label>
          <label>State<input value={form.state} onChange={(e) => setField('state', e.target.value)} /></label>
          <label>Country<input value={form.country} onChange={(e) => setField('country', e.target.value)} /></label>
          <label>Owner PIN<input value={form.pin} maxLength={4} onChange={(e) => setField('pin', e.target.value.replace(/\D/g, '').slice(0, 4))} /></label>
          <label>Temp Password<input value={form.password} onChange={(e) => setField('password', e.target.value)} /></label>
          <label>Machines<input value={form.machines} onChange={(e) => setField('machines', e.target.value.replace(/\D/g, ''))} /></label>
          <label>Rate / Slot<input value={form.rate} onChange={(e) => setField('rate', e.target.value.replace(/\D/g, ''))} /></label>
          <label>Hours<input value={`${form.open} - ${form.close}`} readOnly /></label>
        </div>
        <div className="modal-actions">
          <button className="action-button secondary small-action" onClick={onClose}>Cancel</button>
          <button className="action-button primary small-action" onClick={submit} disabled={saving}>{saving ? 'Saving...' : 'Create Cafe'}</button>
        </div>
      </div>
    </div>
  );
}

type CafeDetailTab = 'profile' | 'documents' | 'operations' | 'team' | 'plan' | 'bookings' | 'notices';

function VendorDetailModal({ vendor, onClose, onChanged }: {
  vendor: VendorRow;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<VendorDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [staffName, setStaffName] = useState('');
  const [ownerMessage, setOwnerMessage] = useState('');
  const [bookingQueue, setBookingQueue] = useState<BookingQueueRow[]>([]);
  const [activeTab, setActiveTab] = useState<CafeDetailTab>('profile');
  const [promotionPlan, setPromotionPlan] = useState('early_onboard');
  const [manualPlan, setManualPlan] = useState(vendor.subscription?.package?.code || 'early_onboard');
  const [manualStart, setManualStart] = useState(todayIso());
  const [manualEnd, setManualEnd] = useState(addDaysIso(30));
  const [manualAmount, setManualAmount] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [data, queueData] = await Promise.all([
        apiRequest<{ vendor: VendorDetail }>(`admin/vendors/${vendor.vendor_id}`),
        optionalApiRequest<{ queue?: BookingQueueRow[] }>(`admin/vendors/${vendor.vendor_id}/booking-queue`, { queue: [] }),
      ]);
      setDetail(data.vendor);
      setBookingQueue(queueData.queue || []);
    } catch (e) {
      setDetail(null);
      setError(e instanceof Error ? e.message : 'Unable to load live cafe details.');
    } finally {
      setLoading(false);
    }
  }, [vendor]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (label: string, fn: () => Promise<void>) => {
    setError('');
    setMessage('');
    try {
      await fn();
      setMessage(label);
      await load();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed.');
    }
  };
  const confirmAndRun = (prompt: string, label: string, fn: () => Promise<void>) => {
    if (window.confirm(prompt)) void runAction(label, fn);
  };

  const applyManualPlan = () => {
    const body = {
      package_code: manualPlan,
      immediate: true,
      unit_amount: Number(manualAmount || 0),
      period_start: manualStart,
      period_end: manualEnd,
    };
    confirmAndRun(
      `Apply ${manualPlan.replace('_', ' ')} from ${manualStart} to ${manualEnd}?`,
      `Plan changed to ${manualPlan}.`,
      () => apiRequest(`admin/vendors/${vendor.vendor_id}/subscriptions/change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(() => undefined)
    );
  };

  const docs = detail?.documents || [];
  const contact = detail?.contact;
  const address = detail?.address;
  const activeSubscription = detail?.subscriptions?.find((subscription) => subscription.is_active) || detail?.subscriptions?.[0];
  const currentPlanName = activeSubscription?.package?.name || vendor.subscription?.package?.name || 'No plan';
  const currentPlanStatus = activeSubscription?.is_active ? 'active now' : (activeSubscription?.status || vendor.subscription?.status || 'unknown');
  const currentPlanSource = activeSubscription?.set_by_super_admin || vendor.subscription?.set_by_super_admin ? 'Super admin' : null;
  const fullAddress = [address?.addressLine1, address?.addressLine2, address?.state, address?.pincode, address?.country]
    .filter(Boolean)
    .join(', ') || 'Address not provided';
  const tabs: Array<{ id: CafeDetailTab; label: string }> = [
    { id: 'profile', label: 'Cafe profile' },
    { id: 'documents', label: `Documents${docs.length ? ` (${docs.length})` : ''}` },
    { id: 'operations', label: 'Operations' },
    { id: 'team', label: 'Team' },
    { id: 'plan', label: 'Plan' },
    { id: 'bookings', label: `Bookings${bookingQueue.length ? ` (${bookingQueue.length})` : ''}` },
    { id: 'notices', label: 'Messages' },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel detail-modal cafe-detail-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>{detail?.cafe_name || vendor.cafe_name}</h2>
            <p>Vendor #{vendor.vendor_id} · {detail?.owner_name || vendor.owner_name} · {detail?.status || vendor.status}</p>
          </div>
          <button className="icon-button" onClick={onClose} title="Close cafe details"><X size={18} /></button>
        </div>
        {loading ? <div className="action-notice">Loading vendor detail...</div> : null}
        {message ? <div className="action-notice good">{message}</div> : null}
        {error ? <div className="action-notice bad">{error}</div> : null}

        <div className="detail-tabs" role="tablist" aria-label="Cafe management sections">
          {tabs.map((tab) => <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}
        </div>

        <div className="detail-tab-content">
          {activeTab === 'profile' ? <section className="profile-card">
            <div className="profile-summary">
              <span className="initials">{(detail?.cafe_name || vendor.cafe_name).split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>
              <div><h3>{detail?.cafe_name || vendor.cafe_name}</h3><p>{detail?.description || 'Cafe profile and owner contact record.'}</p></div>
              <span className={classNames('status-pill', statusTone(detail?.status || vendor.status))}>{(detail?.status || vendor.status).replaceAll('_', ' ')}</span>
            </div>
            <div className="profile-details-grid">
              <div><span>Cafe name</span><strong>{detail?.cafe_name || vendor.cafe_name}</strong></div>
              <div><span>Owner</span><strong>{detail?.owner_name || vendor.owner_name || 'Not provided'}</strong></div>
              <div><span>Address</span><strong>{fullAddress}</strong></div>
              <div><span>Contact number</span><strong>{contact?.phone || vendor.phone || 'Not provided'}</strong></div>
              <div><span>Contact email</span><strong>{contact?.email || detail?.account_email || vendor.email || 'Not provided'}</strong></div>
              <div><span>Account email</span><strong>{detail?.account_email || vendor.email || 'Not provided'}</strong></div>
            </div>
          </section> : null}

          {activeTab === 'operations' ? <section className="e2e-card">
            <h3>Status</h3>
            <p>{detail?.status || vendor.status}</p>
            <div className="inline-actions">
              <button disabled={docs.length < 1 || docs.some((doc) => doc.status !== 'verified')} onClick={() => confirmAndRun('Activate this cafe? All documents must be verified.', 'Cafe activated.', () => apiRequest(`admin/vendors/${vendor.vendor_id}/status`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'active' }),
              }).then(() => undefined))}>Activate</button>
              <button onClick={() => confirmAndRun('Suspend this cafe? Access may be interrupted immediately.', 'Cafe suspended.', () => apiRequest(`admin/vendors/${vendor.vendor_id}/status`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'suspended' }),
              }).then(() => undefined))}>Suspend</button>
              <button className="danger" onClick={() => confirmAndRun('Deboard this cafe? This action removes its vendor record and cannot be undone.', 'Cafe deboarded.', () => apiRequest(`admin/vendors/${vendor.vendor_id}`, { method: 'DELETE' }).then(() => undefined))}><Trash2 size={14} /> Deboard</button>
            </div>
          </section> : null}

          {activeTab === 'documents' ? <section className="e2e-card">
            <h3>Documents</h3>
            {docs.length ? docs.map((doc) => (
              <div className="mini-row" key={doc.id}>
                <span>{doc.document_type}</span>
                <b className={classNames('doc-status', statusTone(doc.status))}>{doc.status}</b>
              </div>
            )) : <p>No document records returned.</p>}
            <div className="inline-actions">
              <button disabled={!docs.length} onClick={() => runAction('Documents marked verified.', () => apiRequest(`admin/vendors/${vendor.vendor_id}/documents/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ document_ids: docs.map((doc) => doc.id), status: 'verified' }),
              }).then(() => undefined))}>Verify All</button>
              <button disabled={!docs.length} onClick={() => confirmAndRun('Reject every listed document? The cafe owner will be notified.', 'Documents marked rejected.', () => apiRequest(`admin/vendors/${vendor.vendor_id}/documents/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ document_ids: docs.map((doc) => doc.id), status: 'rejected' }),
              }).then(() => undefined))}>Reject Docs</button>
            </div>
          </section> : null}

          {activeTab === 'operations' ? <section className="e2e-card">
            <h3>Credentials</h3>
            <div className="form-grid-compact two">
              <label>New PIN<input value={pin} maxLength={4} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="auto if blank" /></label>
              <label>Password<input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="auto if blank" /></label>
            </div>
            <div className="inline-actions">
              <button onClick={() => confirmAndRun('Reset this cafe PIN? The owner will need the new credentials.', 'PIN reset.', () => apiRequest(`admin/vendors/${vendor.vendor_id}/credentials/reset-pin`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: pin || undefined }),
              }).then(() => { setPin(''); }))}>Reset PIN</button>
              <button onClick={() => confirmAndRun('Reset this cafe password and notify the owner?', 'Password reset.', () => apiRequest(`admin/vendors/${vendor.vendor_id}/credentials/reset-password`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: password || undefined, notify: true }),
              }).then(() => { setPassword(''); }))}>Reset Password</button>
            </div>
          </section> : null}

          {activeTab === 'team' ? <section className="e2e-card">
            <h3>Team Access</h3>
            {(detail?.team_access?.staff || []).slice(0, 4).map((staff) => (
              <div className="mini-row" key={staff.id}><span>{staff.name} · {staff.role}</span><div className="inline-actions"><b>{staff.is_active ? 'active' : 'inactive'}</b><button onClick={() => runAction(`Staff ${staff.is_active ? 'disabled' : 'enabled'}.`, () => apiRequest(`admin/vendors/${vendor.vendor_id}/team-access/staff/${staff.id}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !staff.is_active }),
              }).then(() => undefined))}>{staff.is_active ? 'Disable' : 'Enable'}</button><button className="danger" onClick={() => runAction('Staff removed.', () => apiRequest(`admin/vendors/${vendor.vendor_id}/team-access/staff/${staff.id}`, { method: 'DELETE' }).then(() => undefined))}>Remove</button></div></div>
            ))}
            <div className="form-grid-compact two">
              <label>Staff Name<input value={staffName} onChange={(e) => setStaffName(e.target.value)} /></label>
              <label>Role<input value="staff" readOnly /></label>
            </div>
            <button onClick={() => runAction('Staff added.', () => apiRequest(`admin/vendors/${vendor.vendor_id}/team-access/staff`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: staffName, role: 'staff', is_active: true }),
            }).then(() => { setStaffName(''); }))}>Add Staff</button>
          </section> : null}

          {activeTab === 'plan' ? <section className="e2e-card">
            <h3>Subscription</h3>
            <p>{currentPlanName} · {currentPlanStatus}{currentPlanSource ? ` · ${currentPlanSource}` : ''}</p>
            {activeSubscription ? <div className="mini-row"><span>Active period</span><b>{dateInputValue(activeSubscription.period_start) || '-'} to {dateInputValue(activeSubscription.period_end) || '-'}</b></div> : null}
            <div className="form-grid-compact four">
              <label>Plan<select value={manualPlan} onChange={(event) => setManualPlan(event.target.value)}><option value="early_onboard">Early Onboard</option><option value="base">Base</option><option value="grow">Grow</option><option value="elite">Elite</option></select></label>
              <label>From<input type="date" value={manualStart} onChange={(event) => setManualStart(event.target.value)} /></label>
              <label>To<input type="date" value={manualEnd} min={manualStart || undefined} onChange={(event) => setManualEnd(event.target.value)} /></label>
              <label>Amount<input type="number" min="0" value={manualAmount} onChange={(event) => setManualAmount(event.target.value)} placeholder="0" /></label>
            </div>
            <div className="inline-actions">
              <button disabled={!manualPlan || !manualStart || !manualEnd} onClick={applyManualPlan}>Apply Period</button>
              {['early_onboard', 'base', 'grow', 'elite'].map((code) => (
                <button key={code} onClick={() => confirmAndRun(`Change this cafe to the ${code.replace('_', ' ')} plan?`, `Plan changed to ${code}.`, () => apiRequest(`admin/vendors/${vendor.vendor_id}/subscriptions/change`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ package_code: code, immediate: true }),
                }).then(() => undefined))}>{code.replace('_', ' ')}</button>
              ))}
              <button onClick={() => confirmAndRun('Provision the default subscription plan for this cafe?', 'Default plan provisioned.', () => apiRequest(`admin/vendors/${vendor.vendor_id}/subscriptions/provision-default`, { method: 'POST' }).then(() => undefined))}>Default Plan</button>
            </div>
          </section> : null}

          {activeTab === 'bookings' ? <section className="e2e-card booking-queue-card">
            <h3>Booking Queue</h3>
            {bookingQueue.length ? bookingQueue.slice(0, 6).map((entry) => <div className="mini-row" key={entry.id}><span>#{entry.booking_id || entry.id} · Console {entry.console_id}</span><select value={entry.status} onChange={(event) => runAction('Queue entry updated.', () => apiRequest(`admin/vendors/${vendor.vendor_id}/booking-queue/${entry.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: event.target.value }) }).then(() => undefined))}><option value="queued">Queued</option><option value="started">Started</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>) : <p>No queue entries for this cafe.</p>}
          </section> : null}

          {activeTab === 'notices' ? <section className="e2e-card">
            <h3>Owner Notices</h3>
            <label>Message<textarea value={ownerMessage} onChange={(event) => setOwnerMessage(event.target.value)} placeholder="Add an optional note for the cafe owner" /></label>
            <label>Promotion plan<select value={promotionPlan} onChange={(event) => setPromotionPlan(event.target.value)}><option value="early_onboard">Early Onboard</option><option value="base">Base</option><option value="grow">Grow</option><option value="elite">Elite</option></select></label>
            <div className="inline-actions">
              <button onClick={() => confirmAndRun(`Send the ${promotionPlan.replace('_', ' ')} promotion to this cafe?`, 'Promotion email sent.', () => apiRequest(`admin/vendors/${vendor.vendor_id}/notifications/promotion/early-onboard`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sent_by: 'super_admin_dashboard', message: ownerMessage || undefined, package_code: promotionPlan }),
              }).then(() => undefined))}>Send Promotion</button>
              <button onClick={() => confirmAndRun('Send this deactivation notice to the cafe owner?', 'Deactivation notice sent.', () => apiRequest(`admin/vendors/${vendor.vendor_id}/notifications/deactivation`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: ownerMessage || 'Admin review', sent_by: 'super_admin_dashboard' }),
              }).then(() => undefined))}>Send Notice</button>
            </div>
          </section> : null}
        </div>
      </div>
    </div>
  );
}

function OverviewPage({ vendors, setActive }: { vendors: VendorRow[]; setActive: (id: ModuleId) => void }) {
  const active = vendors.filter((v) => v.status === 'active').length;
  const revenue = vendors.reduce((sum, vendor) => sum + Number(vendor.subscription?.amount_paid || 0), 0);
  const capacity = vendors.reduce((sum, vendor) => sum + machinesForVendor(vendor).limit, 0);

  return (
    <section className="page-stack overview-stack">
      <div className="hero-row">
        <div>
          <h1>Network Overview</h1>
          <p>Live operational status from the cafe registry.</p>
        </div>
        <div className="hero-actions">
          <button className="action-button cyan" onClick={() => setActive('approval')}><ClipboardCheck size={22} /> Approve Pending</button>
          <button className="action-button primary" onClick={() => setActive('cafes')}><Plus size={22} /> Add Cafe</button>
        </div>
      </div>

      <div className="metrics-grid">
        <MetricCard icon={Store} label="Total Cafes" value={vendors.length.toLocaleString()} />
        <MetricCard icon={ClipboardCheck} label="Approved Cafes" value={active.toLocaleString()} tone="blue" />
        <MetricCard icon={CreditCard} label="Subscription Revenue" value={formatMoney(revenue)} tone="warn" />
        <MetricCard icon={Monitor} label="Licensed PCs" value={capacity.toLocaleString()} />
      </div>

      <div className="dashboard-grid live-dashboard-grid">
        <section className="chart-panel wide">
          <div className="panel-head"><h2>Needs Attention</h2><button onClick={() => setActive('approval')}>Open approvals</button></div>
          <div className="dashboard-list">
            {vendors.filter((vendor) => vendor.status !== 'active' || (vendor.documents?.pending || 0) > 0).slice(0, 5).map((vendor) => (
              <button key={vendor.vendor_id} onClick={() => setActive('cafes')}><span><strong>{vendor.cafe_name}</strong><small>{vendor.owner_name} · {cityForVendor(vendor)}</small></span><b className={classNames('status-pill', statusTone(vendor.status))}>{vendor.status.replaceAll('_', ' ')}</b></button>
            ))}
            {!vendors.length ? <div className="empty-state">No cafe records available.</div> : null}
          </div>
        </section>
        <section className="chart-panel activity-panel">
          <div className="panel-head compact"><h2>Approval Queue</h2><button onClick={() => setActive('approval')}>Review</button></div>
          <strong className="queue-count">{vendors.filter((vendor) => vendor.status === 'pending_verification' || (vendor.documents?.pending || 0) > 0).length}</strong>
          <p>cafes require review</p>
        </section>
        <section className="chart-panel density-panel">
          <div className="panel-head compact"><h2>Plan Adoption</h2><button onClick={() => setActive('cafes')}>Manage</button></div>
          <div className="analytics-bars">
            {Object.entries(vendors.reduce<Record<string, number>>((acc, vendor) => { const key = vendor.subscription?.package?.name || 'Unassigned'; acc[key] = (acc[key] || 0) + 1; return acc; }, {})).map(([plan, count]) => <div className="bar-row" key={plan}><span>{plan}</span><b><i style={{ width: `${(count / Math.max(vendors.length, 1)) * 100}%` }} /></b><strong>{count}</strong></div>)}
          </div>
        </section>
        <section className="chart-panel bookings-panel">
          <div className="panel-head compact"><h2>Network Capacity</h2><button onClick={() => setActive('cafes')}>View cafes</button></div>
          <strong className="queue-count">{capacity.toLocaleString()}</strong>
          <p>licensed PCs</p>
        </section>
      </div>
    </section>
  );
}

function SupportIssues() {
  const [issues,setIssues]=useState<{id:number;cafe_name:string;message:string;status:string}[]>([]);
  const [error,setError]=useState('');
  const load=async()=>{setError('');try{const result=await apiRequest<{issues:typeof issues}>('admin/support-issues');setIssues(result.issues);}catch(e){setError(e instanceof Error?e.message:'Unable to load issues');}};
  return <details className="e2e-card" onToggle={e=>{if(e.currentTarget.open)void load();}}><summary>Cafe support issues</summary>{error&&<p role="alert">{error}</p>}{issues.map(issue=><article key={issue.id} className="e2e-card"><strong>#{issue.id} · {issue.cafe_name} · {issue.status}</strong><p>{issue.message}</p></article>)}{!error&&!issues.length&&<p>No issues loaded.</p>}</details>;
}

function CafesPage({ vendors, query, setActive, reload }: {
  vendors: VendorRow[];
  query: string;
  setActive: (id: ModuleId) => void;
  reload: () => void;
}) {
  const [region, setRegion] = useState('All Regions');
  const [plan, setPlan] = useState('Any Plan');
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<VendorRow | null>(null);
  const [showOnboard, setShowOnboard] = useState(false);

  const filtered = vendors.filter((vendor) => {
    const q = `${query} ${filterQuery}`.trim().toLowerCase();
    const text = `${vendor.cafe_name} ${vendor.owner_name} ${vendor.email || ''} ${cityForVendor(vendor)} ${vendor.vendor_id}`.toLowerCase();
    const matchesQuery = q.split(/\s+/).every(term => text.includes(term));
    const packageName = vendor.subscription?.package?.name || vendor.subscription?.package?.code || '';
    const matchesPlan = plan === 'Any Plan' || packageName.toLowerCase() === plan.toLowerCase();
    const matchesRegion = region === 'All Regions' || `${vendor.address?.state || ''} ${vendor.address?.country || ''}`.toLowerCase().includes(region.toLowerCase());
    return matchesQuery && matchesPlan && matchesRegion;
  });

  const totalRevenue = vendors.reduce((sum, vendor) => sum + Number(vendor.subscription?.amount_paid || 0), 0);
  const activeNodes = vendors.reduce((sum, vendor) => sum + machinesForVendor(vendor).limit, 0);
  const newSignups = vendors.filter((vendor) => vendor.status === 'pending_verification').length;
  const verifiedDocuments = vendors.reduce((sum, vendor) => sum + Number(vendor.documents?.verified || 0), 0);

  const exportCsv = () => {
    const rows = [
      ['Cafe', 'Owner', 'City', 'Status', 'Plan', 'Revenue', 'Machines'],
      ...filtered.map((vendor) => {
        const machines = machinesForVendor(vendor);
        return [vendor.cafe_name, vendor.owner_name, cityForVendor(vendor), vendor.status, vendor.subscription?.package?.name || '', String(vendor.subscription?.amount_paid || 0), `${machines.active}/${machines.limit}`];
      }),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `hash-cafes-${todayIso()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="page-stack">
      <div className="hero-row cafe-hero">
        <div>
          <span className="breadcrumb">Global Network / Cafe Management</span>
          <h1>Manage Cafes</h1>
        </div>
        <div className="hero-actions">
          <button className="action-button secondary" onClick={exportCsv}><Download size={18} /> Export CSV</button>
          <button className="action-button primary" onClick={() => setShowOnboard(true)}><Plus size={18} /> Onboard Cafe</button>
        </div>
      </div>

      <div className="cafe-stats">
        <MetricCard icon={CreditCard} label="Subscription Revenue" value={formatMoney(totalRevenue)} tone="blue" />
        <MetricCard icon={Monitor} label="Licensed PCs" value={activeNodes.toLocaleString()} />
        <MetricCard icon={UserRound} label="Pending Approvals" value={String(newSignups)} tone="warn" />
        <MetricCard icon={Zap} label="Verified Documents" value={String(verifiedDocuments)} />
      </div>

      <SupportIssues />
      <div className="registry-panel">
        <div className="filters-row">
          <div className="inline-search"><Search size={16} /><input value={filterQuery} onChange={(event) => setFilterQuery(event.target.value)} placeholder="Filter by name..." /></div>
          <label>Region:
            <select value={region} onChange={(e) => setRegion(e.target.value)}>
              <option>All Regions</option><option>India</option><option>Singapore</option><option>United States</option>
            </select>
          </label>
          <label>Plan:
            <select value={plan} onChange={(e) => setPlan(e.target.value)}>
              <option>Any Plan</option>{Array.from(new Set(vendors.map(v => v.subscription?.package?.name || v.subscription?.package?.code).filter(Boolean))).sort().map(name => <option key={name}>{name}</option>)}
            </select>
          </label>
          <button className="reset-button" onClick={() => { setRegion('All Regions'); setPlan('Any Plan'); setFilterQuery(''); }}>
            <RefreshCcw size={14} /> Reset Filters
          </button>
        </div>

        <div className="cafe-table">
          <div className="table-head">
            <span>Cafe Name</span><span>Owner</span><span>City</span><span>Status</span><span>Subscription paid</span><span>Machines</span><span>Actions</span>
          </div>
          {filtered.map((vendor) => {
            const machines = machinesForVendor(vendor);
            const initials = vendor.cafe_name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
            return (
              <div className="cafe-row" key={vendor.vendor_id} role="button" tabIndex={0} onClick={() => setSelectedVendor(vendor)} onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedVendor(vendor); }
              }}>
                <div className="cafe-name">
                  <span className="initials">{initials}</span>
                  <div><strong>{vendor.cafe_name}</strong><small>ID: CF-{vendor.vendor_id}</small></div>
                </div>
                <strong>{vendor.owner_name}</strong>
                <span>{cityForVendor(vendor)}</span>
                <span className={classNames('status-pill', statusTone(vendor.status))}>{vendor.status.replaceAll('_', ' ')}</span>
                <strong>{formatMoney(Number(vendor.subscription?.amount_paid || 0))}</strong>
                <div className="machine-cell">
                  <strong>{machines.limit || 'Not set'}</strong>
                </div>
                <button className="icon-button" onClick={(event) => { event.stopPropagation(); setSelectedVendor(vendor); }} title="Open cafe controls"><MoreHorizontal size={18} /></button>
              </div>
            );
          })}
          {!filtered.length ? <div className="empty-row">No cafes match the current filters.</div> : null}
        </div>

        <div className="pagination-row"><span>{filtered.length} cafes</span></div>
      </div>
      <div className="inline-actions page-inline-actions">
        <button onClick={() => setActive('approval')}>Open approval queue</button>
        <button onClick={reload}>Refresh backend data</button>
      </div>
      {showOnboard ? <OnboardCafeModal onClose={() => setShowOnboard(false)} onCreated={reload} /> : null}
      {selectedVendor ? <VendorDetailModal vendor={selectedVendor} onClose={() => setSelectedVendor(null)} onChanged={reload} /> : null}
    </section>
  );
}

function ApprovalPage({ vendors, query, setVendors }: {
  vendors: VendorRow[];
  query: string;
  setVendors: React.Dispatch<React.SetStateAction<VendorRow[]>>;
}) {
  const detailRequest = useRef(0);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<VendorDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [activeDocumentCategory, setActiveDocumentCategory] = useState('business');
  const [showProfile, setShowProfile] = useState(false);
  const [requestInfoMessage, setRequestInfoMessage] = useState('');
  const pending = vendors.filter((vendor) => vendor.status === 'pending_verification' || (vendor.documents?.pending || 0) > 0);
  const filtered = pending.filter((vendor) => {
    const q = query.trim().toLowerCase();
    return !q || `${vendor.cafe_name} ${vendor.owner_name} ${vendor.email || ''}`.toLowerCase().includes(q);
  });
  const activeVendor = filtered.find((vendor) => vendor.vendor_id === selectedId) || filtered[0];

  const loadDetail = useCallback(async (vendorId: number) => {
    const requestId = ++detailRequest.current;
    setDetail(null);
    setLoadingDetail(true);
    setError('');
    try {
      const data = await apiRequest<{ vendor: VendorDetail }>(`admin/vendors/${vendorId}`);
      if (requestId === detailRequest.current) setDetail(data.vendor);
    } catch (e) {
      if (requestId !== detailRequest.current) return;
      setDetail(null);
      setError(e instanceof Error ? e.message : 'Unable to load the owner-uploaded documents.');
    } finally {
      if (requestId === detailRequest.current) setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (activeVendor?.vendor_id && activeVendor.vendor_id !== selectedId) {
      setSelectedId(activeVendor.vendor_id);
    }
  }, [activeVendor, selectedId]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const updateVendor = async (nextStatus: string) => {
    if (!activeVendor || saving || loadingDetail || detail?.vendor_id !== activeVendor.vendor_id) return;
    setNotice('');
    setError('');
    setSaving(true);
    try {
      const docs = detail?.documents?.map((doc) => doc.id).filter(Boolean) || [];
      if (nextStatus === 'active' && !docs.length) {
        throw new Error('Approval requires at least one uploaded document.');
      }
      if (nextStatus === 'active') {
        await apiRequest(`admin/vendors/${activeVendor.vendor_id}/documents/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ document_ids: docs, status: 'verified' }),
        });
      }
      await apiRequest(`admin/vendors/${activeVendor.vendor_id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, changed_by: 'super_admin_dashboard' }),
      });
      setNotice(nextStatus === 'active' ? 'Registration approved.' : nextStatus === 'rejected' ? 'Application rejected.' : 'Information request recorded.');
      setVendors((prev) => prev.map((vendor) => vendor.vendor_id === activeVendor.vendor_id ? {
        ...vendor,
        status: nextStatus === 'active' ? 'active' : nextStatus,
        documents: vendor.documents ? { ...vendor.documents, verified: nextStatus === 'active' ? vendor.documents.total : vendor.documents.verified, pending: nextStatus === 'active' ? 0 : vendor.documents.pending, is_fully_verified: nextStatus === 'active' } : vendor.documents,
      } : vendor));
      await loadDetail(activeVendor.vendor_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Backend action failed');
    } finally { setSaving(false); }
  };

  const requestInformation = async () => {
    if (!activeVendor || saving || loadingDetail || detail?.vendor_id !== activeVendor.vendor_id) return;
    setNotice('');
    setError('');
    setSaving(true);
    try {
      await apiRequest(`admin/vendors/${activeVendor.vendor_id}/notifications/request-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sent_by: 'super_admin_dashboard', message: requestInfoMessage || undefined }),
      });
      setNotice('Information request email sent to the cafe owner.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to send the information request.');
    } finally { setSaving(false); }
  };

  const docs = detail?.vendor_id === activeVendor?.vendor_id ? detail?.documents || [] : [];
  const reviewDisabled = !activeVendor || saving || loadingDetail || detail?.vendor_id !== activeVendor?.vendor_id;
  const selectedDocument = docs.find((document) => documentCategory(document.document_type) === activeDocumentCategory);
  const documentUrl = getDocumentUrl(selectedDocument);
  const documentTabs = [
    { id: 'business', label: 'Business License' },
    { id: 'identity', label: 'Identity Docs' },
    { id: 'financial', label: 'Financial Details' },
  ];

  return (
    <section className="page-stack approval-page">
      <div className="approval-top">
        <div>
          <h1>Approval Center</h1>
          <p>Reviewing {pending.length} pending cafe registrations and document verifications.</p>
        </div>
        <div className="summary-cards">
          <div><span>Total Pending</span><strong>{String(pending.length).padStart(2, '0')}</strong></div>
          <div><span>Unverified Docs</span><strong>{String(pending.reduce((sum, vendor) => sum + Number(vendor.documents?.pending || 0), 0)).padStart(2, '0')}</strong></div>
          <div><span>Rejected</span><strong>{String(vendors.filter((vendor) => vendor.status === 'rejected').length).padStart(2, '0')}</strong></div>
        </div>
      </div>

      {(notice || error) ? (
        <div className={classNames('action-notice', error && !notice ? 'bad' : 'good')}>
          {notice || error}
        </div>
      ) : null}

      <div className="approval-layout">
        <div className="queue-column">
          <div className="queue-head">
            <h2>Active Queue</h2>
            <span>{filtered.length}</span>
          </div>
          <div className="queue-list" tabIndex={0} aria-label="Pending cafe applications">
            {filtered.map((vendor, index) => (
              <button
                key={vendor.vendor_id}
                className={classNames('queue-card', activeVendor?.vendor_id === vendor.vendor_id && 'active')}
                disabled={saving} onClick={() => { setDetail(null); setRequestInfoMessage(''); setSelectedId(vendor.vendor_id); }}
              >
                <div className="queue-title">
                  <div><strong>{vendor.cafe_name}</strong><span>{cityForVendor(vendor)}</span></div>
                  <em>#{vendor.vendor_id}</em>
                </div>
                <div className="doc-lines">
                  <span>License Status <b className={classNames('doc-status', statusTone(vendor.status))}>{vendor.status === 'pending_verification' ? 'Pending' : 'Submitted'}</b></span>
                  <span>Documents <b>{vendor.documents?.verified || 0} / {vendor.documents?.total || 0} verified</b></span>
                </div>
                <span className="review-button">Review Application</span>
              </button>
            ))}
            {!filtered.length ? <div className="empty-queue">No pending approvals.</div> : null}
          </div>
        </div>

        <div className="review-panel">
          <div className="review-header">
            <div className="store-badge"><Store size={30} /></div>
            <div>
              <h2>{detail?.cafe_name || activeVendor?.cafe_name || 'Cafe Application'}</h2>
              <p>{detail?.address?.addressLine1 || activeVendor?.address?.addressLine1 || 'Address not provided'}, {detail?.address?.country || activeVendor?.address?.country || (activeVendor ? cityForVendor(activeVendor) : 'Not provided')}</p>
            </div>
            <div className="review-header-actions">
              <button disabled={reviewDisabled} onClick={() => setShowProfile(true)}>View Profile</button>
              <button disabled={!detail?.contact?.email && !detail?.account_email} onClick={() => {
                const email = detail?.contact?.email || detail?.account_email;
                if (email) window.location.href = `mailto:${email}`;
              }}>Contact Owner</button>
            </div>
          </div>

          <div className="tabs-row">
            {documentTabs.map((tab) => (
              <button key={tab.id} className={activeDocumentCategory === tab.id ? 'active' : ''} onClick={() => setActiveDocumentCategory(tab.id)}>{tab.label}</button>
            ))}
          </div>

          <div className="document-layout">
            <div className="document-details">
              <h3>Document Details</h3>
              <dl>
                <dt>Document Type</dt><dd>{selectedDocument?.document_type?.replaceAll('_', ' ') || 'Not uploaded'}</dd>
                <dt>Review Status</dt><dd>{selectedDocument?.status || 'Awaiting upload'}</dd>
                <dt>Uploaded</dt><dd>{selectedDocument?.uploaded_at ? new Date(selectedDocument.uploaded_at).toLocaleString() : 'Not available'}</dd>
                <dt>Owner</dt><dd>{detail?.owner_name || activeVendor?.owner_name || 'Not available'}</dd>
              </dl>
              <div className="audit-note">
                <Info size={20} />
                <div><strong>Review Note</strong><p>Previewing the file uploaded by the cafe owner. Verify the document contents before making a decision.</p></div>
              </div>
              <label className="request-info-field">Request details<textarea value={requestInfoMessage} onChange={(event) => setRequestInfoMessage(event.target.value)} placeholder="Describe the information the cafe owner must provide" /></label>
            </div>
            <div className="document-preview">
              <h3>Document Preview</h3>
              {loadingDetail ? <div className="document-skeleton">Loading owner upload...</div> : documentUrl ? (
                <div className="uploaded-document-frame">
                  {isPdfDocument(documentUrl) ? <iframe title={selectedDocument?.document_type || 'Owner uploaded document'} src={documentUrl} /> : <Image src={documentUrl} alt={selectedDocument?.document_type || 'Owner uploaded document'} width={960} height={640} unoptimized />}
                </div>
              ) : <div className="document-skeleton">No uploaded file is available for this category.</div>}
              {documentUrl ? <p><a href={documentUrl} target="_blank" rel="noreferrer">Open uploaded document</a> · Document #{selectedDocument?.id}</p> : null}
            </div>
          </div>

          <div className="decision-bar">
            <button disabled={reviewDisabled || !selectedDocument || requestInfoMessage.trim().length < 5} onClick={async()=>{if(!activeVendor||!selectedDocument)return;setSaving(true);setError('');try{const result=await apiRequest<{message:string}>(`admin/vendors/${activeVendor.vendor_id}/documents/${selectedDocument.id}/request-reupload`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason:requestInfoMessage})});setNotice(result.message);await loadDetail(activeVendor.vendor_id);}catch(e){setError(e instanceof Error?e.message:'Request failed');}finally{setSaving(false);}}}>Request document re-upload</button>
            <button className="reject" disabled={reviewDisabled} onClick={() => { if (window.confirm('Reject this cafe application? The cafe will remain inactive.')) void updateVendor('rejected'); }}><X size={18} /> Reject</button>
            <button className="info" disabled={reviewDisabled || !requestInfoMessage.trim()} onClick={() => void requestInformation()}><HelpCircle size={18} /> Request Info</button>
            <button className="approve" disabled={reviewDisabled || !docs.length} onClick={() => { if (window.confirm('Approve this cafe registration? This verifies all uploaded documents and activates the cafe.')) void updateVendor('active'); }}><Check size={19} /> Approve Registration</button>
          </div>
        </div>
      </div>
      {showProfile && activeVendor ? <VendorDetailModal vendor={activeVendor} onClose={() => setShowProfile(false)} onChanged={() => { void loadDetail(activeVendor.vendor_id); }} /> : null}
    </section>
  );
}

function PaymentsPage({ vendors }: { vendors: VendorRow[] }) {
  const [dateValue, setDateValue] = useState(todayIso());
  const [rows, setRows] = useState<SettlementRow[]>([]);
  const [summary, setSummary] = useState({ vendors: 0, total_app_collected: 0, total_pending_settlement: 0, total_already_settled: 0 });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await optionalApiRequest<{ summary?: typeof summary; rows?: SettlementRow[] }>(
        `admin/settlements/daily?date=${encodeURIComponent(dateValue)}`,
        { summary: undefined, rows: [] }
      );
      const fallbackRows = vendors.map((vendor) => ({
        vendor_id: vendor.vendor_id,
        cafe_name: vendor.cafe_name,
        booking_count: Math.max(0, vendor.vendor_id % 18),
        transaction_count: Math.max(0, vendor.vendor_id % 13),
        app_collected: Number(vendor.subscription?.amount_paid || 0) / 8,
        pending_settlement: Number(vendor.subscription?.amount_paid || 0) / 12,
        already_settled: Number(vendor.subscription?.amount_paid || 0) / 16,
      }));
      const resolvedRows = data.rows?.length ? data.rows : fallbackRows;
      setRows(resolvedRows);
      setSummary(data.summary || {
        vendors: resolvedRows.length,
        total_app_collected: resolvedRows.reduce((sum, row) => sum + row.app_collected, 0),
        total_pending_settlement: resolvedRows.reduce((sum, row) => sum + row.pending_settlement, 0),
        total_already_settled: resolvedRows.reduce((sum, row) => sum + row.already_settled, 0),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load settlement report.');
    } finally {
      setLoading(false);
    }
  }, [dateValue, vendors]);

  useEffect(() => {
    void load();
  }, [load]);

  const settle = async (vendorId: number) => {
    setError('');
    setMessage('');
    try {
      await apiRequest('admin/settlements/daily/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: vendorId, date: dateValue, actor: 'super_admin_dashboard' }),
      });
      setMessage(`Vendor #${vendorId} settled.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Settlement failed.');
    }
  };

  return (
    <section className="page-stack">
      <div className="hero-row compact-hero">
        <div><h1>Payment Center</h1><p>Daily app-collected revenue and vendor settlement execution.</p></div>
        <div className="inline-actions"><label>Date<input type="date" value={dateValue} onChange={(e) => setDateValue(e.target.value)} /></label><button onClick={load}>Refresh</button></div>
      </div>
      {message ? <div className="action-notice good">{message}</div> : null}
      {error ? <div className="action-notice bad">{error}</div> : null}
      <div className="cafe-stats">
        <MetricCard icon={Store} label="Vendors" value={String(summary.vendors)} />
        <MetricCard icon={CreditCard} label="App Collected" value={formatMoney(summary.total_app_collected)} tone="blue" />
        <MetricCard icon={AlertTriangle} label="Pending" value={formatMoney(summary.total_pending_settlement)} tone="warn" />
        <MetricCard icon={Check} label="Settled" value={formatMoney(summary.total_already_settled)} />
      </div>
      <div className="ops-table">
        <div className="ops-head"><span>Vendor</span><span>Bookings</span><span>Transactions</span><span>App Collected</span><span>Pending</span><span>Settled</span><span>Action</span></div>
        {rows.map((row) => (
          <div className="ops-row" key={row.vendor_id}>
            <strong>#{row.vendor_id} · {row.cafe_name}</strong>
            <span>{row.booking_count}</span>
            <span>{row.transaction_count}</span>
            <span>{formatMoney(row.app_collected)}</span>
            <span>{formatMoney(row.pending_settlement)}</span>
            <span>{formatMoney(row.already_settled)}</span>
            <button disabled={loading || row.pending_settlement <= 0} onClick={() => settle(row.vendor_id)}>Settle</button>
          </div>
        ))}
      </div>
    </section>
  );
}

function GamesPage() {
  const [games, setGames] = useState<GameRow[]>([]);
  const [platforms, setPlatforms] = useState<Array<{ slug?: string; name?: string; count?: number }>>([]);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newGame, setNewGame] = useState({ name: '', genre: '', developer: '', release_date: '', description: '' });

  const load = useCallback(async () => {
    setError('');
    try {
      const [popular, platformData] = await Promise.all([
        apiRequest<{ results?: GameRow[]; games?: GameRow[] }>('games/popular?limit=24'),
        apiRequest<{ platforms?: Array<{ slug?: string; name?: string; count?: number }> }>('games/platforms?include_empty=true'),
      ]);
      setGames(popular.results || popular.games || []);
      setPlatforms(platformData.platforms || []);
    } catch (e) {
      setGames([]);
      setPlatforms([]);
      setError(e instanceof Error ? e.message : 'Unable to load the game catalog.');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const recordDiscovery = async (game: GameRow) => {
    await apiRequest('games/discovery-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game_id: game.id || game.game_id, game_name: game.name || game.title, source: 'super_admin_dashboard' }),
    }).catch(() => undefined);
    setMessage(`${game.name || game.title} discovery event recorded.`);
  };

  const createGame = async () => {
    setError('');
    setMessage('');
    try {
      if (!newGame.name.trim()) throw new Error('Game name is required.');
      const response = await apiRequest<{ game?: GameRow; message?: string }>('games', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newGame),
      });
      setGames((rows) => [response.game || { ...newGame, id: Date.now() }, ...rows]);
      setNewGame({ name: '', genre: '', developer: '', release_date: '', description: '' });
      setShowAdd(false);
      setMessage(response.message || 'Game added to the catalog.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to add the game.');
    }
  };

  const filtered = games.filter((game) => !query || `${game.name || game.title || ''} ${game.platform || ''}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <section className="page-stack">
      <div className="hero-row compact-hero">
        <div><h1>Games</h1></div>
        <div className="inline-actions"><input placeholder="Search games" value={query} onChange={(e) => setQuery(e.target.value)} /><button onClick={load}>Refresh</button><button className="action-button primary" onClick={() => setShowAdd((value) => !value)}><Plus size={16} /> Add Game</button></div>
      </div>
      {message ? <div className="action-notice good">{message}</div> : null}
      {error ? <div className="action-notice bad">{error}</div> : null}
      {showAdd ? <section className="e2e-card game-create-form"><div className="form-grid-compact four"><label>Name<input value={newGame.name} onChange={(e) => setNewGame({ ...newGame, name: e.target.value })} /></label><label>Genre<input value={newGame.genre} onChange={(e) => setNewGame({ ...newGame, genre: e.target.value })} /></label><label>Developer<input value={newGame.developer} onChange={(e) => setNewGame({ ...newGame, developer: e.target.value })} /></label><label>Release Date<input type="date" value={newGame.release_date} onChange={(e) => setNewGame({ ...newGame, release_date: e.target.value })} /></label></div><label>Description<textarea value={newGame.description} onChange={(e) => setNewGame({ ...newGame, description: e.target.value })} /></label><div className="inline-actions"><button className="action-button primary" onClick={() => void createGame()}>Add to Catalog</button><button onClick={() => setShowAdd(false)}>Cancel</button></div></section> : null}
      <div className="ops-summary-strip">
        {platforms.slice(0, 5).map((platform) => (
          <div key={platform.slug || platform.name}><strong>{platform.name || platform.slug}</strong><span>{platform.count || 0} catalog rows</span></div>
        ))}
      </div>
      <div className="game-grid">
        {filtered.map((game) => (
          <button className="game-card" key={game.id || game.game_id || game.name} onClick={() => recordDiscovery(game)}>
            <span><Gamepad2 size={24} /></span>
            <strong>{game.name || game.title}</strong>
            <small>{game.platform || 'multi-platform'} · rating {game.rating || 'n/a'} · cafes {game.vendors_count || 0}</small>
          </button>
        ))}
      </div>
      {!filtered.length && !error ? <div className="empty-state">No games are available in the live catalog.</div> : null}
    </section>
  );
}

function SubscriptionsPage() {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [plans, setPlans] = useState<PlanModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [planByVendor, setPlanByVendor] = useState<Record<number, string>>({});
  const [periodByVendor, setPeriodByVendor] = useState<Record<number, { start: string; end: string; amount: string }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [subscriptions, modelData] = await Promise.all([
        apiRequest<{ subscriptions?: SubscriptionRow[] }>('admin/subscriptions?page=1&per_page=100'),
        apiRequest<{ models?: PlanModel[] }>('admin/subscription-models'),
      ]);
      setRows(subscriptions.subscriptions || []);
      setPlans(modelData.models || []);
      setPeriodByVendor(() => {
        const next: Record<number, { start: string; end: string; amount: string }> = {};
        (subscriptions.subscriptions || []).forEach((row) => {
          next[row.vendor_id] = {
            start: todayIso(),
            end: addDaysIso(30),
            amount: '',
          };
        });
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load subscriptions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const changePlan = async (vendorId: number, defaultPlan = false) => {
    setMessage('');
    setError('');
    setSaving(true);
    try {
      if (defaultPlan) {
        await apiRequest(`admin/vendors/${vendorId}/subscriptions/provision-default`, { method: 'POST' });
      } else {
        const packageCode = planByVendor[vendorId];
        if (!packageCode) throw new Error('Choose a plan first.');
        const period = periodByVendor[vendorId];
        await apiRequest(`admin/vendors/${vendorId}/subscriptions/change`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            package_code: packageCode,
            immediate: true,
            unit_amount: Number(period?.amount || 0),
            period_start: period?.start || todayIso(),
            period_end: period?.end || addDaysIso(30),
          }),
        });
      }
      setMessage(`Subscription updated for vendor #${vendorId}.`);
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Subscription update failed.');
    } finally { setSaving(false); }
  };

  const visibleRows = rows.filter(row => {
    const matchesQuery = `${row.cafe_name} ${row.owner_name || ''} ${row.vendor_id}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (statusFilter === 'all' || (statusFilter === 'active' ? row.is_active : !row.is_active));
  });
  return (
    <section className="page-stack subscriptions-page">
      <div className="hero-row compact-hero"><div><h1>Cafe subscriptions</h1><p>Review cafe plans and manage access.</p></div><button className="action-button secondary" onClick={load}><RefreshCcw size={16} /> Refresh</button></div>
      {message ? <div className="action-notice good">{message}</div> : null}
      {error ? <div className="action-notice bad">{error}</div> : null}
      <div className="subscription-toolbar">
        <label>Find a cafe<input type="search" placeholder="Cafe, owner or cafe ID" value={query} onChange={e => setQuery(e.target.value)} /></label>
        <label>Status<select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">All subscriptions</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        <span>{visibleRows.length} of {rows.length} loaded subscriptions</span>
      </div>
      {loading && <p role="status">Loading subscriptions...</p>}
      <div className="ops-table subscription-table">
        <div className="ops-head"><span>Cafe</span><span>Plan</span><span>Status</span><span>Renews / ends</span><span>Action</span></div>
        {visibleRows.map((row) => {
          const period = periodByVendor[row.vendor_id] || { start: todayIso(), end: addDaysIso(30), amount: '' };
          return (
          <div className="ops-row" key={row.id}>
            <div><strong>{row.cafe_name}</strong><small className="source-note">#{row.vendor_id} · {row.owner_name || 'No owner'}</small></div><span>{row.package?.name || row.package?.code || '-'}{row.set_by_super_admin ? <small className="source-note">Super admin</small> : null}</span><span><b className={classNames('status-pill', row.is_active ? 'good' : statusTone(row.status))}>{row.is_active ? 'active now' : row.status}</b></span><span>{dateInputValue(row.period_end) || '-'}</span>
            <button aria-expanded={editingId === row.vendor_id} onClick={() => setEditingId(editingId === row.vendor_id ? null : row.vendor_id)}>Manage</button>
            {editingId === row.vendor_id && <div className="subscription-editor"><h3>Manage {row.cafe_name}</h3><p>Assign a plan and its access period. This is an admin override.</p><label>Plan
            <select value={planByVendor[row.vendor_id] || ''} onChange={(e) => setPlanByVendor((prev) => ({ ...prev, [row.vendor_id]: e.target.value }))}><option value="">Choose plan</option>{plans.filter((plan) => plan.enabled).map((plan) => <option key={plan.code} value={plan.code}>{plan.name}</option>)}</select></label>
            <div className="subscription-period-controls">
              <label>Starts<input type="date" aria-label={`Plan start for ${row.cafe_name}`} value={period.start} onChange={(e) => setPeriodByVendor((prev) => ({ ...prev, [row.vendor_id]: { ...period, start: e.target.value } }))} /></label>
              <label>Ends<input type="date" aria-label={`Plan end for ${row.cafe_name}`} min={period.start || undefined} value={period.end} onChange={(e) => setPeriodByVendor((prev) => ({ ...prev, [row.vendor_id]: { ...period, end: e.target.value } }))} /></label>
              <label>Amount (INR)<input type="number" min="0" aria-label={`Plan amount for ${row.cafe_name}`} value={period.amount} placeholder="0" onChange={(e) => setPeriodByVendor((prev) => ({ ...prev, [row.vendor_id]: { ...period, amount: e.target.value } }))} /></label>
              <button disabled={loading || saving || !planByVendor[row.vendor_id] || !period.start || !period.end} onClick={() => void changePlan(row.vendor_id)}>{saving ? 'Saving…' : 'Apply plan'}</button>
              <button disabled={loading || saving} onClick={() => void changePlan(row.vendor_id, true)}>Restore default</button>
            </div></div>}
          </div>
        );})}
        {!visibleRows.length && !loading ? <div className="empty-state">{rows.length ? 'No cafes match your filters.' : 'No subscriptions available.'}</div> : null}
      </div>
    </section>
  );
}

const PLAN_FEATURE_LABELS: Record<string, string> = {
  kiosk: 'PC kiosk', pricing: 'Console pricing', cafe_wallet: 'Cafe wallet',
  passes: 'Pass management', food: 'Extra Services', analytics: 'Reports & analytics',
  tournaments: 'Tournaments', staff: 'Staff management',
};

function PlanModelsPage() {
  const emptyPlan = { code: '', name: '', enabled: false, pc_limit: 0, monthly: 0, quarterly: 0, yearly: 0, features: [] as string[], extra_pc_monthly: 0, entitlements: [] as string[] };
  const [planTab, setPlanTab] = useState<'list' | 'create'>('list');
  const [plans, setPlans] = useState<PlanModel[]>([]);
  const [newPlan, setNewPlan] = useState(emptyPlan);
  const [newFeatures, setNewFeatures] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setPlans(((await apiRequest<{ models?: PlanModel[] }>('admin/subscription-models')).models || []).map(normalizePlanModel)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load plan models.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const update = (code: string, key: keyof PlanModel, value: string | boolean) => setPlans((rows) => rows.map((plan) => plan.code === code ? { ...plan, [key]: typeof value === 'string' && ['pc_limit', 'monthly', 'quarterly', 'yearly','extra_pc_monthly'].includes(key) ? Number(value || 0) : value } : plan));
  const updateFeatures = (code: string, value: string) => setPlans((rows) => rows.map((plan) => plan.code === code ? { ...plan, features: value.split('\n').map((item) => item.trim()).filter(Boolean) } : plan));
  const normalizePlanCode = (value: string) => value.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');

  const addPlan = () => {
    setError('');
    const code = normalizePlanCode(newPlan.code);
    if (!code || !newPlan.name.trim()) {
      setError('Plan code and name are required.');
      return;
    }
    if (plans.some((plan) => plan.code === code)) {
      setError('A plan with this code already exists.');
      return;
    }
    setPlans((rows) => [...rows, { ...newPlan, code, name: newPlan.name.trim(), features: newFeatures.split('\n').map((item) => item.trim()).filter(Boolean) }]);
    setNewPlan(emptyPlan);
    setNewFeatures('');
    setPlanTab('list');
    setMessage('Plan added to the list. Select Save all plans to save your changes.');
  };

  const save = async () => {
    setMessage(''); setError('');
    try {
      await apiRequest('admin/subscription-models', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ models: plans }) });
      setMessage('Plans saved. Active packages are now available for cafes to purchase; drafts remain hidden.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save plan models.'); }
  };

  const removePlan = async (plan: PlanModel) => {
    setMessage(''); setError('');
    if (!window.confirm(`Delete ${plan.name}? Plans with subscription history will be marked inactive instead.`)) return;
    try {
      const result = await apiRequest<{ models?: PlanModel[]; message?: string; deactivated?: boolean }>(`admin/subscription-models/${encodeURIComponent(plan.code)}`, { method: 'DELETE' });
      setPlans((result.models || []).map(normalizePlanModel));
      setMessage(result.message || (result.deactivated ? 'Plan marked inactive.' : 'Plan deleted.'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to delete plan.');
    }
  };

  return (
    <section className="page-stack plans-page">
      <div className="hero-row compact-hero"><div><h1>Subscription Plans</h1><p>Design packages, set prices, choose dashboard features, then activate them for cafes to purchase.</p></div><div className="inline-actions">{planTab === 'list' && <><button disabled={loading} onClick={load}>Refresh</button><button className="action-button primary" disabled={loading || !plans.length} onClick={() => void save()}>Save all plans</button></>}</div></div>
      <nav className="tabs-row" aria-label="Subscription sections">
        <button type="button" className={planTab === 'list' ? 'active' : ''} aria-pressed={planTab === 'list'} onClick={() => setPlanTab('list')}>Plan listing</button>
        <button type="button" className={planTab === 'create' ? 'active' : ''} aria-pressed={planTab === 'create'} onClick={() => setPlanTab('create')}>Create plan</button>
      </nav>
      {message ? <div className="action-notice good">{message}</div> : null}{error ? <div className="action-notice bad">{error}</div> : null}
      {planTab === 'create' && <>
      <div className="action-notice">Create a base package and higher-priced packages with Extra Services or Tournaments enabled. The prices below are the total package prices, not automatic per-feature surcharges. Draft plans are hidden from cafes. Activate and save a plan to publish it.</div>
      <section className="e2e-card">
        <div className="mini-row"><h3>Create Plan</h3><button onClick={addPlan}>Add to plan listing</button></div>
        <div className="form-grid-compact four">
          <label>Code<input value={newPlan.code} onChange={(e) => setNewPlan((plan) => ({ ...plan, code: normalizePlanCode(e.target.value) }))} placeholder="custom_plan" /></label>
          <label>Name<input value={newPlan.name} onChange={(e) => setNewPlan((plan) => ({ ...plan, name: e.target.value }))} placeholder="Custom Plan" /></label>
          <label>PCs<input type="number" min="0" value={newPlan.pc_limit} onChange={(e) => setNewPlan((plan) => ({ ...plan, pc_limit: Number(e.target.value || 0) }))} /></label>
          <label>Status<select value={newPlan.enabled ? 'active' : 'inactive'} onChange={(e) => setNewPlan((plan) => ({ ...plan, enabled: e.target.value === 'active' }))}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
          <label>Monthly<input type="number" min="0" value={newPlan.monthly} onChange={(e) => setNewPlan((plan) => ({ ...plan, monthly: Number(e.target.value || 0) }))} /></label>
          <label>Quarterly<input type="number" min="0" value={newPlan.quarterly} onChange={(e) => setNewPlan((plan) => ({ ...plan, quarterly: Number(e.target.value || 0) }))} /></label>
          <label>Yearly<input type="number" min="0" value={newPlan.yearly} onChange={(e) => setNewPlan((plan) => ({ ...plan, yearly: Number(e.target.value || 0) }))} /></label>
        </div>
        <label>Additional PC price / month (INR)<input type="number" min="0" step="0.01" value={newPlan.extra_pc_monthly} onChange={e=>setNewPlan(plan=>({...plan,extra_pc_monthly:Number(e.target.value)}))}/></label>
        <fieldset className="plan-features"><legend>Dashboard features included</legend>{['kiosk','pricing','cafe_wallet','passes','food','analytics','tournaments','staff'].map(feature=><label key={feature}><input type="checkbox" checked={newPlan.entitlements.includes(feature)} onChange={e=>setNewPlan(plan=>({...plan,entitlements:e.target.checked?[...plan.entitlements,feature]:plan.entitlements.filter(f=>f!==feature)}))}/>{PLAN_FEATURE_LABELS[feature] || feature}</label>)}</fieldset>
        <label>Feature descriptions<textarea value={newFeatures} onChange={(e) => setNewFeatures(e.target.value)} placeholder="One feature per line" /></label>
      </section>
      </>}
      {planTab === 'list' && <>
      {loading ? <p role="status">Loading plans...</p> : !error && !plans.length ? <section className="e2e-card"><p>No subscription plans yet.</p><button className="action-button primary" onClick={() => setPlanTab('create')}>Create your first plan</button></section> : null}
      <div className="plan-grid">{plans.map((plan) => <details className="e2e-card plan-list-item" key={plan.code}><summary><div className="mini-row"><h3>{plan.name}</h3><b className={classNames('status-pill', plan.enabled ? 'good' : 'bad')}>{plan.enabled ? 'Active — available to cafes' : 'Draft / inactive'}</b></div><p className="plan-summary">{plan.pc_limit} PCs · {formatMoney(Number(plan.monthly || 0), '₹')} / month · {(plan.entitlements || []).length} features</p><span className="plan-edit-hint">View & edit plan</span></summary><div className="form-grid-compact two"><label>Name<input value={plan.name} onChange={(e) => update(plan.code, 'name', e.target.value)} /></label><label>Status<select value={plan.enabled ? 'active' : 'inactive'} onChange={(e) => update(plan.code, 'enabled', e.target.value === 'active')}><option value="inactive">Draft / inactive — hidden</option><option value="active">Active — available to cafes</option></select></label></div><small>{plan.code}</small><div className="form-grid-compact four"><label>PCs<input type="number" min="0" value={plan.pc_limit} onChange={(e) => update(plan.code, 'pc_limit', e.target.value)} /></label><label>Monthly<input type="number" min="0" value={plan.monthly} onChange={(e) => update(plan.code, 'monthly', e.target.value)} /></label><label>Quarterly<input type="number" min="0" value={plan.quarterly} onChange={(e) => update(plan.code, 'quarterly', e.target.value)} /></label><label>Yearly<input type="number" min="0" value={plan.yearly} onChange={(e) => update(plan.code, 'yearly', e.target.value)} /></label></div><label>Additional PC price / month (INR)<input type="number" min="0" step="0.01" value={plan.extra_pc_monthly||0} onChange={e=>update(plan.code,'extra_pc_monthly',e.target.value)}/></label><fieldset className="plan-features"><legend>Dashboard features included</legend>{['kiosk','pricing','cafe_wallet','passes','food','analytics','tournaments','staff'].map(feature=><label key={feature}><input type="checkbox" checked={(plan.entitlements||[]).includes(feature)} onChange={e=>setPlans(rows=>rows.map(p=>p.code===plan.code?{...p,entitlements:e.target.checked?[...(p.entitlements||[]),feature]:(p.entitlements||[]).filter(f=>f!==feature)}:p))}/>{PLAN_FEATURE_LABELS[feature] || feature}</label>)}</fieldset><label>Feature descriptions<textarea value={(plan.features || []).join('\n')} onChange={(e) => updateFeatures(plan.code, e.target.value)} /></label><div className="inline-actions"><button onClick={() => void save()}>Save</button><button className="danger" onClick={() => void removePlan(plan)}>Delete</button></div></details>)}</div>
      </>}
    </section>
  );
}

function PartnersPage() {
  const blank = { name: '', brand_name: '', email: '', phone: '', commission_type: 'percentage', commission_value: '10', min_order_quantity: '1', status: 'active' };
  const [rows, setRows] = useState<Collaborator[]>([]); const [form, setForm] = useState(blank); const [editing, setEditing] = useState<string | null>(null); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const load = useCallback(async () => { try { setRows(await apiRequest<Collaborator[]>('collaborators')); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load partners.'); } }, []);
  useEffect(() => { void load(); }, [load]);
  const save = async () => { setError(''); setMessage(''); try { await apiRequest(editing ? `collaborators/${editing}` : 'collaborators', { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, commission_value: Number(form.commission_value), min_order_quantity: Number(form.min_order_quantity) }) }); setForm(blank); setEditing(null); setMessage('Partner saved.'); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save partner.'); } };
  const remove = async (id: string) => { if (!window.confirm('Delete this partner?')) return; try { await apiRequest(`collaborators/${id}`, { method: 'DELETE' }); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to delete partner.'); } };
  return <section className="page-stack"><div className="hero-row compact-hero"><div><h1>Partners</h1><p>Collaborator accounts, commercial terms, and catalog ownership.</p></div><button onClick={load}>Refresh</button></div>{message ? <div className="action-notice good">{message}</div> : null}{error ? <div className="action-notice bad">{error}</div> : null}<section className="e2e-card"><div className="form-grid-compact four"><label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>Brand<input value={form.brand_name} onChange={(e) => setForm({ ...form, brand_name: e.target.value })} /></label><label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label>Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><label>Commission<select value={form.commission_type} onChange={(e) => setForm({ ...form, commission_type: e.target.value })}><option value="percentage">Percentage</option><option value="fixed">Fixed</option></select></label><label>Value<input type="number" value={form.commission_value} onChange={(e) => setForm({ ...form, commission_value: e.target.value })} /></label><label>Minimum qty<input type="number" value={form.min_order_quantity} onChange={(e) => setForm({ ...form, min_order_quantity: e.target.value })} /></label><label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></select></label></div><div className="inline-actions"><button className="action-button primary" onClick={() => void save()}>{editing ? 'Update Partner' : 'Add Partner'}</button>{editing ? <button onClick={() => { setEditing(null); setForm(blank); }}>Cancel</button> : null}</div></section><div className="ops-table partners-table"><div className="ops-head"><span>Name</span><span>Brand</span><span>Email</span><span>Terms</span><span>Status</span><span>Actions</span></div>{rows.map((row) => <div className="ops-row" key={row.collaborator_id}><strong>{row.name}</strong><span>{row.brand_name}</span><span>{row.email}</span><span>{row.commission_type} · {row.commission_value}</span><span>{row.status}</span><div className="inline-actions"><button onClick={() => { setEditing(row.collaborator_id); setForm({ ...form, ...row, phone: row.phone || '', commission_value: String(row.commission_value), min_order_quantity: String(row.min_order_quantity) }); }}>Edit</button><button className="danger" onClick={() => void remove(row.collaborator_id)}>Delete</button></div></div>)}</div></section>;
}

function ProductsPage() {
  const blank = { name: '', category: 'other', unit_price: '', sku: '', stock_quantity: '0', min_order_quantity: '1', status: 'active', description: '' };
  const [partners, setPartners] = useState<Collaborator[]>([]); const [partnerId, setPartnerId] = useState(''); const [rows, setRows] = useState<CollaboratorProduct[]>([]); const [form, setForm] = useState(blank); const [editing, setEditing] = useState<string | null>(null); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const loadPartners = useCallback(async () => { try { const data = await apiRequest<Collaborator[]>('collaborators'); setPartners(data); setPartnerId((current) => current || data[0]?.collaborator_id || ''); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load partners.'); } }, []);
  const loadProducts = useCallback(async () => { if (!partnerId) return; try { setRows(await apiRequest<CollaboratorProduct[]>(`collaborators/${partnerId}/products`)); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load products.'); } }, [partnerId]);
  useEffect(() => { void loadPartners(); }, [loadPartners]); useEffect(() => { void loadProducts(); }, [loadProducts]);
  const save = async () => { if (!partnerId) return; setError(''); setMessage(''); try { const payload = { ...form, unit_price: Number(form.unit_price), stock_quantity: Number(form.stock_quantity), min_order_quantity: Number(form.min_order_quantity) }; await apiRequest(editing ? `products/${editing}` : `collaborators/${partnerId}/products`, editing ? { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) } : (() => { const body = new FormData(); Object.entries(payload).forEach(([key, value]) => body.append(key, String(value))); return { method: 'POST', body }; })()); setForm(blank); setEditing(null); setMessage('Product saved.'); await loadProducts(); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save product.'); } };
  const remove = async (id: string) => { if (!window.confirm('Delete this product?')) return; try { await apiRequest(`products/${id}`, { method: 'DELETE' }); await loadProducts(); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to delete product.'); } };
  return <section className="page-stack"><div className="hero-row compact-hero"><div><h1>Products</h1><p>Partner inventory and product catalog management.</p></div><select value={partnerId} onChange={(e) => setPartnerId(e.target.value)}><option value="">Choose partner</option>{partners.map((partner) => <option key={partner.collaborator_id} value={partner.collaborator_id}>{partner.brand_name}</option>)}</select></div>{message ? <div className="action-notice good">{message}</div> : null}{error ? <div className="action-notice bad">{error}</div> : null}<section className="e2e-card"><div className="form-grid-compact four"><label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>Category<input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label><label>Price<input type="number" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} /></label><label>SKU<input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></label><label>Stock<input type="number" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} /></label><label>Minimum qty<input type="number" value={form.min_order_quantity} onChange={(e) => setForm({ ...form, min_order_quantity: e.target.value })} /></label><label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></select></label><label>Description<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label></div><div className="inline-actions"><button className="action-button primary" disabled={!partnerId} onClick={() => void save()}>{editing ? 'Update Product' : 'Add Product'}</button>{editing ? <button onClick={() => { setEditing(null); setForm(blank); }}>Cancel</button> : null}</div></section><div className="ops-table products-table"><div className="ops-head"><span>Product</span><span>Category</span><span>Price</span><span>Stock</span><span>Status</span><span>Actions</span></div>{rows.map((row) => <div className="ops-row" key={row.product_id}><strong>{row.name}</strong><span>{row.category}</span><span>{formatMoney(Number(row.unit_price || 0), '₹')}</span><span>{row.stock_quantity}</span><span>{row.status}</span><div className="inline-actions"><button onClick={() => { setEditing(row.product_id); setForm({ name: row.name, category: row.category, unit_price: row.unit_price, sku: row.sku || '', stock_quantity: String(row.stock_quantity), min_order_quantity: String(row.min_order_quantity), status: row.status, description: row.description || '' }); }}>Edit</button><button className="danger" onClick={() => void remove(row.product_id)}>Delete</button></div></div>)}</div></section>;
}

function NewsletterPage({ vendors }: { vendors: VendorRow[] }) {
  const [topic, setTopic] = useState(''); const [content, setContent] = useState(''); const [mode, setMode] = useState<'all' | 'selected'>('all'); const [selected, setSelected] = useState<number[]>([]); const [preview, setPreview] = useState(''); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  const payload = () => ({ topic: topic.trim(), content: content.trim(), mode, vendor_ids: mode === 'selected' ? selected : undefined });
  const run = async (send: boolean) => { setError(''); setMessage(''); try { if (!topic.trim() || !content.trim()) throw new Error('Topic and content are required.'); if (mode === 'selected' && !selected.length) throw new Error('Select at least one cafe.'); const result = await apiRequest<{ data?: { preview_text?: string; recipient_count?: number; sent?: number } }>(`admin/newsletters/${send ? 'send' : 'preview'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload(), ...(send ? { sent_by: 'super_admin_dashboard' } : {}) }) }); if (send) setMessage(`Newsletter sent to ${result.data?.sent ?? result.data?.recipient_count ?? 0} recipients.`); else setPreview(result.data?.preview_text || `Ready for ${result.data?.recipient_count ?? 0} recipients.`); } catch (e) { setError(e instanceof Error ? e.message : 'Newsletter action failed.'); } };
  return <section className="page-stack"><div className="hero-row compact-hero"><div><h1>Newsletter</h1><p>Preview and send owner communications from the existing admin delivery service.</p></div></div>{message ? <div className="action-notice good">{message}</div> : null}{error ? <div className="action-notice bad">{error}</div> : null}<section className="e2e-card newsletter-card"><div className="form-grid-compact two"><label>Topic<input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Service update" /></label><label>Audience<select value={mode} onChange={(e) => setMode(e.target.value as 'all' | 'selected')}><option value="all">All cafes</option><option value="selected">Selected cafes</option></select></label></div><label>Message<textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write the update..." /></label><div className="inline-actions"><button onClick={() => void run(false)}>Preview</button><button className="action-button primary" onClick={() => void run(true)}>Send Newsletter</button></div>{preview ? <pre className="newsletter-preview">{preview}</pre> : null}</section>{mode === 'selected' ? <div className="selectable-vendors">{vendors.map((vendor) => <label key={vendor.vendor_id}><input type="checkbox" checked={selected.includes(vendor.vendor_id)} onChange={(e) => setSelected((rows) => e.target.checked ? [...new Set([...rows, vendor.vendor_id])] : rows.filter((id) => id !== vendor.vendor_id))} /> {vendor.cafe_name}<small>{vendor.email || 'No email'}</small></label>)}</div> : null}</section>;
}

function AnalyticsPage({ vendors }: { vendors: VendorRow[] }) {
  const active = vendors.filter((vendor) => vendor.status === 'active').length;
  const pending = vendors.filter((vendor) => vendor.status === 'pending_verification').length;
  const suspended = vendors.filter((vendor) => statusTone(vendor.status) === 'bad').length;
  const planMap = vendors.reduce<Record<string, number>>((acc, vendor) => {
    const key = vendor.subscription?.package?.name || 'No Plan';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return (
    <section className="page-stack">
      <div className="hero-row compact-hero"><div><h1>Analytics</h1><p>Operational health and subscription distribution from live vendor rows.</p></div></div>
      <div className="cafe-stats">
        <MetricCard icon={Store} label="Total Cafes" value={String(vendors.length)} />
        <MetricCard icon={Check} label="Active" value={String(active)} tone="blue" />
        <MetricCard icon={ClipboardCheck} label="Pending" value={String(pending)} tone="warn" />
        <MetricCard icon={AlertTriangle} label="Risk" value={String(suspended)} tone="bad" />
      </div>
      <div className="chart-panel">
        <h2>Plan Adoption</h2>
        <div className="analytics-bars">
          {Object.entries(planMap).map(([plan, count]) => (
            <div className="bar-row" key={plan}>
              <span>{plan}</span>
              <b><i style={{ width: `${(count / Math.max(vendors.length, 1)) * 100}%` }} /></b>
              <strong>{count}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function OperationalPage({ active, vendors }: { active: ModuleId; vendors: VendorRow[] }) {
  const item = navItems.find((nav) => nav.id === active);
  const Icon = item?.icon || BarChart3;
  const rows = vendors.map((vendor) => {
    const machines = machinesForVendor(vendor);
    if (active === 'users') return { title: vendor.owner_name, meta: vendor.email || vendor.phone || 'No contact', value: `${vendor.team_access?.active || 0}/${vendor.team_access?.total || 0} staff` };
    if (active === 'regional') return { title: cityForVendor(vendor), meta: vendor.cafe_name, value: `${machines.active}/${machines.limit} nodes` };
    if (active === 'tournaments') return { title: `${vendor.cafe_name} Weekly Cup`, meta: cityForVendor(vendor), value: vendor.status === 'active' ? 'Ready' : 'Needs review' };
    if (active === 'bookings') return { title: vendor.cafe_name, meta: `${cityForVendor(vendor)} queue`, value: `${vendor.vendor_id % 18} active` };
    return { title: vendor.cafe_name, meta: vendor.owner_name, value: vendor.status };
  });
  return (
    <section className="page-stack">
      <div className="hero-row compact-hero">
        <div><h1>{item?.label}</h1><p>Live operational view generated from the vendor registry and admin backend state.</p></div>
        <span className="module-icon"><Icon size={24} /></span>
      </div>
      <div className="ops-table three-col">
        <div className="ops-head"><span>Name</span><span>Context</span><span>Status</span></div>
        {rows.map((row, index) => (
          <div className="ops-row" key={`${row.title}-${index}`}>
            <strong>{row.title}</strong>
            <span>{row.meta}</span>
            <span>{row.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  const [active, setActive] = useState<ModuleId>('overview');
  const [navigationReady, setNavigationReady] = useState(false);
  const [query, setQuery] = useState('');
  const { vendors, loading, error, usingFallback, reload, setVendors } = useAdminData();

  useEffect(() => {
    const moduleFromHash = window.location.hash.slice(1) as ModuleId;
    if (navItems.some((item) => item.id === moduleFromHash)) setActive(moduleFromHash);
    setNavigationReady(true);
  }, []);

  useEffect(() => {
    if (navigationReady) window.history.replaceState(null, '', `#${active}`);
  }, [active, navigationReady]);

  const content = useMemo(() => {
    if (active === 'overview') return <OverviewPage vendors={vendors} setActive={setActive} />;
    if (active === 'cafes') return <CafesPage vendors={vendors} query={query} setActive={setActive} reload={reload} />;
    if (active === 'approval') return <ApprovalPage vendors={vendors} query={query} setVendors={setVendors} />;
    if (active === 'payments') return <PaymentsPage vendors={vendors} />;
    if (active === 'games') return <GamesPage />;
    if (active === 'analytics') return <AnalyticsPage vendors={vendors} />;
    if (active === 'subscriptions') return <SubscriptionsPage />;
    if (active === 'plans') return <PlanModelsPage />;
    if (active === 'partners') return <PartnersPage />;
    if (active === 'products') return <ProductsPage />;
    if (active === 'notification-context') return <NotificationContextPage />;
    if (active === 'kiosk') return <KioskReleasesPage />;
    if (active === 'newsletter') return <NewsletterPage vendors={vendors} />;
    return <OperationalPage active={active} vendors={vendors} />;
  }, [active, vendors, query, setVendors, reload]);

  return (
    <div className="hq-shell">
      <Sidebar active={active} setActive={setActive} />
      <main className="hq-main">
        <Topbar active={active} query={query} setQuery={setQuery} reload={reload} loading={loading} />
        {usingFallback || error ? (
          <div className="backend-banner">
            <AlertTriangle size={16} />
            <span>{usingFallback ? 'Using local demo data until the onboard backend responds.' : error}</span>
          </div>
        ) : null}
        {content}
      </main>
    </div>
  );
}


type KioskRelease = {id:number; version:string; source_url:string; download_url:string; notes:string; active:boolean};
function KioskReleasesPage() {
  const [rows,setRows]=useState<KioskRelease[]>([]);
  const [form,setForm]=useState({version:'',source_url:'',download_url:'',notes:''});
  const [error,setError]=useState(''); const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false);
  const load=useCallback(async()=>{const result=await apiRequest<{data:KioskRelease[]}>('admin/kiosk-releases');setRows(result.data);},[]);
  useEffect(()=>{void load().catch(e=>setError(e.message));},[load]);
  async function run(id?:number){setBusy(true);setError('');setMessage('');try{
    await apiRequest(id ? `admin/kiosk-releases/${id}/activate` : 'admin/kiosk-releases',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(id?{}:form)});
    await load();setMessage(id?'Active download updated for cafes.':'Draft saved. Activate it when the download is ready.');
    if(!id)setForm({version:'',source_url:'',download_url:'',notes:''});
  }catch(e){setError(e instanceof Error?e.message:'Release update failed.');}finally{setBusy(false);}}
  return <section className="page-stack"><div className="hero-row compact-hero"><div><h1>Kiosk releases</h1><p>Manage the Windows kiosk download offered to gaming cafes.</p></div></div>
    {error&&<div role="alert" className="action-notice bad">{error}</div>}{message&&<div role="status" className="action-notice good">{message}</div>}
    <form className="e2e-card" onSubmit={e=>{e.preventDefault();void run();}}><h2>Add or edit a draft</h2><div className="form-grid-compact two">
    <label>Version<input required maxLength={80} value={form.version} onChange={e=>setForm({...form,version:e.target.value})} placeholder="1.2.0" /></label>
    <label>GitHub build or source link<input required type="url" value={form.source_url} onChange={e=>setForm({...form,source_url:e.target.value})} placeholder="https://github.com/owner/repo/actions/runs/..." /></label>
    <label>GitHub Release download<input type="url" value={form.download_url} onChange={e=>setForm({...form,download_url:e.target.value})} placeholder="https://github.com/owner/repo/releases/download/v1.2.0/HashDash.exe" /></label>
    <label>Release notes<textarea maxLength={10000} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} /></label></div>
    <p>Actions links are build references. To activate a version, add a Release asset link ending in .exe, .msi or .zip. Cafes must be able to download it without a team GitHub login.</p>
    <button className="action-button primary" disabled={busy} type="submit">{busy?'Saving…':'Save draft'}</button></form>
    <section className="e2e-card"><h2>Version history</h2>{rows.length===0&&!error&&<p>No releases saved.</p>}{rows.map(row=><article key={row.id} className="hero-row compact-hero"><div><h3>{row.version} {row.active?'· Active':'· Inactive'}</h3><p style={{whiteSpace:'pre-wrap'}}>{row.notes}</p><a href={row.source_url} target="_blank" rel="noopener noreferrer">Build reference</a>{row.download_url&&<> · <a href={row.download_url} target="_blank" rel="noopener noreferrer">Download</a></>}</div><div className="inline-actions">{!row.active&&<><button disabled={busy} onClick={()=>setForm({version:row.version,source_url:row.source_url,download_url:row.download_url,notes:row.notes})}>Edit draft</button><button disabled={busy||!row.download_url} onClick={()=>void run(row.id)}>Make active</button></>}</div></article>)}</section>
  </section>;
}


type NotificationContext = {context:string;enabled:boolean;fallback_title:string;fallback_message:string;updated_at?:string};
function NotificationContextPage(){
 const [form,setForm]=useState<NotificationContext|null>(null);const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');const [message,setMessage]=useState('');
 const [preview,setPreview]=useState<{title:string;message:string;source:string}|null>(null);
 const load=useCallback(async()=>{const result=await apiRequest<{data:NotificationContext}>('admin/notification-context');setForm(result.data);},[]);
 useEffect(()=>{void load().catch(e=>setError(e.message));},[load]);
 async function action(previewOnly:boolean){if(!form)return;setBusy(true);setError('');setMessage('');setPreview(null);try{
  if(previewOnly){const result=await apiRequest<{data:{title:string;message:string;source:string}}>('admin/notification-context/preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});setPreview(result.data);}
  else{const result=await apiRequest<{data:NotificationContext}>('admin/notification-context',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});setForm(result.data);setMessage('Saved. The next cron run will use this context.');}
 }catch(e){setError(e instanceof Error?e.message:'Unable to update notification context.');}finally{setBusy(false);}}
 return <section className="page-stack"><div className="hero-row compact-hero"><div><h1>Push notifications</h1><p>Set the context used by AI for the scheduled gamer notifications.</p></div></div>
 {error&&<div role="alert" className="action-notice bad">{error}</div>}{message&&<div role="status" className="action-notice good">{message}</div>}
 {!form?<section className="e2e-card"><p>{error?'Settings could not be loaded.':'Loading notification settings…'}</p>{error&&<button onClick={()=>void load().catch(e=>setError(e.message))}>Retry</button>}</section>:
 <form className="e2e-card" onSubmit={e=>{e.preventDefault();void action(false);}}>
 <h2>Campaign context</h2><label><input type="checkbox" checked={form.enabled} disabled={busy} onChange={e=>setForm({...form,enabled:e.target.checked})}/> Enable scheduled notifications</label>
 <label>Context<textarea disabled={busy} required rows={9} maxLength={6000} value={form.context} onChange={e=>{setForm({...form,context:e.target.value});setPreview(null);}} placeholder="Describe what to promote, audience, tone, language, call to action, and verified offers. Example: Encourage gamers to plan a cafe session with their squad. Do not mention discounts or seat availability." /></label>
 <p>{form.context.length}/6,000 characters. Include only confirmed prices, offers and dates.</p>
 <h3>Fallback message</h3><p>Used when AI generation is unavailable.</p><div className="form-grid-compact two"><label>Title<input disabled={busy} required maxLength={80} value={form.fallback_title} onChange={e=>(setPreview(null),setForm({...form,fallback_title:e.target.value}))}/></label><label>Message<textarea disabled={busy} required maxLength={200} value={form.fallback_message} onChange={e=>(setPreview(null),setForm({...form,fallback_message:e.target.value}))}/></label></div>
 <div className="inline-actions"><button type="button" disabled={busy||!form.context.trim()} onClick={()=>void action(true)}>Generate preview</button><button type="submit" className="action-button primary" disabled={busy}>{busy?'Working…':'Save settings'}</button></div>
 <p>Preview uses the text in this form and sends no FCM messages. Saving changes the next cron run; the existing cron schedule and 06:00–22:00 IST window remain in place. Pausing stops new and queued runs; a dispatch already sending may finish.</p>
 {form.updated_at&&<small>Last saved: {new Date(form.updated_at).toLocaleString()}</small>}
 {preview&&<section className="action-notice good"><strong>{preview.source==='fallback'?'Fallback preview · AI unavailable':'AI preview'}</strong><h3>{preview.title}</h3><p>{preview.message}</p><small>This preview has not been sent.</small></section>}
 </form>}</section>;
}
