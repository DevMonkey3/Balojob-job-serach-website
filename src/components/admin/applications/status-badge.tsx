import { Badge } from "@/components/ui/badge";
import { applicationStatusLabels } from "@/lib/admin/labels";

const variant = { new: "default", in_progress: "secondary", closed: "outline" } as const;

export function ApplicationStatusBadge({ status }: { status: keyof typeof applicationStatusLabels }) {
  return <Badge variant={variant[status]}>{applicationStatusLabels[status]}</Badge>;
}
