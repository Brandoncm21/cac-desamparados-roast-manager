import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-3 py-0.5 text-xs font-semibold whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary-container",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/90",
        destructive:
          "bg-error-container text-on-error-container [a]:hover:bg-destructive/20 focus-visible:ring-destructive/20",
        outline:
          "border-outline-variant text-on-surface-variant [a]:hover:bg-surface-container-low",
        ghost:
          "hover:bg-muted hover:text-muted-foreground",
        link: "text-secondary underline-offset-4 hover:underline",
        // SCACR order status variants
        pending: "bg-secondary-fixed text-on-secondary-fixed",
        proceso: "bg-secondary-container text-on-secondary-container",
        completado: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
        cancelado: "bg-error-container text-on-error-container",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
