/* eslint-disable @typescript-eslint/ban-ts-comment */
import { task } from "hardhat/config";
import { getParams } from "./config";
import { WrapperRegistry, MoonbirdsWrapper, KodaWrapper } from "../typechain-types";
import { getContract, getContractAddressFromDB, getContractFromDB, waitForTx } from "./utils/helpers";
import { verifyEtherscanContract } from "./utils/verification";
import { BigNumberish } from "ethers";

task("veirfy:Implementation", "Verify WrapperRegistry")
  .addParam("proxyid", "The proxy contract id")
  .setAction(async ({ proxyid }, { network, upgrades, run }) => {
    await run("set-DRE");
    await run("compile");
    const networkName = network.name;

    const proxyAddress = await getContractAddressFromDB(proxyid);
    const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    console.log("proxyAddress:", proxyAddress, "implAddress:", implAddress);
    await verifyEtherscanContract(implAddress, []);
  });

task("veirfy:KodaWrapper", "Verify KodaWrapper").setAction(async (_, { network, upgrades, run }) => {
  await run("set-DRE");
  await run("compile");
  const networkName = network.name;

  const proxyAddress = await getContractAddressFromDB("KodaWrapper");
  const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("proxyAddress:", proxyAddress, "implAddress:", implAddress);

  const kodaWrapper = (await getContract("KodaWrapper", implAddress)) as KodaWrapper;

  console.log("kodaWrapper Implementation:", kodaWrapper.address);
  await verifyEtherscanContract(kodaWrapper.address, [], "contracts/KodaWrapper.sol:KodaWrapper");
});

task("veirfy:MoonbirdsWrapper", "Verify MoonbirdsWrapper").setAction(async (_, { network, run }) => {
  await run("set-DRE");
  await run("compile");
  const networkName = network.name;

  const moonbirdsWrapper = await getContractFromDB<MoonbirdsWrapper>("MoonbirdsWrapper");

  console.log("moonbirdsWrapper:", moonbirdsWrapper.address);
  await verifyEtherscanContract(moonbirdsWrapper.address, []);
});
