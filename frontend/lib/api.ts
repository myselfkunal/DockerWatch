const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function apiFetch<T>(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "API error");
  }

  return res.json();
}

// ── Auth ────────────────────────────────────────────────────────────────────

export async function apiLogin(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("Invalid email or password");
  return res.json() as Promise<{ access_token: string }>;
}

export async function apiRegister(email: string, password: string, name: string) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Registration failed" }));
    throw new Error(err.detail);
  }
  return res.json() as Promise<{ access_token: string }>;
}

// ── Workspaces ───────────────────────────────────────────────────────────────

export async function apiGetWorkspaces(token: string) {
  return apiFetch<Workspace[]>("/workspaces/", token);
}

export async function apiCreateServer(token: string, workspaceId: string, name: string) {
  return apiFetch<{ server: Server; api_key: string }>(
    `/workspaces/${workspaceId}/servers`,
    token,
    { method: "POST", body: JSON.stringify({ name }) }
  );
}

// ── Servers + Containers ─────────────────────────────────────────────────────

export async function apiGetServers(token: string, workspaceId: string) {
  return apiFetch<ServerWithContainers[]>(
    `/workspaces/${workspaceId}/servers`,
    token
  );
}

// ── Metrics ──────────────────────────────────────────────────────────────────

export type TimeRange = "1h" | "6h" | "24h" | "7d" | "30d";

export async function apiGetContainerMetrics(
  token: string,
  containerId: string,
  range: TimeRange = "24h"
) {
  return apiFetch<ContainerMetricsResponse>(
    `/containers/${containerId}/metrics?range=${range}`,
    token
  );
}

export async function apiGetContainerSummary(token: string, containerId: string) {
  return apiFetch<ContainerSummary>(`/containers/${containerId}/summary`, token);
}

// ── Cost ─────────────────────────────────────────────────────────────────────

export async function apiGetCost(token: string, workspaceId: string) {
  return apiFetch<CostSummary>(`/workspaces/${workspaceId}/cost`, token);
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  plan: string;
  created_at: string;
}

export interface Server {
  id: string;
  name: string;
  last_seen_at: string | null;
  created_at: string;
}

export interface Container {
  id: string;
  server_id: string;
  docker_id: string;
  name: string;
  image: string;
  last_status: string;
  last_seen_at: string | null;
}

export interface ServerWithContainers extends Server {
  containers: Container[];
}

export interface MetricPoint {
  time: string;
  cpu_percent: number;
  mem_usage_bytes: number;
  mem_limit_bytes: number;
  net_rx_bytes: number;
  net_tx_bytes: number;
  blk_read_bytes: number;
  blk_write_bytes: number;
}

export interface ContainerMetricsResponse {
  container_id: string;
  container_name: string;
  resolution_seconds: number;
  points: MetricPoint[];
}

export interface ContainerSummary {
  avg_cpu_percent: number;
  max_cpu_percent: number;
  avg_mem_bytes: number;
  max_mem_bytes: number;
  mem_limit_bytes: number;
}

export interface ContainerCostEstimate {
  container_id: string;
  container_name: string;
  avg_cpu_percent: number;
  avg_mem_gb: number;
  estimated_instance: string;
  monthly_cost_usd: number;
  is_idle: boolean;
  savings_if_removed_usd: number;
}

export interface CostSummary {
  total_monthly_usd: number;
  total_wasted_usd: number;
  container_count: number;
  idle_container_count: number;
  top_savings: {
    container_name: string;
    reason: string;
    saving_usd: number;
    action: string;
  }[];
  containers: ContainerCostEstimate[];
}