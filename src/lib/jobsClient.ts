import { apiFetch } from '@/lib/apiClient';
import { CreateJobRequest, CreateJobResponse, JobError } from '@/types/jobs';

const GENERIC_ERROR = "Couldn't start job. Try again.";

/** Narrows an unknown JSON body to a `message`/`error` string, if present. */
function extractErrorMessage(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const record = body as Record<string, unknown>;
  if (typeof record.message === 'string' && record.message) return record.message;
  if (typeof record.error === 'string' && record.error) return record.error;
  return null;
}

/**
 * Creates a job via the BFF proxy (`apiFetch` prepends `/api/gw/`, attaches the
 * bearer token server-side, and owns 401 → refresh → retry → `/login`). Any 2xx
 * is success; the response body is parsed best-effort. Non-2xx (or a network
 * failure) throws a `JobError` carrying a user-facing message. All HTTP and
 * error-shaping lives here so the rail never sees a `Response`.
 */
export async function createJob(req: CreateJobRequest): Promise<CreateJobResponse> {
  let res: Response;
  try {
    res = await apiFetch('jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
  } catch {
    throw new JobError(GENERIC_ERROR);
  }

  if (!res.ok) {
    let message = GENERIC_ERROR;
    try {
      message = extractErrorMessage(await res.json()) ?? GENERIC_ERROR;
    } catch {
      /* no/invalid JSON body — keep the generic message */
    }
    throw new JobError(message, res.status);
  }

  // 2xx: the flow only promises `200 OK`, so tolerate an empty/non-JSON body.
  try {
    return (await res.json()) as CreateJobResponse;
  } catch {
    return {};
  }
}
