import { TOKEN_PROGRAM_ID, Token } from '@raydium-io/raydium-sdk';
import { getKeypairFromEnvironment } from '@solana-developers/node-helpers';
import { Cluster, Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import dotenv from 'dotenv';
import { tokenInfo } from './types';
dotenv.config();

// change to 'devnet' for testing and 'mainnet-beta' for live use
const network: Cluster = 'devnet';

// Image file location and name. Change to your own
const imageFile = './image/token_image.png';
const imageFileName = 'token_image.png';

export const RPC_ENDPOINT = process.env.RPC_ENDPOINT ?? clusterApiUrl(network);

export const solanaConnection = new Connection(RPC_ENDPOINT, {
  commitment: 'confirmed',
});

export const creatorWallet = getKeypairFromEnvironment('WALLET_SECRET_KEY');

export const DEFAULT_TOKEN = {
  WSOL: new Token(
    TOKEN_PROGRAM_ID,
    new PublicKey('So11111111111111111111111111111111111111112'),
    9,
    'WSOL',
    'WSOL'
  ),
  USDC: new Token(
    TOKEN_PROGRAM_ID,
    new PublicKey('CLAdX4NBgS5YCPFnTbyfX6uUUCVSx5JCTauS4mLXpgT'),
    6,
    'USDC',
    'USDC'
  ),
};

export const token_info: tokenInfo = {
  token_name: 'CLaus Token',
  token_symbol: 'Claus',
  description: `CLAUS TOKEN.\n\nTELEGRAM:  \nTWITTER: \n WEBSITE:  `,
  image_info: {
    image: imageFile ?? '',
    imageFileName: imageFileName ?? '',
  },
  uri: '', // CHANGE TO YOUR OWN URI
  token_supply: 1_000_000_000,
  token_decimals: 6,
  init_sol_amount: 5,
};

// Trading lock configuration
export let isTradingLocked = true;
