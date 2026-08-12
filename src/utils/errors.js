export const GENERIC_ERROR = "Xəta baş verdi. Zəhmət olmasa yenidən yoxlayın.";

const STATUS_MESSAGES = {
  400: "Göndərilən məlumat yanlışdır.",
  401: "Bu əməliyyat üçün hesaba daxil olmalısınız.",
  403: "Bu əməliyyata icazəniz yoxdur.",
  404: "Məlumat tapılmadı.",
  409: "Bu məlumat artıq mövcuddur.",
  422: "Göndərilən məlumat yanlışdır.",
  429: "Çox sayda sorğu göndərildi. Bir az sonra yenidən cəhd edin.",
};

export class AppError extends Error {
  constructor(message, { status = null, code = null, cause = null } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    if (cause && !this.cause) this.cause = cause;
    if (status != null) this.response = { status, data: { message } };
  }
}

export function authError(message = STATUS_MESSAGES[401]) {
  return new AppError(message, { status: 401, code: "UNAUTHENTICATED" });
}

export function notFoundError(message = STATUS_MESSAGES[404]) {
  return new AppError(message, { status: 404, code: "NOT_FOUND" });
}

export function statusOf(error) {
  return error?.status ?? error?.response?.status ?? null;
}

export function isAuthError(error) {
  return statusOf(error) === 401;
}

export function getErrorMessage(error, fallback = GENERIC_ERROR) {
  if (!error) return fallback;
  if (typeof error === "string") return error || fallback;

  const serverMessage =
    error.response?.data?.message || error.response?.data?.error;
  if (serverMessage) return serverMessage;

  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
    return "Server cavab vermədi. İnternet bağlantınızı yoxlayıb yenidən cəhd edin.";
  }
  if (error.code === "ERR_NETWORK" || (!error.response && error.request)) {
    return "Serverə qoşulmaq mümkün olmadı. İnternet bağlantınızı yoxlayın.";
  }

  const status = statusOf(error);
  if (status) {
    if (STATUS_MESSAGES[status]) return STATUS_MESSAGES[status];
    if (status >= 500) return "Serverdə xəta baş verdi. Bir az sonra yenidən cəhd edin.";
  }

  return error.userMessage || error.message || fallback;
}

export function logError(context, error) {
  console.error(`[ekinchi] ${context}:`, error);
}

export function describeError(context, error, fallback = GENERIC_ERROR) {
  logError(context, error);
  return getErrorMessage(error, fallback);
}
