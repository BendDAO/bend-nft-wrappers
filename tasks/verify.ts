/* eslint-disable @typescript-eslint/ban-ts-comment */
import { task } from "hardhat/config";
import { getParams } from "./config";
import { MoonbirdsWrapper } from "../typechain-types";
import { getContract, getContractAddressFromDB, getContractFromDB, waitForTx } from "./utils/helpers";
import { verifyEtherscanContract } from "./utils/verification";
import { BigNumberish } from "ethers";

task("veirfy:MoonbirdsUserProxy", "Verify MoonbirdsUserProxy").setAction(async (_, { network, run }) => {
  await run("set-DRE");
  await run("compile");
  const networkName = network.name;

  const moonbirdsWrapper = await getContractFromDB<MoonbirdsWrapper>("MoonbirdsWrapper");
  const userProxyImplemention = await moonbirdsWrapper.userProxyImplemention();

  console.log("userProxyImplemention:", userProxyImplemention);
  await verifyEtherscanContract(userProxyImplemention, []);
});
