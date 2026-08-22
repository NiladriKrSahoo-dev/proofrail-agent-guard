import { cn } from "@/lib/utils";
import {
  ArrowRight,
  CheckCircle2,
  Database,
  FileInput,
  MessageSquareText,
  ShieldCheck,
  Wrench,
} from "lucide-react";

export type StepKind =
  | "input"
  | "retrieval"
  | "tool"
  | "approval"
  | "action"
  | "output";

const stepIcon: Record<StepKind, React.ComponentType<{ className?: string }>> = {
  input: FileInput,
  retrieval: Database,
  tool: Wrench,
  approval: ShieldCheck,
  action: ArrowRight,
  output: MessageSquareText,
};

const stepTone: Record<StepKind, string> = {
  input: "bg-sky-500/10 text-sky-300",
  retrieval: "bg-blue-500/10 text-blue-300",
  tool: "bg-violet-500/10 text-violet-300",
  approval: "bg-emerald-500/10 text-emerald-300",
  action: "bg-amber-500/10 text-amber-300",
  output: "bg-slate-500/10 text-slate-300",
};

export function StepTimeline({
  steps,
  riskyIndex,
  className,
  compact = false,
}: {
  steps: { kind: StepKind; label: string; detail: string }[];
  /** Index of the risky decision to highlight. */
  riskyIndex?: number;
  className?: string;
  compact?: boolean;
}) {
  return (
    <ol className={cn("relative space-y-1", className)}>
      {steps.map((step, i) => {
        const Icon = stepIcon[step.kind];
        const isRisky = riskyIndex !== undefined && i === riskyIndex;
        return (
          <li key={i} className="relative flex gap-3">
            {i < steps.length - 1 && (
              <span className="absolute top-8 bottom-[-4px] left-[15px] w-px bg-border" />
            )}
            <span
              className={cn(
                "relative z-10 mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_1px_3px_rgba(0,0,0,0.45)]",
                stepTone[step.kind],
              )}
            >
              {isRisky ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <Icon className="size-4" />
              )}
            </span>
            <div
              className={cn(
                "min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
                isRisky &&
                  "border-amber-400/30 bg-amber-400/10 ring-1 ring-amber-400/20",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[13px] font-semibold tracking-tight">
                  {step.label}
                </p>
                {isRisky && (
                  <span className="rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                    Risky decision
                  </span>
                )}
              </div>
              {!compact && (
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {step.detail}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
