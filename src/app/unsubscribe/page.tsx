type Props = {
  searchParams: Promise<{ status?: string }>;
};

export default async function UnsubscribePage({ searchParams }: Props) {
  const { status } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md text-center dark:bg-gray-800">
        {status === "success" && (
          <>
            <div className="mb-4 text-5xl">✅</div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
              Unsubscribed
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              You have been successfully unsubscribed. You will no longer receive
              emails from us.
            </p>
          </>
        )}

        {status === "already" && (
          <>
            <div className="mb-4 text-5xl">ℹ️</div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
              Already Unsubscribed
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              You have already been unsubscribed from our emails.
            </p>
          </>
        )}

        {status === "not-found" && (
          <>
            <div className="mb-4 text-5xl">❓</div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
              Not Found
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              We couldn&apos;t find your subscription. The link may be invalid or
              expired.
            </p>
          </>
        )}

        {status === "invalid" && (
          <>
            <div className="mb-4 text-5xl">⚠️</div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
              Invalid Link
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              This unsubscribe link is invalid. Please use the link from your
              email.
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mb-4 text-5xl">❌</div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
              Something Went Wrong
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              An error occurred while processing your request. Please try again
              later.
            </p>
          </>
        )}

        {!status && (
          <>
            <div className="mb-4 text-5xl">📧</div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
              Unsubscribe
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Use the unsubscribe link from your email to opt out.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
