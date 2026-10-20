"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFieldError } from "@/components/admin/form-context";
import type { Option } from "@/lib/admin/labels";
import { cn } from "@/lib/utils";

// Plain form controls for admin screens. They submit as normal form fields, so
// server actions read them with FormData, and they show the error the action
// returned for their name.

type Common = {
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  /** Columns spanned in a two-column FieldGroup. */
  span?: 1 | 2;
  className?: string;
};

export const controlClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30";

export function FieldWrap({
  name,
  label,
  hint,
  required,
  span,
  className,
  htmlFor,
  children,
}: Common & { htmlFor?: string; children: React.ReactNode }) {
  const error = useFieldError(name);
  return (
    <div className={cn("flex flex-col gap-1.5", span === 2 && "sm:col-span-2", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

const normalize = (options: readonly (Option | string)[]): Option[] =>
  options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));

export function TextField({
  type = "text",
  defaultValue,
  placeholder,
  maxLength,
  suffix,
  readOnly,
  disabled,
  list,
  step,
  min,
  max,
  autoComplete,
  ...wrap
}: Common & {
  type?: "text" | "email" | "tel" | "url" | "number" | "date" | "month" | "time" | "password";
  defaultValue?: string | number | null;
  placeholder?: string;
  maxLength?: number;
  suffix?: string;
  readOnly?: boolean;
  disabled?: boolean;
  /** Suggestions the user can pick or ignore ("選択 or 手入力"). */
  list?: readonly string[];
  step?: string;
  min?: number;
  max?: number;
  autoComplete?: string;
}) {
  const id = useId();
  const error = useFieldError(wrap.name);
  const listId = list ? `${id}-list` : undefined;
  return (
    <FieldWrap {...wrap} htmlFor={id}>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          name={wrap.name}
          type={type}
          defaultValue={defaultValue ?? ""}
          placeholder={placeholder ?? (list ? "選択または入力" : undefined)}
          maxLength={maxLength}
          readOnly={readOnly}
          disabled={disabled}
          list={listId}
          step={step}
          min={min}
          max={max}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          className={cn(readOnly && "bg-muted/60")}
        />
        {suffix && <span className="shrink-0 text-sm text-muted-foreground">{suffix}</span>}
      </div>
      {list && (
        <datalist id={listId}>
          {list.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
      )}
    </FieldWrap>
  );
}

export function TextareaField({
  defaultValue,
  rows = 4,
  maxLength,
  placeholder,
  ...wrap
}: Common & { defaultValue?: string | null; rows?: number; maxLength?: number; placeholder?: string }) {
  const id = useId();
  const error = useFieldError(wrap.name);
  return (
    <FieldWrap {...wrap} htmlFor={id}>
      <Textarea
        id={id}
        name={wrap.name}
        defaultValue={defaultValue ?? ""}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-invalid={!!error}
      />
    </FieldWrap>
  );
}

export function SelectField({
  options,
  defaultValue,
  placeholder = "選択してください",
  allowEmpty = true,
  disabled,
  ...wrap
}: Common & {
  options: readonly (Option | string)[];
  defaultValue?: string | null;
  placeholder?: string;
  allowEmpty?: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  const error = useFieldError(wrap.name);
  return (
    <FieldWrap {...wrap} htmlFor={id}>
      <select
        id={id}
        name={wrap.name}
        defaultValue={defaultValue ?? ""}
        disabled={disabled}
        aria-invalid={!!error}
        className={controlClass}
      >
        {allowEmpty && <option value="">{placeholder}</option>}
        {normalize(options).map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldWrap>
  );
}

export function RadioField({
  options,
  defaultValue,
  ...wrap
}: Common & { options: readonly (Option | string)[]; defaultValue?: string | null }) {
  const error = useFieldError(wrap.name);
  return (
    <FieldWrap {...wrap}>
      <div className="flex min-h-8 flex-wrap items-center gap-x-5 gap-y-2" aria-invalid={!!error}>
        {normalize(options).map((o) => (
          <Label key={o.value} className="font-normal">
            <input
              type="radio"
              name={wrap.name}
              value={o.value}
              defaultChecked={(defaultValue ?? "") === o.value}
              className="size-4 accent-primary"
            />
            {o.label}
          </Label>
        ))}
      </div>
    </FieldWrap>
  );
}

export function CheckboxField({
  name,
  label,
  defaultChecked,
  description,
  disabled,
  className,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean | null;
  description?: string;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  const error = useFieldError(name);
  return (
    <div className={cn("flex items-start gap-2 py-1", className)}>
      <input
        id={id}
        type="checkbox"
        name={name}
        defaultChecked={!!defaultChecked}
        disabled={disabled}
        aria-invalid={!!error}
        className="mt-0.5 size-4 accent-primary"
      />
      <Label htmlFor={id} className="flex-col items-start gap-0.5 font-normal leading-snug">
        {label}
        {description && <span className="text-xs text-muted-foreground">{description}</span>}
        {error && (
          <span role="alert" className="text-sm text-destructive">
            {error}
          </span>
        )}
      </Label>
    </div>
  );
}

export function HiddenField({ name, value }: { name: string; value: string | number }) {
  return <input type="hidden" name={name} value={value} />;
}

/** A titled block of fields in two columns. */
export function FieldGroup({
  title,
  screenId,
  description,
  children,
  className,
}: {
  title: string;
  screenId?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cn("rounded-xl border bg-background p-5", className)}>
      <legend className="flex items-center gap-2 px-1 text-sm font-semibold">
        {title}
        {screenId && <span className="font-mono text-xs font-normal text-muted-foreground">{screenId}</span>}
      </legend>
      {description && <p className="mb-4 text-xs text-muted-foreground">{description}</p>}
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}
