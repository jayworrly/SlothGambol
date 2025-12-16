import { ethers } from "hardhat";

async function main() {
  console.log("Deploying ChipVault to", process.env.HARDHAT_NETWORK || "hardhat");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "AVAX");

  // Deploy ChipVault
  console.log("\nDeploying ChipVault...");
  const ChipVault = await ethers.getContractFactory("ChipVault");
  const chipVault = await ChipVault.deploy();
  await chipVault.waitForDeployment();

  const chipVaultAddress = await chipVault.getAddress();
  console.log("ChipVault deployed to:", chipVaultAddress);

  // Authorize game server if provided
  const gameServerAddress = process.env.GAME_SERVER_ADDRESS;
  if (gameServerAddress && gameServerAddress !== "0x...") {
    console.log("\nAuthorizing game server:", gameServerAddress);
    const tx = await chipVault.authorizeServer(gameServerAddress);
    await tx.wait();
    console.log("Game server authorized");
  }

  console.log("\n========================================");
  console.log("Deployment complete!");
  console.log("========================================");
  console.log("\nContract Addresses:");
  console.log("  ChipVault:", chipVaultAddress);
  console.log("\nNext steps:");
  console.log("  1. Verify on Snowtrace: npx hardhat verify --network fuji", chipVaultAddress);
  console.log("  2. Update frontend with contract address");
  console.log("  3. Authorize your game server address");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
