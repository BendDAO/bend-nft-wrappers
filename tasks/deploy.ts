/* eslint-disable @typescript-eslint/ban-ts-comment */
import { task } from "hardhat/config";
import { getParams, MAYC, Moonbirds, Otherdeed } from "./config";
import { IWrapperRegistry } from "../typechain-types";
import {
  deployContract,
  deployContractWithID,
  deployProxyContract,
  deployProxyContractWithID,
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

  const validator = await deployProxyContract("KodaValidator", [otherdeed, kodaBitMapData], true);
  console.log("validator:", validator.address);

  const kodaWrapper = await deployProxyContractWithID(
    "KodaWrapper",
    "ERC721Wrapper",
    [otherdeed, validator.address, "Otherdeed Koda Wrapper", "WKODA"],
    true
  );
  console.log("KodaWrapper:", kodaWrapper.address);

  await run("config:registerWrapper", { wrapper: kodaWrapper.address });
});

task("deploy:MAYC:M2Wrapper", "Deploy MAYC M2 wrapper").setAction(async (_, { network, run }) => {
  await run("set-DRE");
  await run("compile");
  const networkName = network.name;

  const mayc = getParams(MAYC, networkName);
  console.log("MAYC:", mayc);
  if (mayc === undefined || mayc === "") {
    throw Error("invalid MAYC address");
  }

  const m2BitMapData: BigNumberish[] = [];

  const validator = await deployProxyContract("MAYCM2Validator", [mayc, m2BitMapData], true);
  console.log("validator:", validator.address);

  const m2Wrapper = await deployProxyContractWithID(
    "MAYCM2Wrapper",
    "ERC721Wrapper",
    [mayc, validator.address, "MAYC M2 Wrapper", "WMAYCM2"],
    true
  );
  console.log("m2Wrapper:", m2Wrapper.address);

  await run("config:registerWrapper", { wrapper: m2Wrapper.address });
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
