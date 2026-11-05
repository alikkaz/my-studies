"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="error-page"><h1>Let’s try that again.</h1><p>Your study space couldn’t be loaded.</p><button className="primary" onClick={reset}>Retry</button></main>;
}
