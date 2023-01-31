/* eslint-disable  no-unused-expressions */
import { expect, assert } from "chai";
import { BigNumber, BigNumberish, constants } from "ethers";
import { ethers } from "hardhat";
import { waitForTx } from "../tasks/utils/helpers";
import { ERC721Wrapper } from "../typechain-types";
import { MintableERC721 } from "../typechain-types/contracts/mocks";
import { Contracts, Env, makeSuite } from "./_setup";

makeSuite("BitmapValidator", (contracts: Contracts, env: Env) => {
  let testCollection: MintableERC721;
  /* ID: 1, 3
   * b'1010' => 0xA
   */

  before(async () => {
    testCollection = contracts.commonERC721;
  });

  it("Constructor and baisc tests", async () => {
    const validator = await (await ethers.getContractFactory("BitmapValidator")).deploy();
    await waitForTx(await validator.initialize(testCollection.address, [0xa]));

    const tokenId1Valid = await validator.isValid(testCollection.address, 1);
    expect(tokenId1Valid).to.be.eq(true);

    const tokenId2Valid = await validator.isValid(testCollection.address, 2);
    expect(tokenId2Valid).to.be.eq(false);

    const key0Value = await validator.viewBitMapValue(0);
    expect(key0Value).to.be.eq(0xa);

    const keyCount = await validator.viewBitMapKeyCount();
    expect(keyCount).to.be.eq(1);

    const keys = await validator.viewBitmapKeys(0, keyCount);
    expect(keys[0].length).to.be.eq(1);
  });

  it("Enable and disable token ids", async () => {
    const validator = await (await ethers.getContractFactory("BitmapValidator")).deploy();
    await waitForTx(await validator.initialize(testCollection.address, []));

    {
      await waitForTx(await validator.enableTokenIds([1, 3]));

      const tokenId1Valid = await validator.isValid(testCollection.address, 1);
      expect(tokenId1Valid).to.be.eq(true);

      const tokenId2Valid = await validator.isValid(testCollection.address, 2);
      expect(tokenId2Valid).to.be.eq(false);

      const key0Value = await validator.viewBitMapValue(0);
      expect(key0Value).to.be.eq(0xa);

      const keyCount = await validator.viewBitMapKeyCount();
      expect(keyCount).to.be.eq(1);

      const keys = await validator.viewBitmapKeys(0, keyCount);
      expect(keys[0].length).to.be.eq(1);
    }

    {
      await waitForTx(await validator.disableTokenIds([1, 3]));

      const tokenId1Valid = await validator.isValid(testCollection.address, 1);
      expect(tokenId1Valid).to.be.eq(false);

      const tokenId2Valid = await validator.isValid(testCollection.address, 3);
      expect(tokenId2Valid).to.be.eq(false);
    }
  });

  it("Set bitmap value", async () => {
    const validator = await (await ethers.getContractFactory("BitmapValidator")).deploy();
    await waitForTx(await validator.initialize(testCollection.address, []));

    await waitForTx(await validator.setBitMapValue(0, 0xa));

    const tokenId1Valid = await validator.isValid(testCollection.address, 1);
    expect(tokenId1Valid).to.be.eq(true);

    const tokenId2Valid = await validator.isValid(testCollection.address, 2);
    expect(tokenId2Valid).to.be.eq(false);

    const keyCount = await validator.viewBitMapKeyCount();
    expect(keyCount).to.be.eq(1);

    const keys = await validator.viewBitmapKeys(0, keyCount);
    expect(keys[0].length).to.be.eq(1);
  });

  it("Set bitmap values", async () => {
    const validator = await (await ethers.getContractFactory("BitmapValidator")).deploy();
    await waitForTx(await validator.initialize(testCollection.address, []));

    const keyValues: {
      key: BigNumberish;
      value: BigNumberish;
    }[] = [
      {
        key: 0,
        value: 0xa,
      },
    ];
    await waitForTx(await validator.setBitMapValues(keyValues));

    const tokenId1Valid = await validator.isValid(testCollection.address, 1);
    expect(tokenId1Valid).to.be.eq(true);

    const tokenId2Valid = await validator.isValid(testCollection.address, 2);
    expect(tokenId2Valid).to.be.eq(false);

    const keyCount = await validator.viewBitMapKeyCount();
    expect(keyCount).to.be.eq(1);

    const keys = await validator.viewBitmapKeys(0, keyCount);
    expect(keys[0].length).to.be.eq(1);
  });
});
