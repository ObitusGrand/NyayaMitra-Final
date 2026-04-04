import { BrowserProvider, Contract, keccak256, toUtf8Bytes } from 'ethers'

declare global {
  interface Window {
    ethereum?: unknown
  }
}

const CONTRACT_ADDRESS = import.meta.env.VITE_POLYGON_CONTRACT_ADDRESS as string | undefined
const CONTRACT_ABI_JSON = import.meta.env.VITE_POLYGON_CONTRACT_ABI as string | undefined
const EXPLORER = (import.meta.env.VITE_POLYGON_EXPLORER as string | undefined) || 'https://amoy.polygonscan.com/tx/'
const MINT_METHOD = (import.meta.env.VITE_POLYGON_MINT_METHOD as string | undefined) || 'mintWithTokenURI'

const DEFAULT_ABI = [
  `function ${MINT_METHOD}(string tokenURI) public returns (uint256)`,
]

const getProvider = async (): Promise<BrowserProvider> => {
  if (!window.ethereum) throw new Error('Wallet not detected. Install MetaMask to continue.')
  const provider = new BrowserProvider(window.ethereum)
  await provider.send('eth_requestAccounts', [])
  return provider
}

export interface BlockchainProof {
  txHash?: string
  explorerUrl?: string
  signature?: string
  documentHash: string
}

export const mintNFT = async (tokenURI: string): Promise<BlockchainProof> => {
  const provider = await getProvider()
  const signer = await provider.getSigner()
  const documentHash = keccak256(toUtf8Bytes(tokenURI))

  if (CONTRACT_ADDRESS) {
    const abi = CONTRACT_ABI_JSON ? JSON.parse(CONTRACT_ABI_JSON) : DEFAULT_ABI
    const contract = new Contract(CONTRACT_ADDRESS, abi, signer)
    const tx = await contract[MINT_METHOD](tokenURI)
    const receipt = await tx.wait()
    return {
      txHash: receipt?.hash,
      explorerUrl: `${EXPLORER}${receipt?.hash}`,
      documentHash,
    }
  }

  // Fallback proof if contract is not configured: sign typed statement from wallet.
  const signature = await signer.signMessage(`NyayaMitra proof:${documentHash}`)
  return { signature, documentHash }
}
