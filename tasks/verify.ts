/* eslint-disable @typescript-eslint/ban-ts-comment */
import { task } from "hardhat/config";
import { getParams } from "./config";
import { MoonbirdsWrapper } from "../typechain-types";
import { getContract, getContractAddressFromDB, getContractFromDB, waitForTx } from "./utils/helpers";
import { verifyEtherscanContract } from "./utils/verification";
import { BigNumberish } from "ethers";

task("veirfy:MoonbirdsWrapper", "Verify MoonbirdsWrapper").setAction(async (_, { network, run }) => {
  await run("set-DRE");
  await run("compile");
  const networkName = network.name;

  const moonbirdsWrapper = await getContractFromDB<MoonbirdsWrapper>("MoonbirdsWrapper");

  console.log("moonbirdsWrapper:", moonbirdsWrapper.address);
  await verifyEtherscanContract(moonbirdsWrapper.address, []);
});
