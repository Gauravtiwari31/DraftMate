const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const API_BASE = BASE;

async function request(path, opts = {}, timeoutMs = null) {
  const controller = new AbortController();
  const timer = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const res = await fetch(BASE + path, { ...opts, signal: controller.signal });
    if (res.status === 429) {
      let retryAfter = 30;
      try { retryAfter = (await res.json()).retry_after || 30; } catch {}
      return { status: 429, retryAfter };
    }
    if (res.status === 204) return { status: 204, data: null };
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("json")) return { status: res.status, data: await res.json() };
    return { status: res.status, data: res };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// GET/POST with one automatic retry after retry_after on 429.
export async function get(path, { signal } = {}) {
  let r = await request(path, { signal });
  if (r.status === 429) {
    await new Promise((ok) => setTimeout(ok, r.retryAfter * 1000));
    r = await request(path, { signal });
  }
  if (r.status === 429) throw new Error("busy");
  if (r.status >= 400) throw new Error((r.data && r.data.detail) || `HTTP ${r.status}`);
  return r.data;
}

export async function post(path, body) {
  let r = await request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (r.status === 429) {
    await new Promise((ok) => setTimeout(ok, r.retryAfter * 1000));
    r = await request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }
  if (r.status === 429) throw new Error("busy");
  if (r.status >= 400) throw new Error((r.data && r.data.error) || (r.data && r.data.detail) || `HTTP ${r.status}`);
  return r.data;
}

export async function postForm(path, formData) {
  let r = await request(path, { method: "POST", body: formData });
  if (r.status >= 400) {
    const msg = (r.data && r.data.detail) || `HTTP ${r.status}`;
    throw new Error(msg);
  }
  return r.data;
}

// /export returns raw bytes
export async function postExport(body) {
  const res = await fetch(BASE + "/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try { detail = (await res.json()).detail || detail; } catch {}
    throw new Error(detail);
  }
  return res.blob();
}

// health with 3s timeout; caller shows "Waking server..." loader
export async function health() {
  return request("/health", {}, 3000);
}
