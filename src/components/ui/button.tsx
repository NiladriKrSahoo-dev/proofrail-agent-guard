import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "border border-black/30 bg-[linear-gradient(180deg,var(--primary),var(--primary-deep))] text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.32),inset_0_-1px_0_rgba(0,0,0,0.3),0_1px_3px_rgba(0,0,0,0.5)] hover:brightness-110 active:translate-y-px active:shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_2px_6px_rgba(0,0,0,0.45)]",
        destructive:
          "border border-black/30 bg-[linear-gradient(180deg,var(--destructive),var(--destructive-deep))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-1px_0_rgba(0,0,0,0.3),0_1px_3px_rgba(0,0,0,0.5)] hover:brightness-110 active:translate-y-px active:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_2px_6px_rgba(0,0,0,0.45)]",
        outline:
          "border bg-background/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 active:translate-y-px",
        secondary:
          "border border-black/25 bg-[linear-gradient(180deg,var(--secondary),var(--secondary-deep))] text-secondary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-1px_0_rgba(0,0,0,0.28),0_1px_2px_rgba(0,0,0,0.4)] hover:brightness-110 active:translate-y-px active:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_2px_5px_rgba(0,0,0,0.4)]",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
