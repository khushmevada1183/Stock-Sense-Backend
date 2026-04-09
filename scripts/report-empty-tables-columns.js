/* eslint-disable no-console */

const { query, closePool } = require('../src/db/client');

const qid = (s) => `"${String(s).replace(/"/g, '""')}"`;
const isText = (dt) => ['character varying', 'text', 'character'].includes(String(dt || '').toLowerCase());

const run = async () => {
  const tablesRes = await query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;"
  );

  const emptyTables = [];
  const tablesWithEmptyColumns = [];

  for (const row of tablesRes.rows) {
    const table = row.table_name;

    const rowCountRes = await query(`SELECT COUNT(*)::bigint AS row_count FROM ${qid(table)};`);
    const rowCount = Number(rowCountRes.rows[0].row_count || 0);

    const colsRes = await query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position;",
      [table]
    );

    const columns = colsRes.rows.map((c) => c.column_name);

    if (rowCount === 0) {
      emptyTables.push({ table, rowCount, columns });
      continue;
    }

    if (columns.length === 0) {
      continue;
    }

    const exprs = [];
    colsRes.rows.forEach((c, idx) => {
      const col = qid(c.column_name);
      exprs.push(`COUNT(${col})::bigint AS nn_${idx}`);
      if (isText(c.data_type)) {
        exprs.push(`COUNT(*) FILTER (WHERE ${col} IS NOT NULL AND BTRIM(${col}::text) <> '')::bigint AS nb_${idx}`);
      }
    });

    const countsRes = await query(`SELECT ${exprs.join(', ')} FROM ${qid(table)};`);
    const counts = countsRes.rows[0] || {};

    const allNullColumns = [];
    const allBlankOrNullTextColumns = [];

    colsRes.rows.forEach((c, idx) => {
      const nonNull = Number(counts[`nn_${idx}`] || 0);
      if (nonNull === 0) {
        allNullColumns.push(c.column_name);
      }

      if (isText(c.data_type)) {
        const nonBlank = Number(counts[`nb_${idx}`] || 0);
        if (nonBlank === 0) {
          allBlankOrNullTextColumns.push(c.column_name);
        }
      }
    });

    if (allNullColumns.length > 0 || allBlankOrNullTextColumns.length > 0) {
      tablesWithEmptyColumns.push({
        table,
        rowCount,
        allNullColumns,
        allBlankOrNullTextColumns,
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        scannedTables: tablesRes.rows.length,
        emptyTables,
        tablesWithEmptyColumns,
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
