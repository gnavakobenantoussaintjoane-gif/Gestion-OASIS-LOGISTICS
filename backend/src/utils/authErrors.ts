/** A service outage must not be mistaken for an invalid password/session. */
export function isTemporaryAuthError(
  error: { name?: string; status?: number } | null | undefined,
) {
  return (
    !!error &&
    (error.name === "AuthRetryableFetchError" ||
      error.status === 0 ||
      (error.status !== undefined && error.status >= 500))
  );
}
