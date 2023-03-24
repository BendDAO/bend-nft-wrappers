/* eslint-disable  no-unused-expressions */
import { expect, assert } from "chai";
import { BigNumber, constants } from "ethers";
import { ethers } from "hardhat";
import { waitForTx } from "../tasks/utils/helpers";
import { Contracts, Env, makeSuite } from "./_setup";

makeSuite("Koda", (contracts: Contracts, env: Env) => {
  let tokenIdTracker: number;
  let landIdWithoutKoda: number;
  let landIdWithKoda: number;

  before(async () => {
    tokenIdTracker = 0;

    landIdWithoutKoda = ++tokenIdTracker;
    await waitForTx(await contracts.mockOtherdeed.mint(landIdWithoutKoda));

    landIdWithKoda = ++tokenIdTracker;
    await waitForTx(await contracts.mockOtherdeed.mint(landIdWithKoda));

    await waitForTx(await contracts.mockOtherdeed.setApprovalForAll(contracts.kodaWrapper.address, true));
  });

  it("User without permission failed to enabled mint (revert expected)", async () => {
    const user5 = env.accounts[5];

    await expect(contracts.kodaWrapper.connect(user5).setMintEnabled(true)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  it("User has permission sucess to enabled mint", async () => {
    await waitForTx(await contracts.kodaWrapper.connect(env.admin).setMintEnabled(true));
    const isEnabledAfter1 = await contracts.kodaWrapper.isMintEnabled();
    expect(isEnabledAfter1).to.be.eq(true);

    await waitForTx(await contracts.kodaWrapper.connect(env.admin).setMintEnabled(false));
    const isEnabledAfter2 = await contracts.kodaWrapper.isMintEnabled();
    expect(isEnabledAfter2).to.be.eq(false);
  });

  it("User without permission failed to pause (revert expected)", async () => {
    const user5 = env.accounts[5];

    await expect(contracts.kodaWrapper.connect(user5).setPause(true)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  it("Failed to do mint & burn when paused (revert expected)", async () => {
    const user0 = env.accounts[0];

    await waitForTx(await contracts.kodaWrapper.connect(env.admin).setPause(true));

    await expect(contracts.kodaWrapper.connect(user0).mint(landIdWithKoda)).to.be.revertedWith("Pausable: paused");

    await expect(contracts.kodaWrapper.connect(user0).burn(landIdWithKoda)).to.be.revertedWith("Pausable: paused");

    await waitForTx(await contracts.kodaWrapper.connect(env.admin).setPause(false));
  });

  it("Failed to do mint when mint is disabled (revert expected)", async () => {
    const user0 = env.accounts[0];

    await waitForTx(await contracts.kodaWrapper.connect(env.admin).setMintEnabled(false));

    await expect(contracts.kodaWrapper.connect(user0).mint(landIdWithKoda)).to.be.revertedWith(
      "ERC721Wrapper: mint disabled"
    );

    await waitForTx(await contracts.kodaWrapper.connect(env.admin).setMintEnabled(true));
  });

  it("Update validator", async () => {
    const validatorV2Factory = await ethers.getContractFactory("BitmapValidator");
    const validatorV2 = await validatorV2Factory.deploy();
    await waitForTx(await validatorV2.initialize(contracts.mockOtherdeed.address, []));

    await waitForTx(await contracts.kodaWrapper.connect(env.admin).updateValidator(validatorV2.address));

    const validatorAfter = await contracts.kodaWrapper.validator();
    expect(validatorAfter).to.be.eq(validatorV2.address);

    await waitForTx(await contracts.kodaWrapper.connect(env.admin).updateValidator(contracts.kodaValidator.address));
  });

  it("Add token with koda to validator", async () => {
    await waitForTx(await contracts.kodaValidator.connect(env.admin).enableTokenIds([landIdWithKoda]));
  });

  it("User failed mint land without koda (revert expected)", async () => {
    const user0 = env.accounts[0];

    const ownerBefore = await contracts.mockOtherdeed.ownerOf(landIdWithoutKoda);

    await expect(contracts.kodaWrapper.connect(user0).mint(landIdWithoutKoda)).to.be.revertedWith(
      "ERC721Wrapper: token id not valid"
    );

    const ownerAfter = await contracts.mockOtherdeed.ownerOf(landIdWithoutKoda);
    expect(ownerAfter).to.be.eq(ownerBefore);
  });

  it("User successfully mint for land with koda", async () => {
    const user0 = env.accounts[0];

    const totalSupplyBeforeMint = await contracts.kodaWrapper.totalSupply();
    const userBalanceBeforeMint = await contracts.kodaWrapper.balanceOf(user0.address);

    // mint
    await waitForTx(await contracts.kodaWrapper.connect(user0).mint(landIdWithKoda));

    const landOwner1 = await contracts.mockOtherdeed.ownerOf(landIdWithKoda);
    expect(landOwner1).to.be.eq(contracts.kodaWrapper.address);

    const wkodaOwner1 = await contracts.kodaWrapper.ownerOf(landIdWithKoda);
    expect(wkodaOwner1).to.be.eq(user0.address);

    const tokenUrl = await contracts.kodaWrapper.tokenURI(landIdWithKoda);
    expect(tokenUrl.length).to.be.gt(0);

    const totalSupplyAfterMint = await contracts.kodaWrapper.totalSupply();
    expect(totalSupplyAfterMint).to.be.eq(totalSupplyBeforeMint.add(1));

    const userBalanceAfterMint = await contracts.kodaWrapper.balanceOf(user0.address);
    expect(userBalanceAfterMint).to.be.eq(userBalanceBeforeMint.add(1));

    const totalIdByIndexAfterMint = await contracts.kodaWrapper.tokenByIndex(totalSupplyAfterMint.sub(1));
    expect(totalIdByIndexAfterMint).to.be.eq(landIdWithKoda);

    const userTotalIdByIndexAfterMint = await contracts.kodaWrapper.tokenByIndex(userBalanceAfterMint.sub(1));
    expect(userTotalIdByIndexAfterMint).to.be.eq(landIdWithKoda);
  });

  it("User without permission failed to enabled flash loan (revert expected)", async () => {
    const user5 = env.accounts[5];

    await expect(contracts.kodaWrapper.connect(user5).setFlashLoanEnabled(true)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  it("User has permission sucess to enabled flash loan", async () => {
    await waitForTx(await contracts.kodaWrapper.connect(env.admin).setFlashLoanEnabled(true));
    const isEnabledAfter1 = await contracts.kodaWrapper.isFlashLoanEnabled();
    expect(isEnabledAfter1).to.be.eq(true);

    await waitForTx(await contracts.kodaWrapper.connect(env.admin).setFlashLoanEnabled(false));
    const isEnabledAfter2 = await contracts.kodaWrapper.isFlashLoanEnabled();
    expect(isEnabledAfter2).to.be.eq(false);
  });

  it("User failed to flash loan when not enabled (revert expected)", async () => {
    const user0 = env.accounts[0];

    await waitForTx(await contracts.mockFlashLoanReceiver.setTestFlag(1));

    // flash loan
    await expect(
      contracts.kodaWrapper.connect(user0).flashLoan(contracts.mockFlashLoanReceiver.address, [landIdWithKoda], [])
    ).to.be.revertedWith("ERC721Wrapper: flash loan disabled");

    await waitForTx(await contracts.mockFlashLoanReceiver.setTestFlag(0));

    // enable the flag
    await waitForTx(await contracts.kodaWrapper.connect(env.admin).setFlashLoanEnabled(true));
  });

  it("User failed to flash loan for land with koda (revert expected)", async () => {
    const user0 = env.accounts[0];

    await waitForTx(await contracts.mockFlashLoanReceiver.setTestFlag(1));

    // flash loan
    await expect(
      contracts.kodaWrapper.connect(user0).flashLoan(contracts.mockFlashLoanReceiver.address, [landIdWithKoda], [])
    ).to.be.revertedWith("ERC721: transfer caller is not owner nor approved");

    const landOwner1 = await contracts.mockOtherdeed.ownerOf(landIdWithKoda);
    expect(landOwner1).to.be.eq(contracts.kodaWrapper.address);

    const wkodaOwner1 = await contracts.kodaWrapper.ownerOf(landIdWithKoda);
    expect(wkodaOwner1).to.be.eq(user0.address);

    await waitForTx(await contracts.mockFlashLoanReceiver.setTestFlag(0));
  });

  it("User successfully flash loan for land with koda", async () => {
    const user0 = env.accounts[0];

    // flash loan
    await waitForTx(
      await contracts.kodaWrapper
        .connect(user0)
        .flashLoan(contracts.mockFlashLoanReceiver.address, [landIdWithKoda], [])
    );

    const birdOwner1 = await contracts.mockOtherdeed.ownerOf(landIdWithKoda);
    expect(birdOwner1).to.be.eq(contracts.kodaWrapper.address);

    const wBirdOwner1 = await contracts.kodaWrapper.ownerOf(landIdWithKoda);
    expect(wBirdOwner1).to.be.eq(user0.address);
  });

  it("User successfully burn for land with koda", async () => {
    const user0 = env.accounts[0];

    // burn
    await waitForTx(await contracts.kodaWrapper.connect(user0).burn(landIdWithKoda));

    const birdOwner2 = await contracts.mockOtherdeed.ownerOf(landIdWithKoda);
    expect(birdOwner2).to.be.eq(user0.address);

    await expect(contracts.kodaWrapper.ownerOf(landIdWithKoda)).to.be.revertedWith(
      "ERC721: owner query for nonexistent token"
    );
  });
});
