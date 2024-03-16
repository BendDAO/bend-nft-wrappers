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
  [Network.sepolia]: "0x4e3A064eF42DD916347751DfA7Ca1dcbA49d3DA8",
  [Network.goerli]: "0x784e3fcfc86f7806f52a24571d8534c916c8c609",
  [Network.mainnet]: "0x23581767a106ae21c074b2276D25e5C3e136a68b",
};

export const Otherdeed: Params<string> = {
  [Network.sepolia]: "0x3e9FE826da6Be171EE99eaFb40a97754997852BC",
  [Network.goerli]: "0xC1272E57eA9086832eEEb7810B7553D75e0CE419",
  [Network.mainnet]: "0x34d85c9CDeB23FA97cb08333b511ac86E1C4E258",
};

export const MAYC: Params<string> = {
  [Network.sepolia]: "0xD0ff8ae7E3D9591605505D3db9C33b96c4809CDC",
  [Network.goerli]: "0x15596c27900e12a9cfc301248e21888751f61c19",
  [Network.mainnet]: "0x60E4d786628Fea6478F785A6d7e704777c86a7c6",
};
