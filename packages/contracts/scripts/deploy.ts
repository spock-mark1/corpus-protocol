import { ethers } from "hardhat";

// Hedera HTS precompile address (same on mainnet and testnet)
const HTS_PRECOMPILE = "0x0000000000000000000000000000000000000167";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // Protocol wallet receives 3% launchpad fee on every Corpus Genesis
  const protocolWallet = process.env.CORPUS_PROTOCOL_WALLET ?? deployer.address;
  console.log("Protocol wallet:", protocolWallet);

  // 1. Deploy CorpusRegistry (with HTS precompile + protocol wallet)
  const Registry = await ethers.getContractFactory("CorpusRegistry");
  const registry = await Registry.deploy(HTS_PRECOMPILE, protocolWallet);
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log("CorpusRegistry deployed to:", registryAddr);

  // 2. Deploy CorpusNameService (linked to Registry)
  const NameService = await ethers.getContractFactory("CorpusNameService");
  const nameService = await NameService.deploy(registryAddr);
  await nameService.waitForDeployment();
  const nameServiceAddr = await nameService.getAddress();
  console.log("CorpusNameService deployed to:", nameServiceAddr);

  console.log("\n--- Deployment Summary ---");
  console.log(`NEXT_PUBLIC_REGISTRY_ADDRESS=${registryAddr}`);
  console.log(`NEXT_PUBLIC_NAME_SERVICE_ADDRESS=${nameServiceAddr}`);
  console.log(`CORPUS_PROTOCOL_WALLET=${protocolWallet}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
