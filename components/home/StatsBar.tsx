"use client";

import { Coins, ArrowLeftRight, Network } from "lucide-react";

interface StatItemProps {
  icon: React.ReactNode;
  value: string;
  label: string;
}

function StatItem({ icon, value, label }: StatItemProps) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <div>
        <p className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">
          {value}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  );
}

export function StatsBar() {
  return (
    <section className="w-full px-4 md:px-8 lg:px-12 mt-16">
      <div className="glass-sub py-8 px-6 md:px-12">
        <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
          Trustless, secure
          <br />
          cross-chain transfers.
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-lg">
          Move assets between Ethereum and the Polkadot ecosystem with ease,
          without compromising on security.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <StatItem
            icon={
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-md shadow-pink-200 dark:shadow-pink-900/30">
                <Coins className="w-5 h-5 text-white" />
              </div>
            }
            value="$1B+"
            label="All-time volume"
          />
          <StatItem
            icon={
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shadow-md shadow-purple-200 dark:shadow-purple-900/30">
                <ArrowLeftRight className="w-5 h-5 text-white" />
              </div>
            }
            value="360K+"
            label="Cross-chain transactions"
          />
          <StatItem
            icon={
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-md shadow-cyan-200 dark:shadow-cyan-900/30">
                <Network className="w-5 h-5 text-white" />
              </div>
            }
            value="7+"
            label="Connected Networks"
          />
        </div>
      </div>
    </section>
  );
}
