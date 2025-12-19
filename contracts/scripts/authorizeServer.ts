import { ethers } from "hardhat";

async function main() {
  const SERVER_ADDRESS = "0x3cE27D043B0F507303dB7D26bd6Ad9bA9172C2F8";
  const CONTRACT_ADDRESS = "0x4168d40F0B2906495510517646a8FB406cfbB38b";

  console.log("Authorizing server:", SERVER_ADDRESS);

  const ChipVault = await ethers.getContractAt("ChipVault", CONTRACT_ADDRESS);

  // Check current status
  const isAuthorized = await ChipVault.authorizedServers(SERVER_ADDRESS);
  console.log("Currently authorized:", isAuthorized);

  if (!isAuthorized) {
    console.log("Authorizing...");
    const tx = await ChipVault.authorizeServer(SERVER_ADDRESS);
    await tx.wait();
    console.log("Transaction hash:", tx.hash);

    // Verify
    const nowAuthorized = await ChipVault.authorizedServers(SERVER_ADDRESS);
    console.log("Now authorized:", nowAuthorized);
  } else {
    console.log("Already authorized!");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
