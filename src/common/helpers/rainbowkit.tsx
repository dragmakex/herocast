import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, midnightTheme } from "@rainbow-me/rainbowkit";
import { optimism, mainnet, base, arbitrum, polygon } from "@wagmi/core/chains";
import { http } from "@wagmi/core";
import { createPublicClient } from "viem";
import { isDev } from "./env";
import { Chains } from "@paywithglide/glide-js";

const optimismHttp = http(
  `https://opt-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
);

const mainnetHttp = http(
  `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
);

export const publicClient = createPublicClient({
  chain: optimism,
  transport: optimismHttp,
});

export const publicClientTestnet = createPublicClient({
  chain: Chains.OptimismTestnet,
  transport: http(),
});

export const config = getDefaultConfig({
  appName: "herocast",
  projectId: "b34f1019e33e832831871e41741f13fc",
  chains: isDev()
    ? [mainnet, Chains.OptimismTestnet, Chains.BaseTestnet]
    : [optimism, mainnet, base, arbitrum, polygon],
  ssr: true,
});

export const rainbowKitTheme = midnightTheme({
  accentColorForeground: "white",
  borderRadius: "small",
  fontStack: "system",
});
