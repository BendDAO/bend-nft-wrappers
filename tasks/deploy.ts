/* eslint-disable @typescript-eslint/ban-ts-comment */
import { task } from "hardhat/config";
import { getParams, MAYC, Moonbirds, Otherdeed } from "./config";
import { IWrapperRegistry } from "../typechain-types";
import {
  deployContract,
  deployProxyContract,
  getContractAddressFromDB,
  getContractFromDB,
  waitForTx,
} from "./utils/helpers";
import { verifyEtherscanContract } from "./utils/verification";
import { BigNumberish } from "ethers";

task("deploy:registry", "Deploy wrapper registry").setAction(async (_, { network, run }) => {
  await run("set-DRE");
  await run("compile");
  const networkName = network.name;

  const registry = await deployContract("WrapperRegistry", [], true);
  console.log("WrapperRegistry:", registry.address);
});

task("deploy:moonbirds", "Deploy moonbirds wrapper").setAction(async (_, { network, run }) => {
  await run("set-DRE");
  await run("compile");
  const networkName = network.name;

  const moonbirds = getParams(Moonbirds, networkName);
  console.log("moonbirds:", moonbirds);
  if (moonbirds === undefined || moonbirds === "") {
    throw Error("invalid moonbirds address");
  }

  const registry = await getContractFromDB("WrapperRegistry");
  console.log("registry:", registry.address);

  const validator = await deployContract("MoonbirdsValidator", [moonbirds], true);
  console.log("validator:", validator.address);

  const moonbirdsWrapper = await deployContract(
    "MoonbirdsWrapper",
    [moonbirds, validator.address, "Moonbirds Wrapper", "WMOONBIRD"],
    true
  );
  console.log("MoonbirdsWrapper:", moonbirdsWrapper.address);

  await run("config:registerWrapper", { wrapper: moonbirdsWrapper.address });
});

task("deploy:otherdeed-koda", "Deploy koda wrapper").setAction(async (_, { network, run }) => {
  await run("set-DRE");
  await run("compile");
  const networkName = network.name;

  const otherdeed = getParams(Otherdeed, networkName);
  console.log("otherdeed:", otherdeed);
  if (otherdeed === undefined || otherdeed === "") {
    throw Error("invalid otherdeed address");
  }

  const kodaBitMapData: BigNumberish[] = [];
  if (kodaBitMapData === undefined || kodaBitMapData.length === 0) {
    throw Error("invalid kodaBitMapData address");
  }

  const registry = await getContractFromDB("WrapperRegistry");
  console.log("registry:", registry.address);

  const validator = await deployContract("BitmapValidator", [otherdeed, kodaBitMapData], true);
  console.log("validator:", validator.address);

  const kodaWrapper = await deployContract(
    "KodaWrapper",
    [otherdeed, validator.address, "Otherdeed Koda Wrapper", "WKODA"],
    true
  );
  console.log("KodaWrapper:", kodaWrapper.address);

  await run("config:registerWrapper", { wrapper: kodaWrapper.address });
});

task("deploy:mutant-ape-m2", "Deploy mutant ape m2 wrapper").setAction(async (_, { network, run }) => {
  await run("set-DRE");
  await run("compile");
  const networkName = network.name;

  const mayc = getParams(MAYC, networkName);
  console.log("MAYC:", mayc);
  if (mayc === undefined || mayc === "") {
    throw Error("invalid MAYC address");
  }

  const m2BitMapData: BigNumberish[] = [];
  if (m2BitMapData === undefined || m2BitMapData.length === 0) {
    throw Error("invalid m2BitMapData address");
  }

  const registry = await getContractFromDB("WrapperRegistry");
  console.log("registry:", registry.address);

  const validator = await deployContract("BitmapValidator", [mayc], true);
  console.log("validator:", validator.address);

  const m2Wrapper = await deployContract(
    "MAYCM2Wrapper",
    [mayc, validator.address, "MAYC M2 Wrapper", "WMAYCM2"],
    true
  );
  console.log("m2Wrapper:", m2Wrapper.address);

  await run("config:registerWrapper", { wrapper: m2Wrapper.address });
});

task("config:createWrapper", "Create wrapper")
  .addParam("collection", "collection address")
  .addParam("validator", "validator address")
  .addParam("name", "name of wrapper")
  .addParam("symbol", "symbol of wrapper")
  .setAction(async ({ collection, validator, name, symbol }, { run }) => {
    await run("set-DRE");
    const registry = await getContractFromDB<IWrapperRegistry>("WrapperRegistry");
    const createTx = await waitForTx(await registry.createWrapper(collection, validator, name, symbol));
    if (createTx.events === undefined) {
      throw Error("createWrapper failed");
    }
    console.log("Event WrapperCreated:", createTx.events[1].args);
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
