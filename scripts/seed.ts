/* eslint-disable no-console */
import { q, one, pool } from "../lib/webaudit/db";
import { hashPassword } from "../lib/webaudit/auth";

const EMAIL = process.env.SEED_EMAIL || "demo@webaudit.local";
const PASSWORD = process.env.SEED_PASSWORD || "demopassword123";

async function main() {
  const exists = await one(`SELECT id FROM users WHERE email=$1`, [EMAIL]);
  let userId: string;
  if (exists) {
    userId = (exists as any).id;
    console.log(`[seed] user exists: ${EMAIL}`);
  } else {
    const hash = await hashPassword(PASSWORD);
    const [u] = await q<{ id: string }>(
      `INSERT INTO users (email, password_hash, name) VALUES ($1,$2,$3) RETURNING id`,
      [EMAIL, hash, "Demo User"],
    );
    userId = u.id;
    console.log(`[seed] created user: ${EMAIL} / ${PASSWORD}`);
  }

  const proj = await one(`SELECT id FROM projects WHERE user_id=$1 AND name=$2`, [userId, "Demo Project"]);
  if (!proj) {
    await q(
      `INSERT INTO projects (user_id, name, url) VALUES ($1, 'Demo Project', 'https://example.com')`,
      [userId],
    );
    console.log(`[seed] created demo project`);
  }

  await pool.end();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
