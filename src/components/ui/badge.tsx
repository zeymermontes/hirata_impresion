import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border",
  {
    variants: {
      variant: {
        default: "bg-primary/15 text-primary-foreground border-primary/30",
        secondary: "bg-secondary text-secondary-foreground border-transparent",
        outline: "bg-transparent border-border text-foreground",
        success: "bg-emerald-100 text-emerald-900 border-emerald-200",
        warning: "bg-amber-100 text-amber-900 border-amber-200",
        destructive: "bg-destructive/15 text-destructive border-destructive/30",
        muted: "bg-muted text-muted-foreground border-transparent",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { badgeVariants };
