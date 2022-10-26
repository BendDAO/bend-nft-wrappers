/* eslint-disable @typescript-eslint/no-explicit-any */
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, network, upgrades } from "hardhat";
import { parseEther } from "ethers/lib/utils";
import {
  WrapperRegistry,
  ERC721Wrapper,
  MoonbirdsValidator,
  MoonbirdsWrapper,
  BitmapValidator,
  MintableERC721,
} from "../typechain-types";
import { getParams, Moonbirds } from "./config";
import { waitForTx } from "../tasks/utils/helpers";
import { constants } from "ethers";
import { MockMoonbirds } from "../typechain-types/contracts/mocks";
import { MockMoonbirdsFlashLoanReceiver } from "../typechain-types/contracts/mocks/MockMoonbirdsFlashLoanReceiver";

export interface Env {
  initialized: boolean;
  fee: number;
  accounts: SignerWithAddress[];
  admin: SignerWithAddress;
  chainId: number;
}

export interface Contracts {
  initialized: boolean;

  // wrappers
  wrapperRegistry: WrapperRegistry;

  otherdeed: MintableERC721;
  kodaValidator: BitmapValidator;
  kodaWrapper: ERC721Wrapper;

  // moonbirds
  mockMoonbirds: MockMoonbirds;
  moonbirdsValidator: MoonbirdsValidator;
  moonbirdsWrapper: MoonbirdsWrapper;
  mockMoonbirdsFlashLoanReceiver: MockMoonbirdsFlashLoanReceiver;
}

export async function setupEnv(env: Env, contracts: Contracts): Promise<void> {
  env.fee = 100;
  env.accounts = await ethers.getSigners();
  env.admin = env.accounts[0];
  env.chainId = (await ethers.provider.getNetwork()).chainId;

  await waitForTx(await contracts.mockMoonbirds.setNestingOpen(true));

  // add wrappers
  await waitForTx(await contracts.wrapperRegistry.registerWrapper(contracts.moonbirdsWrapper.address));
}

export async function setupContracts(): Promise<Contracts> {
  const networkName = network.name;

  // config
  const moonbirdParams = getParams(Moonbirds, networkName);

  // registry
  const wrapperRegistryFactory = await ethers.getContractFactory("WrapperRegistry");
  const wrapperRegistry = await wrapperRegistryFactory.deploy();

  // Koda wrapper
  const otherdeedFactory = await ethers.getContractFactory("MintableERC721");
  const otherdeed = await otherdeedFactory.deploy("MockOtherdeed", "LAND");

  const kodaValidatorFactory = await ethers.getContractFactory("BitmapValidator");
  const kodaValidator = await kodaValidatorFactory.deploy(otherdeed.address, []);

  const kodaWrapperFactory = await ethers.getContractFactory("MoonbirdsWrapper");
  const kodaWrapper = await kodaWrapperFactory.deploy(
    otherdeed.address,
    kodaValidator.address,
    "Otherdeed Koda Wrapper",
    "WKODA"
  );

  // Moonbirds wrapper
  const mockMoonbirdsFactory = await ethers.getContractFactory("MockMoonbirds");
  const mockMoonbirds = await mockMoonbirdsFactory.deploy("MockMoonbirds", "MOONBIRD");

  const moonbirdsValidatorFactory = await ethers.getContractFactory("MoonbirdsValidator");
  const moonbirdsValidator = await moonbirdsValidatorFactory.deploy(mockMoonbirds.address);

  const moonbirdsWrapperFactory = await ethers.getContractFactory("MoonbirdsWrapper");
  const moonbirdsWrapper = await moonbirdsWrapperFactory.deploy(
    mockMoonbirds.address,
    moonbirdsValidator.address,
    "Moonbirds Wrapper",
    "WMOONBIRD"
  );

  const moonbirdsReceiverFactory = await ethers.getContractFactory("MockMoonbirdsFlashLoanReceiver");
  const mockMoonbirdsFlashLoanReceiver = await moonbirdsReceiverFactory.deploy();

  /** Return contracts
   */
  return {
    initialized: true,

    wrapperRegistry,

    otherdeed,
    kodaValidator,
    kodaWrapper,

    mockMoonbirds,
    moonbirdsValidator,
    moonbirdsWrapper,
    mockMoonbirdsFlashLoanReceiver,
  } as Contracts;
}

export class Snapshots {
  ids = new Map<string, string>();

  async capture(tag: string): Promise<void> {
    this.ids.set(tag, await this.evmSnapshot());
  }

  async revert(tag: string): Promise<void> {
    await this.evmRevert(this.ids.get(tag) || "1");
    await this.capture(tag);
  }

  async evmSnapshot(): Promise<any> {
    return await ethers.provider.send("evm_snapshot", []);
  }

  async evmRevert(id: string): Promise<any> {
    return await ethers.provider.send("evm_revert", [id]);
  }
}

const contracts: Contracts = { initialized: false } as Contracts;
const env: Env = { initialized: false } as Env;
const snapshots = new Snapshots();
export function makeSuite(name: string, tests: (contracts: Contracts, env: Env, snapshots: Snapshots) => void): void {
  describe(name, () => {
    let _id: any;
    before(async () => {
      if (!env.initialized && !contracts.initialized) {
        Object.assign(contracts, await setupContracts());
        await setupEnv(env, contracts);
        env.initialized = true;
        contracts.initialized = true;
        snapshots.capture("setup");
      }
      _id = await snapshots.evmSnapshot();
    });
    tests(contracts, env, snapshots);
    after(async () => {
      await snapshots.evmRevert(_id);
    });
  });
}
