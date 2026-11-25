export function PageHeader({
  title,
  titleEn,
  description,
  children,
}: {
  /** @deprecated The design-document ID is no longer shown. Accepted and ignored; remove it from callers. */
  screenId?: string;
  title: string;
  titleEn?: string;
  description?: string;
  /** Buttons shown on the right. */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">
          {title}
          {titleEn && <span className="ml-2 text-base font-normal text-muted-foreground">{titleEn}</span>}
        </h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
