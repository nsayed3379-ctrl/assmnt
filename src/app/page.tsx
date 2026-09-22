import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">Vecosoft</h1>
      <p className="mt-1 text-sm font-medium text-brand">Practical Hiring & Skill Assessment Platform</p>
      <p className="mt-6 text-sm text-slate-500">
        If you've been shortlisted, check your email for your access code and sign in below.
      </p>
      <Link
        href="/assessment/login"
        className="mt-6 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-dark"
      >
        Candidate Sign In
      </Link>
    </main>
  );
}
