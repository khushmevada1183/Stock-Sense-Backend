/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const { query, closePool } = require('../src/db/client');

const GENERIC_COLUMNS = new Set([
  'id',
  'symbol',
  'source',
  'metadata',
  'created_at',
  'updated_at',
  'user_id',
]);

const run = async () => {
  const reportFile = path.resolve(__dirname, '../docs/refactor/schema-duplication-audit.json');

  const tablesRes = await query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `
  );

  const tables = tablesRes.rows.map((r) => r.table_name);
  const tableMeta = new Map();

  for (const table of tables) {
    const columnsRes = await query(
      `
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
        ORDER BY ordinal_position;
      `,
      [table]
    );

    const pkRes = await query(
      `
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
         AND tc.table_name = kcu.table_name
        WHERE tc.table_schema = 'public'
          AND tc.table_name = $1
          AND tc.constraint_type = 'PRIMARY KEY'
        ORDER BY kcu.ordinal_position;
      `,
      [table]
    );

    const uniqueRes = await query(
      `
        SELECT DISTINCT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
         AND tc.table_name = kcu.table_name
        WHERE tc.table_schema = 'public'
          AND tc.table_name = $1
          AND tc.constraint_type = 'UNIQUE'
        ORDER BY kcu.column_name;
      `,
      [table]
    );

    const fkOutRes = await query(
      `
        SELECT
          kcu.column_name,
          ccu.table_name AS references_table,
          ccu.column_name AS references_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
         AND tc.table_name = kcu.table_name
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
         AND ccu.table_schema = tc.table_schema
        WHERE tc.table_schema = 'public'
          AND tc.table_name = $1
          AND tc.constraint_type = 'FOREIGN KEY'
        ORDER BY kcu.column_name;
      `,
      [table]
    );

    const rowCountRes = await query(`SELECT COUNT(*)::bigint AS row_count FROM public.${table};`);

    tableMeta.set(table, {
      table,
      rowCount: Number(rowCountRes.rows[0].row_count || 0),
      columns: columnsRes.rows,
      columnNames: columnsRes.rows.map((c) => c.column_name),
      primaryKey: pkRes.rows.map((r) => r.column_name),
      uniqueColumns: uniqueRes.rows.map((r) => r.column_name),
      foreignKeysOut: fkOutRes.rows,
    });
  }

  const repeatedColumnsMap = new Map();
  for (const table of tables) {
    const colNames = tableMeta.get(table).columnNames;
    for (const col of colNames) {
      if (!repeatedColumnsMap.has(col)) {
        repeatedColumnsMap.set(col, []);
      }
      repeatedColumnsMap.get(col).push(table);
    }
  }

  const repeatedColumns = Array.from(repeatedColumnsMap.entries())
    .map(([column, tableList]) => ({
      column,
      tables: tableList,
      count: tableList.length,
      isGeneric: GENERIC_COLUMNS.has(column),
    }))
    .filter((item) => item.count > 1)
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.column.localeCompare(b.column);
    });

  const tablePairOverlaps = [];
  for (let i = 0; i < tables.length; i += 1) {
    for (let j = i + 1; j < tables.length; j += 1) {
      const a = tables[i];
      const b = tables[j];
      const colsA = new Set(tableMeta.get(a).columnNames);
      const colsB = new Set(tableMeta.get(b).columnNames);
      const shared = [...colsA].filter((col) => colsB.has(col));
      const sharedNonGeneric = shared.filter((col) => !GENERIC_COLUMNS.has(col));

      if (sharedNonGeneric.length >= 2) {
        tablePairOverlaps.push({
          tableA: a,
          tableB: b,
          sharedNonGenericCount: sharedNonGeneric.length,
          sharedNonGenericColumns: sharedNonGeneric.sort(),
          sharedAllCount: shared.length,
        });
      }
    }
  }

  tablePairOverlaps.sort((a, b) => {
    if (b.sharedNonGenericCount !== a.sharedNonGenericCount) {
      return b.sharedNonGenericCount - a.sharedNonGenericCount;
    }
    return a.tableA.localeCompare(b.tableA) || a.tableB.localeCompare(b.tableB);
  });

  const summary = {
    ok: true,
    scannedTables: tables.length,
    genericColumnsIgnoredInPairScoring: Array.from(GENERIC_COLUMNS.values()),
    tableSummary: tables.map((table) => {
      const meta = tableMeta.get(table);
      return {
        table,
        rowCount: meta.rowCount,
        columnCount: meta.columns.length,
        primaryKey: meta.primaryKey,
        uniqueColumns: meta.uniqueColumns,
        foreignKeysOutCount: meta.foreignKeysOut.length,
      };
    }),
    repeatedColumns,
    potentialDuplicationHotspots: tablePairOverlaps.slice(0, 40),
  };

  fs.mkdirSync(path.dirname(reportFile), { recursive: true });
  fs.writeFileSync(reportFile, JSON.stringify(summary, null, 2));

  console.log(
    JSON.stringify(
      {
        ok: true,
        reportFile,
        scannedTables: summary.scannedTables,
        repeatedColumnsCount: summary.repeatedColumns.length,
        hotspotPairsCount: summary.potentialDuplicationHotspots.length,
      },
      null,
      2
    )
  );
};

run()
  .then(async () => {
    await closePool();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error.message);
    await closePool();
    process.exit(1);
  });
