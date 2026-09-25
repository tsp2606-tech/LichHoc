export function filterAndPaginateLogs(logs = [], query = "", pageSize = 15, currentPage = 1) {
  const safePageSize = Number.isFinite(Number(pageSize)) && Number(pageSize) > 0 ? Number(pageSize) : 15;
  const safeCurrentPage = Number.isFinite(Number(currentPage)) && Number(currentPage) > 0 ? Number(currentPage) : 1;
  const normalizedQuery = String(query || "").trim().toLowerCase();

  const filtered = normalizedQuery
    ? (logs || []).filter((log) => {
        const email = String(log?.user_email || log?.email || "").toLowerCase();
        const userId = String(log?.user_id ?? "").toLowerCase();
        const details = String(log?.details || "").toLowerCase();

        return email.includes(normalizedQuery) || userId.includes(normalizedQuery) || details.includes(normalizedQuery);
      })
    : logs || [];

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const adjustedPage = Math.min(safeCurrentPage, totalPages);
  const startIndex = (adjustedPage - 1) * safePageSize;
  const items = filtered.slice(startIndex, startIndex + safePageSize);

  return {
    items,
    totalItems,
    totalPages,
    currentPage: adjustedPage,
    hasPrevious: adjustedPage > 1,
    hasNext: adjustedPage < totalPages,
  };
}
