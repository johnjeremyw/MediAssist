// Shared helpers for mapping backend DoseLog shapes to the UI's simple
// { status: 'taken' | 'missed' | 'upcoming' } vocabulary used throughout
// the screens (and originally by data.js's mock fixtures).

export function doseUiStatus(status) {
  if (status === 'TAKEN') return 'taken';
  if (status === 'MISSED') return 'missed';
  return 'upcoming'; // PENDING or SNOOZED
}

export function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function formatDayHeading(date = new Date()) {
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

// "8:00 AM" -> "08:00" (24h), what the backend's ReminderTime.timeOfDay expects.
export function to24Hour(time12h) {
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (modifier === 'PM' && hours !== 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// "08:00" (24h, backend's ReminderTime.timeOfDay) -> "8:00 AM". Inverse of to24Hour.
export function formatTimeOfDay(timeOfDay24h) {
  const [hh, mm] = timeOfDay24h.split(':').map(Number);
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// "DAILY" -> "Every day"; "MON,WED,FRI" -> "Mon, Wed, Fri".
export function formatDaysOfWeek(daysOfWeek) {
  if (!daysOfWeek || daysOfWeek === 'DAILY') return 'Every day';
  const label = (code) => code.charAt(0) + code.slice(1).toLowerCase();
  return daysOfWeek.split(',').map((d) => label(d.trim())).join(', ');
}

// Refill tracking is opt-in (quantityRemaining is null until the patient
// sets a starting count), so this must not fire for untracked medications.
export function isLowStock(medication) {
  if (!medication || medication.quantityRemaining === null || medication.quantityRemaining === undefined) {
    return false;
  }
  const threshold = medication.refillThreshold ?? 7;
  return medication.quantityRemaining <= threshold;
}

export function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}
