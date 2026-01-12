"use client";

import { Layers, MessageSquare, Coins } from "lucide-react";
import Image from "next/image";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  image?: string;
  imageAlt?: string;
  href?: string;
}

function FeatureCard({
  icon,
  title,
  description,
  image,
  imageAlt,
  href,
}: FeatureCardProps) {
  const CardWrapper = href ? "a" : "div";
  const cardProps = href
    ? {
        href,
        target: "_blank",
        rel: "noopener noreferrer",
      }
    : {};

  return (
    <CardWrapper
      {...cardProps}
      className={`glass-sub p-6 rounded-2xl h-full flex flex-col ${href ? "group cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02]" : ""}`}
    >
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
        {description}
      </p>
      {image && (
        <div className="mt-auto relative h-32 rounded-xl overflow-hidden">
          <Image
            src={image}
            alt={imageAlt || title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}
    </CardWrapper>
  );
}

export function FeaturesSection() {
  return (
    <section className="w-full px-4 md:px-8 lg:px-12 mt-20">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100 mb-4">
          Built for all the ways you transfer
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FeatureCard
          icon={
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-200 dark:shadow-cyan-900/30">
              <Layers className="w-6 h-6 text-white" />
            </div>
          }
          title="Cross-Chain Apps"
          description="Enable seamless cross-chain functionality with your favorite Polkadot apps like Hydration and more."
          image="/images/home/hero-illustration.png"
          imageAlt="Cross-chain bridge illustration"
          href="https://app.hydration.net/trade/swap"
        />

        <FeatureCard
          icon={
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200 dark:shadow-violet-900/30">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
          }
          title="Secure Message Passing"
          description="Pass any arbitrary data between chains, enabling your dApps to communicate across any chain, verified fully."
          image="/images/home/trust-illustration.png"
          imageAlt="Secure messaging illustration"
        />

        <FeatureCard
          icon={
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200 dark:shadow-amber-900/30">
              <Coins className="w-6 h-6 text-white" />
            </div>
          }
          title="Bridge Tokens"
          description="Easily transfer tokens between Ethereum and Polkadot with low fees and fast finality."
          image="/images/home/bridge-tokens.png"
          imageAlt="Bridge tokens illustration"
          href="#transfer"
        />
      </div>
    </section>
  );
}
