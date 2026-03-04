type Props = {
  searchParams: Promise<{ status?: string }>;
};

export default async function UnsubscribePage({ searchParams }: Props) {
  const { status } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md text-center">
        {status === "success" && (
          <>
            <div className="mb-4 text-5xl">✅</div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">
              Unsubscribed
            </h1>
            <p className="text-gray-600">
              You have been successfully unsubscribed. You will no longer receive
              emails from us.
            </p>
          </>
        )}

        {status === "already" && (
          <>
            <div className="mb-4 text-5xl">ℹ️</div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">
              Already Unsubscribed
            </h1>
            <p className="text-gray-600">
              You have already been unsubscribed from our emails.
            </p>
          </>
        )}

        {status === "not-found" && (
          <>
            <div className="mb-4 text-5xl">❓</div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">
              Not Found
            </h1>
            <p className="text-gray-600">
              We couldn&apos;t find your subscription. The link may be invalid or
              expired.
            </p>
          </>
        )}

        {status === "invalid" && (
          <>
            <div className="mb-4 text-5xl">⚠️</div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">
              Invalid Link
            </h1>
            <p className="text-gray-600">
              This unsubscribe link is invalid. Please use the link from your
              email.
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mb-4 text-5xl">❌</div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">
              Something Went Wrong
            </h1>
            <p className="text-gray-600">
              An error occurred while processing your request. Please try again
              later.
            </p>
          </>
        )}

        {!status && (
          <>
            <div className="mb-4 text-5xl">📧</div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">
              Unsubscribe
            </h1>
            <p className="text-gray-600">
              Use the unsubscribe link from your email to opt out.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
