"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, children, className, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          "btn",
          `btn-${variant}`,
          size === "sm" && "btn-sm",
          size === "lg" && "btn-lg",
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <span className="spinner spinner-sm" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
