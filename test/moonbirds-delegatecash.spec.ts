/* eslint-disable  no-unused-expressions */
import { expect, assert } from "chai";
import { BigNumber, constants } from "ethers";
import { ethers } from "hardhat";
import { waitForTx } from "../tasks/utils/helpers";
import { Contracts, Env, makeSuite } from "./_setup";

makeSuite("Moonbirds: Delegate Cash", (contracts: Contracts, env: Env) => {
  let birdIdTracker: number;
  let birdIdWithNesting: number;

  before(async () => {
    birdIdTracker = 0;

    birdIdWithNesting = ++birdIdTracker;
    await waitForTx(await contracts.mockMoonbirds.mint(birdIdWithNesting));
    await waitForTx(await contracts.mockMoonbirds.toggleNesting([birdIdWithNesting]));
  });

  it("User without permission failed to set bnft registry contract (revert expected)", async () => {
    const user5 = env.accounts[5];

    await expect(contracts.moonbirdsWrapper.connect(user5).setBNFTRegistryContract(user5.address)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  it("User without permission failed to set delegate cash contract (revert expected)", async () => {
    const user5 = env.accounts[5];

    await expect(contracts.moonbirdsWrapper.connect(user5).setDelegateCashContract(user5.address)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  it("User without permission failed to set delegate enabled (revert expected)", async () => {
    const user5 = env.accounts[5];

    await expect(contracts.moonbirdsWrapper.connect(user5).setOwnershipDelegateEnabled(true)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  it("User without permission failed to revoke all delegations (revert expected)", async () => {
    const user5 = env.accounts[5];

    await expect(contracts.moonbirdsWrapper.connect(user5).revokeAllDelegateCash()).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  it("User failed set delegate for token when delegate disabled (revert expected)", async () => {
    const user0 = env.accounts[0];

    await waitForTx(await contracts.moonbirdsWrapper.connect(user0).setOwnershipDelegateEnabled(false));

    await expect(
      contracts.moonbirdsWrapper
        .connect(user0)
        ["setDelegateCashForToken(address,uint256[],bool)"](user0.address, [birdIdWithNesting], true)
    ).to.be.revertedWith("MoonbirdsWrapper: ownership delegate disabled");

    await waitForTx(await contracts.moonbirdsWrapper.connect(user0).setOwnershipDelegateEnabled(true));
  });

  it("User successfully transfer & mint for bird with nesting", async () => {
    const user0 = env.accounts[0];

    // transfer & mint
    await waitForTx(
      await contracts.mockMoonbirds
        .connect(user0)
        .safeTransferWhileNesting(user0.address, contracts.moonbirdsWrapper.address, birdIdWithNesting)
    );

    const birdOwner1 = await contracts.mockMoonbirds.ownerOf(birdIdWithNesting);
    expect(birdOwner1).to.be.eq(contracts.moonbirdsWrapper.address);

    const wBirdOwner1 = await contracts.moonbirdsWrapper.ownerOf(birdIdWithNesting);
    expect(wBirdOwner1).to.be.eq(user0.address);
  });

  it("User failed set delegate for token when not owner (revert expected)", async () => {
    const user5 = env.accounts[5];

    await expect(
      contracts.moonbirdsWrapper
        .connect(user5)
        ["setDelegateCashForToken(address,uint256[],bool)"](user5.address, [birdIdWithNesting], true)
    ).to.be.revertedWith("MoonbirdsWrapper: caller is not owner");
  });

  it("User set delegate for token", async () => {
    const user0 = env.accounts[0];
    const user1 = env.accounts[1];

    await waitForTx(
      await contracts.moonbirdsWrapper
        .connect(user0)
        ["setDelegateCashForToken(address,uint256[],bool)"](user1.address, [birdIdWithNesting], true)
    );
    const hasDelegate1 = await contracts.moonbirdsWrapper.hasDelegateCashForToken(birdIdWithNesting);
    expect(hasDelegate1).to.be.eq(true);
    const delegateAddr1 = await contracts.moonbirdsWrapper.getDelegateCashForToken(birdIdWithNesting);
    expect(delegateAddr1).to.be.eq(user1.address);

    await waitForTx(
      await contracts.moonbirdsWrapper
        .connect(user0)
        ["setDelegateCashForToken(address,uint256[],bool)"](user1.address, [birdIdWithNesting], false)
    );
    const hasDelegate2 = await contracts.moonbirdsWrapper.hasDelegateCashForToken(birdIdWithNesting);
    expect(hasDelegate2).to.be.eq(false);
    const delegateAddr2 = await contracts.moonbirdsWrapper.getDelegateCashForToken(birdIdWithNesting);
    expect(delegateAddr2).to.be.eq(constants.AddressZero);
  });

  it("User change delegate for token (revert expected)", async () => {
    const user0 = env.accounts[0];
    const user1 = env.accounts[1];
    const user2 = env.accounts[2];

    await waitForTx(
      await contracts.moonbirdsWrapper
        .connect(user0)
        ["setDelegateCashForToken(address,uint256[],bool)"](user1.address, [birdIdWithNesting], true)
    );

    await expect(
      contracts.moonbirdsWrapper
        .connect(user0)
        ["setDelegateCashForToken(address,uint256[],bool)"](user2.address, [birdIdWithNesting], true)
    ).to.be.revertedWith("MoonbirdsWrapper: delegate not same");

    await waitForTx(
      await contracts.moonbirdsWrapper
        .connect(user0)
        ["setDelegateCashForToken(address,uint256[],bool)"](user1.address, [birdIdWithNesting], false)
    );
  });

  it("Admin revoke all delegate", async () => {
    const user0 = env.accounts[0];

    await waitForTx(
      await contracts.moonbirdsWrapper
        .connect(user0)
        ["setDelegateCashForToken(address,uint256[],bool)"](user0.address, [birdIdWithNesting], true)
    );
    const hasDelegate1 = await contracts.moonbirdsWrapper.hasDelegateCashForToken(birdIdWithNesting);
    expect(hasDelegate1).to.be.eq(true);

    await waitForTx(await contracts.moonbirdsWrapper.connect(user0).revokeAllDelegateCash());

    const hasDelegate2 = await contracts.moonbirdsWrapper.hasDelegateCashForToken(birdIdWithNesting);
    expect(hasDelegate2).to.be.eq(false);
  });

  it("User successfully burn for bird with nesting", async () => {
    const user0 = env.accounts[0];

    await waitForTx(
      await contracts.moonbirdsWrapper
        .connect(user0)
        ["setDelegateCashForToken(address,uint256[],bool)"](user0.address, [birdIdWithNesting], true)
    );

    // burn
    await waitForTx(await contracts.moonbirdsWrapper.connect(user0).burn(birdIdWithNesting));

    const hasDelegate = await contracts.moonbirdsWrapper.hasDelegateCashForToken(birdIdWithNesting);
    expect(hasDelegate).to.be.eq(false);
  });

  it("User successfully set delegate cash for WMBIRD in boundNFT", async () => {
    const user0 = env.accounts[0];
    const user5 = env.accounts[5];

    // mint WBIRD
    await waitForTx(
      await contracts.mockMoonbirds
        .connect(user0)
        .safeTransferWhileNesting(user0.address, contracts.moonbirdsWrapper.address, birdIdWithNesting)
    );

    // mint boundWBIRD
    await waitForTx(
      await contracts.moonbirdsWrapper.connect(user0).setApprovalForAll(contracts.mockWMBirdBNFT.address, true)
    );

    await waitForTx(await contracts.mockWMBirdBNFT.mint(birdIdWithNesting));

    // not owner (revert expected)
    await expect(
      contracts.moonbirdsWrapper
        .connect(user5)
        ["setDelegateCashForToken(address,uint256[],bool)"](user5.address, [birdIdWithNesting], true)
    ).to.be.revertedWith("MoonbirdsWrapper: caller is not owner");

    // set delegate
    await waitForTx(
      await contracts.moonbirdsWrapper
        .connect(user0)
        ["setDelegateCashForToken(address,uint256[],bool)"](user0.address, [birdIdWithNesting], true)
    );

    const hasDelegate1 = await contracts.moonbirdsWrapper.hasDelegateCashForToken(birdIdWithNesting);
    expect(hasDelegate1).to.be.eq(true);

    // burn boundWBIRD
    await waitForTx(await contracts.mockWMBirdBNFT.burn(birdIdWithNesting));

    // unset delegate
    await waitForTx(
      await contracts.moonbirdsWrapper
        .connect(user0)
        ["setDelegateCashForToken(address,uint256[],bool)"](user0.address, [birdIdWithNesting], false)
    );

    const hasDelegate2 = await contracts.moonbirdsWrapper.hasDelegateCashForToken(birdIdWithNesting);
    expect(hasDelegate2).to.be.eq(false);
  });
});
