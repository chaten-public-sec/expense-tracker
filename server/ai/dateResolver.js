/**
 * Timezone-aware date resolution utility for natural Hinglish and English expressions.
 */

const parseHinglishDateRange = (text) => {
  if (!text || typeof text !== 'string') {
    return { fromDate: null, toDate: null };
  }

  const query = text.toLowerCase().trim();
  const now = new Date();

  // 1. "aaj" / "today"
  if (query.includes('aaj') || query.includes('today')) {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { fromDate: start, toDate: end, label: 'Today' };
  }

  // 2. "kal" / "yesterday"
  if (query.includes('kal') || query.includes('yesterday') || query.includes('beeta hua kal')) {
    const yStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
    const yEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    return { fromDate: yStart, toDate: yEnd, label: 'Yesterday' };
  }

  // 3. "this month" / "is mahine" / "august"
  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  const shortMonths = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  for (let m = 0; m < 12; m++) {
    if (query.includes(monthNames[m]) || query.includes(shortMonths[m])) {
      const year = now.getFullYear();
      const start = new Date(year, m, 1, 0, 0, 0, 0);
      const end = new Date(year, m + 1, 0, 23, 59, 59, 999);
      return { fromDate: start, toDate: end, label: monthNames[m] };
    }
  }

  if (query.includes('this month') || query.includes('is mahine') || query.includes('is month')) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { fromDate: start, toDate: end, label: 'This Month' };
  }

  // 4. "last month" / "pichle mahine" / "pichla month"
  if (query.includes('last month') || query.includes('pichle mahine') || query.includes('pichla month') || query.includes('previous month')) {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { fromDate: start, toDate: end, label: 'Last Month' };
  }

  // 5. "last 30 days" / "pichle 30 din" / "30 days"
  if (query.includes('30 days') || query.includes('30 din') || query.includes('pichle 30')) {
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { fromDate: start, toDate: now, label: 'Last 30 Days' };
  }

  // 6. "this week" / "is hafte"
  if (query.includes('this week') || query.includes('is hafte') || query.includes('is week')) {
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const start = new Date(now.setDate(diff));
    start.setHours(0, 0, 0, 0);
    return { fromDate: start, toDate: new Date(), label: 'This Week' };
  }

  // 7. "last week" / "pichle hafte"
  if (query.includes('last week') || query.includes('pichle hafte') || query.includes('pichla week')) {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { fromDate: start, toDate: now, label: 'Last 7 Days' };
  }

  // 8. Regex for "3 august se", "3 aug se", "from 3 august", "since august 3"
  const sinceMatch = query.match(/(?:since|from|se)?\s*(\d{1,2})\s*(?:st|nd|rd|th)?\s*(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)/i);
  if (sinceMatch) {
    const day = parseInt(sinceMatch[1], 10);
    const monthStr = sinceMatch[2].toLowerCase();
    const monthIdx = monthNames.findIndex(m => m.startsWith(monthStr.slice(0, 3)));
    if (monthIdx !== -1) {
      const year = now.getFullYear();
      const start = new Date(year, monthIdx, day, 0, 0, 0, 0);
      return { fromDate: start, toDate: now, label: `Since ${day} ${monthNames[monthIdx]}` };
    }
  }

  return { fromDate: null, toDate: null };
};

module.exports = {
  parseHinglishDateRange,
};
