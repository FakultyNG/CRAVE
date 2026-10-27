"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { upload } from "@vercel/blob/client";
import { ImagePlus, PackagePlus, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { formatNaira } from "@/lib/utils";

type Category = { id: string; name: string; slug: string };
type ProductVariant = { id: string; name: string; sku: string | null; priceDeltaKobo: number; isActive: boolean; position: number };
type ProductOption = { id: string; name: string; groupName: string; priceDeltaKobo: number; isRequired: boolean; maxSelections: number; position: number };
type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  basePriceKobo: number;
  status: string;
  preparationMins: number | null;
  allergens: string[];
  isFeatured: boolean;
  category: Category;
  media: { id: string; type: string; url: string }[];
  variants: ProductVariant[];
  options: ProductOption[];
};

const statuses = ["DRAFT", "ACTIVE", "UNAVAILABLE", "ARCHIVED"];

function errorMessage(body: { error?: { message?: string } }, fallback: string) {
  return body.error?.message ?? fallback;
}

export function ProductManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/v1/admin/products");
    const body = await response.json();
    if (!response.ok) throw new Error(errorMessage(body, "Products could not be loaded."));
    setProducts(body.products);
    setCategories(body.categories);
  }

  useEffect(() => {
    let active = true;
    fetch("/api/v1/admin/products")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(errorMessage(body, "Products could not be loaded."));
        if (active) {
          setProducts(body.products);
          setCategories(body.categories);
        }
      })
      .catch((reason) => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const response = await fetch("/api/v1/admin/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: String(data.get("name")),
          slug: String(data.get("slug")),
          categorySlug: String(data.get("categorySlug")),
          description: String(data.get("description")),
          basePriceKobo: Math.round(Number(data.get("price")) * 100),
          preparationMins: Number(data.get("preparationMins")),
          status: "DRAFT",
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(errorMessage(body, "Product could not be created."));
      form.reset();
      await load();
      setNotice("Draft product created.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Product could not be created.");
    } finally {
      setBusy(false);
    }
  }

  async function update(event: FormEvent<HTMLFormElement>, product: Product) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/v1/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: String(data.get("name")),
          slug: String(data.get("slug")),
          categorySlug: String(data.get("categorySlug")),
          description: String(data.get("description")),
          basePriceKobo: Math.round(Number(data.get("price")) * 100),
          preparationMins: Number(data.get("preparationMins")),
          allergens: String(data.get("allergens")).split(",").map((item) => item.trim()).filter(Boolean),
          isFeatured: data.get("isFeatured") === "on",
          status: String(data.get("status")),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(errorMessage(body, "Product changes could not be saved."));
      await load();
      setEditingId(null);
      setNotice(`${product.name} was updated.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Product changes could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(product: Product, status: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/v1/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(errorMessage(body, "Status could not be changed."));
      setProducts((current) => current.map((item) => item.id === product.id ? { ...item, status } : item));
      setNotice(`${product.name} status changed to ${status.toLowerCase()}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Status could not be changed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(product: Product) {
    if (!window.confirm(`Delete ${product.name}? Products used in past orders will be archived instead to preserve order history.`)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/v1/admin/products/${product.id}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) throw new Error(errorMessage(body, "Product could not be deleted."));
      await load();
      setEditingId(null);
      setNotice(body.archived ? `${product.name} has order history, so it was archived.` : `${product.name} was permanently deleted.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Product could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  async function media(product: Product, file: File) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/v1/admin/media/upload",
        clientPayload: JSON.stringify({ productId: product.id, altText: `${product.name} by Crave` }),
      });
      await load();
      setNotice(`Media added to ${product.name}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="space-y-5">
    {error && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</p>}
    <div className="grid gap-7 xl:grid-cols-[1fr_360px]">
      <section className="space-y-3">
        {products.map((product) => <article key={product.id} className="rounded-[1.7rem] bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-bold">{product.name}</h2>
                <span className="rounded-full bg-crave-cream px-2.5 py-1 text-[10px] font-bold">{product.status}</span>
                {product.isFeatured && <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-bold text-orange-800">FEATURED</span>}
              </div>
              <p className="mt-1 text-sm text-crave-muted">{product.category.name} · {formatNaira(product.basePriceKobo)} · {product.preparationMins ?? "—"} min · {product.media.length} media</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select disabled={busy} aria-label={`Status for ${product.name}`} value={product.status} onChange={(event) => void setStatus(product, event.target.value)} className="min-h-10 rounded-full border border-black/10 px-3 text-sm disabled:opacity-50">{statuses.map((status) => <option key={status}>{status}</option>)}</select>
              <button type="button" disabled={busy} onClick={() => setEditingId((current) => current === product.id ? null : product.id)} className="flex min-h-10 items-center gap-2 rounded-full border border-black/10 px-4 text-sm font-bold disabled:opacity-50"><Pencil size={15} /> Edit</button>
              <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-full bg-crave-ink px-4 text-sm font-bold text-white"><ImagePlus size={15} /> Add media<input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void media(product, file); event.currentTarget.value = ""; }} /></label>
              <button type="button" disabled={busy} onClick={() => void remove(product)} className="flex min-h-10 items-center gap-2 rounded-full bg-red-50 px-4 text-sm font-bold text-red-700 disabled:opacity-50"><Trash2 size={15} /> Delete</button>
            </div>
          </div>
          <p className="mt-4 line-clamp-2 text-sm leading-6 text-crave-muted">{product.description}</p>
          {editingId === product.id && <div><EditProductForm product={product} categories={categories} busy={busy} onCancel={() => setEditingId(null)} onSubmit={(event) => void update(event, product)} /><ProductConfiguration product={product} onChanged={load} /></div>}
        </article>)}
      </section>
      <form onSubmit={create} className="h-fit space-y-4 rounded-[2rem] bg-crave-ink p-6 text-white xl:sticky xl:top-8">
        <PackagePlus className="text-crave-orange" />
        <h2 className="text-2xl font-bold">New product</h2>
        <TextField name="name" label="Name" placeholder="Crave special" />
        <TextField name="slug" label="URL slug" placeholder="crave-special" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" />
        <label className="block"><span className="mb-1.5 block text-xs font-bold text-white/65">Category</span><select required name="categorySlug" className="min-h-11 w-full rounded-xl border border-white/15 bg-white/8 px-3">{categories.map((category) => <option key={category.id} value={category.slug} className="text-black">{category.name}</option>)}</select></label>
        <TextField name="price" label="Price in naira" placeholder="5000" type="number" min="0" step="0.01" />
        <TextField name="preparationMins" label="Preparation minutes" placeholder="15" type="number" min="1" max="240" />
        <label className="block"><span className="mb-1.5 block text-xs font-bold text-white/65">Description</span><textarea required name="description" rows={4} minLength={10} className="w-full rounded-xl border border-white/15 bg-white/8 p-3" /></label>
        <button disabled={busy} className="min-h-12 w-full rounded-full bg-crave-orange font-bold disabled:opacity-50">{busy ? "Working…" : "Create draft"}</button>
      </form>
    </div>
  </div>;
}

function EditProductForm({ product, categories, busy, onCancel, onSubmit }: { product: Product; categories: Category[]; busy: boolean; onCancel: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <form onSubmit={onSubmit} className="mt-5 grid gap-4 rounded-2xl border border-black/10 bg-crave-cream/35 p-4 sm:grid-cols-2">
    <h3 className="text-lg font-bold sm:col-span-2">Edit product</h3>
    <EditField name="name" label="Name" defaultValue={product.name} />
    <EditField name="slug" label="URL slug" defaultValue={product.slug} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" />
    <label className="block"><span className="mb-1.5 block text-xs font-bold text-crave-muted">Category</span><select required name="categorySlug" defaultValue={product.category.slug} className="min-h-11 w-full rounded-xl border border-black/10 bg-white px-3">{categories.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}</select></label>
    <label className="block"><span className="mb-1.5 block text-xs font-bold text-crave-muted">Status</span><select required name="status" defaultValue={product.status} className="min-h-11 w-full rounded-xl border border-black/10 bg-white px-3">{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
    <EditField name="price" label="Price in naira" defaultValue={product.basePriceKobo / 100} type="number" min="0" step="0.01" />
    <EditField name="preparationMins" label="Preparation minutes" defaultValue={product.preparationMins ?? 15} type="number" min="1" max="240" />
    <label className="block sm:col-span-2"><span className="mb-1.5 block text-xs font-bold text-crave-muted">Allergens <span className="font-normal">(comma separated)</span></span><input name="allergens" defaultValue={product.allergens.join(", ")} placeholder="Milk, nuts" className="min-h-11 w-full rounded-xl border border-black/10 bg-white px-3" /></label>
    <label className="block sm:col-span-2"><span className="mb-1.5 block text-xs font-bold text-crave-muted">Description</span><textarea required name="description" defaultValue={product.description} rows={4} minLength={10} className="w-full rounded-xl border border-black/10 bg-white p-3" /></label>
    <label className="flex items-center gap-3 text-sm font-semibold sm:col-span-2"><input name="isFeatured" type="checkbox" defaultChecked={product.isFeatured} className="size-4 accent-crave-red" /> Feature this product on the storefront</label>
    <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
      <button type="button" disabled={busy} onClick={onCancel} className="flex min-h-10 items-center gap-2 rounded-full border border-black/10 px-4 text-sm font-bold disabled:opacity-50"><X size={15} /> Cancel</button>
      <button disabled={busy} className="flex min-h-10 items-center gap-2 rounded-full bg-crave-red px-5 text-sm font-bold text-white disabled:opacity-50"><Save size={15} /> {busy ? "Saving…" : "Save changes"}</button>
    </div>
  </form>;
}

type FieldProps = { name: string; label: string; placeholder?: string; defaultValue?: string | number; type?: string; pattern?: string; min?: string; max?: string; step?: string };

function TextField({ label, ...inputProps }: FieldProps) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-white/65">{label}</span><input required {...inputProps} aria-label={label} className="min-h-11 w-full rounded-xl border border-white/15 bg-white/8 px-3" /></label>;
}

function EditField({ label, ...inputProps }: FieldProps) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-crave-muted">{label}</span><input required {...inputProps} aria-label={label} className="min-h-11 w-full rounded-xl border border-black/10 bg-white px-3" /></label>;
}

function ProductConfiguration({ product, onChanged }: { product: Product; onChanged: () => Promise<void> }) {
  const [editingVariant, setEditingVariant] = useState<string | null>(null);
  const [editingOption, setEditingOption] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function request(url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) {
    const response = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    const payload = await response.json();
    if (!response.ok) throw new Error(errorMessage(payload, "The product configuration could not be changed."));
  }

  async function saveVariant(event: FormEvent<HTMLFormElement>, variant?: ProductVariant) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const form = event.currentTarget; const data = new FormData(form);
    try {
      await request(`/api/v1/admin/products/${product.id}/variants${variant ? `/${variant.id}` : ""}`, variant ? "PATCH" : "POST", {
        name: String(data.get("name")), sku: String(data.get("sku")).trim() || null,
        priceDeltaKobo: Math.round(Number(data.get("priceDelta")) * 100), isActive: data.get("isActive") === "on", position: Number(data.get("position")),
      });
      if (!variant) form.reset(); setEditingVariant(null); await onChanged(); setMessage(variant ? "Variant updated." : "Variant created.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Variant could not be saved."); }
    finally { setBusy(false); }
  }

  async function saveOption(event: FormEvent<HTMLFormElement>, option?: ProductOption) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const form = event.currentTarget; const data = new FormData(form);
    try {
      await request(`/api/v1/admin/products/${product.id}/options${option ? `/${option.id}` : ""}`, option ? "PATCH" : "POST", {
        name: String(data.get("name")), groupName: String(data.get("groupName")), priceDeltaKobo: Math.round(Number(data.get("priceDelta")) * 100),
        isRequired: data.get("isRequired") === "on", maxSelections: Number(data.get("maxSelections")), position: Number(data.get("position")),
      });
      if (!option) form.reset(); setEditingOption(null); await onChanged(); setMessage(option ? "Option updated." : "Option created.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Option could not be saved."); }
    finally { setBusy(false); }
  }

  async function remove(kind: "variants" | "options", id: string, name: string) {
    if (!window.confirm(`Delete ${name}? It will also be removed from any active carts.`)) return;
    setBusy(true); setError(""); setMessage("");
    try { await request(`/api/v1/admin/products/${product.id}/${kind}/${id}`, "DELETE"); await onChanged(); setMessage(`${name} was deleted.`); }
    catch (reason) { setError(reason instanceof Error ? reason.message : `${name} could not be deleted.`); }
    finally { setBusy(false); }
  }

  return <section className="mt-5 rounded-2xl border border-black/10 p-4">
    <div className="mb-5"><h3 className="text-lg font-bold">Sizes, blends & extras</h3><p className="text-xs text-crave-muted">Price adjustments are entered in naira. Lower display positions appear first.</p></div>
    {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
    {message && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p>}
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h4 className="mb-3 font-bold">Sizes / variants</h4>
        <div className="space-y-2">{product.variants.map((variant) => editingVariant === variant.id
          ? <VariantForm key={variant.id} variant={variant} busy={busy} onCancel={() => setEditingVariant(null)} onSubmit={(event) => void saveVariant(event, variant)} />
          : <div key={variant.id} className="flex items-center justify-between gap-3 rounded-xl bg-crave-cream/60 p-3"><div><strong className="text-sm">{variant.name}</strong><p className="text-xs text-crave-muted">{variant.priceDeltaKobo ? `+${formatNaira(variant.priceDeltaKobo)}` : "Included"} · position {variant.position} · {variant.isActive ? "active" : "inactive"}{variant.sku ? ` · ${variant.sku}` : ""}</p></div><div className="flex gap-1"><IconButton label={`Edit ${variant.name}`} onClick={() => setEditingVariant(variant.id)}><Pencil size={14} /></IconButton><IconButton label={`Delete ${variant.name}`} danger onClick={() => void remove("variants", variant.id, variant.name)}><Trash2 size={14} /></IconButton></div></div>)}</div>
        <VariantForm busy={busy} onSubmit={(event) => void saveVariant(event)} />
      </div>
      <div>
        <h4 className="mb-3 font-bold">Blends / extras</h4>
        <div className="space-y-2">{product.options.map((option) => editingOption === option.id
          ? <OptionForm key={option.id} option={option} busy={busy} onCancel={() => setEditingOption(null)} onSubmit={(event) => void saveOption(event, option)} />
          : <div key={option.id} className="flex items-center justify-between gap-3 rounded-xl bg-crave-cream/60 p-3"><div><strong className="text-sm">{option.name}</strong><p className="text-xs text-crave-muted">{option.groupName} · {option.priceDeltaKobo ? `+${formatNaira(option.priceDeltaKobo)}` : "Included"} · max {option.maxSelections}{option.isRequired ? " · required" : ""}</p></div><div className="flex gap-1"><IconButton label={`Edit ${option.name}`} onClick={() => setEditingOption(option.id)}><Pencil size={14} /></IconButton><IconButton label={`Delete ${option.name}`} danger onClick={() => void remove("options", option.id, option.name)}><Trash2 size={14} /></IconButton></div></div>)}</div>
        <OptionForm busy={busy} onSubmit={(event) => void saveOption(event)} />
      </div>
    </div>
  </section>;
}

function VariantForm({ variant, busy, onCancel, onSubmit }: { variant?: ProductVariant; busy: boolean; onCancel?: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <form onSubmit={onSubmit} className="mt-3 grid gap-2 rounded-xl border border-black/10 p-3 sm:grid-cols-2">
    <ConfigField name="name" label="Name" placeholder="Large" defaultValue={variant?.name} />
    <ConfigField name="sku" label="SKU (optional)" placeholder="SMOOTHIE-L" defaultValue={variant?.sku ?? ""} required={false} />
    <ConfigField name="priceDelta" label="Extra price (₦)" type="number" min="0" step="0.01" defaultValue={(variant?.priceDeltaKobo ?? 0) / 100} />
    <ConfigField name="position" label="Display position" type="number" min="0" defaultValue={variant?.position ?? 0} />
    <label className="flex items-center gap-2 text-xs font-semibold sm:col-span-2"><input name="isActive" type="checkbox" defaultChecked={variant?.isActive ?? true} /> Available to customers</label>
    <div className="flex justify-end gap-2 sm:col-span-2">{onCancel && <button type="button" onClick={onCancel} className="rounded-full border border-black/10 px-3 py-2 text-xs font-bold">Cancel</button>}<button disabled={busy} className="flex items-center gap-1 rounded-full bg-crave-ink px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{variant ? <Save size={13} /> : <Plus size={13} />}{variant ? "Save variant" : "Add variant"}</button></div>
  </form>;
}

function OptionForm({ option, busy, onCancel, onSubmit }: { option?: ProductOption; busy: boolean; onCancel?: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <form onSubmit={onSubmit} className="mt-3 grid gap-2 rounded-xl border border-black/10 p-3 sm:grid-cols-2">
    <ConfigField name="name" label="Option name" placeholder="Mango sunshine" defaultValue={option?.name} />
    <ConfigField name="groupName" label="Group name" placeholder="Choose a blend" defaultValue={option?.groupName} />
    <ConfigField name="priceDelta" label="Extra price (₦)" type="number" min="0" step="0.01" defaultValue={(option?.priceDeltaKobo ?? 0) / 100} />
    <ConfigField name="maxSelections" label="Maximum selections" type="number" min="1" max="20" defaultValue={option?.maxSelections ?? 1} />
    <ConfigField name="position" label="Display position" type="number" min="0" defaultValue={option?.position ?? 0} />
    <label className="flex items-center gap-2 self-end pb-3 text-xs font-semibold"><input name="isRequired" type="checkbox" defaultChecked={option?.isRequired ?? false} /> Group is required</label>
    <p className="text-[11px] text-crave-muted sm:col-span-2">Required and maximum selection settings apply to every option sharing this group name.</p>
    <div className="flex justify-end gap-2 sm:col-span-2">{onCancel && <button type="button" onClick={onCancel} className="rounded-full border border-black/10 px-3 py-2 text-xs font-bold">Cancel</button>}<button disabled={busy} className="flex items-center gap-1 rounded-full bg-crave-ink px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{option ? <Save size={13} /> : <Plus size={13} />}{option ? "Save option" : "Add option"}</button></div>
  </form>;
}

function ConfigField({ label, required = true, ...props }: FieldProps & { required?: boolean }) {
  return <label className="block"><span className="mb-1 block text-[11px] font-bold text-crave-muted">{label}</span><input required={required} {...props} className="min-h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm" /></label>;
}

function IconButton({ label, danger = false, onClick, children }: { label: string; danger?: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" aria-label={label} onClick={onClick} className={`grid size-9 place-items-center rounded-full ${danger ? "bg-red-50 text-red-700" : "bg-white"}`}>{children}</button>;
}
