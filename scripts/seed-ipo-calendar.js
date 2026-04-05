/* eslint-disable no-console */

const { seedIpoCalendar } = require('../src/modules/ipo/ipo.service');
const { closePool } = require('../src/db/client');

const run = async () => {
  const summary = await seedIpoCalendar({ source: 'script_seed_ipo_calendar' });
  console.log(JSON.stringify({ ok: true, ...summary }, null, 2));
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
