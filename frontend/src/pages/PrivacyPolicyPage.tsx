import { Link } from "react-router-dom";
import { ArrowLeft, BrainCircuit, ShieldCheck } from "lucide-react";

export default function PrivacyPolicyPage() {
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
              <ShieldCheck size={26} />
            </div>
            <div>
              <p className="text-sm font-semibold text-indigo-700">
                InterviewIQ
              </p>
              <h1 className="text-3xl font-extrabold">Privacy Policy</h1>
            </div>
          </div>

          <p className="mb-8 text-sm text-slate-500">
            Last updated: November 3, 2026
          </p>

          <div className="space-y-7 text-sm leading-7 text-slate-700">
            <section>
              <h2 className="mb-2 text-xl font-bold text-[#4C1D95]">
                1. Introduction
              </h2>
              <p>
                Welcome to InterviewIQ, an AI-powered interview preparation
                platform. This Privacy Policy explains how information may be
                collected, used, stored, and protected when you use our
                application.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-bold text-[#4C1D95]">
                2. Information We Collect
              </h2>
              <p>Depending on the features you use, InterviewIQ may process:</p>
              <ul className="mt-2 list-disc space-y-2 pl-6">
                <li>Account details such as name and email address.</li>
                <li>Profile information and target job role.</li>
                <li>Interview questions and answers you submit.</li>
                <li>Resume information when you use resume-based features.</li>
                <li>Interview scores, feedback, and practice history.</li>
                <li>
                  Voice recordings or audio-related information if you use
                  voice interview features.
                </li>
              </ul>
              <p className="mt-3">
                Only include information types here that your deployed
                application actually collects or processes.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-bold text-[#4C1D95]">
                3. How We Use Information
              </h2>
              <p>Information may be used to:</p>
              <ul className="mt-2 list-disc space-y-2 pl-6">
                <li>Create and manage user accounts.</li>
                <li>Provide interview practice and assessment features.</li>
                <li>Generate feedback and preparation recommendations.</li>
                <li>Maintain interview history and progress information.</li>
                <li>Protect the application and troubleshoot technical issues.</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-bold text-[#4C1D95]">
                4. Data Storage and Security
              </h2>
              <p>
                InterviewIQ uses application infrastructure to process and
                store information. We take reasonable steps to protect data
                against unauthorized access, alteration, or disclosure.
                However, no internet-based system can guarantee absolute
                security.
              </p>
              <p className="mt-3">
                Before publishing, describe your actual database, hosting,
                retention, and security practices in this section.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-bold text-[#4C1D95]">
                5. Third-Party Services
              </h2>
              <p>
                The application may use third-party services for functions
                such as authentication, hosting, email delivery, or AI-powered
                processing. Their handling of information is governed by
                their respective privacy policies and terms.
              </p>
              <p className="mt-3">
                List the actual providers used by your deployed application
                before publishing this policy.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-bold text-[#4C1D95]">
                6. Data Retention and Deletion
              </h2>
              <p>
                Information should be retained only for as long as needed for
                the purposes described in this policy or as required by
                applicable law. Add your actual account deletion process and
                data retention periods before launch.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-bold text-[#4C1D95]">
                7. Your Choices
              </h2>
              <p>
                You should be able to contact the InterviewIQ team to ask
                questions about your information or request assistance with
                your account, subject to applicable law and the application's
                available capabilities.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-bold text-[#4C1D95]">
                8. Children's Privacy
              </h2>
              <p>
                InterviewIQ is not intended for children who are not permitted
                to use the service under applicable law. Add the age
                requirements that apply to your service before publication.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-bold text-[#4C1D95]">
                9. Changes to This Policy
              </h2>
              <p>
                This Privacy Policy may be updated when the application or its
                data practices change. The latest version should be published
                on this page with its updated date.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-bold text-[#4C1D95]">
                10. Contact Us
              </h2>
              <p>
                For privacy-related questions, contact the InterviewIQ team
                using the support email address published on our website.
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