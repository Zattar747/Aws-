import { getDb } from "./db";
import { shuffledIndices } from "./shuffle";

interface ItemCycleRow {
  cycle_key: string;
  cycle_number: number;
  order_json: string;
  pointer: number;
}

/**
 * Hands out the next index from a shuffled, site-wide cycle through a list
 * of `itemCount` items, keyed by `cycleKey`. No item repeats until every
 * item has been used once; only then does a new (freshly reshuffled) cycle
 * begin and repeats become possible. Shared by any game whose content pool
 * (word list, trivia questions, ...) shouldn't repeat until exhausted.
 */
export async function getNextIndex(cycleKey: string, itemCount: number): Promise<number> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM item_cycles WHERE cycle_key = ?",
    args: [cycleKey],
  });
  const row = result.rows[0] as unknown as ItemCycleRow | undefined;

  let cycleNumber: number;
  let order: number[];
  let pointer: number;

  if (!row) {
    cycleNumber = 1;
    order = shuffledIndices(itemCount);
    pointer = 0;
  } else {
    cycleNumber = row.cycle_number;
    order = JSON.parse(row.order_json) as number[];
    pointer = row.pointer;
  }

  if (pointer >= order.length || order.length !== itemCount) {
    cycleNumber += 1;
    order = shuffledIndices(itemCount);
    pointer = 0;
  }

  const index = order[pointer];
  pointer += 1;

  await db.execute({
    sql: `INSERT INTO item_cycles (cycle_key, cycle_number, order_json, pointer)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(cycle_key) DO UPDATE SET
            cycle_number = excluded.cycle_number,
            order_json = excluded.order_json,
            pointer = excluded.pointer`,
    args: [cycleKey, cycleNumber, JSON.stringify(order), pointer],
  });

  return index;
}
