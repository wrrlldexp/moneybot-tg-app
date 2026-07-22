import { useQuery, useMutation } from "@tanstack/react-query";
import { getAccounts, getAccountBalances, testAccount } from "@/api/endpoints";
import { useServerStore } from "@/stores/serverStore";
import { useTelegram } from "@/hooks/useTelegram";
import { Wallet, CheckCircle, XCircle, RefreshCw, Coins } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";

interface Currency {
  currency: string;
  total: string;
  free: string;
  used: string;
}

interface AccountBalance {
  account_id: string;
  name: string;
  exchange: string;
  testnet: boolean;
  currencies: Currency[];
}

export function Accounts() {
  const serverId = useServerStore((s) => s.activeServerId);
  const { haptic } = useTelegram();

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["accounts", serverId],
    queryFn: () => getAccounts(serverId!),
    enabled: !!serverId,
  });

  const { data: balances } = useQuery<AccountBalance[]>({
    queryKey: ["balances", serverId],
    queryFn: () => getAccountBalances(serverId!),
    enabled: !!serverId,
  });

  const testMut = useMutation({
    mutationFn: (accountId: string) => testAccount(serverId!, accountId),
    onSuccess: () => haptic?.notificationOccurred("success"),
    onError: () => haptic?.notificationOccurred("error"),
  });

  if (!serverId) return <p className="text-center py-16 text-tg-hint">Выберите сервер</p>;
  if (isLoading) return <LoadingSkeleton />;

  const accs = Array.isArray(accounts) ? accounts : [];
  const bals = Array.isArray(balances) ? balances : [];

  // Build balance map: account_id -> currencies
  const balanceMap = new Map<string, Currency[]>();
  for (const b of bals) {
    balanceMap.set(b.account_id, b.currencies ?? []);
  }

  return (
    <div className="space-y-4 stagger-enter">
      <div className="flex items-center gap-2">
        <Wallet size={20} className="text-tg-accent" />
        <h1 className="text-xl font-bold">Аккаунты</h1>
      </div>

      {!accs.length ? (
        <p className="text-center py-12 text-tg-hint">Нет аккаунтов</p>
      ) : (
        <div className="space-y-3">
          {accs.map((a: any) => {
            const currencies = balanceMap.get(a.id) ?? [];
            // Filter out zero-balance currencies
            const nonZero = currencies.filter((c) => parseFloat(c.total) > 0.000001);

            return (
              <Card key={a.id}>
                {/* Account header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{a.name || a.exchange}</p>
                    <Badge variant={a.is_active ? "success" : "error"}>
                      {a.is_active ? "Активен" : "Неактивен"}
                    </Badge>
                    {a.is_testnet && (
                      <Badge variant="warning">Testnet</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {a.is_active ? (
                      <CheckCircle size={14} className="text-emerald-400" />
                    ) : (
                      <XCircle size={14} className="text-red-400" />
                    )}
                  </div>
                </div>

                {/* Balances */}
                {nonZero.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Coins size={12} className="text-tg-hint" />
                      <p className="text-xs text-tg-hint font-medium">Балансы</p>
                    </div>
                    <div className="space-y-1.5">
                      {nonZero.map((c) => {
                        const total = parseFloat(c.total);
                        const free = parseFloat(c.free);
                        const used = parseFloat(c.used);
                        return (
                          <div key={c.currency} className="flex items-center justify-between text-sm px-2 py-1.5 rounded-lg bg-white/[0.03]">
                            <span className="font-medium text-tg-text">{c.currency}</span>
                            <div className="text-right">
                              <span className="font-semibold tabular-nums">{formatBalance(total)}</span>
                              {used > 0.000001 && (
                                <span className="text-[10px] text-tg-hint ml-1.5">
                                  ({formatBalance(free)} своб.)
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {nonZero.length === 0 && currencies.length === 0 && (
                  <p className="text-xs text-tg-hint mb-3">Баланс не загружен</p>
                )}

                {/* Test button */}
                <button
                  onClick={() => testMut.mutate(a.id)}
                  disabled={testMut.isPending}
                  className="px-3 py-1.5 rounded-lg bg-white/5 text-xs text-tg-hint flex items-center gap-1.5 hover:bg-white/10 transition-colors"
                >
                  <RefreshCw size={12} className={testMut.isPending ? "animate-spin" : ""} />
                  Тест подключения
                </button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatBalance(val: number): string {
  if (val >= 1000) return val.toFixed(2);
  if (val >= 1) return val.toFixed(4);
  if (val >= 0.0001) return val.toFixed(6);
  return val.toFixed(8);
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-7 w-32" />
      </div>
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-40 rounded-xl" />
      ))}
    </div>
  );
}
