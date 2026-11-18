interface PageResult<T> { data: T[] | null; error: unknown; count?: number | null; }

/** Continue through REST row caps, including caps smaller than our page size. */
export async function readAllRows<T>(readPage: (from: number, to: number) => PromiseLike<PageResult<T>>, limit = Number.POSITIVE_INFINITY): Promise<T[]> {
  const rows: T[] = [];
  let total: number | null = null;
  while (rows.length < limit) {
    const result = await readPage(rows.length, rows.length + Math.min(100, limit - rows.length) - 1);
    if (result.error) throw result.error;
    if (typeof result.count === 'number') total = result.count;
    if (!result.data?.length) {
      if (total !== null && rows.length < Math.min(total, limit)) throw new Error('The requested list changed while loading. Please retry.');
      return rows;
    }
    rows.push(...result.data.slice(0, limit - rows.length));
    if (total !== null && rows.length >= total) return rows;
  }
  return rows;
}
