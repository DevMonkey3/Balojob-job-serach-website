"use client";

import { useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { UploadField } from "@/components/upload/upload-field";
import { options, type OptionKey } from "@/lib/options";
import { cn } from "@/lib/utils";
import type { Field, FieldValue } from "@/lib/wizard/types";

type Props = {
  field: Field;
  /** Reads any key, so composite fields (yearMonth, checkboxes) can use several. */
  get: (name: string) => FieldValue | undefined;
  set: (name: string, value: FieldValue) => void;
  error?: string;
};

export function FieldInput({ field, get, set, error }: Props) {
  const id = useId();
  const text = (name: string) => {
    const v = get(name);
    return typeof v === "string" ? v : "";
  };

  return (
    <div className={cn("flex flex-col gap-2", field.span === 2 && "sm:col-span-2")}>
      {field.type !== "checkboxes" && (
        <Label htmlFor={id}>
          {field.label}
          {field.required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <Control field={field} id={id} text={text} get={get} set={set} invalid={!!error} />
      {field.hint && <p className="text-xs text-muted-foreground">{field.hint}</p>}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function Control({
  field,
  id,
  text,
  get,
  set,
  invalid,
}: Omit<Props, "error"> & { id: string; text: (name: string) => string; invalid: boolean }) {
  switch (field.type) {
    case "textarea":
      return (
        <div className="flex flex-col gap-1">
          <Textarea
            id={id}
            rows={field.rows ?? 4}
            maxLength={field.maxLength}
            value={text(field.name)}
            onChange={(e) => set(field.name, e.target.value)}
            aria-invalid={invalid}
          />
          {field.maxLength && (
            <span className="self-end text-xs text-muted-foreground">
              {text(field.name).length} / {field.maxLength}
            </span>
          )}
        </div>
      );

    case "select":
      return (
        <OptionSelect
          id={id}
          optionKey={field.options}
          value={text(field.name)}
          onChange={(v) => set(field.name, v)}
          invalid={invalid}
        />
      );

    case "combo": {
      // A native datalist gives "pick from the list, or type your own" for free.
      const listId = `${id}-list`;
      return (
        <>
          <Input
            id={id}
            list={field.options ? listId : undefined}
            value={text(field.name)}
            onChange={(e) => set(field.name, e.target.value)}
            placeholder={field.options ? "選択または入力 (Select or type)" : undefined}
            aria-invalid={invalid}
          />
          {field.options && (
            <datalist id={listId}>
              {options[field.options].map((o) => (
                <option key={o.value} value={o.value} />
              ))}
            </datalist>
          )}
        </>
      );
    }

    case "radio":
      return (
        <RadioGroup
          id={id}
          value={text(field.name)}
          onValueChange={(v) => set(field.name, String(v))}
          className="flex flex-wrap gap-x-6 gap-y-2"
          aria-invalid={invalid}
        >
          {options[field.options].map((o) => (
            <Label key={o.value} className="font-normal">
              <RadioGroupItem value={o.value} />
              {o.label}
            </Label>
          ))}
        </RadioGroup>
      );

    case "yearMonth":
      return (
        <div className="flex gap-2" id={id}>
          <OptionSelect
            optionKey="year"
            value={text(`${field.name}Year`)}
            onChange={(v) => set(`${field.name}Year`, v)}
            placeholder="年"
            invalid={invalid}
          />
          <OptionSelect
            optionKey="month"
            value={text(`${field.name}Month`)}
            onChange={(v) => set(`${field.name}Month`, v)}
            placeholder="月"
            invalid={invalid}
          />
        </div>
      );

    case "file":
      // The file is stored as soon as it is chosen; the step keeps the stored file's id.
      return (
        <UploadField
          id={id}
          accept={field.accept}
          kind={field.name === "photo" ? "photo" : "resume"}
          value={text(field.name) || undefined}
          onUploaded={(file) => set(field.name, file.id)}
        />
      );

    case "checkboxes":
      return (
        <div className="grid gap-6 sm:grid-cols-2">
          {field.groups.map((group) => (
            <fieldset key={group.title} className="flex flex-col gap-3 rounded-lg border p-4">
              <legend className="px-1 text-sm font-semibold">{group.title}</legend>
              {group.items.map((item) => (
                <Label key={item.name} className="items-start font-normal leading-snug">
                  <Checkbox
                    checked={get(item.name) === true}
                    onCheckedChange={(checked) => set(item.name, checked === true)}
                  />
                  {item.label}
                </Label>
              ))}
            </fieldset>
          ))}
        </div>
      );

    default:
      return (
        <div className="flex items-center gap-2">
          <Input
            id={id}
            type={field.type}
            value={text(field.name)}
            onChange={(e) => set(field.name, e.target.value)}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            min={field.type === "number" ? 0 : undefined}
            aria-invalid={invalid}
          />
          {field.suffix && (
            <span className="shrink-0 text-sm text-muted-foreground">{field.suffix}</span>
          )}
        </div>
      );
  }
}

export function OptionSelect({
  id,
  optionKey,
  value,
  onChange,
  placeholder = "選択してください",
  invalid,
  className,
}: {
  id?: string;
  optionKey: OptionKey;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  invalid?: boolean;
  className?: string;
}) {
  const items = options[optionKey];
  return (
    <Select items={items} value={value || null} onValueChange={(v) => onChange(v ?? "")}>
      <SelectTrigger id={id} className={cn("w-full", className)} aria-invalid={invalid}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
