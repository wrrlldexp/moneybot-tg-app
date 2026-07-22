import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getServers, addServer, deleteServer, pingServer, updateServer } from "@/api/endpoints";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useTelegram } from "@/hooks/useTelegram";
import { useState, useCallback } from "react";
import { Plus, Trash2, RefreshCw, Star, Eye, EyeOff, X } from "lucide-react";
import { cn } from "@/components/ui/cn";

type FormErrors = Partial<Record<"name" | "url" | "email" | "password", string>>;

function validateForm(form: { name: string; url: string; email: string; password: string }): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = "Введите название";
  if (!form.url.trim()) {
    errors.url = "Введите URL сервера";
  } else if (!/^https?:\/\/.+/i.test(form.url.trim())) {
    errors.url = "URL должен начинаться с http:// или https://";
  }
  if (!form.email.trim()) {
    errors.email = "Введите email";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Некорректный email";
  }
  if (!form.password.trim()) errors.password = "Введите пароль";
  return errors;
}

export function Servers() {
  const queryClient = useQueryClient();
  const { haptic } = useTelegram();
  const [showAdd, setShowAdd] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({ name: "", url: "", email: "", password: "" });
  const [serverError, setServerError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());

  const { data: servers, isLoading } = useQuery({ queryKey: ["servers"], queryFn: getServers });

  const handleBlur = useCallback((field: string) => {
    setTouched((prev) => new Set(prev).add(field));
    setFieldErrors((prev) => {
      const all = validateForm(form);
      return { ...prev, [field]: all[field as keyof FormErrors] };
    });
  }, [form]);

  const updateField = useCallback((field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear error on type
    if (touched.has(field)) {
      setFieldErrors((prev) => {
        const all = validateForm({ ...form, [field]: value });
        return { ...prev, [field]: all[field] };
      });
    }
  }, [form, touched]);

  const addMut = useMutation({
    mutationFn: () => addServer(form),
    onSuccess: () => {
      haptic?.notificationOccurred("success");
      setShowAdd(false);
      setForm({ name: "", url: "", email: "", password: "" });
      setServerError("");
      setFieldErrors({});
      setTouched(new Set());
      queryClient.invalidateQueries({ queryKey: ["servers"] });
    },
    onError: (e: any) => {
      setServerError(e.response?.data?.detail || "Ошибка подключения");
    },
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

  const handleSubmit = () => {
    const errors = validateForm(form);
    setFieldErrors(errors);
    setTouched(new Set(["name", "url", "email", "password"]));
    if (Object.keys(errors).length === 0) {
      addMut.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 stagger-enter">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Серверы</h1>
        <button
          onClick={() => { setShowAdd(!showAdd); setServerError(""); setFieldErrors({}); setTouched(new Set()); }}
          className={cn(
            "p-2 rounded-lg transition-colors",
            showAdd ? "bg-red-500/10 text-red-400" : "bg-tg-button/10 text-tg-button",
          )}
        >
          {showAdd ? <X size={18} /> : <Plus size={18} />}
        </button>
      </div>

      {showAdd && (
        <Card className="space-y-3 tab-content">
          <FormField
            placeholder="Название (напр. Main Bot)"
            value={form.name}
            onChange={(v) => updateField("name", v)}
            onBlur={() => handleBlur("name")}
            error={touched.has("name") ? fieldErrors.name : undefined}
          />
          <FormField
            placeholder="URL сервера (напр. http://185.198.58.90:8001)"
            value={form.url}
            onChange={(v) => updateField("url", v)}
            onBlur={() => handleBlur("url")}
            error={touched.has("url") ? fieldErrors.url : undefined}
          />
          <FormField
            placeholder="Email от панели бота"
            value={form.email}
            onChange={(v) => updateField("email", v)}
            onBlur={() => handleBlur("email")}
            error={touched.has("email") ? fieldErrors.email : undefined}
            type="email"
          />
          <div>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                placeholder="Пароль от панели бота"
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                onBlur={() => handleBlur("password")}
                className={cn(
                  "w-full px-3 py-2.5 pr-10 rounded-lg bg-white/5 border text-sm outline-none transition-colors focus:border-tg-button",
                  touched.has("password") && fieldErrors.password ? "input-error border-red-500/50" : "border-white/10",
                )}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tg-hint p-1 rounded hover:bg-white/5 transition-colors"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {touched.has("password") && fieldErrors.password && (
              <p className="text-[11px] text-red-400 mt-1 ml-1">{fieldErrors.password}</p>
            )}
          </div>

          {serverError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
              <p className="text-xs text-red-400">{serverError}</p>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            loading={addMut.isPending}
            size="lg"
          >
            Подключить сервер
          </Button>
        </Card>
      )}

      {!servers?.length ? (
        <div className="text-center py-12 text-tg-hint">
          <p>Нет серверов. Добавьте первый торговый бот.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {servers.map((s) => (
            <Card key={s.id} className="!p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {/* Online/offline colored dot */}
                    <span className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      s.last_status === "ok" ? "bg-emerald-400" : s.last_status === "error" ? "bg-red-400" : "bg-zinc-500",
                    )} />
                    <p className="font-medium text-sm truncate">{s.name}</p>
                    {s.is_default && <Star size={12} className="text-amber-400 fill-amber-400 shrink-0" />}
                  </div>
                  <p className="text-xs text-tg-hint truncate mt-0.5 ml-4">{s.url}</p>
                  {s.last_ping_at && (
                    <p className="text-[10px] text-tg-hint ml-4 mt-0.5">
                      Пинг: {new Date(s.last_ping_at).toLocaleString("ru-RU", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                    </p>
                  )}
                </div>
                <StatusBadge status={s.last_status ?? "unknown"} />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => pingMut.mutate(s.id)}
                  loading={pingMut.isPending && pingMut.variables === s.id}
                  className="!px-2.5 !py-1 !rounded-lg bg-white/5"
                >
                  <RefreshCw size={12} /> Пинг
                </Button>
                {!s.is_default && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => defaultMut.mutate(s.id)}
                    className="!px-2.5 !py-1 !rounded-lg bg-white/5"
                  >
                    <Star size={12} /> Основной
                  </Button>
                )}
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => deleteMut.mutate(s.id)}
                  className="!px-2.5 !py-1 !rounded-lg ml-auto"
                >
                  <Trash2 size={12} /> Удалить
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function FormField({
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  type = "text",
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  error?: string;
  type?: string;
}) {
  return (
    <div>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={cn(
          "w-full px-3 py-2.5 rounded-lg bg-white/5 border text-sm outline-none transition-colors focus:border-tg-button",
          error ? "input-error border-red-500/50" : "border-white/10",
        )}
      />
      {error && <p className="text-[11px] text-red-400 mt-1 ml-1">{error}</p>}
    </div>
  );
}
