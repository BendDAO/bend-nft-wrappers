/* eslint-disable  no-unused-expressions */
import { expect, assert } from "chai";
import { BigNumber, constants } from "ethers";
import { ethers } from "hardhat";
import { waitForTx } from "../tasks/utils/helpers";
import { Contracts, Env, makeSuite } from "./_setup";

makeSuite("Koda: Delegate Cash", (contracts: Contracts, env: Env) => {
  let tokenIdTracker: number;
  let landIdWithKoda: number;

  before(async () => {
    tokenIdTracker = 0;

    landIdWithKoda = ++tokenIdTracker;
    await waitForTx(await contracts.mockOtherdeed.mint(landIdWithKoda));

    await waitForTx(await contracts.mockOtherdeed.setApprovalForAll(contracts.kodaWrapper.address, true));
  });

  it("User without permission failed to set bnft registry contract (revert expected)", async () => {
    const user5 = env.accounts[5];

    await expect(contracts.kodaWrapper.connect(user5).setBNFTRegistryContract(user5.address)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  it("User without permission failed to set delegate cash contract (revert expected)", async () => {
    const user5 = env.accounts[5];

    await expect(contracts.kodaWrapper.connect(user5).setDelegateCashContract(user5.address)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  it("User without permission failed to set delegate enabled (revert expected)", async () => {
    const user5 = env.accounts[5];

    await expect(contracts.kodaWrapper.connect(user5).setOwnershipDelegateEnabled(true)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  it("User without permission failed to revoke all delegations (revert expected)", async () => {
    const user5 = env.accounts[5];

    await expect(contracts.kodaWrapper.connect(user5).revokeAllDelegateCash()).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  it("User failed set delegate for token when delegate disabled (revert expected)", async () => {
    const user0 = env.accounts[0];

    await waitForTx(await contracts.kodaWrapper.connect(user0).setOwnershipDelegateEnabled(false));

    await expect(
      contracts.kodaWrapper
        .connect(user0)
        ["setDelegateCashForToken(address,uint256[],bool)"](user0.address, [landIdWithKoda], true)
    ).to.be.revertedWith("ERC721Wrapper: ownership delegate disabled");

    await waitForTx(await contracts.kodaWrapper.connect(user0).setOwnershipDelegateEnabled(true));
  });

  it("User successfully mint for land with koda", async () => {
    const user0 = env.accounts[0];

    await waitForTx(await contracts.kodaValidator.connect(env.admin).enableTokenIds([landIdWithKoda]));

    // mint
    await waitForTx(await contracts.kodaWrapper.connect(user0).mint(landIdWithKoda));
  });

  it("User failed set delegate for token when not owner (revert expected)", async () => {
    const user5 = env.accounts[5];

    await expect(
      contracts.kodaWrapper
        .connect(user5)
        ["setDelegateCashForToken(address,uint256[],bool)"](user5.address, [landIdWithKoda], true)
    ).to.be.revertedWith("ERC721Wrapper: caller is not owner");
  });

  it("User set delegate for token", async () => {
    const user0 = env.accounts[0];
    const user1 = env.accounts[1];

    await waitForTx(
      await contracts.kodaWrapper
        .connect(user0)
        ["setDelegateCashForToken(address,uint256[],bool)"](user1.address, [landIdWithKoda], true)
    );
    const hasDelegate1 = await contracts.kodaWrapper.hasDelegateCashForToken(landIdWithKoda);
    expect(hasDelegate1).to.be.eq(true);
    const delegateAddr1 = await contracts.kodaWrapper.getDelegateCashForToken(landIdWithKoda);
    expect(delegateAddr1).to.be.eq(user1.address);

    await waitForTx(
      await contracts.kodaWrapper
        .connect(user0)
        ["setDelegateCashForToken(address,uint256[],bool)"](user1.address, [landIdWithKoda], false)
    );
    const hasDelegate2 = await contracts.kodaWrapper.hasDelegateCashForToken(landIdWithKoda);
    expect(hasDelegate2).to.be.eq(false);
    const delegateAddr2 = await contracts.kodaWrapper.getDelegateCashForToken(landIdWithKoda);
    expect(delegateAddr2).to.be.eq(constants.AddressZero);
  });

  it("User change delegate for token (revert expected)", async () => {
    const user0 = env.accounts[0];
    const user1 = env.accounts[1];
    const user2 = env.accounts[2];

    await waitForTx(
      await contracts.kodaWrapper
        .connect(user0)
        ["setDelegateCashForToken(address,uint256[],bool)"](user1.address, [landIdWithKoda], true)
    );

    await expect(
      contracts.kodaWrapper
        .connect(user0)
        ["setDelegateCashForToken(address,uint256[],bool)"](user2.address, [landIdWithKoda], true)
    ).to.be.revertedWith("ERC721Wrapper: delegate not same");

    await waitForTx(
      await contracts.kodaWrapper
        .connect(user0)
        ["setDelegateCashForToken(address,uint256[],bool)"](user1.address, [landIdWithKoda], false)
    );
  });

  it("Admin revoke all delegate", async () => {
    const user0 = env.accounts[0];

    await waitForTx(
      await contracts.kodaWrapper
        .connect(user0)
        ["setDelegateCashForToken(address,uint256[],bool)"](user0.address, [landIdWithKoda], true)
    );
    const hasDelegate1 = await contracts.kodaWrapper.hasDelegateCashForToken(landIdWithKoda);
    expect(hasDelegate1).to.be.eq(true);

    await waitForTx(await contracts.kodaWrapper.connect(user0).revokeAllDelegateCash());

    const hasDelegate2 = await contracts.kodaWrapper.hasDelegateCashForToken(landIdWithKoda);
    expect(hasDelegate2).to.be.eq(false);
  });

  it("User successfully burn for land with koda", async () => {
    const user0 = env.accounts[0];

    await waitForTx(
      await contracts.kodaWrapper
        .connect(user0)
        ["setDelegateCashForToken(address,uint256[],bool)"](user0.address, [landIdWithKoda], true)
    );

    // burn
    await waitForTx(await contracts.kodaWrapper.connect(user0).burn(landIdWithKoda));

    const hasDelegate = await contracts.kodaWrapper.hasDelegateCashForToken(landIdWithKoda);
    expect(hasDelegate).to.be.eq(false);
  });

  it("User successfully set delegate cash for WKODA in boundNFT", async () => {
    const user0 = env.accounts[0];
    const user5 = env.accounts[5];

    // mint WKODA
    await waitForTx(await contracts.kodaWrapper.connect(user0).mint(landIdWithKoda));

    // mint boundWKODA
    await waitForTx(
      await contracts.kodaWrapper.connect(user0).setApprovalForAll(contracts.mockWKodaBNFT.address, true)
    );

    await waitForTx(await contracts.mockWKodaBNFT.mint(landIdWithKoda));

    // not owner (revert expected)
    await expect(
      contracts.kodaWrapper
        .connect(user5)
        ["setDelegateCashForToken(address,uint256[],bool)"](user5.address, [landIdWithKoda], true)
    ).to.be.revertedWith("ERC721Wrapper: caller is not owner");

    // set delegate
    await waitForTx(
      await contracts.kodaWrapper
        .connect(user0)
        ["setDelegateCashForToken(address,uint256[],bool)"](user0.address, [landIdWithKoda], true)
    );

    const hasDelegate1 = await contracts.kodaWrapper.hasDelegateCashForToken(landIdWithKoda);
    expect(hasDelegate1).to.be.eq(true);

    // burn boundWKODA
    await waitForTx(await contracts.mockWKodaBNFT.burn(landIdWithKoda));

    // unset delegate
    await waitForTx(
      await contracts.kodaWrapper
        .connect(user0)
        ["setDelegateCashForToken(address,uint256[],bool)"](user0.address, [landIdWithKoda], false)
    );

    const hasDelegate2 = await contracts.kodaWrapper.hasDelegateCashForToken(landIdWithKoda);
    expect(hasDelegate2).to.be.eq(false);
  });
});
