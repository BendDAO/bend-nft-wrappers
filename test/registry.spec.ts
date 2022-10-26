/* eslint-disable  no-unused-expressions */
import { expect, assert } from "chai";
import { BigNumber, constants } from "ethers";
import { ethers } from "hardhat";
import { waitForTx } from "../tasks/utils/helpers";
import { ERC721Wrapper } from "../typechain-types";
import { Contracts, Env, makeSuite } from "./_setup";

makeSuite("WrapperRegistry", (contracts: Contracts, env: Env) => {
  let tokenIdTracker: number;
  let testWrapper: ERC721Wrapper;

  before(async () => {
    tokenIdTracker = 0;
  });

  it("Create wrapper", async () => {
    const createTx = await waitForTx(
      await contracts.wrapperRegistry
        .connect(env.admin)
        .createWrapper(contracts.commonERC721.address, contracts.commonValidator.address, "Common Wrapper", "WCOMMON")
    );

    let createWrapperAddress = "";
    if (createTx.events !== undefined && createTx.events.length > 0) {
      if (createTx.events[1].args !== undefined && createTx.events[1].args.length > 0) {
        createWrapperAddress = createTx.events[1].args[0];
      }
    }
    if (createWrapperAddress === undefined || createWrapperAddress === "") {
      throw Error("createWrapper failed");
    }

    testWrapper = await ethers.getContractAt("ERC721Wrapper", createWrapperAddress);
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

  it("Update validator", async () => {
    const validatorV2 = await (
      await ethers.getContractFactory("BitmapValidator")
    ).deploy(contracts.commonERC721.address, []);

    await waitForTx(
      await contracts.wrapperRegistry.connect(env.admin).updateValidator(testWrapper.address, validatorV2.address)
    );

    const validatorAfter = await testWrapper.validator();
    expect(validatorAfter).to.be.eq(validatorV2.address);

    await waitForTx(
      await contracts.wrapperRegistry
        .connect(env.admin)
        .updateValidator(testWrapper.address, contracts.commonValidator.address)
    );
  });

  it("Config validato and find wrapper by token idr", async () => {
    const tokenId1 = ++tokenIdTracker;
    await waitForTx(await contracts.commonValidator.connect(env.admin).enableTokenIds([tokenId1]));

    const wrapperFound1 = await contracts.wrapperRegistry.findWrapper(contracts.commonERC721.address, tokenId1);
    expect(wrapperFound1).to.be.eq(testWrapper.address);
  });

  it("Unregister wrapper", async () => {
    // unregister
    await waitForTx(await contracts.wrapperRegistry.connect(env.admin).unregisterWrapper(testWrapper.address));

    const isRegistered2 = await contracts.wrapperRegistry.isRegistered(testWrapper.address);
    expect(isRegistered2).to.be.eq(false);

    const wrapperCount2 = await contracts.wrapperRegistry.viewCollectionWrapperCount(contracts.commonERC721.address);
    expect(wrapperCount2).to.be.eq(0);
  });
});
