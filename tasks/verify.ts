/* eslint-disable @typescript-eslint/ban-ts-comment */
import { task } from "hardhat/config";
import { getParams } from "./config";
import { WrapperRegistry, MoonbirdsWrapper, KodaWrapper } from "../typechain-types";
import { getContract, getContractAddressFromDB, getContractFromDB, waitForTx } from "./utils/helpers";
import { verifyEtherscanContract } from "./utils/verification";
import { BigNumberish } from "ethers";

task("verify:Implementation", "Verify WrapperRegistry")
  .addParam("impladdress", "The implementation contract address")
  .addParam("contractfile", "The contract source code file")
  .setAction(async ({ impladdress, contractfile }, { network, upgrades, run }) => {
    await run("set-DRE");
    await run("compile");
    const networkName = network.name;

    // contractfile: contracts/KodaWrapper.sol:KodaWrapper

    await verifyEtherscanContract(impladdress, [], contractfile);
  });

task("verify:Otherdeed:KodaWrapper", "Verify Otherdeed KodaWrapper").setAction(
  async (_, { network, upgrades, run }) => {
    await run("set-DRE");
    await run("compile");
    const networkName = network.name;

    const proxyAddress = await getContractAddressFromDB("KodaWrapper");
    const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    console.log("proxyAddress:", proxyAddress, "implAddress:", implAddress);

    const kodaWrapper = (await getContract("KodaWrapper", implAddress)) as KodaWrapper;

    console.log("kodaWrapper Implementation:", kodaWrapper.address);
    await verifyEtherscanContract(kodaWrapper.address, [], "contracts/KodaWrapper.sol:KodaWrapper");
  }
);

task("verify:MoonbirdsWrapper", "Verify MoonbirdsWrapper").setAction(async (_, { network, run }) => {
  await run("set-DRE");
  await run("compile");
  const networkName = network.name;

  const moonbirdsWrapper = await getContractFromDB<MoonbirdsWrapper>("MoonbirdsWrapper");

  console.log("moonbirdsWrapper:", moonbirdsWrapper.address);
  await verifyEtherscanContract(moonbirdsWrapper.address, []);
});
