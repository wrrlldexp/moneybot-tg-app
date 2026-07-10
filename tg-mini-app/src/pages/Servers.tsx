import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getServers, addServer, deleteServer, pingServer, updateServer } from "@/api/endpoints";
import { StatusBadge } from "@/components/StatusBadge";
import { useTelegram } from "@/hooks/useTelegram";
import { useState } from "react";
import { Plus, Trash2, RefreshCw, Star } from "lucide-react";

export function Servers() {
  const queryClient = useQueryClient();
  const { haptic } = useTelegram();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", url: "", api_token: "" });

  const { data: servers, isLoading } = useQuery({ queryKey: ["servers"], queryFn: getServers });

  const addMut = useMutation({
    mutationFn: () => addServer({ name: form.name, url: form.url, api_token: form.api_token || undefined }),
    onSuccess: () => { haptic?.notificationOccurred("success"); setShowAdd(false); setForm({ name: "", url: "", api_token: "" }); queryClient.invalidateQueries({ queryKey: ["servers"] }); },
  });

  const deleteMut = useMutation({
    mutationFn: deleteServer,
    onSuccess: () => { haptic?.notificationOccurred("warning"); queryClient.invalidateQueries({ queryKey: ["servers"] }); },
  });

  const pingMut = useMutation({
    mutationFn: pingServer,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["servers"] }),
  });

  const defaultMut = useMutation({
    mutationFn: (id: number) => updateServer(id, { is_default: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["servers"] }),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-tg-button border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Servers</h1>
        <button onClick={() => setShowAdd(!showAdd)} className="p-2 rounded-lg bg-tg-button/10 text-tg-button"><Plus size={18} /></button>
      </div>

      {showAdd && (
        <div className="rounded-xl bg-tg-secondary p-4 border border-white/5 space-y-3">
          <input placeholder="Name (e.g. Main Bot)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm outline-none focus:border-tg-button" />
          <input placeholder="URL (e.g. http://185.198.58.90:8001)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm outline-none focus:border-tg-button" />
          <input placeholder="API Token (optional)" value={form.api_token} onChange={(e) => setForm({ ...form, api_token: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm outline-none focus:border-tg-button" />
          <button onClick={() => addMut.mutate()} disabled={!form.name || !form.url || addMut.isPending}
            className="w-full py-2.5 rounded-lg bg-tg-button text-tg-button-text text-sm font-medium disabled:opacity-50">
            {addMut.isPending ? "Adding..." : "Add Server"}
          </button>
        </div>
      )}

      {!servers?.length ? (
        <p className="text-center py-12 text-tg-hint">No servers yet. Add your first trading bot.</p>
      ) : (
        <div className="space-y-2">
          {servers.map((s) => (
            <div key={s.id} className="rounded-xl bg-tg-secondary p-3 border border-white/5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-sm">{s.name}</p>
                    {s.is_default && <Star size={12} className="text-amber-400 fill-amber-400" />}
                  </div>
                  <p className="text-xs text-tg-hint truncate max-w-[200px]">{s.url}</p>
                </div>
                <StatusBadge status={s.last_status ?? "unknown"} />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <button onClick={() => pingMut.mutate(s.id)} className="px-2.5 py-1 rounded-lg bg-white/5 text-xs text-tg-hint flex items-center gap-1">
                  <RefreshCw size={12} /> Ping
                </button>
                {!s.is_default && (
                  <button onClick={() => defaultMut.mutate(s.id)} className="px-2.5 py-1 rounded-lg bg-white/5 text-xs text-tg-hint flex items-center gap-1">
                    <Star size={12} /> Default
                  </button>
                )}
                <button onClick={() => deleteMut.mutate(s.id)} className="px-2.5 py-1 rounded-lg bg-red-500/10 text-xs text-red-400 flex items-center gap-1 ml-auto">
                  <Trash2 size={12} /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
