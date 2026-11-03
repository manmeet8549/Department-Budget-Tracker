const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  let netName = hre.network.name;
  if (netName === 'localhost' || netName === 'hardhat') {
    netName = 'local';
  }

  console.log(`Deploying AuditAnchor on network: ${netName} (chainId: ${chainId})`);
  if (deployer) {
    console.log(`Deployer address: ${deployer.address}`);
  }

  const AuditAnchor = await hre.ethers.getContractFactory('AuditAnchor');
  const anchor = await AuditAnchor.deploy();
  await anchor.waitForDeployment();

  const contractAddress = await anchor.getAddress();
  console.log(`AuditAnchor deployed successfully at: ${contractAddress}`);

  // 1. Write deployment metadata to contracts/deployments/<network>.json (never private keys!)
  const deploymentsDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentData = {
    network: netName,
    chainId: chainId,
    address: contractAddress,
    deployedAt: new Date().toISOString(),
  };

  const deploymentFile = path.join(deploymentsDir, `${netName}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2), 'utf8');
  console.log(`Saved deployment info to: ${deploymentFile}`);

  // 2. Export ABI to backend/src/modules/ledger/chain/AuditAnchor.abi.json
  const artifactPath = path.join(__dirname, '../artifacts/contracts/AuditAnchor.sol/AuditAnchor.json');
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const backendAbiDir = path.join(__dirname, '../../backend/src/modules/ledger/chain');
    if (!fs.existsSync(backendAbiDir)) {
      fs.mkdirSync(backendAbiDir, { recursive: true });
    }
    const backendAbiFile = path.join(backendAbiDir, 'AuditAnchor.abi.json');
    fs.writeFileSync(backendAbiFile, JSON.stringify(artifact.abi, null, 2), 'utf8');
    console.log(`Exported ABI to backend at: ${backendAbiFile}`);
  }
}

main().catch((error) => {
  console.error('Deployment failed:', error);
  process.exitCode = 1;
});

