export enum Network {
  sepolia = "sepolia",
  goerli = "goerli",
  mainnet = "mainnet",
}

export interface Params<T> {
  [Network.sepolia]: T;
  [Network.goerli]: T;
  [Network.mainnet]: T;
}

export const getParams = <T>({ sepolia, goerli, mainnet }: Params<T>, network: string): T => {
  network = Network[network as keyof typeof Network];
  switch (network) {
    case Network.sepolia:
      return sepolia;
    case Network.goerli:
      return goerli;
    case Network.mainnet:
      return mainnet;
    default:
      return goerli;
  }
};

const INFURA_KEY = process.env.INFURA_KEY || "";
const ALCHEMY_KEY = process.env.ALCHEMY_KEY || "";

export const NETWORKS_RPC_URL: Params<string> = {
  [Network.sepolia]: ALCHEMY_KEY
    ? `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`
    : `https://sepolia.infura.io/v3/${INFURA_KEY}`,
  [Network.goerli]: ALCHEMY_KEY
    ? `https://eth-goerli.g.alchemy.com/v2/${ALCHEMY_KEY}`
    : `https://goerli.infura.io/v3/${INFURA_KEY}`,
  [Network.mainnet]: ALCHEMY_KEY
    ? `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
    : `https://mainnet.infura.io/v3/${INFURA_KEY}`,
};

export const Moonbirds: Params<string> = {
  [Network.sepolia]: "",
  [Network.goerli]: "0x784e3fcfc86f7806f52a24571d8534c916c8c609",
  [Network.mainnet]: "0x23581767a106ae21c074b2276D25e5C3e136a68b",
};
