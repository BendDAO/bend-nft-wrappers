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

    await expect(contracts.moonbirdsWrapper.connect(user5).flipFlashLoanEnabled()).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  it("User has permission sucess to enabled flash loan", async () => {
    const isEnabledBefore = await contracts.moonbirdsWrapper.isFlashLoanEnabled();

    await waitForTx(await contracts.moonbirdsWrapper.connect(env.admin).flipFlashLoanEnabled());

    const isEnabledAfter = await contracts.moonbirdsWrapper.isFlashLoanEnabled();

    expect(isEnabledAfter).to.be.eq(!isEnabledBefore);

    await waitForTx(await contracts.moonbirdsWrapper.connect(env.admin).flipFlashLoanEnabled());
  });

  it("User failed to flash loan when not enabled (revert expected)", async () => {
    const user0 = env.accounts[0];

    await waitForTx(await contracts.mockMoonbirdsFlashLoanReceiver.setTestFlag(1));

    // flash loan
    await expect(
      contracts.moonbirdsWrapper
        .connect(user0)
        .flashLoan(contracts.mockMoonbirdsFlashLoanReceiver.address, [birdIdWithNesting], [])
    ).to.be.revertedWith("MoonbirdsWrapper: flash loan not enabled");

    await waitForTx(await contracts.mockMoonbirdsFlashLoanReceiver.setTestFlag(0));

    // enable the flag
    await waitForTx(await contracts.moonbirdsWrapper.connect(env.admin).flipFlashLoanEnabled());
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

  it("User successfully burn for bird with nesting", async () => {
    const user0 = env.accounts[0];

    // burn
    await waitForTx(await contracts.moonbirdsWrapper.connect(user0).burn(birdIdWithNesting));

    const birdOwner2 = await contracts.mockMoonbirds.ownerOf(birdIdWithNesting);
    expect(birdOwner2).to.be.eq(user0.address);

    await expect(contracts.moonbirdsWrapper.ownerOf(birdIdWithNesting)).to.be.revertedWith(
      "ERC721: owner query for nonexistent token"
    );
  });
});
