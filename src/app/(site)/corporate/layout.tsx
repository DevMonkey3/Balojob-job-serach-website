import { WizardProvider } from "@/components/wizard/wizard-provider";

export default function CorporateLayout({ children }: LayoutProps<"/corporate">) {
  return (
    <WizardProvider initialData={{ values: {}, rows: {} }}>
      <div className="mx-auto w-full max-w-3xl px-4 py-10">{children}</div>
    </WizardProvider>
  );
}
