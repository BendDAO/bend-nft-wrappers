/* eslint-disable @typescript-eslint/ban-ts-comment */
import { task } from "hardhat/config";
import { getContractAddressFromDB } from "./utils/helpers";
import { verifyEtherscanContract } from "./utils/verification";

task("prepareUpgrade", "Deploy new implmentation for upgrade")
  .addParam("proxyid", "The proxy contract id")
  .addParam("implid", "The new impl contract id")
  .setAction(async ({ proxyid, implid }, { ethers, upgrades, run }) => {
    await run("set-DRE");
    await run("compile");
    const proxyAddress = await getContractAddressFromDB(proxyid);
    const upgradeable = await ethers.getContractFactory(implid);
    console.log(`Preparing ${proxyid} upgrade at proxy ${proxyAddress}`);
    // @ts-ignore
    const implAddress = await upgrades.prepareUpgrade(proxyAddress, upgradeable);
    console.log("Implmentation at:", implAddress);
    const adminAddress = await upgrades.erc1967.getAdminAddress(proxyAddress);
    console.log("Proxy admin at:", adminAddress);
    await verifyEtherscanContract(implAddress.toString(), []);
  });

task("upgrade", "upgrade contract")
  .addParam("proxyid", "The proxy contract id")
  .addOptionalParam("implid", "The new impl contract id")
  .addOptionalParam("skipcheck", "Skip upgrade storage check or not")
  .setAction(async ({ skipcheck, proxyid, implid }, { ethers, upgrades, run }) => {
    await run("set-DRE");
    await run("compile");
    if (!implid) {
      implid = proxyid;
    }
    const proxyAddress = await getContractAddressFromDB(proxyid);
    const upgradeable = await ethers.getContractFactory(implid);
    console.log(`Preparing upgrade proxy ${proxyid}: ${proxyAddress} with new ${implid}`);
    // @ts-ignore
    const upgraded = await upgrades.upgradeProxy(proxyAddress, upgradeable, { unsafeSkipStorageCheck: !!skipcheck });
    await upgraded.deployed();
    const implAddress = await upgrades.erc1967.getImplementationAddress(upgraded.address);
    console.log("New implmentation at: ", implAddress);
    await verifyEtherscanContract(implAddress, []);
  });

task("forceImport", "force import implmentation to proxy")
  .addParam("proxy", "The proxy address")
  .addParam("implid", "The new impl contract id")
  .setAction(async ({ proxy, implid }, { ethers, upgrades, run }) => {
    await run("set-DRE");
    await run("compile");
    const upgradeable = await ethers.getContractFactory(implid);
    console.log(`Import proxy: ${proxy} with ${implid}`);
    // @ts-ignore
    await upgrades.forceImport(proxy, upgradeable);
  });
