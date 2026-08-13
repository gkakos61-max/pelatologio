"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  area: string | null;
  postal_code: string | null;
  maps_url: string | null;
  notes: string | null;
};

type Visit = {
  id: number;
  customer_id: number;
  visit_date: string;
  status: string;
  completed_at: string | null;
  notes: string | null;
  customers: {
    id: number;
    name: string;
    area: string | null;
    maps_url: string | null;
  } | null;
};

type Screen = "home" | "customers" | "schedule" | "history";

const emptyCustomerForm = {
  name: "",
  phone: "",
  address: "",
  area: "",
  postal_code: "",
  maps_url: "",
  notes: "",
};

function getLocalDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(dateString: string) {
  return new Date(dateString + "T12:00:00").toLocaleDateString("el-GR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  });
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Καλημέρα";
  if (hour < 18) return "Καλό απόγευμα";

  return "Καλησπέρα";
}

function getWeekRange() {
  const today = new Date();
  const day = today.getDay();
  const difference = day === 0 ? -6 : 1 - day;

  const monday = new Date(today);
  monday.setDate(today.getDate() + difference);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { monday, sunday };
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);

  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  const [showQuickVisits, setShowQuickVisits] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(false);

  const [customerForm, setCustomerForm] = useState(emptyCustomerForm);

  const [search, setSearch] = useState("");

  const [visitCustomerId, setVisitCustomerId] = useState("");
  const [visitDate, setVisitDate] = useState(getLocalDate());
  const [visitNotes, setVisitNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadEverything();
  }, []);

  async function loadEverything() {
    setLoading(true);

    await Promise.all([loadCustomers(), loadVisits()]);

    setLoading(false);
  }

  async function loadCustomers() {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      alert("Σφάλμα φόρτωσης πελατών: " + error.message);
      return;
    }

    setCustomers(data || []);
  }

  async function loadVisits() {
    const { data, error } = await supabase
      .from("visits")
      .select(`
        id,
        customer_id,
        visit_date,
        status,
        completed_at,
        notes,
        customers (
          id,
          name,
          area,
          maps_url
        )
      `)
      .order("visit_date", { ascending: true });

    if (error) {
      alert("Σφάλμα φόρτωσης επισκέψεων: " + error.message);
      return;
    }

    setVisits((data || []) as unknown as Visit[]);
  }

  function handleCustomerChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setCustomerForm({
      ...customerForm,
      [e.target.name]: e.target.value,
    });
  }

  function openCustomer(customer: Customer) {
    setSelectedCustomer(customer);
    setEditingCustomer(false);
  }

  function startEditCustomer() {
    if (!selectedCustomer) return;

    setCustomerForm({
      name: selectedCustomer.name || "",
      phone: selectedCustomer.phone || "",
      address: selectedCustomer.address || "",
      area: selectedCustomer.area || "",
      postal_code: selectedCustomer.postal_code || "",
      maps_url: selectedCustomer.maps_url || "",
      notes: selectedCustomer.notes || "",
    });

    setEditingCustomer(true);
  }

  async function saveNewCustomer() {
    if (!customerForm.name.trim()) {
      alert("Συμπλήρωσε Όνομα / Επωνυμία.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("customers").insert([
      {
        name: customerForm.name.trim(),
        phone: customerForm.phone.trim() || null,
        address: customerForm.address.trim() || null,
        area: customerForm.area.trim() || null,
        postal_code: customerForm.postal_code.trim() || null,
        maps_url: customerForm.maps_url.trim() || null,
        notes: customerForm.notes.trim() || null,
      },
    ]);

    setSaving(false);

    if (error) {
      alert("Σφάλμα αποθήκευσης: " + error.message);
      return;
    }

    setCustomerForm(emptyCustomerForm);
    setShowNewCustomer(false);

    await loadCustomers();
  }

  async function saveCustomerChanges() {
    if (!selectedCustomer) return;

    if (!customerForm.name.trim()) {
      alert("Συμπλήρωσε Όνομα / Επωνυμία.");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from("customers")
      .update({
        name: customerForm.name.trim(),
        phone: customerForm.phone.trim() || null,
        address: customerForm.address.trim() || null,
        area: customerForm.area.trim() || null,
        postal_code: customerForm.postal_code.trim() || null,
        maps_url: customerForm.maps_url.trim() || null,
        notes: customerForm.notes.trim() || null,
      })
      .eq("id", selectedCustomer.id)
      .select()
      .single();

    setSaving(false);

    if (error) {
      alert("Σφάλμα τροποποίησης: " + error.message);
      return;
    }

    setSelectedCustomer(data);
    setEditingCustomer(false);

    await loadCustomers();
    await loadVisits();
  }

  async function deleteCustomer() {
    if (!selectedCustomer) return;

    const confirmed = window.confirm(
      `Θέλεις σίγουρα να διαγράψεις τον πελάτη "${selectedCustomer.name}";`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", selectedCustomer.id);

    if (error) {
      alert(
        "Δεν μπορεί να διαγραφεί ο πελάτης αν υπάρχει συνδεδεμένο ιστορικό επισκέψεων."
      );
      return;
    }

    setSelectedCustomer(null);
    await loadCustomers();
  }

  async function addVisit() {
    if (!visitCustomerId) {
      alert("Επίλεξε πελάτη.");
      return;
    }

    if (!visitDate) {
      alert("Επίλεξε ημερομηνία.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("visits").insert([
      {
        customer_id: Number(visitCustomerId),
        visit_date: visitDate,
        status: "planned",
        completed_at: null,
        notes: visitNotes.trim() || null,
      },
    ]);

    setSaving(false);

    if (error) {
      alert("Σφάλμα προσθήκης επίσκεψης: " + error.message);
      return;
    }

    setVisitCustomerId("");
    setVisitNotes("");

    await loadVisits();
  }

  async function completeVisit(visitId: number) {
    const { error } = await supabase
      .from("visits")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", visitId);

    if (error) {
      alert("Σφάλμα ενημέρωσης: " + error.message);
      return;
    }

    await loadVisits();
  }

  const today = getLocalDate();

  const todayVisits = visits.filter(
    (visit) =>
      visit.visit_date === today &&
      visit.status !== "completed"
  );

  const upcomingVisits = visits.filter(
    (visit) =>
      visit.visit_date >= today &&
      visit.status !== "completed"
  );

  const { monday, sunday } = getWeekRange();

  const weeklyCompletedVisits = visits.filter((visit) => {
    if (visit.status !== "completed") return false;

    const date = new Date(visit.visit_date + "T12:00:00");

    return date >= monday && date <= sunday;
  });

  const filteredCustomers = customers.filter((customer) => {
    const text = `
      ${customer.name}
      ${customer.phone || ""}
      ${customer.address || ""}
      ${customer.area || ""}
      ${customer.postal_code || ""}
      ${customer.notes || ""}
    `.toLowerCase();

    return text.includes(search.toLowerCase());
  });

  const inputStyle =
    "w-full rounded-2xl border border-gray-300 bg-white px-4 py-4 text-base font-semibold text-black placeholder:text-gray-600 outline-none focus:border-black";

  if (selectedCustomer) {
    return (
      <main className="min-h-screen bg-white pb-28 text-black">
        <div className="mx-auto max-w-xl px-5 pt-6">
          <button
            onClick={() => {
              setSelectedCustomer(null);
              setEditingCustomer(false);
            }}
            className="mb-6 text-base font-black"
          >
            ← Πίσω
          </button>

          {!editingCustomer ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-gray-500">
                    ΠΕΛΑΤΗΣ / ΚΑΤΑΣΤΗΜΑ
                  </p>

                  <h1 className="mt-1 text-3xl font-black">
                    {selectedCustomer.name}
                  </h1>
                </div>

                <button
                  onClick={startEditCustomer}
                  className="rounded-2xl border border-gray-300 px-4 py-2 font-black"
                >
                  Αλλαγή
                </button>
              </div>

              <div className="mt-7 space-y-4">
                {selectedCustomer.phone && (
                  <div className="rounded-3xl bg-gray-100 p-5">
                    <p className="text-sm font-black text-gray-500">
                      ΤΗΛΕΦΩΝΟ
                    </p>

                    <a
                      href={`tel:${selectedCustomer.phone}`}
                      className="mt-2 block text-xl font-black"
                    >
                      {selectedCustomer.phone}
                    </a>
                  </div>
                )}

                {selectedCustomer.address && (
                  <div className="rounded-3xl bg-gray-100 p-5">
                    <p className="text-sm font-black text-gray-500">
                      ΔΙΕΥΘΥΝΣΗ
                    </p>

                    <p className="mt-2 text-lg font-black">
                      {selectedCustomer.address}
                    </p>

                    <p className="mt-1 font-bold text-gray-700">
                      {selectedCustomer.area}
                      {selectedCustomer.postal_code &&
                        ` • Τ.Κ. ${selectedCustomer.postal_code}`}
                    </p>
                  </div>
                )}

                {selectedCustomer.maps_url && (
                  <a
                    href={selectedCustomer.maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center rounded-3xl bg-blue-950 px-5 py-4 text-lg font-black text-white"
                  >
                    📍 Άνοιγμα στον χάρτη
                  </a>
                )}

                {selectedCustomer.notes && (
                  <div className="rounded-3xl bg-gray-100 p-5">
                    <p className="text-sm font-black text-gray-500">
                      ΣΗΜΕΙΩΣΕΙΣ
                    </p>

                    <p className="mt-2 whitespace-pre-wrap font-semibold">
                      {selectedCustomer.notes}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={deleteCustomer}
                className="mt-8 w-full rounded-3xl border border-red-300 bg-red-50 px-5 py-4 font-black text-red-700"
              >
                Διαγραφή πελάτη
              </button>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-black">
                Τροποποίηση
              </h1>

              <div className="mt-6 space-y-4">
                <input
                  name="name"
                  value={customerForm.name}
                  onChange={handleCustomerChange}
                  placeholder="Όνομα / Επωνυμία"
                  className={inputStyle}
                />

                <input
                  name="phone"
                  value={customerForm.phone}
                  onChange={handleCustomerChange}
                  placeholder="Τηλέφωνο"
                  className={inputStyle}
                />

                <input
                  name="address"
                  value={customerForm.address}
                  onChange={handleCustomerChange}
                  placeholder="Διεύθυνση"
                  className={inputStyle}
                />

                <input
                  name="area"
                  value={customerForm.area}
                  onChange={handleCustomerChange}
                  placeholder="Περιοχή"
                  className={inputStyle}
                />

                <input
                  name="postal_code"
                  value={customerForm.postal_code}
                  onChange={handleCustomerChange}
                  placeholder="Τ.Κ."
                  className={inputStyle}
                />

                <input
                  name="maps_url"
                  value={customerForm.maps_url}
                  onChange={handleCustomerChange}
                  placeholder="Google Maps URL"
                  className={inputStyle}
                />

                <textarea
                  name="notes"
                  value={customerForm.notes}
                  onChange={handleCustomerChange}
                  placeholder="Σημειώσεις"
                  rows={5}
                  className={inputStyle}
                />

                <button
                  onClick={saveCustomerChanges}
                  disabled={saving}
                  className="w-full rounded-3xl bg-blue-950 px-5 py-4 text-lg font-black text-white"
                >
                  Αποθήκευση αλλαγών
                </button>

                <button
                  onClick={() => setEditingCustomer(false)}
                  className="w-full rounded-3xl border border-gray-300 px-5 py-4 font-black"
                >
                  Ακύρωση
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white pb-28 text-black">
      <div className="mx-auto max-w-xl px-5 pt-5">

        {screen === "home" && (
          <>
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowQuickVisits(!showQuickVisits)}
                className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-2xl font-black"
              >
                ☰

                {todayVisits.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-black text-white">
                    {todayVisits.length}
                  </span>
                )}
              </button>
            </div>

            {showQuickVisits && (
              <div className="mt-4 rounded-3xl bg-black p-5 text-white">
                <h2 className="text-xl font-black text-white">
                  Σημερινές επισκέψεις
                </h2>

                <div className="mt-4 space-y-3">
                  {todayVisits.length === 0 ? (
                    <p className="font-semibold text-gray-300">
                      Δεν έχεις επίσκεψη σήμερα.
                    </p>
                  ) : (
                    todayVisits.map((visit) => (
                      <div
                        key={visit.id}
                        className="rounded-2xl bg-white/10 p-4"
                      >
                        <p className="font-black text-white">
                          {visit.customers?.name}
                        </p>

                        <div className="mt-3 flex gap-2">
                          {visit.customers?.maps_url && (
                            <a
                              href={visit.customers.maps_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white"
                            >
                              📍
                            </a>
                          )}

                          <button
                            onClick={() => completeVisit(visit.id)}
                            className="flex-1 rounded-xl bg-green-500 py-2 font-black text-white"
                          >
                            Πήγα ✓
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="mt-10">
              <p className="text-lg font-black text-gray-600">
                {getGreeting()} 👋
              </p>

              <h1 className="mt-1 text-4xl font-black leading-tight">
                Πελατολόγιο
              </h1>

              <p className="mt-2 font-semibold text-gray-600">
                Οργάνωσε πελάτες και επισκέψεις
              </p>
            </div>

            <div className="mt-9 grid grid-cols-2 gap-4">
              <button
                onClick={() => setScreen("customers")}
                className="rounded-3xl bg-blue-950 p-5 text-left text-white"
              >
                <div className="text-3xl">👥</div>

                <p className="mt-5 text-xl font-black text-white">
                  Πελάτες
                </p>

                <p className="mt-1 text-sm font-semibold text-blue-100">
                  {customers.length} καταχωρήσεις
                </p>
              </button>

              <button
                onClick={() => setScreen("schedule")}
                className="rounded-3xl bg-gray-100 p-5 text-left"
              >
                <div className="text-3xl">📅</div>

                <p className="mt-5 text-xl font-black">
                  Πρόγραμμα
                </p>

                <p className="mt-1 text-sm font-semibold text-gray-600">
                  {upcomingVisits.length} εκκρεμείς
                </p>
              </button>

              <button
                onClick={() => setScreen("history")}
                className="col-span-2 rounded-3xl bg-gray-100 p-5 text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl">🕘</div>

                    <p className="mt-4 text-xl font-black">
                      Ιστορικό εβδομάδας
                    </p>

                    <p className="mt-1 font-semibold text-gray-600">
                      {weeklyCompletedVisits.length} ολοκληρωμένες επισκέψεις
                    </p>
                  </div>

                  <span className="text-4xl">›</span>
                </div>
              </button>
            </div>

            <div className="mt-7 rounded-3xl border border-gray-200 p-5">
              <p className="text-sm font-black text-gray-500">
                ΣΗΜΕΡΑ
              </p>

              <p className="mt-2 text-2xl font-black">
                {todayVisits.length === 0
                  ? "Δεν έχεις επισκέψεις"
                  : `${todayVisits.length} επισκέψεις`}
              </p>
            </div>
          </>
        )}

        {screen === "customers" && (
          <>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="font-bold text-gray-600">
                  Πελατολόγιο
                </p>

                <h1 className="text-3xl font-black">
                  Πελάτες / Καταστήματα
                </h1>
              </div>

              <button
                onClick={() => {
                  setCustomerForm(emptyCustomerForm);
                  setShowNewCustomer(true);
                }}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-950 text-3xl text-white"
              >
                +
              </button>
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Αναζήτηση..."
              className={`${inputStyle} mt-6`}
            />

            {showNewCustomer && (
              <div className="mt-5 rounded-3xl border border-gray-200 p-5">
                <h2 className="text-2xl font-black">
                  Νέος πελάτης
                </h2>

                <div className="mt-4 space-y-3">
                  <input
                    name="name"
                    value={customerForm.name}
                    onChange={handleCustomerChange}
                    placeholder="Όνομα / Επωνυμία"
                    className={inputStyle}
                  />

                  <input
                    name="phone"
                    value={customerForm.phone}
                    onChange={handleCustomerChange}
                    placeholder="Τηλέφωνο"
                    className={inputStyle}
                  />

                  <input
                    name="address"
                    value={customerForm.address}
                    onChange={handleCustomerChange}
                    placeholder="Διεύθυνση"
                    className={inputStyle}
                  />

                  <input
                    name="area"
                    value={customerForm.area}
                    onChange={handleCustomerChange}
                    placeholder="Περιοχή"
                    className={inputStyle}
                  />

                  <input
                    name="postal_code"
                    value={customerForm.postal_code}
                    onChange={handleCustomerChange}
                    placeholder="Τ.Κ."
                    className={inputStyle}
                  />

                  <input
                    name="maps_url"
                    value={customerForm.maps_url}
                    onChange={handleCustomerChange}
                    placeholder="Google Maps URL"
                    className={inputStyle}
                  />

                  <textarea
                    name="notes"
                    value={customerForm.notes}
                    onChange={handleCustomerChange}
                    placeholder="Σημειώσεις"
                    rows={4}
                    className={inputStyle}
                  />

                  <button
                    onClick={saveNewCustomer}
                    disabled={saving}
                    className="w-full rounded-3xl bg-blue-950 py-4 text-lg font-black text-white"
                  >
                    Αποθήκευση
                  </button>

                  <button
                    onClick={() => setShowNewCustomer(false)}
                    className="w-full rounded-3xl border border-gray-300 py-4 font-black"
                  >
                    Ακύρωση
                  </button>
                </div>
              </div>
            )}

            <div className="mt-5">
              {filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center border-b border-gray-200 py-4"
                >
                  <button
                    onClick={() => openCustomer(customer)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <h3 className="truncate text-xl font-black">
                      {customer.name}
                    </h3>

                    <p className="truncate font-semibold text-gray-600">
                      {customer.area || customer.address || ""}
                    </p>
                  </button>

                  {customer.maps_url && (
                    <a
                      href={customer.maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-3 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xl"
                    >
                      📍
                    </a>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {screen === "schedule" && (
          <>
            <div className="mt-4">
              <p className="font-bold text-gray-600">
                Πρόγραμμα
              </p>

              <h1 className="text-3xl font-black">
                Πότε θα πάω
              </h1>
            </div>

            <div className="mt-6 rounded-3xl bg-gray-100 p-5">
              <h2 className="text-xl font-black">
                + Νέα επίσκεψη
              </h2>

              <div className="mt-4 space-y-3">
                <select
                  value={visitCustomerId}
                  onChange={(e) => setVisitCustomerId(e.target.value)}
                  className={inputStyle}
                >
                  <option value="">
                    Επίλεξε πελάτη
                  </option>

                  {customers.map((customer) => (
                    <option
                      key={customer.id}
                      value={customer.id}
                    >
                      {customer.name}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className={inputStyle}
                />

                <input
                  value={visitNotes}
                  onChange={(e) => setVisitNotes(e.target.value)}
                  placeholder="Σημείωση"
                  className={inputStyle}
                />

                <button
                  onClick={addVisit}
                  disabled={saving}
                  className="w-full rounded-3xl bg-blue-950 py-4 text-lg font-black text-white"
                >
                  Προσθήκη
                </button>
              </div>
            </div>

            <div className="mt-7 space-y-4">
              {upcomingVisits.map((visit) => (
                <div
                  key={visit.id}
                  className="rounded-3xl border border-gray-200 p-5"
                >
                  <p className="text-sm font-black text-gray-500">
                    {visit.visit_date === today
                      ? "ΣΗΜΕΡΑ"
                      : formatDate(visit.visit_date)}
                  </p>

                  <h3 className="mt-1 text-2xl font-black">
                    {visit.customers?.name}
                  </h3>

                  {visit.customers?.area && (
                    <p className="font-semibold text-gray-600">
                      {visit.customers.area}
                    </p>
                  )}

                  {visit.notes && (
                    <p className="mt-3 font-semibold text-gray-700">
                      {visit.notes}
                    </p>
                  )}

                  <div className="mt-4 flex gap-3">
                    {visit.customers?.maps_url && (
                      <a
                        href={visit.customers.maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-xl"
                      >
                        📍
                      </a>
                    )}

                    <button
                      onClick={() => completeVisit(visit.id)}
                      className="flex-1 rounded-2xl bg-green-100 py-3 font-black text-green-800"
                    >
                      Πήγα ✓
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {screen === "history" && (
          <>
            <div className="mt-4">
              <p className="font-bold text-gray-600">
                Εβδομάδα
              </p>

              <h1 className="text-3xl font-black">
                Ιστορικό
              </h1>
            </div>

            <div className="mt-6 space-y-3">
              {weeklyCompletedVisits.map((visit) => (
                <div
                  key={visit.id}
                  className="flex items-center gap-4 border-b border-gray-200 py-4"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 text-xl">
                    ✓
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-xl font-black">
                      {visit.customers?.name}
                    </h3>

                    <p className="font-semibold text-gray-600">
                      {formatDate(visit.visit_date)}
                    </p>
                  </div>

                  {visit.customers?.maps_url && (
                    <a
                      href={visit.customers.maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xl"
                    >
                      📍
                    </a>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-7 rounded-3xl bg-blue-950 p-5 text-white">
              <p className="text-sm font-black text-blue-100">
                ΣΥΝΟΛΟ ΕΒΔΟΜΑΔΑΣ
              </p>

              <p className="mt-1 text-4xl font-black text-white">
                {weeklyCompletedVisits.length}
              </p>

              <p className="font-semibold text-blue-100">
                ολοκληρωμένες επισκέψεις
              </p>
            </div>
          </>
        )}
      </div>

      {/* MOBILE BOTTOM NAV */}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto grid max-w-xl grid-cols-4 px-2 py-2">

          <button
            onClick={() => setScreen("home")}
            className={`flex flex-col items-center gap-1 rounded-2xl py-2 ${
              screen === "home"
                ? "bg-gray-100 text-blue-950"
                : "text-gray-500"
            }`}
          >
            <span className="text-xl">⌂</span>
            <span className="text-xs font-black">
              Αρχική
            </span>
          </button>

          <button
            onClick={() => setScreen("customers")}
            className={`flex flex-col items-center gap-1 rounded-2xl py-2 ${
              screen === "customers"
                ? "bg-gray-100 text-blue-950"
                : "text-gray-500"
            }`}
          >
            <span className="text-xl">👥</span>
            <span className="text-xs font-black">
              Πελάτες
            </span>
          </button>

          <button
            onClick={() => setScreen("schedule")}
            className={`flex flex-col items-center gap-1 rounded-2xl py-2 ${
              screen === "schedule"
                ? "bg-gray-100 text-blue-950"
                : "text-gray-500"
            }`}
          >
            <span className="text-xl">📅</span>
            <span className="text-xs font-black">
              Πρόγραμμα
            </span>
          </button>

          <button
            onClick={() => setScreen("history")}
            className={`flex flex-col items-center gap-1 rounded-2xl py-2 ${
              screen === "history"
                ? "bg-gray-100 text-blue-950"
                : "text-gray-500"
            }`}
          >
            <span className="text-xl">🕘</span>
            <span className="text-xs font-black">
              Ιστορικό
            </span>
          </button>

        </div>
      </nav>
    </main>
  );
}