import { safeGraphQL, bearer, adminLoginAndGetTokens, getGQLError } from './testUtilsAPI.js';
import { expect } from '../globalConfig.api.js';

// reusable method for creating rider schedule
const CREATE_SCHEDULES_QUERY = `
mutation ($schedules: [DayScheduleRequest!]!) { administrator { rider { createSchedules(schedules: $schedules) } } }
`;

// Fixed system timezone offset used by backend (UTC+8)
const TIMEZONE_OFFSET = '+08:00';

/**
 * Formats a Date object into the API-required time format:
 * HH:mm:ss.SSS+08:00
 */
function formatTime(date) {
  return date.toISOString().split('T')[1].replace('Z', '') + TIMEZONE_OFFSET;
}

/**
 * Gets today's date in YYYY-MM-DD form (local date)
 */
function getFormattedDate() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * Create a rider schedule through the admin API.
 */
export async function createRiderScheduleAsAdmin(api, riderId) {
  // 1) Admin login
  const { accessToken, raw: loginRes } = await adminLoginAndGetTokens(api, {
    username: process.env.ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD,
  });

  if (!loginRes.ok) {
    throw new Error('Failed admin login: cannot create schedules');
  }

  // 2) Build date + times
  const now = new Date();

  const start = new Date(now.getTime() + 10 * 60 * 1000); // +10 mins
  const end = new Date(start.getTime() + 60 * 60 * 1000); // +1 hour

  const scheduleDate = getFormattedDate();
  const startTime = formatTime(start);
  const endTime = formatTime(end);

  // 3) Build schedules payload
  const schedules = [
    {
      riderId,
      scheduleDate,
      startTime,
      endTime,
    },
  ];

  // 4) Hit the mutation
  const createRiderScheduleRes = await safeGraphQL(api, {
    query: CREATE_SCHEDULES_QUERY,
    variables: { schedules },
    headers: bearer(accessToken),
  });

  // Handle success OR known conflict "already exists"
  if (!createRiderScheduleRes.ok) {
    const { message } = getGQLError(createRiderScheduleRes);
    const alreadyExists = typeof message === 'string' && /already exists/i.test(message);

    if (!alreadyExists) {
      // Any other error → fail hard
      expect(
        createRiderScheduleRes.ok,
        createRiderScheduleRes.error || `Failed to create schedule for rider ${riderId}`
      ).toBe(true);
    }

    // If it's the "already exists" case, treat it as success
    console.log(`Schedule for Rider ${riderId} already exists — continuing without error.`);
  } else {
    // Success case
    console.log(
      `  Created rider schedule for Rider ${riderId}:\n` +
        `  Date: ${scheduleDate}\n` +
        `  Start: ${startTime}\n` +
        `  End:   ${endTime}`
    );
  }
}
