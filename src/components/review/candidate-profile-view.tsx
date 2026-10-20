import Link from "next/link";
import { ArrowLeftIcon, FileTextIcon, UserIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtDate } from "@/lib/admin/labels";
import { memberSections, staticSectionOptions, type SectionField } from "@/lib/admin/member-sections";
import { jobTrackLabels, schoolCategoryLabels } from "@/lib/format";
import type { MemberDetail } from "@/server/admin/members";

// Read-only 履歴書 (BHALO201 layout) of one candidate, shared by the staff review
// screen and the employer's applicant page. Server component: no hooks.
// Passport number, religion and allergies are never shown here; the caller
// decides whether contact details appear (showContact).

type Files = { photoUrl?: string | null; resumeUrl?: string | null; resumeName?: string | null };

type Props = {
  member: MemberDetail;
  files?: Files;
  /** Address, phone and email. True for staff and for employers with an approved applicant. */
  showContact?: boolean;
  backHref?: string;
  backLabel?: string;
  /** Rendered in the header card (e.g. review buttons). */
  actions?: React.ReactNode;
};

const yesNo = (v: boolean | null) => (v === null ? "" : v ? "有り" : "無し");

/** "2026-04" → 2026年4月 */
function fmtMonth(ym: string) {
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  return m ? `${m[1]}年${Number(m[2])}月` : ym;
}

function displayValue(field: SectionField, value: string): string {
  if (!value) return "";
  if (field.type === "month") return fmtMonth(value);
  if (field.type === "date") return fmtDate(value);
  if (field.type === "select" && field.options) {
    const options = staticSectionOptions[field.options];
    const hit = options?.find((o) => (typeof o === "string" ? o : o.value) === value);
    if (hit) return typeof hit === "string" ? hit : hit.label;
  }
  return value;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === "" || value === null || value === undefined) return null;
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-wrap">{value}</dd>
    </>
  );
}

function Group({ title, screenId, children }: { title: string; screenId?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {title}
          {screenId && <span className="font-mono text-xs font-normal text-muted-foreground">{screenId}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">{children}</dl>
      </CardContent>
    </Card>
  );
}

export function CandidateProfileView({ member: m, files, showContact = false, backHref, backLabel = "もどる", actions }: Props) {
  const goals = [
    m.wantsEngineer && jobTrackLabels.engineer,
    m.wantsSsw && jobTrackLabels.ssw,
    m.wantsTitp && jobTrackLabels.titp,
    m.wantsUniversity && schoolCategoryLabels.university,
    m.wantsVocational && schoolCategoryLabels.vocational,
    m.wantsLanguageSchool && schoolCategoryLabels.language_school,
  ].filter((g) => g !== false);
  const address = [m.postalCode, m.state, m.city, m.street, m.houseNumber].filter(Boolean).join(" ");
  const r = m.resume;

  return (
    <div className="flex flex-col gap-6">
      {backHref && (
        <Link href={backHref} className={buttonVariants({ variant: "ghost", size: "sm", className: "w-fit" })}>
          <ArrowLeftIcon />
          {backLabel}
        </Link>
      )}

      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
            {files?.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- private file served by our own route
              <img src={files.photoUrl} alt={`${m.fullName}の写真`} className="size-full object-cover" />
            ) : (
              <UserIcon className="size-10 text-muted-foreground" aria-hidden />
            )}
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <div>
              <p className="font-mono text-xs text-muted-foreground">{m.memberNo}</p>
              <h2 className="text-2xl font-bold">{m.fullName}</h2>
              {m.nameKana && <p className="text-sm text-muted-foreground">{m.nameKana}</p>}
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <Row label="国籍" value={m.nationality} />
              <Row label="生年月日" value={fmtDate(m.birthDate)} />
              <Row label="性別" value={m.gender} />
              <Row label="居住国" value={m.residenceCountry} />
            </dl>
            {goals.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {goals.map((g) => (
                  <Badge key={g} variant="secondary">
                    {g}
                  </Badge>
                ))}
              </div>
            )}
            {files?.resumeUrl && (
              <a href={files.resumeUrl} target="_blank" rel="noopener" className={buttonVariants({ variant: "outline", size: "sm", className: "w-fit" })}>
                <FileTextIcon />
                履歴書ファイルを開く{files.resumeName ? `（${files.resumeName}）` : ""}
              </a>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-start gap-2">{actions}</div>}
        </CardContent>
      </Card>

      <Group title="基本情報" screenId="BHALO010">
        <Row label="配偶者" value={yesNo(m.hasSpouse)} />
        <Row label="子供" value={yesNo(m.hasChildren)} />
        <Row label="子供人数" value={m.childrenCount === null ? "" : `${m.childrenCount}人`} />
        <Row label="母国語" value={m.nativeLanguage} />
      </Group>

      {showContact && (
        <Group title="連絡先・住所" screenId="BHALO011">
          <Row label="携帯番号" value={m.mobile} />
          <Row label="メールアドレス" value={m.contactEmail} />
          <Row label="住所" value={address} />
        </Group>
      )}

      {(m.visaStatus || m.visaExpiry) && (
        <Group title="VISA情報" screenId="BHALO013">
          <Row label="ステータス" value={m.visaStatus} />
          <Row label="有効期限" value={m.visaExpiry ? fmtMonth(m.visaExpiry) : ""} />
        </Group>
      )}

      {m.introduction && (
        <Group title="自己紹介" screenId="BHALO018">
          <Row label="自己紹介" value={m.introduction} />
        </Group>
      )}

      {memberSections.map((section) => {
        const rows = m.sections[section.key] ?? [];
        if (rows.length === 0) return null;
        return (
          <Card key={section.key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {section.title}
                <span className="font-mono text-xs font-normal text-muted-foreground">{section.screenId}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    {section.fields.map((f) => (
                      <TableHead key={f.name}>{f.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={i}>
                      {section.fields.map((f) => (
                        <TableCell key={f.name} className="whitespace-normal">
                          {displayValue(f, row[f.name] ?? "")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      {r && (
        <Group title="履歴書情報" screenId="BHALO201">
          <Row label="身長" value={r.heightCm ? `${r.heightCm} cm` : ""} />
          <Row label="体重" value={r.weightKg ? `${r.weightKg} kg` : ""} />
          <Row label="血液型" value={r.bloodType} />
          <Row label="利き手" value={r.dominantHand} />
          <Row label="視力" value={r.eyesightRight || r.eyesightLeft ? `右 ${r.eyesightRight || "—"} / 左 ${r.eyesightLeft || "—"}` : ""} />
          <Row label="喫煙" value={yesNo(r.smokes)} />
          <Row label="刺青" value={r.hasTattoo ? `有り${r.tattooLocation ? `（${r.tattooLocation}）` : ""}` : yesNo(r.hasTattoo)} />
          <Row label="お酒" value={r.alcohol} />
          <Row label="長所" value={r.strengths} />
          <Row label="短所" value={r.weaknesses} />
          <Row label="志望動機" value={r.motivation} />
          <Row label="趣味・特技" value={r.hobbies} />
          <Row label="その他" value={r.otherNotes} />
        </Group>
      )}
    </div>
  );
}
