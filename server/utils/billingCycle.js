/**
 * Calculate current billing cycle date range and next payday date
 * @param {number|null} payday - Day of month (1-31)
 * @param {Date} [refDate] - Reference date (defaults to now)
 * @returns {{ payday: number|null, startDate: Date|null, endDate: Date|null, nextPayday: Date|null, daysRemaining: number|null, isPaydayToday: boolean }}
 */
const calculateBillingCycle = (payday, refDate = new Date()) => {
  if (!payday || typeof payday !== 'number' || payday < 1 || payday > 31) {
    return {
      payday: null,
      startDate: null,
      endDate: null,
      nextPayday: null,
      daysRemaining: null,
      isPaydayToday: false,
    };
  }

  const today = new Date(refDate);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed
  const currentDay = today.getDate();

  // Helper to cap day of month for shorter months (e.g., Feb 28/29, April 30)
  const getValidDate = (year, month, targetDay) => {
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const actualDay = Math.min(targetDay, lastDayOfMonth);
    return new Date(year, month, actualDay, 23, 59, 59, 999);
  };

  const getValidStartDate = (year, month, targetDay) => {
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const actualDay = Math.min(targetDay, lastDayOfMonth);
    return new Date(year, month, actualDay, 0, 0, 0, 0);
  };

  let startDate;
  let endDate;
  let nextPayday;

  if (currentDay >= payday) {
    // Current cycle started on this month's payday and ends next month's payday
    startDate = getValidStartDate(currentYear, currentMonth, payday);
    endDate = getValidDate(currentYear, currentMonth + 1, payday);
    nextPayday = getValidStartDate(currentYear, currentMonth + 1, payday);
  } else {
    // Current cycle started on last month's payday and ends this month's payday
    startDate = getValidStartDate(currentYear, currentMonth - 1, payday);
    endDate = getValidDate(currentYear, currentMonth, payday);
    nextPayday = getValidStartDate(currentYear, currentMonth, payday);
  }

  const diffMs = nextPayday.getTime() - today.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const isPaydayToday = currentDay === payday;

  return {
    payday,
    startDate,
    endDate,
    nextPayday,
    daysRemaining,
    isPaydayToday,
  };
};

module.exports = { calculateBillingCycle };
