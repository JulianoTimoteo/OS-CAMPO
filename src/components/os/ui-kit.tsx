import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Cabeçalho padrão de página: título, descrição e área de ações.
 * Garante hierarquia tipográfica e espaçamento idênticos em todas as abas.
 */
export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
}: {
  title: string;
  description?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-usina/12 text-usina ring-1 ring-usina/20">
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="heading-fluid truncate font-bold">{title}</h2>
          {description && (
            <p className="prose-measure mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Estado vazio consistente: ícone, título e orientação do próximo passo. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/25 px-6 py-12 text-center",
        className,
      )}
    >
      {Icon && (
        <span className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
          <Icon className="h-6 w-6" />
        </span>
      )}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && (
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Chip de filtro com contador — usado nas listas de chamados. */
export function FilterChip({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "touch-target inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold capitalize transition-all duration-200 active:scale-[0.97]",
        active
          ? "border-usina bg-usina text-usina-foreground shadow-soft"
          : "border-border bg-card text-muted-foreground hover:border-usina/40 hover:bg-accent hover:text-foreground",
      )}
    >
      {children}
      {count !== undefined && (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
            active ? "bg-usina-foreground/20" : "bg-muted",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/** Barra fina de progresso no topo — feedback global de sincronização. */
export function GlobalLoadingBar({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="loading-bar-track" role="progressbar" aria-label="Carregando dados" aria-busy="true" />
  );
}

/** Bloco cinza com brilho — base dos esqueletos de carregamento. */
export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={cn("skeleton-shimmer rounded-md bg-muted/70", className)} aria-hidden="true" />
  );
}

/** Esqueleto de grade de cards (chamados, KPIs). */
export function CardGridSkeleton({
  count = 4,
  className,
  cardClassName,
}: { count?: number; className?: string; cardClassName?: string }) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2", className)} aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn("space-y-3 rounded-xl border border-border/70 bg-card p-4 shadow-xs", cardClassName)}
        >
          <div className="flex items-center justify-between gap-3">
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="h-5 w-16 rounded-full" />
          </div>
          <SkeletonBlock className="h-3 w-3/4" />
          <SkeletonBlock className="h-3 w-1/2" />
          <div className="flex gap-2 pt-1">
            <SkeletonBlock className="h-8 w-24 rounded-lg" />
            <SkeletonBlock className="h-8 w-20 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Esqueleto de linhas de tabela. */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-border/60" aria-busy="true">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-3 py-3.5">
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonBlock
              key={c}
              className={cn("h-3.5 flex-1", c === 0 && "max-w-[40%]", c > 1 && "max-w-[20%]")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
