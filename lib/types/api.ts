export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
}

export function apiSuccess<T>(data: T, message: string = "Success"): Response {
  const body: ApiResponse<T> = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
  return Response.json(body, { status: 200 });
}

export function apiCreated<T>(data: T, message: string = "Created"): Response {
  const body: ApiResponse<T> = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
  return Response.json(body, { status: 201 });
}

export function apiError(
  message: string,
  error: string,
  status: number = 400
): Response {
  const body: ApiResponse = {
    success: false,
    message,
    error,
    timestamp: new Date().toISOString(),
  };
  return Response.json(body, { status });
}

export function apiUnauthorized(message: string = "Unauthorized"): Response {
  return apiError(message, "UNAUTHORIZED", 401);
}

export function apiForbidden(message: string = "Forbidden"): Response {
  return apiError(message, "FORBIDDEN", 403);
}

export function apiNotFound(message: string = "Not found"): Response {
  return apiError(message, "NOT_FOUND", 404);
}

export function apiConflict(message: string = "Conflict"): Response {
  return apiError(message, "CONFLICT", 409);
}

export function apiRateLimited(message: string = "Rate limited"): Response {
  return apiError(message, "RATE_LIMITED", 429);
}

export function apiInternal(message: string = "Internal server error"): Response {
  return apiError(message, "INTERNAL_ERROR", 500);
}
