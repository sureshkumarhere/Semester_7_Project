// MODULE: Complaint Management (Part 2) & Agentic AI (Module 2)
// AdminSettings page for managing agentic workflows, email notifications, LLM orchestration, and system environment configurations.

import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { fetchAllSettings, saveAllSettings, SystemSettingsData } from '../../api/complaints';
import { adminLogout } from '../../api/admin';
import {
  Settings,
  Bell,
  CheckCircle2,
  ArrowLeft,
  LogOut,
  Bot,
  Cpu,
  Mail,
  ShieldCheck,
  Clock,
  Building,
  Save,
  RotateCcw,
  Sparkles,
  Zap,
  Sliders,
  AlertCircle,
  Eye,
  EyeOff,
  Check
} from 'lucide-react';

type TabType = 'agent' | 'email' | 'llm' | 'lifecycle' | 'security' | 'general';

export const AdminSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('agent');

  // Server state
  const [serverSettings, setServerSettings] = useState<SystemSettingsData | null>(null);

  // Form state (all flat fields for simple, robust 2-way binding)
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [newApiKeys, setNewApiKeys] = useState<{
    gemini?: string;
    openai?: string;
    grok?: string;
    llm?: string;
    smtp_password?: string;
  }>({});

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await fetchAllSettings();
      setServerSettings(res);

      // Flatten into form state
      const flat: Record<string, any> = {
        notify_on_new_complaint: res.personal?.notify_on_new_complaint ?? false,
        ...res.agent,
        ...res.email,
        ...res.security,
        ...res.lifecycle,
        ...res.general,
        LLM_PROVIDER_ORDER: res.llm?.LLM_PROVIDER_ORDER ?? '',
        GEMINI_MODEL: res.llm?.GEMINI_MODEL ?? '',
        GEMINI_TIMEOUT: res.llm?.GEMINI_TIMEOUT ?? 60,
        OPENAI_MODEL: res.llm?.OPENAI_MODEL ?? '',
        GROK_MODEL: res.llm?.GROK_MODEL ?? '',
        LLM_MODEL_CHAT: res.llm?.LLM_MODEL_CHAT ?? '',
        LLM_MODEL_GUARD: res.llm?.LLM_MODEL_GUARD ?? '',
      };
      setFormData(flat);
      setNewApiKeys({});
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to load settings.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleApiKeyChange = (provider: 'gemini' | 'openai' | 'grok' | 'llm' | 'smtp_password', value: string) => {
    setNewApiKeys((prev) => ({
      ...prev,
      [provider]: value,
    }));
  };

  const isDirty = useMemo(() => {
    if (!serverSettings) return false;
    // Check if new API keys entered
    if (Object.values(newApiKeys).some((v) => v && v.trim().length > 0)) return true;

    // Compare flat fields with initial server values
    const originalFlat: Record<string, any> = {
      notify_on_new_complaint: serverSettings.personal?.notify_on_new_complaint ?? false,
      ...serverSettings.agent,
      ...serverSettings.email,
      ...serverSettings.security,
      ...serverSettings.lifecycle,
      ...serverSettings.general,
      LLM_PROVIDER_ORDER: serverSettings.llm?.LLM_PROVIDER_ORDER ?? '',
      GEMINI_MODEL: serverSettings.llm?.GEMINI_MODEL ?? '',
      GEMINI_TIMEOUT: serverSettings.llm?.GEMINI_TIMEOUT ?? 60,
      OPENAI_MODEL: serverSettings.llm?.OPENAI_MODEL ?? '',
      GROK_MODEL: serverSettings.llm?.GROK_MODEL ?? '',
      LLM_MODEL_CHAT: serverSettings.llm?.LLM_MODEL_CHAT ?? '',
      LLM_MODEL_GUARD: serverSettings.llm?.LLM_MODEL_GUARD ?? '',
    };

    return Object.keys(formData).some((k) => formData[k] !== originalFlat[k]);
  }, [formData, serverSettings, newApiKeys]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    const payload: Record<string, any> = { ...formData };

    // Inject any new secrets if provided
    if (newApiKeys.gemini?.trim()) payload.GEMINI_API_KEY = newApiKeys.gemini.trim();
    if (newApiKeys.openai?.trim()) payload.OPENAI_API_KEY = newApiKeys.openai.trim();
    if (newApiKeys.grok?.trim()) payload.GROK_API_KEY = newApiKeys.grok.trim();
    if (newApiKeys.llm?.trim()) payload.LLM_API_KEY = newApiKeys.llm.trim();
    if (newApiKeys.smtp_password?.trim()) payload.SMTP_PASSWORD = newApiKeys.smtp_password.trim();

    try {
      const res = await saveAllSettings(payload);
      setServerSettings(res.settings);
      setNewApiKeys({});
      setMessage({ type: 'success', text: 'All settings saved and synchronized to environment successfully.' });
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!serverSettings) return;
    const flat: Record<string, any> = {
      notify_on_new_complaint: serverSettings.personal?.notify_on_new_complaint ?? false,
      ...serverSettings.agent,
      ...serverSettings.email,
      ...serverSettings.security,
      ...serverSettings.lifecycle,
      ...serverSettings.general,
      LLM_PROVIDER_ORDER: serverSettings.llm?.LLM_PROVIDER_ORDER ?? '',
      GEMINI_MODEL: serverSettings.llm?.GEMINI_MODEL ?? '',
      GEMINI_TIMEOUT: serverSettings.llm?.GEMINI_TIMEOUT ?? 60,
      OPENAI_MODEL: serverSettings.llm?.OPENAI_MODEL ?? '',
      GROK_MODEL: serverSettings.llm?.GROK_MODEL ?? '',
      LLM_MODEL_CHAT: serverSettings.llm?.LLM_MODEL_CHAT ?? '',
      LLM_MODEL_GUARD: serverSettings.llm?.LLM_MODEL_GUARD ?? '',
    };
    setFormData(flat);
    setNewApiKeys({});
  };

  const handleLogout = () => {
    adminLogout();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-mnnit-blue text-white shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
              title="Return to Admin Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight">System & Admin Settings</h1>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  .env & DB Managed
                </span>
              </div>
              <p className="text-[11px] text-blue-200/80">
                Configure agentic workflows, notifications, multi-provider LLM models, and runtime parameters.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isDirty && (
              <span className="text-xs text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                Unsaved changes
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !isDirty}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow ${
                isDirty
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer ring-2 ring-emerald-400/50'
                  : 'bg-slate-700/60 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 px-3 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-6 w-full flex-1 flex flex-col md:flex-row gap-6">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 shrink-0 space-y-2">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 space-y-1">
            <button
              onClick={() => setActiveTab('agent')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'agent'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Bot className={`w-4 h-4 ${activeTab === 'agent' ? 'text-indigo-600' : 'text-slate-400'}`} />
                Agentic AI Engine
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                  formData.AGENT_ENABLED ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {formData.AGENT_ENABLED ? 'ACTIVE' : 'OFF'}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('email')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'email'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Mail className={`w-4 h-4 ${activeTab === 'email' ? 'text-blue-600' : 'text-slate-400'}`} />
                Email & Alerts
              </span>
              {formData.notify_on_new_complaint && (
                <Bell className="w-3 h-3 text-amber-500" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('llm')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'llm'
                  ? 'bg-purple-50 text-purple-700 border border-purple-200 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Cpu className={`w-4 h-4 ${activeTab === 'llm' ? 'text-purple-600' : 'text-slate-400'}`} />
              LLM Orchestration
            </button>

            <button
              onClick={() => setActiveTab('lifecycle')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'lifecycle'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Clock className={`w-4 h-4 ${activeTab === 'lifecycle' ? 'text-amber-600' : 'text-slate-400'}`} />
              Lifecycle & Policies
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'security'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ShieldCheck className={`w-4 h-4 ${activeTab === 'security' ? 'text-rose-600' : 'text-slate-400'}`} />
              Security & OTP
            </button>

            <button
              onClick={() => setActiveTab('general')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'general'
                  ? 'bg-slate-100 text-slate-800 border border-slate-300 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Building className={`w-4 h-4 ${activeTab === 'general' ? 'text-slate-700' : 'text-slate-400'}`} />
              Campus & System
            </button>
          </div>

          {/* Quick Info Box */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 shadow-sm border border-slate-700 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-mnnit-gold">
              <Sparkles className="w-3.5 h-3.5" />
              Live Hot-Reloading
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Updates saved on this page are stored in the database, mirrored to the <code className="text-amber-300 bg-white/10 px-1 rounded">.env</code> file, and applied immediately without requiring a service restart.
            </p>
          </div>
        </aside>

        {/* Settings Content Area */}
        <section className="flex-1 space-y-5">
          {/* Notification Messages */}
          {message && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 border shadow-sm transition-all ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span className="font-medium">{message.text}</span>
            </div>
          )}

          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
              Loading settings configuration...
            </div>
          ) : (
            <>
              {/* TAB 1: AGENTIC AI SETTINGS */}
              {activeTab === 'agent' && (
                <div className="space-y-5">
                  {/* Master Switch Card */}
                  <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Bot className="w-5 h-5 text-indigo-600" />
                          <h2 className="text-base font-bold text-slate-900">Module 2 Agentic Autonomous Engine</h2>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            AGENT_ENABLED
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 max-w-xl">
                          Toggle all autonomous AI workflows for student complaints. When enabled, new tickets are evaluated by LLM router, cluster fault matcher, priority estimator, and automated technician assignment pipeline.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={!!formData.AGENT_ENABLED}
                          onChange={(e) => handleChange('AGENT_ENABLED', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  </div>

                  {/* Assignment Execution Mode */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <h3 className="text-sm font-bold text-slate-900">Technician Assignment Execution Mode</h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          AGENT_ASSIGNMENT_MODE
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Choose whether the agent dispatches tickets automatically, creates pending suggestions, or remains disabled.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        {
                          mode: 'auto',
                          title: '⚡ Auto Dispatch',
                          desc: 'Full autonomous assignment. Best matching available technician is assigned immediately upon classification.',
                        },
                        {
                          mode: 'suggest',
                          title: '💡 Suggest Only',
                          desc: 'Recommendation mode. Agent picks best candidate with rationale; manager clicks "Accept Suggestion" to confirm.',
                        },
                        {
                          mode: 'off',
                          title: '⛔ Manual Only',
                          desc: 'Assignment stage skipped. Managers assign technicians completely manually from the dashboard.',
                        },
                      ].map((item) => (
                        <div
                          key={item.mode}
                          onClick={() => handleChange('AGENT_ASSIGNMENT_MODE', item.mode)}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                            formData.AGENT_ASSIGNMENT_MODE === item.mode
                              ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between font-bold text-xs text-slate-800 mb-1">
                              <span>{item.title}</span>
                              {formData.AGENT_ASSIGNMENT_MODE === item.mode && (
                                <Check className="w-3.5 h-3.5 text-indigo-600" />
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* LLM Categorization & Rationale */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      Classification & Confidence Calibration
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                        <div className="space-y-0.5 pr-2">
                          <span className="font-bold text-slate-800">Use LLM Classification Router</span>
                          <p className="text-[11px] text-slate-500 font-mono">AGENT_USE_LLM</p>
                          <p className="text-[11px] text-slate-500">
                            When disabled, falls back strictly to rule-based keyword classification.
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={!!formData.AGENT_USE_LLM}
                          onChange={(e) => handleChange('AGENT_USE_LLM', e.target.checked)}
                          className="w-5 h-5 text-indigo-600 rounded cursor-pointer"
                        />
                      </div>

                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                        <div className="space-y-0.5 pr-2">
                          <span className="font-bold text-slate-800">Friendly Natural Language Reason</span>
                          <p className="text-[11px] text-slate-500 font-mono">AGENT_LLM_REASON</p>
                          <p className="text-[11px] text-slate-500">
                            Rewrites candidate math scores into friendly, natural English explanation.
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={!!formData.AGENT_LLM_REASON}
                          onChange={(e) => handleChange('AGENT_LLM_REASON', e.target.checked)}
                          className="w-5 h-5 text-indigo-600 rounded cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Confidence Threshold Slider */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-xs text-slate-800">AI Category Adoption Threshold</span>
                          <span className="text-[10px] font-mono text-slate-500 ml-2">AGENT_CATEGORY_MIN_CONFIDENCE</span>
                          <p className="text-[11px] text-slate-500">
                            Minimum AI confidence required to override student's self-reported problem category.
                          </p>
                        </div>
                        <span className="text-sm font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg">
                          {Math.round((formData.AGENT_CATEGORY_MIN_CONFIDENCE || 0.75) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="0.95"
                        step="0.05"
                        value={formData.AGENT_CATEGORY_MIN_CONFIDENCE || 0.75}
                        onChange={(e) => handleChange('AGENT_CATEGORY_MIN_CONFIDENCE', parseFloat(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>50% (Permissive)</span>
                        <span>75% (Default Recommended)</span>
                        <span>95% (Strict)</span>
                      </div>
                    </div>
                  </div>

                  {/* Priority Escalation & Clusters */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-blue-600" />
                      Priority Escalation & Fault Clustering Windows
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">High Impact User Threshold</label>
                        <p className="text-[10px] text-slate-500 font-mono">AGENT_HIGH_IMPACT_USERS</p>
                        <input
                          type="number"
                          min="1"
                          value={formData.AGENT_HIGH_IMPACT_USERS ?? 5}
                          onChange={(e) => handleChange('AGENT_HIGH_IMPACT_USERS', parseInt(e.target.value) || 5)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:ring-1 focus:ring-indigo-500"
                        />
                        <span className="text-[10px] text-slate-400">Escalates ticket priority +1 level</span>
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Critical Impact User Threshold</label>
                        <p className="text-[10px] text-slate-500 font-mono">AGENT_CRITICAL_IMPACT_USERS</p>
                        <input
                          type="number"
                          min="1"
                          value={formData.AGENT_CRITICAL_IMPACT_USERS ?? 20}
                          onChange={(e) => handleChange('AGENT_CRITICAL_IMPACT_USERS', parseInt(e.target.value) || 20)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:ring-1 focus:ring-indigo-500"
                        />
                        <span className="text-[10px] text-slate-400">Forces ticket to CRITICAL immediately</span>
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Similar Fault Window (Hours)</label>
                        <p className="text-[10px] text-slate-500 font-mono">AGENT_SIMILAR_WINDOW_HOURS</p>
                        <input
                          type="number"
                          min="1"
                          value={formData.AGENT_SIMILAR_WINDOW_HOURS ?? 6}
                          onChange={(e) => handleChange('AGENT_SIMILAR_WINDOW_HOURS', parseInt(e.target.value) || 6)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:ring-1 focus:ring-indigo-500"
                        />
                        <span className="text-[10px] text-slate-400">Time window for open cluster grouping</span>
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Historical Fault Lookback (Days)</label>
                        <p className="text-[10px] text-slate-500 font-mono">AGENT_PREVIOUS_FAULT_DAYS</p>
                        <input
                          type="number"
                          min="1"
                          value={formData.AGENT_PREVIOUS_FAULT_DAYS ?? 90}
                          onChange={(e) => handleChange('AGENT_PREVIOUS_FAULT_DAYS', parseInt(e.target.value) || 90)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:ring-1 focus:ring-indigo-500"
                        />
                        <span className="text-[10px] text-slate-400">Days to search for past resolved solutions</span>
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <label className="font-bold text-slate-700">High Priority Locations (Comma-separated)</label>
                        <p className="text-[10px] text-slate-500 font-mono">AGENT_PRIORITY_LOCATIONS</p>
                        <input
                          type="text"
                          placeholder="SVBH Hostel, Academic Campus, Administrative Block"
                          value={formData.AGENT_PRIORITY_LOCATIONS ?? ''}
                          onChange={(e) => handleChange('AGENT_PRIORITY_LOCATIONS', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:ring-1 focus:ring-indigo-500"
                        />
                        <span className="text-[10px] text-slate-400">Matches complaint locations to boost priority</span>
                      </div>
                    </div>
                  </div>

                  {/* Resilience, Sweeps & RAG */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-600" />
                      Background Worker Resilience & RAG Indexing
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Stuck Job Timeout (Minutes)</label>
                        <p className="text-[10px] text-slate-500 font-mono">AGENT_STUCK_MINUTES</p>
                        <input
                          type="number"
                          min="1"
                          value={formData.AGENT_STUCK_MINUTES ?? 10}
                          onChange={(e) => handleChange('AGENT_STUCK_MINUTES', parseInt(e.target.value) || 10)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Unassigned Sweep (Minutes)</label>
                        <p className="text-[10px] text-slate-500 font-mono">AGENT_SWEEP_MINUTES</p>
                        <input
                          type="number"
                          min="1"
                          value={formData.AGENT_SWEEP_MINUTES ?? 5}
                          onChange={(e) => handleChange('AGENT_SWEEP_MINUTES', parseInt(e.target.value) || 5)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Max Job Retries</label>
                        <p className="text-[10px] text-slate-500 font-mono">AGENT_MAX_ATTEMPTS</p>
                        <input
                          type="number"
                          min="1"
                          value={formData.AGENT_MAX_ATTEMPTS ?? 3}
                          onChange={(e) => handleChange('AGENT_MAX_ATTEMPTS', parseInt(e.target.value) || 3)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                        <div className="space-y-0.5 pr-2">
                          <span className="font-bold text-slate-800">Auto RAG Index Closed</span>
                          <p className="text-[10px] text-slate-500 font-mono">RAG_AUTO_INDEX_CLOSED</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={!!formData.RAG_AUTO_INDEX_CLOSED}
                          onChange={(e) => handleChange('RAG_AUTO_INDEX_CLOSED', e.target.checked)}
                          className="w-5 h-5 text-indigo-600 rounded cursor-pointer"
                        />
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                        <div className="space-y-0.5 pr-2">
                          <span className="font-bold text-slate-800">Index Auto-Closed</span>
                          <p className="text-[10px] text-slate-500 font-mono">RAG_INCLUDE_AUTO_CLOSED</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={!!formData.RAG_INCLUDE_AUTO_CLOSED}
                          onChange={(e) => handleChange('RAG_INCLUDE_AUTO_CLOSED', e.target.checked)}
                          className="w-5 h-5 text-indigo-600 rounded cursor-pointer"
                        />
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                        <div className="space-y-0.5 pr-2">
                          <span className="font-bold text-slate-800">RAG Similarity Search</span>
                          <p className="text-[10px] text-slate-500 font-mono">AGENT_USE_RAG_SIMILARITY</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={!!formData.AGENT_USE_RAG_SIMILARITY}
                          onChange={(e) => handleChange('AGENT_USE_RAG_SIMILARITY', e.target.checked)}
                          className="w-5 h-5 text-indigo-600 rounded cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: EMAIL & NOTIFICATIONS */}
              {activeTab === 'email' && (
                <div className="space-y-5">
                  {/* Admin Personal Email Alert Setting (Preserved original feature!) */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                      <Bell className="w-5 h-5 text-mnnit-gold" />
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Admin Notification Preferences</h3>
                        <p className="text-xs text-slate-500">Personal alert subscriptions for your admin account.</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-amber-50/50 rounded-xl border border-amber-200">
                      <div className="space-y-0.5 pr-4">
                        <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          <Bell className="w-4 h-4 text-amber-600" />
                          Email Alert on New Complaint Ticket
                        </span>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          Receive immediate email notification copies whenever a student submits and verifies a new complaint ticket.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!formData.notify_on_new_complaint}
                        onChange={(e) => handleChange('notify_on_new_complaint', e.target.checked)}
                        className="w-5 h-5 text-blue-600 rounded cursor-pointer shrink-0"
                      />
                    </div>
                  </div>

                  {/* Outbox & SMTP Server Configuration */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-600" />
                      <h3 className="text-sm font-bold text-slate-900">Email Delivery & SMTP Service</h3>
                    </div>

                    {/* Delivery Backend Switch */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="font-bold text-slate-800">Email Dispatch Backend</span>
                        <p className="text-[10px] text-slate-500 font-mono">EMAIL_BACKEND</p>
                        <p className="text-[11px] text-slate-500">
                          {formData.EMAIL_BACKEND === 'smtp'
                            ? 'Live SMTP delivery: Emails sent to actual mailboxes.'
                            : 'Console / Mock delivery: Emails logged to backend stdout outbox (safe for development).'}
                        </p>
                      </div>
                      <select
                        value={formData.EMAIL_BACKEND || 'console'}
                        onChange={(e) => handleChange('EMAIL_BACKEND', e.target.value)}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-xs"
                      >
                        <option value="console">console (Development Mock)</option>
                        <option value="smtp">smtp (Live Mail Server)</option>
                      </select>
                    </div>

                    {/* SMTP Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">SMTP Host</label>
                        <p className="text-[10px] text-slate-500 font-mono">SMTP_HOST</p>
                        <input
                          type="text"
                          placeholder="localhost or smtp.office365.com"
                          value={formData.SMTP_HOST || ''}
                          onChange={(e) => handleChange('SMTP_HOST', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">SMTP Port</label>
                        <p className="text-[10px] text-slate-500 font-mono">SMTP_PORT</p>
                        <input
                          type="number"
                          placeholder="25, 587, or 465"
                          value={formData.SMTP_PORT || 25}
                          onChange={(e) => handleChange('SMTP_PORT', parseInt(e.target.value) || 25)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">SMTP Username</label>
                        <p className="text-[10px] text-slate-500 font-mono">SMTP_USER</p>
                        <input
                          type="text"
                          placeholder="smtp_username@mnnit.ac.in"
                          value={formData.SMTP_USER || ''}
                          onChange={(e) => handleChange('SMTP_USER', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">
                          SMTP Password {serverSettings?.email?.has_smtp_password && '(Configured)'}
                        </label>
                        <p className="text-[10px] text-slate-500 font-mono">SMTP_PASSWORD</p>
                        <input
                          type="password"
                          placeholder={serverSettings?.email?.has_smtp_password ? '•••••••• (Leave blank to keep)' : 'Enter password'}
                          value={newApiKeys.smtp_password || ''}
                          onChange={(e) => handleApiKeyChange('smtp_password', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">From Address</label>
                        <p className="text-[10px] text-slate-500 font-mono">EMAIL_FROM</p>
                        <input
                          type="text"
                          placeholder="noreply@mnnit.ac.in"
                          value={formData.EMAIL_FROM || ''}
                          onChange={(e) => handleChange('EMAIL_FROM', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">In-Charge CC Emails (Comma-separated)</label>
                        <p className="text-[10px] text-slate-500 font-mono">INCHARGE_CC_EMAILS</p>
                        <input
                          type="text"
                          placeholder="incharge@mnnit.ac.in, head.cc@mnnit.ac.in"
                          value={formData.INCHARGE_CC_EMAILS || ''}
                          onChange={(e) => handleChange('INCHARGE_CC_EMAILS', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs mt-2">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-800">Use TLS Encryption</span>
                        <p className="text-[10px] text-slate-500 font-mono">SMTP_USE_TLS</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!formData.SMTP_USE_TLS}
                        onChange={(e) => handleChange('SMTP_USE_TLS', e.target.checked)}
                        className="w-5 h-5 text-indigo-600 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: LLM ORCHESTRATION & KEYS */}
              {activeTab === 'llm' && (
                <div className="space-y-5">
                  {/* Fallback Priority Order */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-purple-600" />
                      <h3 className="text-sm font-bold text-slate-900">Multi-Provider Fallback Priority Order</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        LLM_PROVIDER_ORDER
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Comma-separated failover sequence. System attempts each provider in order until successful response is received.
                    </p>
                    <input
                      type="text"
                      value={formData.LLM_PROVIDER_ORDER || ''}
                      onChange={(e) => handleChange('LLM_PROVIDER_ORDER', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-purple-800 font-bold"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(formData.LLM_PROVIDER_ORDER || '').split(',').map((p: string, i: number) => (
                        <span
                          key={i}
                          className="text-[11px] font-mono px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg flex items-center gap-1"
                        >
                          <span className="w-4 h-4 rounded-full bg-purple-200 text-purple-800 font-bold flex items-center justify-center text-[9px]">
                            {i + 1}
                          </span>
                          {p.trim()}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Provider Models & API Keys */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-indigo-600" />
                      Models & API Credentials
                    </h3>

                    {/* Gemini */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          Google Gemini Provider
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                            serverSettings?.llm?.has_gemini_key
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {serverSettings?.llm?.has_gemini_key
                            ? `Key Set (${serverSettings.llm.masked_gemini_key})`
                            : 'No API Key'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600">Model Name</label>
                          <input
                            type="text"
                            value={formData.GEMINI_MODEL || ''}
                            onChange={(e) => handleChange('GEMINI_MODEL', e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600">Timeout (Seconds)</label>
                          <input
                            type="number"
                            value={formData.GEMINI_TIMEOUT || 60}
                            onChange={(e) => handleChange('GEMINI_TIMEOUT', parseFloat(e.target.value) || 60)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600">Update API Key</label>
                          <input
                            type="password"
                            placeholder="Enter new Gemini API key"
                            value={newApiKeys.gemini || ''}
                            onChange={(e) => handleApiKeyChange('gemini', e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* OpenAI */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          OpenAI Provider
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                            serverSettings?.llm?.has_openai_key
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {serverSettings?.llm?.has_openai_key
                            ? `Key Set (${serverSettings.llm.masked_openai_key})`
                            : 'No API Key'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600">Model Name (OPENAI_MODEL)</label>
                          <input
                            type="text"
                            value={formData.OPENAI_MODEL || ''}
                            onChange={(e) => handleChange('OPENAI_MODEL', e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600">Update OpenAI API Key</label>
                          <input
                            type="password"
                            placeholder="sk-proj-..."
                            value={newApiKeys.openai || ''}
                            onChange={(e) => handleApiKeyChange('openai', e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Grok & Claude Anthropic */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      {/* Grok */}
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">xAI Grok</span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {serverSettings?.llm?.has_grok_key ? 'Key configured' : 'No key'}
                          </span>
                        </div>
                        <input
                          type="text"
                          placeholder="GROK_MODEL (e.g. grok-beta)"
                          value={formData.GROK_MODEL || ''}
                          onChange={(e) => handleChange('GROK_MODEL', e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs"
                        />
                        <input
                          type="password"
                          placeholder="Update Grok Key (gsk_...)"
                          value={newApiKeys.grok || ''}
                          onChange={(e) => handleApiKeyChange('grok', e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs"
                        />
                      </div>

                      {/* Anthropic Claude */}
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">Anthropic Claude</span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {serverSettings?.llm?.has_llm_key ? 'Key configured' : 'No key'}
                          </span>
                        </div>
                        <input
                          type="text"
                          placeholder="LLM_MODEL_CHAT"
                          value={formData.LLM_MODEL_CHAT || ''}
                          onChange={(e) => handleChange('LLM_MODEL_CHAT', e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs"
                        />
                        <input
                          type="password"
                          placeholder="Update Anthropic Key (sk-ant-...)"
                          value={newApiKeys.llm || ''}
                          onChange={(e) => handleApiKeyChange('llm', e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: LIFECYCLE & POLICIES */}
              {activeTab === 'lifecycle' && (
                <div className="space-y-5">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600" />
                      Complaint Lifecycle & Auto-Closure
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Auto-Close Delay (Days)</label>
                        <p className="text-[10px] text-slate-500 font-mono">AUTO_CLOSE_DAYS</p>
                        <input
                          type="number"
                          min="1"
                          value={formData.AUTO_CLOSE_DAYS ?? 3}
                          onChange={(e) => handleChange('AUTO_CLOSE_DAYS', parseInt(e.target.value) || 3)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                        />
                        <span className="text-[10px] text-slate-400">Days after resolution without student dispute</span>
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Auto-Close Sweep Interval (Min)</label>
                        <p className="text-[10px] text-slate-500 font-mono">AUTO_CLOSE_CHECK_MINUTES</p>
                        <input
                          type="number"
                          min="1"
                          value={formData.AUTO_CLOSE_CHECK_MINUTES ?? 30}
                          onChange={(e) => handleChange('AUTO_CLOSE_CHECK_MINUTES', parseInt(e.target.value) || 30)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                        />
                        <span className="text-[10px] text-slate-400">Worker check period</span>
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Action Token Expiry (Days)</label>
                        <p className="text-[10px] text-slate-500 font-mono">ACTION_TOKEN_EXPIRY_DAYS</p>
                        <input
                          type="number"
                          min="1"
                          value={formData.ACTION_TOKEN_EXPIRY_DAYS ?? 14}
                          onChange={(e) => handleChange('ACTION_TOKEN_EXPIRY_DAYS', parseInt(e.target.value) || 14)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                        />
                        <span className="text-[10px] text-slate-400">Confirm & rating link validity</span>
                      </div>
                    </div>
                  </div>

                  {/* Scoring Formula & Policy Limits */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-blue-600" />
                      Leaderboard Scoring & Chat Limits
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Score Formula</label>
                        <p className="text-[10px] text-slate-500 font-mono">SCORE_FORMULA</p>
                        <select
                          value={formData.SCORE_FORMULA || 'average'}
                          onChange={(e) => handleChange('SCORE_FORMULA', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold"
                        >
                          <option value="average">average (Arithmetic Mean)</option>
                          <option value="weighted">weighted (Bayesian Prior)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Score Prior Mean</label>
                        <p className="text-[10px] text-slate-500 font-mono">SCORE_PRIOR_MEAN</p>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.SCORE_PRIOR_MEAN ?? 3.5}
                          onChange={(e) => handleChange('SCORE_PRIOR_MEAN', parseFloat(e.target.value) || 3.5)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Score Prior Sample Count</label>
                        <p className="text-[10px] text-slate-500 font-mono">SCORE_PRIOR_COUNT</p>
                        <input
                          type="number"
                          step="1"
                          value={formData.SCORE_PRIOR_COUNT ?? 5.0}
                          onChange={(e) => handleChange('SCORE_PRIOR_COUNT', parseFloat(e.target.value) || 5.0)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Max Chat Messages / Session</label>
                        <p className="text-[10px] text-slate-500 font-mono">MAX_CHAT_MESSAGES</p>
                        <input
                          type="number"
                          value={formData.MAX_CHAT_MESSAGES ?? 10}
                          onChange={(e) => handleChange('MAX_CHAT_MESSAGES', parseInt(e.target.value) || 10)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Max Upload Size (MB)</label>
                        <p className="text-[10px] text-slate-500 font-mono">MAX_UPLOAD_MB</p>
                        <input
                          type="number"
                          value={formData.MAX_UPLOAD_MB ?? 10}
                          onChange={(e) => handleChange('MAX_UPLOAD_MB', parseInt(e.target.value) || 10)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: SECURITY & OTP */}
              {activeTab === 'security' && (
                <div className="space-y-5">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-rose-600" />
                      Student OTP Authentication & Email Domain Restriction
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1 sm:col-span-2">
                        <label className="font-bold text-slate-700">Allowed Student Email Domain</label>
                        <p className="text-[10px] text-slate-500 font-mono">ALLOWED_EMAIL_DOMAIN</p>
                        <input
                          type="text"
                          placeholder="mnnit.ac.in"
                          value={formData.ALLOWED_EMAIL_DOMAIN || ''}
                          onChange={(e) => handleChange('ALLOWED_EMAIL_DOMAIN', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-800"
                        />
                        <span className="text-[10px] text-slate-400">
                          Students can only register complaints using addresses matching this domain.
                        </span>
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">OTP Validity (Minutes)</label>
                        <p className="text-[10px] text-slate-500 font-mono">OTP_EXPIRE_MINUTES</p>
                        <input
                          type="number"
                          min="1"
                          value={formData.OTP_EXPIRE_MINUTES ?? 10}
                          onChange={(e) => handleChange('OTP_EXPIRE_MINUTES', parseInt(e.target.value) || 10)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">OTP Resend Cooldown (Seconds)</label>
                        <p className="text-[10px] text-slate-500 font-mono">OTP_RESEND_SECONDS</p>
                        <input
                          type="number"
                          min="10"
                          value={formData.OTP_RESEND_SECONDS ?? 60}
                          onChange={(e) => handleChange('OTP_RESEND_SECONDS', parseInt(e.target.value) || 60)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Max Incorrect OTP Attempts</label>
                        <p className="text-[10px] text-slate-500 font-mono">OTP_MAX_ATTEMPTS</p>
                        <input
                          type="number"
                          min="1"
                          value={formData.OTP_MAX_ATTEMPTS ?? 5}
                          onChange={(e) => handleChange('OTP_MAX_ATTEMPTS', parseInt(e.target.value) || 5)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Max Resends Per Session</label>
                        <p className="text-[10px] text-slate-500 font-mono">OTP_MAX_RESENDS</p>
                        <input
                          type="number"
                          min="1"
                          value={formData.OTP_MAX_RESENDS ?? 3}
                          onChange={(e) => handleChange('OTP_MAX_RESENDS', parseInt(e.target.value) || 3)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Staff Login Security */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-slate-700" />
                      Staff Login Lockout Policies
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Max Login Failures</label>
                        <p className="text-[10px] text-slate-500 font-mono">LOGIN_MAX_FAILURES</p>
                        <input
                          type="number"
                          min="1"
                          value={formData.LOGIN_MAX_FAILURES ?? 5}
                          onChange={(e) => handleChange('LOGIN_MAX_FAILURES', parseInt(e.target.value) || 5)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                        />
                        <span className="text-[10px] text-slate-400">Failed attempts before account lock</span>
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Lockout Duration (Minutes)</label>
                        <p className="text-[10px] text-slate-500 font-mono">LOGIN_LOCK_MINUTES</p>
                        <input
                          type="number"
                          min="1"
                          value={formData.LOGIN_LOCK_MINUTES ?? 15}
                          onChange={(e) => handleChange('LOGIN_LOCK_MINUTES', parseInt(e.target.value) || 15)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                        />
                        <span className="text-[10px] text-slate-400">Temporary lockout duration</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: GENERAL & SYSTEM */}
              {activeTab === 'general' && (
                <div className="space-y-5">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Building className="w-4 h-4 text-slate-700" />
                      Campus & Localization Configuration
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Institution Name</label>
                        <p className="text-[10px] text-slate-500 font-mono">COLLEGE_NAME</p>
                        <input
                          type="text"
                          value={formData.COLLEGE_NAME || ''}
                          onChange={(e) => handleChange('COLLEGE_NAME', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Application Timezone</label>
                        <p className="text-[10px] text-slate-500 font-mono">APP_TIMEZONE</p>
                        <input
                          type="text"
                          value={formData.APP_TIMEZONE || 'Asia/Kolkata'}
                          onChange={(e) => handleChange('APP_TIMEZONE', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Flow Trace (Optional Feature Branch Ready) */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">LLM Execution Flow Tracing</h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                            FLOW_TRACE
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Enables step-by-step latency and LLM prompt tracing across pipeline stages (ready for feature branch integration).
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!formData.FLOW_TRACE}
                        onChange={(e) => handleChange('FLOW_TRACE', e.target.checked)}
                        className="w-5 h-5 text-indigo-600 rounded cursor-pointer"
                      />
                    </div>

                    <div className="pt-2 text-xs">
                      <label className="font-bold text-slate-700">Slow Step Latency Warning (Milliseconds)</label>
                      <p className="text-[10px] text-slate-500 font-mono mb-1">FLOW_TRACE_SLOW_MS</p>
                      <input
                        type="number"
                        step="500"
                        value={formData.FLOW_TRACE_SLOW_MS ?? 3000}
                        onChange={(e) => handleChange('FLOW_TRACE_SLOW_MS', parseInt(e.target.value) || 3000)}
                        className="w-full max-w-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Floating Bottom Action Bar */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-4 flex items-center justify-between sticky bottom-4 z-20">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReset}
                    disabled={!isDirty || saving}
                    className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Discard Changes
                  </button>
                  {isDirty && (
                    <span className="text-xs text-amber-600 font-medium hidden sm:inline">
                      You have modified parameters that are not yet saved.
                    </span>
                  )}
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving || !isDirty}
                  className={`flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold transition shadow ${
                    isDirty
                      ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer ring-2 ring-blue-400/40'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save All Settings'}
                </button>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
};
