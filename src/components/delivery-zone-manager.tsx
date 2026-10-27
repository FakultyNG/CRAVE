"use client";

import { useEffect, useState, type FormEvent } from "react";
import { MapPinned, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { formatNaira } from "@/lib/utils";

type Location = { id: string; name: string; city: string; status: string };
type DeliveryZone = {
  id: string;
  name: string;
  slug: string;
  feeKobo: number;
  minimumOrderKobo: number;
  estimatedMinutes: number;
  isActive: boolean;
  location: Location;
  _count: { orders: number };
};

type ApiError = { error?: { message?: string } };
const inputClass = "min-h-11 w-full rounded-xl border border-black/10 bg-white px-3 outline-none focus:border-crave-orange";

function apiError(body: ApiError, fallback: string) {
  return body.error?.message ?? fallback;
}

function zonePayload(data: FormData) {
  return {
    name: String(data.get("name")),
    slug: String(data.get("slug")),
    locationId: String(data.get("locationId")),
    feeKobo: Math.round(Number(data.get("fee")) * 100),
    minimumOrderKobo: Math.round(Number(data.get("minimumOrder")) * 100),
    estimatedMinutes: Number(data.get("estimatedMinutes")),
    isActive: data.get("isActive") === "on",
  };
}

export function DeliveryZoneManager() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    const response = await fetch("/api/v1/admin/delivery-zones");
    const body = await response.json();
    if (!response.ok) throw new Error(apiError(body, "Delivery areas could not be loaded."));
    setZones(body.zones);
    setLocations(body.locations);
  }

  useEffect(() => {
    let active = true;
    fetch("/api/v1/admin/delivery-zones")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(apiError(body, "Delivery areas could not be loaded."));
        if (active) {
          setZones(body.zones);
          setLocations(body.locations);
        }
      })
      .catch((reason) => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, []);

  async function submit(url: string, method: "POST" | "PATCH", data: FormData) {
    const response = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(zonePayload(data)),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(apiError(body, "Delivery area could not be saved."));
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true); setError(""); setNotice("");
    try {
      await submit("/api/v1/admin/delivery-zones", "POST", new FormData(form));
      form.reset();
      await load();
      setNotice("Delivery area created and checkout has been updated.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Delivery area could not be created.");
    } finally {
      setBusy(false);
    }
  }

  async function update(event: FormEvent<HTMLFormElement>, zone: DeliveryZone) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      await submit(`/api/v1/admin/delivery-zones/${zone.id}`, "PATCH", new FormData(event.currentTarget));
      await load();
      setEditingId(null);
      setNotice(`${zone.name} was updated.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Delivery area could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(zone: DeliveryZone) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/v1/admin/delivery-zones/${zone.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isActive: !zone.isActive }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(apiError(body, "Availability could not be changed."));
      await load();
      setNotice(`${zone.name} is now ${zone.isActive ? "unavailable" : "available"} at checkout.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Availability could not be changed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(zone: DeliveryZone) {
    if (!window.confirm(`Delete ${zone.name}? Areas used by past orders will be deactivated instead.`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/v1/admin/delivery-zones/${zone.id}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) throw new Error(apiError(body, "Delivery area could not be deleted."));
      await load();
      setEditingId(null);
      setNotice(body.archived ? `${zone.name} was deactivated because it has order history.` : `${zone.name} was deleted.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Delivery area could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="space-y-5">
    <div className="rounded-2xl bg-crave-cream p-5 text-sm leading-6 text-crave-muted"><strong className="text-crave-ink">Checkout uses these records live.</strong> Inactive areas disappear from customer checkout immediately. Amounts are entered in naira.</div>
    {error && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</p>}
    <div className="grid gap-7 xl:grid-cols-[1fr_360px]">
      <section className="space-y-3">
        {zones.length === 0 && <div className="rounded-[1.7rem] bg-white p-8 text-center text-crave-muted">No delivery areas yet. Create the first one.</div>}
        {zones.map((zone) => <article key={zone.id} className="rounded-[1.7rem] bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-bold">{zone.name}</h2><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${zone.isActive ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{zone.isActive ? "ACTIVE" : "INACTIVE"}</span></div>
              <p className="mt-1 text-sm text-crave-muted">{zone.location.name} · {formatNaira(zone.feeKobo)} delivery · {zone.estimatedMinutes} min</p>
              <p className="mt-1 text-xs text-crave-muted">Minimum {formatNaira(zone.minimumOrderKobo)} · {zone._count.orders} order{zone._count.orders === 1 ? "" : "s"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => void toggle(zone)} className="min-h-10 rounded-full border border-black/10 px-4 text-sm font-bold disabled:opacity-50">{zone.isActive ? "Deactivate" : "Activate"}</button>
              <button type="button" disabled={busy} onClick={() => setEditingId((current) => current === zone.id ? null : zone.id)} className="flex min-h-10 items-center gap-2 rounded-full border border-black/10 px-4 text-sm font-bold disabled:opacity-50"><Pencil size={15} /> Edit</button>
              <button type="button" disabled={busy} onClick={() => void remove(zone)} className="flex min-h-10 items-center gap-2 rounded-full bg-red-50 px-4 text-sm font-bold text-red-700 disabled:opacity-50"><Trash2 size={15} /> Delete</button>
            </div>
          </div>
          {editingId === zone.id && <ZoneForm zone={zone} locations={locations} busy={busy} onCancel={() => setEditingId(null)} onSubmit={(event) => void update(event, zone)} />}
        </article>)}
      </section>
      <form onSubmit={create} className="h-fit space-y-4 rounded-[2rem] bg-crave-ink p-6 text-white xl:sticky xl:top-8">
        <MapPinned className="text-crave-orange" />
        <h2 className="text-2xl font-bold">New delivery area</h2>
        <DarkField name="name" label="Area name" placeholder="Ajah" />
        <DarkField name="slug" label="URL slug" placeholder="ajah" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" />
        <DarkSelect locations={locations} />
        <DarkField name="fee" label="Delivery fee (₦)" placeholder="2500" type="number" min="0" step="0.01" />
        <DarkField name="minimumOrder" label="Minimum order (₦)" placeholder="5000" type="number" min="0" step="0.01" />
        <DarkField name="estimatedMinutes" label="Estimated minutes" placeholder="60" type="number" min="1" max="600" />
        <label className="flex items-center gap-2 text-sm"><input name="isActive" type="checkbox" defaultChecked className="size-4 accent-crave-orange" /> Available at checkout</label>
        <button disabled={busy || locations.length === 0} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-crave-orange font-bold disabled:opacity-50"><Plus size={17} /> {busy ? "Saving…" : "Create area"}</button>
      </form>
    </div>
  </div>;
}

function ZoneForm({ zone, locations, busy, onCancel, onSubmit }: { zone: DeliveryZone; locations: Location[]; busy: boolean; onCancel: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <form onSubmit={onSubmit} className="mt-5 grid gap-4 rounded-2xl border border-black/10 bg-crave-cream/35 p-4 sm:grid-cols-2">
    <h3 className="text-lg font-bold sm:col-span-2">Edit delivery area</h3>
    <LightField name="name" label="Area name" defaultValue={zone.name} />
    <LightField name="slug" label="URL slug" defaultValue={zone.slug} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" />
    <label className="block"><span className="mb-1.5 block text-xs font-bold text-crave-muted">Business location</span><select required name="locationId" defaultValue={zone.location.id} className={inputClass}>{locations.map((location) => <option key={location.id} value={location.id}>{location.name} · {location.city}</option>)}</select></label>
    <LightField name="estimatedMinutes" label="Estimated minutes" defaultValue={zone.estimatedMinutes} type="number" min="1" max="600" />
    <LightField name="fee" label="Delivery fee (₦)" defaultValue={zone.feeKobo / 100} type="number" min="0" step="0.01" />
    <LightField name="minimumOrder" label="Minimum order (₦)" defaultValue={zone.minimumOrderKobo / 100} type="number" min="0" step="0.01" />
    <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2"><input name="isActive" type="checkbox" defaultChecked={zone.isActive} className="size-4 accent-crave-red" /> Available at checkout</label>
    <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" disabled={busy} onClick={onCancel} className="flex min-h-10 items-center gap-2 rounded-full border border-black/10 px-4 text-sm font-bold"><X size={15} /> Cancel</button><button disabled={busy} className="flex min-h-10 items-center gap-2 rounded-full bg-crave-red px-5 text-sm font-bold text-white disabled:opacity-50"><Save size={15} /> {busy ? "Saving…" : "Save changes"}</button></div>
  </form>;
}

type FieldProps = { name: string; label: string; placeholder?: string; defaultValue?: string | number; type?: string; pattern?: string; min?: string; max?: string; step?: string };

function DarkField({ label, ...props }: FieldProps) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-white/65">{label}</span><input required {...props} aria-label={label} className="min-h-11 w-full rounded-xl border border-white/15 bg-white/8 px-3" /></label>;
}

function LightField({ label, ...props }: FieldProps) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-crave-muted">{label}</span><input required {...props} aria-label={label} className={inputClass} /></label>;
}

function DarkSelect({ locations }: { locations: Location[] }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-white/65">Business location</span><select required name="locationId" className="min-h-11 w-full rounded-xl border border-white/15 bg-white/8 px-3"><option value="" className="text-black">Choose location</option>{locations.map((location) => <option key={location.id} value={location.id} className="text-black">{location.name} · {location.city}</option>)}</select></label>;
}
