// Countdown timer script
//
// Calculates the number of days and hours remaining until 22 November
// 2025 at 00:00 India Standard Time (IST).  The target is expressed
// in UTC (18:30 on 21 November) to avoid client time zone issues.

document.addEventListener('DOMContentLoaded', () => {
  const daysEl = document.getElementById('days');
  const hoursEl = document.getElementById('hours');
  if (!daysEl || !hoursEl) return;

  function updateCountdown() {
    // Target time: 22 Nov 2025 00:00 IST = 21 Nov 2025 18:30 UTC
    const target = new Date('2025-11-21T18:30:00Z');
    const now = new Date();
    let diffMs = target.getTime() - now.getTime();
    if (diffMs < 0) diffMs = 0;
    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    daysEl.textContent = days;
    hoursEl.textContent = hours;
  }

  // Initial call
  updateCountdown();
  // Update every hour
  setInterval(updateCountdown, 60 * 60 * 1000);
});