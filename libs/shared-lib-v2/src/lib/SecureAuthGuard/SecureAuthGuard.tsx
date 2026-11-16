'use client';

// Importing the module installs the global axios 401 → refresh → retry handler in the browser.
import '../../utils/API/secureAuthInterceptor';

/** App Router entry point for the secure auth interceptor — mount once in the root layout. */
export default function SecureAuthGuard() {
  return null;
}
