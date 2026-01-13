"use client";

import { ShieldCheck, Users, Shield } from "lucide-react";

interface TrustCardProps {
  icon: React.ReactNode;
  title: string;
  bullets: Array<{
    text: string;
    link?: { text: string; href: string };
  }>;
}

function TrustCard({ icon, title, bullets }: TrustCardProps) {
  return (
    <div className="glass-sub p-6 rounded-2xl h-full flex flex-col">
      <div className="flex items-center gap-3 mb-5">
        {icon}
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          {title}
        </h3>
      </div>
      <ul className="space-y-4 flex-grow">
        {bullets.map((bullet, index) => (
          <li key={index} className="flex gap-3 text-gray-600 dark:text-gray-300 leading-relaxed">
            <span className="text-cyan-500 dark:text-cyan-400 mt-1 text-xs">●</span>
            <span>
              {bullet.link ? (
                <>
                  {bullet.text.split(bullet.link.text)[0]}
                  <a
                    href={bullet.link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
                  >
                    {bullet.link.text}
                  </a>
                  {bullet.text.split(bullet.link.text)[1]}
                </>
              ) : (
                bullet.text
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TrustSection() {
  return (
    <section className="w-full px-4 md:px-8 lg:px-12 mt-20">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100 mb-4">
          A blockchain bridge you can actually trust.
        </h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          A safe spot for Snowbridge ecosystem, with a trusted system.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <TrustCard
          icon={
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-200 dark:shadow-pink-900/30">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
          }
          title="More Proofs, Less Trust"
          bullets={[
            {
              text: "Secure interoperability by exchanging cryptographically-secure proofs of finality between on-chain light clients.",
            },
            {
              text: "Offchain relayers are untrusted and have no capability to forge messages. Anyone can spin up their own relayers.",
            },
          ]}
        />

        <TrustCard
          icon={
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-200 dark:shadow-purple-900/30">
              <Users className="w-6 h-6 text-white" />
            </div>
          }
          title="Governed by the Polkadot Community"
          bullets={[
            {
              text: "Snowbridge is a system bridge that is part of the Polkadot SDK.",
              link: {
                text: "Polkadot SDK",
                href: "https://github.com/paritytech/polkadot-sdk/tree/master/bridges/snowbridge",
              },
            },
            {
              text: "Upgrades are voted upon using OpenGov.",
              link: {
                text: "OpenGov",
                href: "https://wiki.polkadot.com/learn/learn-polkadot-opengov/",
              },
            },
            {
              text: "Built and maintained using funding from the Polkadot Treasury.",
            },
          ]}
        />

        <TrustCard
          icon={
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30">
              <Shield className="w-6 h-6 text-white" />
            </div>
          }
          title="Defense in Depth"
          bullets={[
            {
              text: "10+ incremental code audits.",
              link: {
                text: "code audits",
                href: "https://docs.snowbridge.network/security/audits",
              },
            },
            {
              text: "An active bug bounty program that has disbursed over $40,000 in rewards.",
            },
          ]}
        />
      </div>

    </section>
  );
}
