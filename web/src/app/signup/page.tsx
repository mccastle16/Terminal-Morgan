import Link from "next/link";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { SiteFooter, SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Create an account — CO_ Network",
};

const AFTER_SIGNUP = [
  "Search the directory and claim your business — or add it if it isn't indexed yet.",
  "Verify ownership with a one-time code sent to the phone number on file.",
  "Review everything we know, correct it, and unlock your benchmark and connections.",
];

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col bg-void">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 pb-16 pt-20">
        <div className="mx-auto grid max-w-3xl grid-cols-1 gap-16 md:grid-cols-2">
          <div>
            <h1 className="text-heading-sm font-w510 text-paper">Create an account</h1>
            <p className="mt-2 text-body-sm text-fog">
              Free for business owners in Coral Gables.
            </p>
            <AuthForm mode="signup" />
            <p className="mt-8 text-caption text-fog">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-mist underline decoration-graphite underline-offset-4 hover:decoration-mist"
              >
                Log in
              </Link>
              .
            </p>
          </div>
          <div className="pt-2 md:pt-12">
            <p className="text-label font-w510 uppercase tracking-wide text-ash">
              What happens next
            </p>
            <ol className="mt-4 space-y-5">
              {AFTER_SIGNUP.map((step, i) => (
                <li key={step} className="flex gap-4">
                  <span className="text-subheading font-w510 text-ash">{i + 1}</span>
                  <p className="text-caption font-normal leading-relaxed text-fog">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
