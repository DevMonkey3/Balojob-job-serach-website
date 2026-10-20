import Link from "next/link";
import { PencilIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteButton } from "@/components/admin/delete-button";
import { EmptyRow, InactiveMark } from "@/components/admin/status";
import type { CorporationKind } from "@/generated/prisma/client";
import type { CorporationRow } from "@/server/admin/corporations";
import { deleteCompanyAction, deleteSchoolAction } from "@/server/admin/corporations-actions";

// The rows of 企業一覧 (BHALO803) and 学校一覧 (BHALO807). Only the third
// column differs: 業種 for companies, 学校種別 for schools.
const wording = {
  company: {
    path: "/admin/companies",
    name: "会社名",
    third: "業種",
    confirm: "この企業情報を削除します。よろしいですか？",
    deleteAction: deleteCompanyAction,
  },
  school: {
    path: "/admin/schools",
    name: "学校名",
    third: "学校種別",
    confirm: "この学校情報を削除します。よろしいですか？",
    deleteAction: deleteSchoolAction,
  },
} as const;

/** External link column: the page keeps its width even for long URLs. */
export function UrlCell({ url }: { url: string | null }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block max-w-56 truncate text-primary hover:underline">
      {url}
    </a>
  );
}

export function CorporationTable({
  kind,
  rows,
  canDelete,
}: {
  kind: CorporationKind;
  rows: CorporationRow[];
  canDelete: boolean;
}) {
  const t = wording[kind];
  return (
    <div className="rounded-xl border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>法人会員番号</TableHead>
            <TableHead>{t.name}</TableHead>
            <TableHead>{t.third}</TableHead>
            <TableHead>所在地</TableHead>
            <TableHead>URL</TableHead>
            <TableHead className="text-center">非アクティブ</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && <EmptyRow colSpan={7} />}
          {rows.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-mono text-xs">
                <Link href={`${t.path}/${c.id}`} className="text-primary hover:underline">
                  {c.memberNo}
                </Link>
              </TableCell>
              <TableCell>{c.name}</TableCell>
              <TableCell>{kind === "company" ? c.industry : c.schoolCategory}</TableCell>
              <TableCell>{c.address}</TableCell>
              <TableCell>
                <UrlCell url={c.url} />
              </TableCell>
              <TableCell className="text-center">
                <InactiveMark active={c.isActive} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Link href={`${t.path}/${c.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    <PencilIcon />
                    編集
                  </Link>
                  {canDelete && <DeleteButton action={t.deleteAction} id={c.id} message={t.confirm} />}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
