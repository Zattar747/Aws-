import { getDb } from "./db";
import { shuffledIndices } from "./shuffle";

interface ClaimRow {
  used_pointer: number;
  order_json: string;
}

const MAX_ATTEMPTS = 20;

/**
 * Hands out the next index from a shuffled, site-wide cycle through a list
 * of `itemCount` items, keyed by `cycleKey`. No item repeats until every
 * item has been used once; only then does a new (freshly reshuffled) cycle
 * begin and repeats become possible. Shared by any game whose content pool
 * (word list, trivia questions, ...) shouldn't repeat until exhausted.
 *
 * The claim itself is a single atomic UPDATE ... RETURNING so two requests
 * arriving at the same instant can't both read the same pointer value and
 * hand out the same item. Retried in a loop rather than once: when a burst
 * of concurrent requests all find the cycle exhausted at once, only one of
 * them actually wins the reshuffle below (the rest become no-ops), but if
 * there are more waiting requests than items in a single fresh cycle, the
 * extras won't get anything to claim from that one reshuffle — they loop
 * back around and either claim from what's left or trigger the next
 * reshuffle themselves.
 */
export async function getNextIndex(cycleKey: string, itemCount: number): Promise<number> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const claimed = await claimNext(cycleKey);
    if (claimed) {
      const order = JSON.parse(claimed.order_json) as number[];
      if (order.length === itemCount) {
        return order[claimed.used_pointer];
      }
      // itemCount changed since this cycle was seeded (list edited) — fall
      // through and reshuffle against the current count.
    }

    // Either no cycle exists yet, the current one is exhausted, or its size
    // no longer matches itemCount. Try to seed a fresh cycle. The WHERE
    // guard means a concurrent request doing the same thing at the same
    // moment becomes a no-op instead of clobbering a cycle another request
    // already (re)seeded.
    const order = shuffledIndices(itemCount);
    const db = await getDb();
    await db.execute({
      sql: `INSERT INTO item_cycles (cycle_key, cycle_number, order_json, pointer)
            VALUES (?, 1, ?, 0)
            ON CONFLICT(cycle_key) DO UPDATE SET
              cycle_number = item_cycles.cycle_number + 1,
              order_json = excluded.order_json,
              pointer = 0
            WHERE item_cycles.pointer >= json_array_length(item_cycles.order_json)
               OR json_array_length(item_cycles.order_json) != ?`,
      args: [cycleKey, JSON.stringify(order), itemCount],
    });
    // Loop back and claim again — either from the cycle this request just
    // seeded, or one a concurrent request seeded instead.
  }

  throw new Error(
    `getNextIndex: could not claim from cycle "${cycleKey}" after ${MAX_ATTEMPTS} attempts`
  );
}

async function claimNext(cycleKey: string): Promise<ClaimRow | null> {
  const db = await getDb();
  const result = await db.execute({
    sql: `UPDATE item_cycles
          SET pointer = pointer + 1
          WHERE cycle_key = ? AND pointer < json_array_length(order_json)
          RETURNING pointer - 1 AS used_pointer, order_json`,
    args: [cycleKey],
  });
  return (result.rows[0] as unknown as ClaimRow | undefined) ?? null;
}
