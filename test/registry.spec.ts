/* eslint-disable  no-unused-expressions */
import { expect, assert } from "chai";
import { BigNumber, constants } from "ethers";
import { ethers } from "hardhat";
import { waitForTx } from "../tasks/utils/helpers";
import { MockERC721Wrapper } from "../typechain-types";
import { Contracts, Env, makeSuite } from "./_setup";

makeSuite("WrapperRegistry", (contracts: Contracts, env: Env) => {
  let tokenIdTracker: number;
  let tokenId1: number;
  let testWrapper: MockERC721Wrapper;

  before(async () => {
    tokenIdTracker = 0;

    tokenId1 = ++tokenIdTracker;

    const wrapperFactory = await ethers.getContractFactory("MockERC721Wrapper");
    testWrapper = await wrapperFactory.deploy();
    await waitForTx(
      await testWrapper.initialize(
        contracts.commonERC721.address,
        contracts.commonValidator.address,
        "Test Wrapper",
        "TWRAP"
      )
    );
  });

  it("Register wrapper", async () => {
    // register
    await waitForTx(await contracts.wrapperRegistry.connect(env.admin).registerWrapper(testWrapper.address));

    const isRegistered1 = await contracts.wrapperRegistry.isRegistered(testWrapper.address);
    expect(isRegistered1).to.be.eq(true);

    const wrapperCount1 = await contracts.wrapperRegistry.viewCollectionWrapperCount(contracts.commonERC721.address);
    expect(wrapperCount1).to.be.eq(1);

    const wrapperAddresses1 = await contracts.wrapperRegistry.viewCollectionWrappers(
      contracts.commonERC721.address,
      0,
      wrapperCount1
    );
    expect(wrapperAddresses1[0][0]).to.be.eq(testWrapper.address);
  });

  it("Find wrapper by token idr", async () => {
    await waitForTx(await contracts.commonValidator.connect(env.admin).enableTokenIds([tokenId1]));

    const retWrappers = await contracts.wrapperRegistry.findWrappers(contracts.commonERC721.address, tokenId1);
    expect(retWrappers.length).to.be.eq(1);
    expect(retWrappers[0]).to.be.eq(testWrapper.address);
  });

  it("Unregister wrapper", async () => {
    // unregister
    await waitForTx(await contracts.wrapperRegistry.connect(env.admin).unregisterWrapper(testWrapper.address));

    const isRegistered2 = await contracts.wrapperRegistry.isRegistered(testWrapper.address);
    expect(isRegistered2).to.be.eq(false);

    const wrapperCount2 = await contracts.wrapperRegistry.viewCollectionWrapperCount(contracts.commonERC721.address);
    expect(wrapperCount2).to.be.eq(0);

    const retWrappers = await contracts.wrapperRegistry.findWrappers(contracts.commonERC721.address, tokenId1);
    expect(retWrappers.length).to.be.eq(0);
  });
});
