const hre = require("hardhat");

async function main() {
  console.log("[RED TEAM SIMULATION] Deploying MaliciousVault contract...");

  // Get the contract factory
  const MaliciousVault = await hre.ethers.getContractFactory("MaliciousVault");
  
  // Deploy the contract
  const maliciousVault = await MaliciousVault.deploy();
  
  // Wait for deployment to finish
  await maliciousVault.waitForDeployment();
  
  // Get the deployed contract address
  const address = await maliciousVault.getAddress();
  
  console.log("[RED TEAM SIMULATION] MaliciousVault deployed to:", address);
  console.log("[RED TEAM SIMULATION] Network:", hre.network.name);
  console.log("[RED TEAM SIMULATION] Deployer:", (await hre.ethers.getSigners())[0].address);
  
  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: address,
    deployer: (await hre.ethers.getSigners())[0].address,
    timestamp: new Date().toISOString(),
    chainId: hre.network.config.chainId
  };
  
  console.log("[RED TEAM SIMULATION] Deployment info:", deploymentInfo);
  console.log("[RED TEAM SIMULATION] Add this to your .env file:");
  console.log(`VAULT_CONTRACT_ADDRESS=${address}`);
  
  return deploymentInfo;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
