import { expect } from "chai";
import { ethers } from "hardhat";
import { ChipVault } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("ChipVault", function () {
  let chipVault: ChipVault;
  let owner: HardhatEthersSigner;
  let player1: HardhatEthersSigner;
  let player2: HardhatEthersSigner;
  let gameServer: HardhatEthersSigner;

  const ONE_AVAX = ethers.parseEther("1");
  const HALF_AVAX = ethers.parseEther("0.5");
  const TABLE_ID = ethers.id("table-1");

  beforeEach(async function () {
    [owner, player1, player2, gameServer] = await ethers.getSigners();

    const ChipVaultFactory = await ethers.getContractFactory("ChipVault");
    chipVault = await ChipVaultFactory.deploy();
    await chipVault.waitForDeployment();

    // Authorize game server
    await chipVault.authorizeServer(gameServer.address);
  });

  describe("Deposits", function () {
    it("should accept deposits", async function () {
      await chipVault.connect(player1).deposit({ value: ONE_AVAX });

      expect(await chipVault.getAvailableBalance(player1.address)).to.equal(ONE_AVAX);
      expect(await chipVault.getTotalBalance(player1.address)).to.equal(ONE_AVAX);
    });

    it("should reject deposits below minimum", async function () {
      const tooSmall = ethers.parseEther("0.001");
      await expect(chipVault.connect(player1).deposit({ value: tooSmall }))
        .to.be.revertedWithCustomError(chipVault, "InvalidAmount");
    });

    it("should accept direct AVAX transfers as deposits", async function () {
      await player1.sendTransaction({
        to: await chipVault.getAddress(),
        value: ONE_AVAX
      });

      expect(await chipVault.getAvailableBalance(player1.address)).to.equal(ONE_AVAX);
    });
  });

  describe("Withdrawals", function () {
    beforeEach(async function () {
      await chipVault.connect(player1).deposit({ value: ONE_AVAX });
    });

    it("should allow withdrawals", async function () {
      const balanceBefore = await ethers.provider.getBalance(player1.address);

      const tx = await chipVault.connect(player1).withdraw(HALF_AVAX);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(player1.address);

      expect(await chipVault.getAvailableBalance(player1.address)).to.equal(HALF_AVAX);
      expect(balanceAfter).to.equal(balanceBefore + HALF_AVAX - gasUsed);
    });

    it("should reject withdrawals exceeding available balance", async function () {
      const tooMuch = ethers.parseEther("2");
      await expect(chipVault.connect(player1).withdraw(tooMuch))
        .to.be.revertedWithCustomError(chipVault, "InsufficientBalance");
    });
  });

  describe("Chip Locking", function () {
    beforeEach(async function () {
      await chipVault.connect(player1).deposit({ value: ONE_AVAX });
    });

    it("should lock chips for a table", async function () {
      await chipVault.connect(gameServer).lockChips(player1.address, HALF_AVAX, TABLE_ID);

      expect(await chipVault.getAvailableBalance(player1.address)).to.equal(HALF_AVAX);
      expect(await chipVault.getLockedBalance(player1.address)).to.equal(HALF_AVAX);
      expect(await chipVault.getTableLockedAmount(TABLE_ID, player1.address)).to.equal(HALF_AVAX);
    });

    it("should reject locking from unauthorized address", async function () {
      await expect(chipVault.connect(player2).lockChips(player1.address, HALF_AVAX, TABLE_ID))
        .to.be.revertedWithCustomError(chipVault, "UnauthorizedServer");
    });

    it("should unlock chips from a table", async function () {
      await chipVault.connect(gameServer).lockChips(player1.address, HALF_AVAX, TABLE_ID);
      await chipVault.connect(gameServer).unlockChips(player1.address, HALF_AVAX, TABLE_ID);

      expect(await chipVault.getAvailableBalance(player1.address)).to.equal(ONE_AVAX);
      expect(await chipVault.getLockedBalance(player1.address)).to.equal(0);
    });
  });

  describe("Table Settlement", function () {
    beforeEach(async function () {
      await chipVault.connect(player1).deposit({ value: ONE_AVAX });
      await chipVault.connect(player2).deposit({ value: ONE_AVAX });

      // Both players lock chips at table
      await chipVault.connect(gameServer).lockChips(player1.address, HALF_AVAX, TABLE_ID);
      await chipVault.connect(gameServer).lockChips(player2.address, HALF_AVAX, TABLE_ID);
    });

    it("should settle table with win/loss", async function () {
      const winAmount = ethers.parseEther("0.2");

      // Player1 wins, Player2 loses
      await chipVault.connect(gameServer).settleTable(
        TABLE_ID,
        [player1.address, player2.address],
        [winAmount, -winAmount]
      );

      // Player1: 0.5 available + 0.5 locked + 0.2 won = 1.2
      expect(await chipVault.getAvailableBalance(player1.address)).to.equal(
        HALF_AVAX + HALF_AVAX + winAmount
      );

      // Player2: 0.5 available + 0.5 locked - 0.2 lost = 0.8
      expect(await chipVault.getAvailableBalance(player2.address)).to.equal(
        HALF_AVAX + HALF_AVAX - winAmount
      );

      // Both should have 0 locked
      expect(await chipVault.getLockedBalance(player1.address)).to.equal(0);
      expect(await chipVault.getLockedBalance(player2.address)).to.equal(0);
    });

    it("should reject non-zero-sum settlements", async function () {
      await expect(chipVault.connect(gameServer).settleTable(
        TABLE_ID,
        [player1.address, player2.address],
        [ONE_AVAX, ONE_AVAX] // Both winning is invalid
      )).to.be.revertedWith("Deltas must sum to zero");
    });
  });

  describe("Admin Functions", function () {
    it("should authorize and revoke servers", async function () {
      const newServer = player2.address;

      expect(await chipVault.authorizedServers(newServer)).to.equal(false);

      await chipVault.authorizeServer(newServer);
      expect(await chipVault.authorizedServers(newServer)).to.equal(true);

      await chipVault.revokeServer(newServer);
      expect(await chipVault.authorizedServers(newServer)).to.equal(false);
    });

    it("should pause and unpause", async function () {
      await chipVault.pause();

      await expect(chipVault.connect(player1).deposit({ value: ONE_AVAX }))
        .to.be.revertedWithCustomError(chipVault, "EnforcedPause");

      await chipVault.unpause();

      await chipVault.connect(player1).deposit({ value: ONE_AVAX });
      expect(await chipVault.getAvailableBalance(player1.address)).to.equal(ONE_AVAX);
    });
  });
});
