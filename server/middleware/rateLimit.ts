// MVP-2 Security: rate-limiting для критичных endpoints.
// IP-based, поведение: возвращает 429 с заголовком Retry-After.

import rateLimit from "express-rate-limit";

// Login: 5 попыток на IP за 15 минут (защита от brute-force паролей)
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "rate_limit_exceeded", retryAfter: "15 минут" },
  // skipSuccessfulRequests: false — каждая попытка считается, в т.ч. успешная
});

// Регистрация: 3 за час на IP (защита от спама pending-аккаунтов)
export const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "rate_limit_exceeded", retryAfter: "1 час" },
});

// Pre-check кода: 30 в минуту на IP (защита от перебора кодов)
export const teamCheckRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "rate_limit_exceeded", retryAfter: "1 минута" },
});

// Join: 10 в минуту на IP (защита от создания фейковых команд)
export const teamJoinRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "rate_limit_exceeded", retryAfter: "1 минута" },
});

// Reset password (super_admin → trainer): 20 в час на IP (низкий лимит)
export const resetPasswordRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "rate_limit_exceeded", retryAfter: "1 час" },
});
