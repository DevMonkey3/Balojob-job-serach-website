import "server-only";
import { db } from "@/server/db";

// 選択項目マスタ (selection_options) for admin forms. The specs say each screen
// loads its dropdowns from the master, so admin forms read the database here
// rather than src/lib/options.ts. Values are stored as the Japanese label.

export type OptionNode = {
  id: string;
  labelJa: string;
  labelEn: string | null;
  labelBn: string | null;
  sortOrder: number;
  isActive: boolean;
  children: OptionNode[];
};

/** Active level-1 labels of one category, in display order. */
export async function getOptionLabels(category: string): Promise<string[]> {
  const rows = await db.selectionOption.findMany({
    where: { category, parentId: null, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: { labelJa: true },
  });
  return rows.map((r) => r.labelJa);
}

/** Active level-2 labels of a category (e.g. all 職種 under every 業種). */
export async function getChildOptionLabels(category: string): Promise<string[]> {
  const rows = await db.selectionOption.findMany({
    where: { category, parentId: { not: null }, isActive: true },
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
    select: { labelJa: true },
  });
  return [...new Set(rows.map((r) => r.labelJa))];
}

/** Level-1 options with their children, active or not (for the master maintenance screen). */
export async function getOptionTree(category: string): Promise<OptionNode[]> {
  const rows = await db.selectionOption.findMany({
    where: { category },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  const nodes = new Map<bigint, OptionNode>();
  for (const r of rows) {
    nodes.set(r.id, {
      id: String(r.id),
      labelJa: r.labelJa,
      labelEn: r.labelEn,
      labelBn: r.labelBn,
      sortOrder: r.sortOrder,
      isActive: r.isActive,
      children: [],
    });
  }
  const roots: OptionNode[] = [];
  for (const r of rows) {
    const node = nodes.get(r.id)!;
    const parent = r.parentId === null ? null : nodes.get(r.parentId);
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

export async function getOptionCategories(): Promise<{ category: string; count: number }[]> {
  const groups = await db.selectionOption.groupBy({
    by: ["category"],
    _count: { _all: true },
    orderBy: { category: "asc" },
  });
  return groups.map((g) => ({ category: g.category, count: g._count._all }));
}
