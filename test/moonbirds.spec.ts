/* eslint-disable  no-unused-expressions */
import { expect, assert } from "chai";
import { BigNumber, constants } from "ethers";
import { ethers } from "hardhat";
import { waitForTx } from "../tasks/utils/helpers";
import { Contracts, Env, makeSuite } from "./_setup";

makeSuite("Moonbirds", (contracts: Contracts, env: Env) => {
  let birdIdTracker: number;
  let birdIdWithoutNesting: number;
  let birdIdWithNesting: number;

  before(async () => {
    birdIdTracker = 0;

    birdIdWithoutNesting = ++birdIdTracker;
    await waitForTx(await contracts.mockMoonbirds.mint(birdIdWithoutNesting));

    birdIdWithNesting = ++birdIdTracker;
    await waitForTx(await contracts.mockMoonbirds.mint(birdIdWithNesting));
    await waitForTx(await contracts.mockMoonbirds.toggleNesting([birdIdWithNesting]));
  });

  it("User without permission failed to enabled mint (revert expected)", async () => {
    const user5 = env.accounts[5];

    await expect(contracts.moonbirdsWrapper.connect(user5).setMintEnabled(true)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  it("User has permission sucess to enabled mint", async () => {
    await waitForTx(await contracts.moonbirdsWrapper.connect(env.admin).setMintEnabled(true));
    const isEnabledAfter1 = await contracts.moonbirdsWrapper.isMintEnabled();
    expect(isEnabledAfter1).to.be.eq(true);

    await waitForTx(await contracts.moonbirdsWrapper.connect(env.admin).setMintEnabled(false));
    const isEnabledAfter2 = await contracts.moonbirdsWrapper.isMintEnabled();
    expect(isEnabledAfter2).to.be.eq(false);
  });

  it("User without permission failed to pause (revert expected)", async () => {
    const user5 = env.accounts[5];

    await expect(contracts.moonbirdsWrapper.connect(user5).setPause(true)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  it("Failed to do mint & burn when paused (revert expected)", async () => {
    const user0 = env.accounts[0];

    await waitForTx(await contracts.moonbirdsWrapper.connect(env.admin).setPause(true));

    await expect(contracts.moonbirdsWrapper.connect(user0).mint(birdIdWithNesting)).to.be.revertedWith(
      "Pausable: paused"
    );

    await expect(contracts.moonbirdsWrapper.connect(user0).burn(birdIdWithNesting)).to.be.revertedWith(
      "Pausable: paused"
    );

    await waitForTx(await contracts.moonbirdsWrapper.connect(env.admin).setPause(false));
  });

  it("Failed to do mint when mint is disabled (revert expected)", async () => {
    const user0 = env.accounts[0];

    await waitForTx(await contracts.moonbirdsWrapper.connect(env.admin).setMintEnabled(false));

    await expect(
      contracts.mockMoonbirds
        .connect(user0)
        .safeTransferWhileNesting(user0.address, contracts.moonbirdsWrapper.address, birdIdWithNesting)
    ).to.be.revertedWith("MoonbirdsWrapper: mint disabled");

    await waitForTx(await contracts.moonbirdsWrapper.connect(env.admin).setMintEnabled(true));
  });

  it("Update validator", async () => {
    const validatorV2 = await (await ethers.getContractFactory("MoonbirdsValidator")).deploy();
    await waitForTx(await validatorV2.initialize(contracts.mockMoonbirds.address));

    await waitForTx(await contracts.moonbirdsWrapper.connect(env.admin).updateValidator(validatorV2.address));
    const validatorAfter = await contracts.moonbirdsWrapper.validator();
    expect(validatorAfter).to.be.eq(validatorV2.address);

    await waitForTx(
      await contracts.moonbirdsWrapper.connect(env.admin).updateValidator(contracts.moonbirdsValidator.address)
    );
  });

  it("User transfer bird without nesting to contract (revert expected)", async () => {
    const user0 = env.accounts[0];

    await expect(
      contracts.mockMoonbirds
        .connect(user0)
        .safeTransferWhileNesting(user0.address, contracts.moonbirdsWrapper.address, birdIdWithoutNesting)
    ).to.be.revertedWith("MoonbirdsWrapper: invalid token id");
  });

  it("User failed to mint directly (revert expected)", async () => {
    const user0 = env.accounts[0];

    const birdOwnerBefore = await contracts.mockMoonbirds.ownerOf(birdIdWithoutNesting);

    // mint
    await expect(contracts.moonbirdsWrapper.connect(user0).mint(birdIdWithoutNesting)).to.be.revertedWith(
      "MoonbirdsWrapper: mint not supported"
    );

    const birdOwnerAfter = await contracts.mockMoonbirds.ownerOf(birdIdWithoutNesting);
    expect(birdOwnerAfter).to.be.eq(birdOwnerBefore);
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

    const ogTokenUrl = await contracts.mockMoonbirds.tokenURI(birdIdWithNesting);
    const wTokenUrl = await contracts.moonbirdsWrapper.tokenURI(birdIdWithNesting);
    expect(wTokenUrl).to.be.eq(ogTokenUrl);
  });

  it("User without permission failed to enabled flash loan (revert expected)", async () => {
    const user5 = env.accounts[5];

    await expect(contracts.moonbirdsWrapper.connect(user5).setFlashLoanEnabled(true)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  it("User has permission sucess to enabled flash loan", async () => {
    await waitForTx(await contracts.moonbirdsWrapper.connect(env.admin).setFlashLoanEnabled(true));
    const isEnabledAfter1 = await contracts.moonbirdsWrapper.isFlashLoanEnabled();
    expect(isEnabledAfter1).to.be.eq(true);

    await waitForTx(await contracts.moonbirdsWrapper.connect(env.admin).setFlashLoanEnabled(false));
    const isEnabledAfter2 = await contracts.moonbirdsWrapper.isFlashLoanEnabled();
    expect(isEnabledAfter2).to.be.eq(false);
  });

  it("User failed to flash loan when not enabled (revert expected)", async () => {
    const user0 = env.accounts[0];

    await waitForTx(await contracts.mockMoonbirdsFlashLoanReceiver.setTestFlag(1));

    // flash loan
    await expect(
      contracts.moonbirdsWrapper
        .connect(user0)
        .flashLoan(contracts.mockMoonbirdsFlashLoanReceiver.address, [birdIdWithNesting], [])
    ).to.be.revertedWith("MoonbirdsWrapper: flash loan disabled");

    await waitForTx(await contracts.mockMoonbirdsFlashLoanReceiver.setTestFlag(0));

    // enable the flag
    await waitForTx(await contracts.moonbirdsWrapper.connect(env.admin).setFlashLoanEnabled(true));
  });

  it("User failed to flash loan for bird with nesting (revert expected)", async () => {
    const user0 = env.accounts[0];

    await waitForTx(await contracts.mockMoonbirdsFlashLoanReceiver.setTestFlag(1));

    // flash loan
    await expect(
      contracts.moonbirdsWrapper
        .connect(user0)
        .flashLoan(contracts.mockMoonbirdsFlashLoanReceiver.address, [birdIdWithNesting], [])
    ).to.be.revertedWith("MoonbirdsWrapper: receiver did not return token");

    const birdOwner1 = await contracts.mockMoonbirds.ownerOf(birdIdWithNesting);
    expect(birdOwner1).to.be.eq(contracts.moonbirdsWrapper.address);

    const wBirdOwner1 = await contracts.moonbirdsWrapper.ownerOf(birdIdWithNesting);
    expect(wBirdOwner1).to.be.eq(user0.address);

    await waitForTx(await contracts.mockMoonbirdsFlashLoanReceiver.setTestFlag(0));
  });

  it("User successfully flash loan for bird with nesting", async () => {
    const user0 = env.accounts[0];

    // flash loan
    await waitForTx(
      await contracts.moonbirdsWrapper
        .connect(user0)
        .flashLoan(contracts.mockMoonbirdsFlashLoanReceiver.address, [birdIdWithNesting], [])
    );

    const birdOwner1 = await contracts.mockMoonbirds.ownerOf(birdIdWithNesting);
    expect(birdOwner1).to.be.eq(contracts.moonbirdsWrapper.address);

    const wBirdOwner1 = await contracts.moonbirdsWrapper.ownerOf(birdIdWithNesting);
    expect(wBirdOwner1).to.be.eq(user0.address);
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
      contracts.moonbirdsWrapper.connect(user0).setDelegateCashForToken(user0.address, [birdIdWithNesting], true)
    ).to.be.revertedWith("MoonbirdsWrapper: ownership delegate disabled");

    await waitForTx(await contracts.moonbirdsWrapper.connect(user0).setOwnershipDelegateEnabled(true));
  });

  it("User failed set delegate for token when not owner (revert expected)", async () => {
    const user5 = env.accounts[5];

    await expect(
      contracts.moonbirdsWrapper.connect(user5).setDelegateCashForToken(user5.address, [birdIdWithNesting], true)
    ).to.be.revertedWith("MoonbirdsWrapper: caller is not owner");
  });

  it("User set delegate for token", async () => {
    const user0 = env.accounts[0];
    const user1 = env.accounts[1];

    await waitForTx(
      await contracts.moonbirdsWrapper.connect(user0).setDelegateCashForToken(user1.address, [birdIdWithNesting], true)
    );
    const hasDelegate1 = await contracts.moonbirdsWrapper.hasDelegateCashForToken(birdIdWithNesting);
    expect(hasDelegate1).to.be.eq(true);
    const delegateAddr1 = await contracts.moonbirdsWrapper.getDelegateCashForToken(birdIdWithNesting);
    expect(delegateAddr1).to.be.eq(user1.address);

    await waitForTx(
      await contracts.moonbirdsWrapper.connect(user0).setDelegateCashForToken(user1.address, [birdIdWithNesting], false)
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
      await contracts.moonbirdsWrapper.connect(user0).setDelegateCashForToken(user1.address, [birdIdWithNesting], true)
    );

    await expect(
      contracts.moonbirdsWrapper.connect(user0).setDelegateCashForToken(user2.address, [birdIdWithNesting], true)
    ).to.be.revertedWith("MoonbirdsWrapper: delegate not same");

    await waitForTx(
      await contracts.moonbirdsWrapper.connect(user0).setDelegateCashForToken(user1.address, [birdIdWithNesting], false)
    );
  });

  it("Admin revoke all delegate", async () => {
    const user0 = env.accounts[0];

    await waitForTx(
      await contracts.moonbirdsWrapper.connect(user0).setDelegateCashForToken(user0.address, [birdIdWithNesting], true)
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
      await contracts.moonbirdsWrapper.connect(user0).setDelegateCashForToken(user0.address, [birdIdWithNesting], true)
    );

    // burn
    await waitForTx(await contracts.moonbirdsWrapper.connect(user0).burn(birdIdWithNesting));

    const birdOwner2 = await contracts.mockMoonbirds.ownerOf(birdIdWithNesting);
    expect(birdOwner2).to.be.eq(user0.address);

    await expect(contracts.moonbirdsWrapper.ownerOf(birdIdWithNesting)).to.be.revertedWith(
      "ERC721: owner query for nonexistent token"
    );

    const hasDelegate = await contracts.moonbirdsWrapper.hasDelegateCashForToken(birdIdWithNesting);
    expect(hasDelegate).to.be.eq(false);
  });
});
