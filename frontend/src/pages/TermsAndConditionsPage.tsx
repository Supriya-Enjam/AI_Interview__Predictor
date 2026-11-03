import { Link } from "react-router-dom";
import { ArrowLeft, BrainCircuit, FileText } from "lucide-react";

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-[#FAF9FF] px-5 py-10 text-[#1F1633]">
      <div className="mx-auto max-w-4xl">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900"
        >
          <ArrowLeft size={18} />
          Back to Home
        </Link>

        <div className="rounded-3xl border border-[#E9DDF7] bg-white p-6 shadow-sm sm:p-10">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <FileText size={26} />
            </div>
            <div>
              <p className="text-sm font-semibold text-indigo-700">
                InterviewIQ
              </p>
              <h1 className="text-3xl font-extrabold">
                Terms & Conditions
              </h1>
            </div>
          </div>

          <p className="mb-8 text-sm text-slate-500">
            Last updated: November 3, 2026
          </p>

          <div className="space-y-7 text-sm leading-7 text-slate-700">
            <section>
              <h2 className="mb-2 text-xl font-bold text-[#4C1D95]">
                1. Acceptance of Terms
              </h2>
              <p>
                By accessing or using InterviewIQ, you agree to these Terms
                & Conditions. If you do not agree, please do not use the
                application.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-bold text-[#4C1D95]">
                2. About InterviewIQ
              </h2>
              <p>
                InterviewIQ is an interview preparation platform that provides
                practice questions, mock interview experiences, automated
                feedback, performance assessments, and preparation
                recommendations.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-bold text-[#4C1D95]">
                3. User Accounts
              </h2>
              <ul className="list-disc space-y-2 pl-6">
                <li>You must provide accurate registration information.</li>
                <li>You are responsible for protecting your login credentials.</li>
                <li>You must not share your account in an unauthorized way.</li>
                <li>
                  You should notify the application team if you suspect
                  unauthorized account access.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-bold text-[#4C1D95]">
                4. Acceptable Use
              </h2>
              <p>You agree not to:</p>
              <ul className="mt-2 list-disc space-y-2 pl-6">
                <li>Use the platform for unlawful activities.</li>
                <li>Attempt to access another user's account or information.</li>
                <li>Disrupt, damage, or interfere with the application.</li>
                <li>Upload malicious files or harmful content.</li>
                <li>Abuse or attempt to bypass application security controls.</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-bold text-[#4C1D95]">
                5. AI-Generated Feedback
              </h2>
              <p>
                InterviewIQ may use automated systems to evaluate interview
                answers and provide scores, feedback, and recommendations.
                These results are intended for practice and educational
                assistance only. They are estimates and may not always be
                accurate or complete.
              </p>
              <p className="mt-3">
                InterviewIQ does not guarantee job placement, interview
                selection, or employment outcomes.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-bold text-[#4C1D95]">
                6. User Content
              </h2>
              <p>
                You are responsible for the resumes, answers, and other content
                you submit. Do not upload content that you do not have the
                right to share or that violates another person's rights.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-bold text-[#4C1D95]">
                7. Intellectual Property
              </h2>
              <p>
                The InterviewIQ name, branding, application design, and
                original platform materials are owned by their respective
                owners. You may not copy, redistribute, or commercially exploit
                protected materials without permission.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-bold text-[#4C1D95]">
                8. Availability and Changes
              </h2>
              <p>
                Features may be updated, modified, suspended, or discontinued
                as the platform develops. We will make reasonable efforts to
                maintain availability, but uninterrupted access is not
                guaranteed.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-bold text-[#4C1D95]">
                9. Limitation of Liability
              </h2>
              <p>
                To the extent permitted by applicable law, InterviewIQ is not
                responsible for decisions made solely on the basis of
                automated interview scores or recommendations. Users should
                independently assess important career and employment
                decisions.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-bold text-[#4C1D95]">
                10. Changes to These Terms
              </h2>
              <p>
                These Terms may be updated as the application evolves. The
                latest version and its updated date will be published on this
                page.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-bold text-[#4C1D95]">
                11. Contact
              </h2>
              <p>
                For questions about these Terms, contact the InterviewIQ team
                using the support email address published on the website.
              </p>
              <p className="mt-2 font-semibold text-indigo-700">
                Replace this text with your real support email address.
              </p>
            </section>
          </div>

          <div className="mt-10 border-t border-[#E9DDF7] pt-6 text-center text-sm text-slate-500">
            <BrainCircuit className="mx-auto mb-2 text-indigo-600" size={24} />
            InterviewIQ · AI Interview Performance Predictor
          </div>
        </div>
      </div>
    </div>
  );
}