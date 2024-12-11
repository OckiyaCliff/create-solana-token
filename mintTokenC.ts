import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { base58 } from '@metaplex-foundation/umi/serializers';
import {
  mplTokenMetadata,
  TokenStandard,
  CreateV1InstructionAccounts,
  createAndMint,
  CreateV1InstructionDataArgs,
  MintV1InstructionDataArgs,
} from '@metaplex-foundation/mpl-token-metadata';
import fs from 'fs';
import {
  createGenericFile,
  createSignerFromKeypair,
  generateSigner,
  percentAmount,
  signerIdentity,
} from '@metaplex-foundation/umi';
import dotenv from 'dotenv';
import { fromWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters';
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  clusterApiUrl,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { tokenInfo } from './types';
import {
  RPC_ENDPOINT,
  creatorWallet,
  solanaConnection,
  token_info,
} from './constants';
import chalk from 'chalk';
import {
  AuthorityType,
  createSetAuthorityInstruction,
  getMint,
} from '@solana/spl-token';
dotenv.config();

// Globals to track funding status
let totalFunds = 0;
const fundingGoal = 100 * 1e9; // 100 SOL in lamports (1 SOL = 1e9 lamports)
const isTradingLocked = true;

async function mintTokentoOwner(
  rpcEndpoint: string,
  token_info: tokenInfo,
  wallet: Keypair
) {
  try {
    const { uri, token_supply, token_symbol, token_decimals, token_name } =
      token_info;

    if (!token_supply || !token_symbol || !token_decimals || !token_name) {
      throw new Error(
        'Token supply, symbol, decimals, or name must not be empty. Please update token_info in constants.ts'
      );
    }

    const umi = createUmi(rpcEndpoint, 'confirmed').use(mplTokenMetadata());
    const signer = createSignerFromKeypair(umi, fromWeb3JsKeypair(wallet));
    umi.use(signerIdentity(signer, true));
    const mint = generateSigner(umi);

    console.log(chalk.blue(`Mint address: ${mint.publicKey}`));

    const accounts: CreateV1InstructionAccounts = { mint: mint };

    const onChainData: CreateV1InstructionDataArgs & MintV1InstructionDataArgs =
      {
        isMutable: true,
        collectionDetails: null,
        name: token_name,
        symbol: token_symbol,
        amount: token_supply * Math.pow(10, token_decimals),
        uri: uri ?? '', // off-chain data
        sellerFeeBasisPoints: percentAmount(0),
        creators: null,
        decimals: token_decimals,
        printSupply: null,
      };

    const creation = await createAndMint(umi, {
      tokenStandard: TokenStandard.Fungible,
      ...accounts,
      ...onChainData,
    }).sendAndConfirm(umi);

    const signature = base58.deserialize(creation.signature)[0];

    console.log(
      chalk.green(
        `Token ${token_name} created successfully!
    Address: ${mint.publicKey}
    Signature: ${signature}
    Supply: ${token_supply}`
      )
    );

    console.log(`||---- Revoking mint authority -----||`);
    const connection = new Connection(rpcEndpoint, { commitment: 'confirmed' });

    await revokeMintAuthority(mint.publicKey.toString(), connection, wallet);
  } catch (error) {
    console.log(chalk.red(`Error minting token: ${error}`));
  }
}

async function contributeToFund(contributor, amount) {
  if (isTradingLocked) {
    totalFunds += amount;

    console.log(
      chalk.yellow(
        `Contribution received from ${contributor.publicKey.toString()} - Amount: ${amount}`
      )
    );

    if (totalFunds >= fundingGoal) {
      console.log(chalk.green('Funding goal reached! Unlocking trading...'));
      isTradingLocked;
    }
  } else {
    console.log(
      chalk.red('Trading is unlocked. Contributions are no longer accepted.')
    );
  }
}

async function revokeMintAuthority(
  tokenAddress: string,
  connection: Connection,
  wallet: Keypair
) {
  try {
    console.log(`Mint address to revoke: ${tokenAddress}`);

    const mintInfo = await getMint(connection, new PublicKey(tokenAddress));

    if (mintInfo.mintAuthority !== null) {
      console.log(`Disabling mint and freeze authority...`);
      let tx = new Transaction();

      tx.add(
        createSetAuthorityInstruction(
          new PublicKey(tokenAddress), // mint account
          wallet.publicKey, // current authority
          AuthorityType.MintTokens, // authority type
          null // new authority (null to revoke)
        )
      );

      tx.add(
        createSetAuthorityInstruction(
          new PublicKey(tokenAddress), // mint account
          wallet.publicKey, // current authority
          AuthorityType.FreezeAccount, // authority type
          null // new authority (null to revoke)
        )
      );

      const signature = await sendAndConfirmTransaction(
        connection,
        tx,
        [wallet],
        { skipPreflight: true }
      );

      console.log(`Mint and freeze successfully disabled: ${signature}`);
    } else {
      console.log(`Mint and freeze authority already disabled`);
    }
  } catch (error) {
    throw new Error(`Error revoking mint authority: ${error}`);
  }
}

mintTokentoOwner(RPC_ENDPOINT, token_info, creatorWallet);