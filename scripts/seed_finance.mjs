/**
 * 一次性腳本：把 stores/finance_data.js 既有的第 4-7 期財務資料寫進 DB
 *
 * 使用：
 *   node scripts/seed_finance.mjs            # 預覽
 *   node scripts/seed_finance.mjs --apply    # 寫入
 */

import "dotenv/config";
import pg from "pg";
import { periods } from "../stores/finance_data.js";

const APPLY = process.argv.includes("--apply");

async function main() {
  const c = new pg.Client({
    host: process.env.SUPABASE_DB_HOST,
    port: 5432,
    user: process.env.SUPABASE_DB_USER,
    password: process.env.SUPABASE_DB_PASSWORD,
    database: process.env.SUPABASE_DB_NAME,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  for (const p of periods) {
    console.log(`\n=== Issue ${p.key} (${p.label}) — ${p.dateRange} ===`);
    if (APPLY) {
      await c.query(
        `INSERT INTO finance_periods (issue, date_range, updated_at)
         VALUES ($1, $2, now())
         ON CONFLICT (issue) DO UPDATE
           SET date_range = EXCLUDED.date_range, updated_at = now()`,
        [p.key, p.dateRange],
      );
    }
    console.log(`  ${APPLY ? "" : "[DRY] "}upsert finance_periods.issue=${p.key} date_range="${p.dateRange}"`);

    for (let i = 0; i < p.rows.length; i++) {
      const r = p.rows[i];
      if (APPLY) {
        await c.query(
          `INSERT INTO finance_entries
             (id, issue, entry_date, entry_type, item, category, unit_price, qty, total, note, sort_order, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())
           ON CONFLICT (id) DO UPDATE SET
             issue=EXCLUDED.issue, entry_date=EXCLUDED.entry_date, entry_type=EXCLUDED.entry_type,
             item=EXCLUDED.item, category=EXCLUDED.category, unit_price=EXCLUDED.unit_price,
             qty=EXCLUDED.qty, total=EXCLUDED.total, note=EXCLUDED.note,
             sort_order=EXCLUDED.sort_order, updated_at=now()`,
          [
            r.id,
            p.key,
            r.date,
            r.type,
            r.item,
            r.category,
            r.unitPrice == null ? null : String(r.unitPrice),
            r.qty == null ? null : Number(r.qty),
            r.total == null ? null : Number(r.total),
            r.note || null,
            i,
          ],
        );
      }
      console.log(
        `  ${APPLY ? "" : "[DRY] "}entry ${r.id} ${r.date} ${r.type} ${r.item} ${r.total}`,
      );
    }
  }

  await c.end();
  console.log(APPLY ? "\n✅ 已寫入" : "\n（預覽完成，加 --apply 實際執行）");
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
