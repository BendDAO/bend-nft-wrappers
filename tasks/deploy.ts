/* eslint-disable @typescript-eslint/ban-ts-comment */
import { task } from "hardhat/config";
import { getParams, MAYC, Moonbirds, Otherdeed } from "./config";
import { IWrapperRegistry, IWrapperValidator } from "../typechain-types";
import {
  deployContract,
  deployContractWithID,
  deployProxyContract,
  deployProxyContractWithID,
  getContract,
  getContractAddressFromDB,
  getContractFromDB,
  waitForTx,
} from "./utils/helpers";
import { verifyEtherscanContract } from "./utils/verification";
import { BigNumberish } from "ethers";

task("deploy:WrapperRegistry", "Deploy wrapper registry").setAction(async (_, { network, run }) => {
  await run("set-DRE");
  await run("compile");
  const networkName = network.name;

  const registry = await deployProxyContract("WrapperRegistry", [], true);
  console.log("WrapperRegistry:", registry.address);
});

task("deploy:BitmapValidator", "Deploy BitmapValidator")
  .addParam("name", "validator name")
  .addParam("asset", "asset address")
  .setAction(async ({ name, asset }, { network, run }) => {
    await run("set-DRE");
    await run("compile");
    const networkName = network.name;

    const initData: BigNumberish[] = [];

    const validator = await deployProxyContractWithID(name, "BitmapValidator", [asset, initData], true);
    console.log("validator:", validator.address);
  });

task("deploy:MoonbirdsWrapper", "Deploy moonbirds wrapper").setAction(async (_, { network, run }) => {
  await run("set-DRE");
  await run("compile");
  const networkName = network.name;

  const moonbirds = getParams(Moonbirds, networkName);
  console.log("moonbirds:", moonbirds);
  if (moonbirds === undefined || moonbirds === "") {
    throw Error("invalid moonbirds address");
  }

  const validator = await deployProxyContract("MoonbirdsValidator", [moonbirds], true);
  console.log("validator:", validator.address);

  const moonbirdsWrapper = await deployProxyContract(
    "MoonbirdsWrapper",
    [moonbirds, validator.address, "Moonbirds Wrapper", "WMOONBIRD"],
    true
  );
  console.log("MoonbirdsWrapper:", moonbirdsWrapper.address);

  await run("config:registerWrapper", { wrapper: moonbirdsWrapper.address });
});

task("deploy:Otherdeed:KodaWrapper", "Deploy koda wrapper").setAction(async (_, { network, run }) => {
  await run("set-DRE");
  await run("compile");
  const networkName = network.name;

  const otherdeed = getParams(Otherdeed, networkName);
  console.log("otherdeed:", otherdeed);
  if (otherdeed === undefined || otherdeed === "") {
    throw Error("invalid otherdeed address");
  }

  const kodaBitMapData: BigNumberish[] = [];

  const validator = await deployProxyContractWithID(
    "KodaValidator",
    "BitmapValidator",
    [otherdeed, kodaBitMapData],
    true
  );
  // const validatorAddr = await getContractAddressFromDB("KodaValidator");
  // const validator = await getContract("BitmapValidator", validatorAddr);
  console.log("validator:", validator.address);

  const kodaWrapper = await deployProxyContractWithID(
    "KodaWrapper",
    "KodaWrapper",
    [otherdeed, validator.address, "Otherdeed Koda Wrapper", "WKODA"],
    true
  );
  console.log("KodaWrapper:", kodaWrapper.address);

  await run("config:registerWrapper", { wrapper: kodaWrapper.address });
});

task("config:registerWrapper", "Register wrapper")
  .addParam("wrapper", "wrapper address")
  .setAction(async ({ wrapper }, { run }) => {
    await run("set-DRE");
    const registry = await getContractFromDB<IWrapperRegistry>("WrapperRegistry");
    await waitForTx(await registry.registerWrapper(wrapper));
    console.log("ok");
  });

task("config:unregisterWrapper", "Register wrapper")
  .addParam("wrapper", "wrapper address")
  .setAction(async ({ wrapper }, { run }) => {
    await run("set-DRE");
    const registry = await getContractFromDB<IWrapperRegistry>("WrapperRegistry");
    console.log("registry:", registry.address);
    await waitForTx(await registry.unregisterWrapper(wrapper));
    console.log("ok");
  });
