// import { makeSuite, TestEnv } from './helpers/make-suite';
// import {
//   convertToCurrencyDecimals,
//   getContract,
//   buildPermitParams,
//   getSignatureFromTypedData,
//   buildRepayAdapterParams,
// } from '../../helpers/contracts-helpers';
// import { getMockUniswapRouter } from '../../helpers/contracts-getters';
// import { deployUniswapRepayAdapter } from '../../helpers/contracts-deployments';
// import { MockUniswapV2Router02 } from '../../types/MockUniswapV2Router02';
// import { Zero } from '@ethersproject/constants';
// import BigNumber from 'bignumber.js';
// import { DRE, evmRevert, evmSnapshot } from '../../helpers/misc-utils';
// import { ethers } from 'ethers';
// import { eContractid } from '../../helpers/types';
// import { StableDebtToken } from '../../types/StableDebtToken';
// import { BUIDLEREVM_CHAINID } from '../../helpers/buidler-constants';
// import { MAX_UINT_AMOUNT } from '../../helpers/constants';
// import { VariableDebtToken } from '../../types';
// const { parseEther } = ethers.utils;

// const { expect } = require('chai');

// makeSuite('Uniswap adapters', (testEnv: TestEnv) => {
//   let mockUniswapRouter: MockUniswapV2Router02;
//   let evmSnapshotId: string;

//   before(async () => {
//     mockUniswapRouter = await getMockUniswapRouter();
//   });

//   beforeEach(async () => {
//     evmSnapshotId = await evmSnapshot();
//   });

//   afterEach(async () => {
//     await evmRevert(evmSnapshotId);
//   });

//   describe('UniswapRepayAdapter', () => {
//     beforeEach(async () => {
//       const { users, wbch, flexUsd, usdc, bandz, pool, deployer } = testEnv;
//       const userAddress = users[0].address;

//       // Provide liquidity
//       await flexUsd.mint(parseEther('20000'));
//       await flexUsd.approve(pool.address, parseEther('20000'));
//       await pool.deposit(flexUsd.address, parseEther('20000'), deployer.address, 0);

//       const usdcLiquidity = await convertToCurrencyDecimals(usdc.address, '2000000');
//       await usdc.mint(usdcLiquidity);
//       await usdc.approve(pool.address, usdcLiquidity);
//       await pool.deposit(usdc.address, usdcLiquidity, deployer.address, 0);

//       await wbch.mint(parseEther('100'));
//       await wbch.approve(pool.address, parseEther('100'));
//       await pool.deposit(wbch.address, parseEther('100'), deployer.address, 0);

//       await bandz.mint(parseEther('1000000'));
//       await bandz.approve(pool.address, parseEther('1000000'));
//       await pool.deposit(bandz.address, parseEther('1000000'), deployer.address, 0);

//       // Make a deposit for user
//       await wbch.mint(parseEther('1000'));
//       await wbch.approve(pool.address, parseEther('1000'));
//       await pool.deposit(wbch.address, parseEther('1000'), userAddress, 0);

//       await bandz.mint(parseEther('1000000'));
//       await bandz.approve(pool.address, parseEther('1000000'));
//       await pool.deposit(bandz.address, parseEther('1000000'), userAddress, 0);

//       await usdc.mint(usdcLiquidity);
//       await usdc.approve(pool.address, usdcLiquidity);
//       await pool.deposit(usdc.address, usdcLiquidity, userAddress, 0);
//     });

//     describe('constructor', () => {
//       it('should deploy with correct parameters', async () => {
//         const { addressesProvider, wbch } = testEnv;
//         await deployUniswapRepayAdapter([
//           addressesProvider.address,
//           mockUniswapRouter.address,
//           wbch.address,
//         ]);
//       });

//       it('should revert if not valid addresses provider', async () => {
//         const { wbch } = testEnv;
//         expect(
//           deployUniswapRepayAdapter([
//             mockUniswapRouter.address,
//             mockUniswapRouter.address,
//             wbch.address,
//           ])
//         ).to.be.reverted;
//       });
//     });

//     describe('executeOperation', () => {
//       it('should correctly swap tokens and repay debt', async () => {
//         const {
//           users,
//           pool,
//           wbch,
//           aWBCH,
//           oracle,
//           flexUsd,
//           uniswapRepayAdapter,
//           helpersContract,
//         } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWBCHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

//         const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);
//         const expectedFlexUsdAmount = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountWBCHtoSwap.toString()).div(flexUsdPrice.toString()).toFixed(0)
//         );

//         // Open user Debt
//         await pool.connect(user).borrow(flexUsd.address, expectedFlexUsdAmount, 1, 0, userAddress);

//         const flexUsdStableDebtTokenAddress = (
//           await helpersContract.getReserveTokensAddresses(flexUsd.address)
//         ).stableDebtTokenAddress;

//         const flexUsdStableDebtContract = await getContract<StableDebtToken>(
//           eContractid.StableDebtToken,
//           flexUsdStableDebtTokenAddress
//         );

//         const userFlexUsdStableDebtAmountBefore = await flexUsdStableDebtContract.balanceOf(userAddress);

//         const liquidityToSwap = amountWBCHtoSwap;
//         await aWBCH.connect(user).approve(uniswapRepayAdapter.address, liquidityToSwap);
//         const userAEthBalanceBefore = await aWBCH.balanceOf(userAddress);

//         await mockUniswapRouter.connect(user).setAmountToSwap(wbch.address, liquidityToSwap);

//         const flashLoanDebt = new BigNumber(expectedFlexUsdAmount.toString())
//           .multipliedBy(1.0009)
//           .toFixed(0);

//         await mockUniswapRouter.setAmountIn(
//           flashLoanDebt,
//           wbch.address,
//           flexUsd.address,
//           liquidityToSwap
//         );

//         const params = buildRepayAdapterParams(
//           wbch.address,
//           liquidityToSwap,
//           1,
//           0,
//           0,
//           0,
//           '0x0000000000000000000000000000000000000000000000000000000000000000',
//           '0x0000000000000000000000000000000000000000000000000000000000000000',
//           false
//         );

//         await expect(
//           pool
//             .connect(user)
//             .flashLoan(
//               uniswapRepayAdapter.address,
//               [flexUsd.address],
//               [expectedFlexUsdAmount.toString()],
//               [0],
//               userAddress,
//               params,
//               0
//             )
//         )
//           .to.emit(uniswapRepayAdapter, 'Swapped')
//           .withArgs(wbch.address, flexUsd.address, liquidityToSwap.toString(), flashLoanDebt);

//         const adapterWbchBalance = await wbch.balanceOf(uniswapRepayAdapter.address);
//         const adapterFlexUsdBalance = await flexUsd.balanceOf(uniswapRepayAdapter.address);
//         const userFlexUsdStableDebtAmount = await flexUsdStableDebtContract.balanceOf(userAddress);
//         const userAEthBalance = await aWBCH.balanceOf(userAddress);

//         expect(adapterWbchBalance).to.be.eq(Zero);
//         expect(adapterFlexUsdBalance).to.be.eq(Zero);
//         expect(userFlexUsdStableDebtAmountBefore).to.be.gte(expectedFlexUsdAmount);
//         expect(userFlexUsdStableDebtAmount).to.be.lt(expectedFlexUsdAmount);
//         expect(userAEthBalance).to.be.lt(userAEthBalanceBefore);
//         expect(userAEthBalance).to.be.gte(userAEthBalanceBefore.sub(liquidityToSwap));
//       });

//       it('should correctly swap tokens and repay debt with permit', async () => {
//         const {
//           users,
//           pool,
//           wbch,
//           aWBCH,
//           oracle,
//           flexUsd,
//           uniswapRepayAdapter,
//           helpersContract,
//         } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWBCHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

//         const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);
//         const expectedFlexUsdAmount = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountWBCHtoSwap.toString()).div(flexUsdPrice.toString()).toFixed(0)
//         );

//         // Open user Debt
//         await pool.connect(user).borrow(flexUsd.address, expectedFlexUsdAmount, 1, 0, userAddress);

//         const flexUsdStableDebtTokenAddress = (
//           await helpersContract.getReserveTokensAddresses(flexUsd.address)
//         ).stableDebtTokenAddress;

//         const flexUsdStableDebtContract = await getContract<StableDebtToken>(
//           eContractid.StableDebtToken,
//           flexUsdStableDebtTokenAddress
//         );

//         const userFlexUsdStableDebtAmountBefore = await flexUsdStableDebtContract.balanceOf(userAddress);

//         const liquidityToSwap = amountWBCHtoSwap;
//         const userAEthBalanceBefore = await aWBCH.balanceOf(userAddress);

//         const chainId = DRE.network.config.chainId || BUIDLEREVM_CHAINID;
//         const deadline = MAX_UINT_AMOUNT;
//         const nonce = (await aWBCH._nonces(userAddress)).toNumber();
//         const msgParams = buildPermitParams(
//           chainId,
//           aWBCH.address,
//           '1',
//           await aWBCH.name(),
//           userAddress,
//           uniswapRepayAdapter.address,
//           nonce,
//           deadline,
//           liquidityToSwap.toString()
//         );

//         const ownerPrivateKey = require('../../test-wallets.js').accounts[1].secretKey;
//         if (!ownerPrivateKey) {
//           throw new Error('INVALID_OWNER_PK');
//         }

//         const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, msgParams);

//         await mockUniswapRouter.connect(user).setAmountToSwap(wbch.address, liquidityToSwap);

//         const flashLoanDebt = new BigNumber(expectedFlexUsdAmount.toString())
//           .multipliedBy(1.0009)
//           .toFixed(0);

//         await mockUniswapRouter.setAmountIn(
//           flashLoanDebt,
//           wbch.address,
//           flexUsd.address,
//           liquidityToSwap
//         );

//         const params = buildRepayAdapterParams(
//           wbch.address,
//           liquidityToSwap,
//           1,
//           liquidityToSwap,
//           deadline,
//           v,
//           r,
//           s,
//           false
//         );

//         await expect(
//           pool
//             .connect(user)
//             .flashLoan(
//               uniswapRepayAdapter.address,
//               [flexUsd.address],
//               [expectedFlexUsdAmount.toString()],
//               [0],
//               userAddress,
//               params,
//               0
//             )
//         )
//           .to.emit(uniswapRepayAdapter, 'Swapped')
//           .withArgs(wbch.address, flexUsd.address, liquidityToSwap.toString(), flashLoanDebt);

//         const adapterWbchBalance = await wbch.balanceOf(uniswapRepayAdapter.address);
//         const adapterFlexUsdBalance = await flexUsd.balanceOf(uniswapRepayAdapter.address);
//         const userFlexUsdStableDebtAmount = await flexUsdStableDebtContract.balanceOf(userAddress);
//         const userAEthBalance = await aWBCH.balanceOf(userAddress);

//         expect(adapterWbchBalance).to.be.eq(Zero);
//         expect(adapterFlexUsdBalance).to.be.eq(Zero);
//         expect(userFlexUsdStableDebtAmountBefore).to.be.gte(expectedFlexUsdAmount);
//         expect(userFlexUsdStableDebtAmount).to.be.lt(expectedFlexUsdAmount);
//         expect(userAEthBalance).to.be.lt(userAEthBalanceBefore);
//         expect(userAEthBalance).to.be.gte(userAEthBalanceBefore.sub(liquidityToSwap));
//       });

//       it('should revert if caller not lending pool', async () => {
//         const { users, pool, wbch, aWBCH, oracle, flexUsd, uniswapRepayAdapter } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWBCHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

//         const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);
//         const expectedFlexUsdAmount = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountWBCHtoSwap.toString()).div(flexUsdPrice.toString()).toFixed(0)
//         );

//         // Open user Debt
//         await pool.connect(user).borrow(flexUsd.address, expectedFlexUsdAmount, 1, 0, userAddress);

//         const liquidityToSwap = amountWBCHtoSwap;
//         await aWBCH.connect(user).approve(uniswapRepayAdapter.address, liquidityToSwap);

//         await mockUniswapRouter.connect(user).setAmountToSwap(wbch.address, liquidityToSwap);

//         const params = buildRepayAdapterParams(
//           wbch.address,
//           liquidityToSwap,
//           1,
//           0,
//           0,
//           0,
//           '0x0000000000000000000000000000000000000000000000000000000000000000',
//           '0x0000000000000000000000000000000000000000000000000000000000000000',
//           false
//         );

//         await expect(
//           uniswapRepayAdapter
//             .connect(user)
//             .executeOperation(
//               [flexUsd.address],
//               [expectedFlexUsdAmount.toString()],
//               [0],
//               userAddress,
//               params
//             )
//         ).to.be.revertedWith('CALLER_MUST_BE_LENDING_POOL');
//       });

//       it('should revert if there is not debt to repay with the specified rate mode', async () => {
//         const { users, pool, wbch, oracle, flexUsd, uniswapRepayAdapter, aWBCH } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWBCHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

//         await wbch.connect(user).mint(amountWBCHtoSwap);
//         await wbch.connect(user).transfer(uniswapRepayAdapter.address, amountWBCHtoSwap);

//         const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);
//         const expectedFlexUsdAmount = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountWBCHtoSwap.toString()).div(flexUsdPrice.toString()).toFixed(0)
//         );

//         // Open user Debt
//         await pool.connect(user).borrow(flexUsd.address, expectedFlexUsdAmount, 2, 0, userAddress);

//         const liquidityToSwap = amountWBCHtoSwap;
//         await aWBCH.connect(user).approve(uniswapRepayAdapter.address, liquidityToSwap);

//         await mockUniswapRouter.connect(user).setAmountToSwap(wbch.address, liquidityToSwap);

//         const params = buildRepayAdapterParams(
//           wbch.address,
//           liquidityToSwap,
//           1,
//           0,
//           0,
//           0,
//           '0x0000000000000000000000000000000000000000000000000000000000000000',
//           '0x0000000000000000000000000000000000000000000000000000000000000000',
//           false
//         );

//         await expect(
//           pool
//             .connect(user)
//             .flashLoan(
//               uniswapRepayAdapter.address,
//               [flexUsd.address],
//               [expectedFlexUsdAmount.toString()],
//               [0],
//               userAddress,
//               params,
//               0
//             )
//         ).to.be.reverted;
//       });

//       it('should revert if there is not debt to repay', async () => {
//         const { users, pool, wbch, oracle, flexUsd, uniswapRepayAdapter, aWBCH } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWBCHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

//         await wbch.connect(user).mint(amountWBCHtoSwap);
//         await wbch.connect(user).transfer(uniswapRepayAdapter.address, amountWBCHtoSwap);

//         const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);
//         const expectedFlexUsdAmount = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountWBCHtoSwap.toString()).div(flexUsdPrice.toString()).toFixed(0)
//         );

//         const liquidityToSwap = amountWBCHtoSwap;
//         await aWBCH.connect(user).approve(uniswapRepayAdapter.address, liquidityToSwap);

//         await mockUniswapRouter.connect(user).setAmountToSwap(wbch.address, liquidityToSwap);

//         const params = buildRepayAdapterParams(
//           wbch.address,
//           liquidityToSwap,
//           1,
//           0,
//           0,
//           0,
//           '0x0000000000000000000000000000000000000000000000000000000000000000',
//           '0x0000000000000000000000000000000000000000000000000000000000000000',
//           false
//         );

//         await expect(
//           pool
//             .connect(user)
//             .flashLoan(
//               uniswapRepayAdapter.address,
//               [flexUsd.address],
//               [expectedFlexUsdAmount.toString()],
//               [0],
//               userAddress,
//               params,
//               0
//             )
//         ).to.be.reverted;
//       });

//       it('should revert when max amount allowed to swap is bigger than max slippage', async () => {
//         const { users, pool, wbch, oracle, flexUsd, aWBCH, uniswapRepayAdapter } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWBCHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

//         const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);
//         const expectedFlexUsdAmount = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountWBCHtoSwap.toString()).div(flexUsdPrice.toString()).toFixed(0)
//         );

//         // Open user Debt
//         await pool.connect(user).borrow(flexUsd.address, expectedFlexUsdAmount, 1, 0, userAddress);

//         const bigMaxAmountToSwap = amountWBCHtoSwap.mul(2);
//         await aWBCH.connect(user).approve(uniswapRepayAdapter.address, bigMaxAmountToSwap);

//         await mockUniswapRouter.connect(user).setAmountToSwap(wbch.address, bigMaxAmountToSwap);

//         const flashLoanDebt = new BigNumber(expectedFlexUsdAmount.toString())
//           .multipliedBy(1.0009)
//           .toFixed(0);

//         await mockUniswapRouter.setAmountIn(
//           flashLoanDebt,
//           wbch.address,
//           flexUsd.address,
//           bigMaxAmountToSwap
//         );

//         const params = buildRepayAdapterParams(
//           wbch.address,
//           bigMaxAmountToSwap,
//           1,
//           0,
//           0,
//           0,
//           '0x0000000000000000000000000000000000000000000000000000000000000000',
//           '0x0000000000000000000000000000000000000000000000000000000000000000',
//           false
//         );

//         await expect(
//           pool
//             .connect(user)
//             .flashLoan(
//               uniswapRepayAdapter.address,
//               [flexUsd.address],
//               [expectedFlexUsdAmount.toString()],
//               [0],
//               userAddress,
//               params,
//               0
//             )
//         ).to.be.revertedWith('maxAmountToSwap exceed max slippage');
//       });

//       it('should swap, repay debt and pull the needed ATokens leaving no leftovers', async () => {
//         const {
//           users,
//           pool,
//           wbch,
//           aWBCH,
//           oracle,
//           flexUsd,
//           uniswapRepayAdapter,
//           helpersContract,
//         } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWBCHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

//         const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);
//         const expectedFlexUsdAmount = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountWBCHtoSwap.toString()).div(flexUsdPrice.toString()).toFixed(0)
//         );

//         // Open user Debt
//         await pool.connect(user).borrow(flexUsd.address, expectedFlexUsdAmount, 1, 0, userAddress);

//         const flexUsdStableDebtTokenAddress = (
//           await helpersContract.getReserveTokensAddresses(flexUsd.address)
//         ).stableDebtTokenAddress;

//         const flexUsdStableDebtContract = await getContract<StableDebtToken>(
//           eContractid.StableDebtToken,
//           flexUsdStableDebtTokenAddress
//         );

//         const userFlexUsdStableDebtAmountBefore = await flexUsdStableDebtContract.balanceOf(userAddress);

//         const liquidityToSwap = amountWBCHtoSwap;
//         await aWBCH.connect(user).approve(uniswapRepayAdapter.address, liquidityToSwap);
//         const userAEthBalanceBefore = await aWBCH.balanceOf(userAddress);
//         const userWbchBalanceBefore = await wbch.balanceOf(userAddress);

//         const actualWBchSwapped = new BigNumber(liquidityToSwap.toString())
//           .multipliedBy(0.995)
//           .toFixed(0);

//         await mockUniswapRouter.connect(user).setAmountToSwap(wbch.address, actualWBchSwapped);

//         const flashLoanDebt = new BigNumber(expectedFlexUsdAmount.toString())
//           .multipliedBy(1.0009)
//           .toFixed(0);

//         await mockUniswapRouter.setAmountIn(
//           flashLoanDebt,
//           wbch.address,
//           flexUsd.address,
//           actualWBchSwapped
//         );

//         const params = buildRepayAdapterParams(
//           wbch.address,
//           liquidityToSwap,
//           1,
//           0,
//           0,
//           0,
//           '0x0000000000000000000000000000000000000000000000000000000000000000',
//           '0x0000000000000000000000000000000000000000000000000000000000000000',
//           false
//         );

//         await expect(
//           pool
//             .connect(user)
//             .flashLoan(
//               uniswapRepayAdapter.address,
//               [flexUsd.address],
//               [expectedFlexUsdAmount.toString()],
//               [0],
//               userAddress,
//               params,
//               0
//             )
//         )
//           .to.emit(uniswapRepayAdapter, 'Swapped')
//           .withArgs(wbch.address, flexUsd.address, actualWBchSwapped.toString(), flashLoanDebt);

//         const adapterWbchBalance = await wbch.balanceOf(uniswapRepayAdapter.address);
//         const adapterFlexUsdBalance = await flexUsd.balanceOf(uniswapRepayAdapter.address);
//         const userFlexUsdStableDebtAmount = await flexUsdStableDebtContract.balanceOf(userAddress);
//         const userAEthBalance = await aWBCH.balanceOf(userAddress);
//         const adapterAEthBalance = await aWBCH.balanceOf(uniswapRepayAdapter.address);
//         const userWbchBalance = await wbch.balanceOf(userAddress);

//         expect(adapterAEthBalance).to.be.eq(Zero);
//         expect(adapterWbchBalance).to.be.eq(Zero);
//         expect(adapterFlexUsdBalance).to.be.eq(Zero);
//         expect(userFlexUsdStableDebtAmountBefore).to.be.gte(expectedFlexUsdAmount);
//         expect(userFlexUsdStableDebtAmount).to.be.lt(expectedFlexUsdAmount);
//         expect(userAEthBalance).to.be.lt(userAEthBalanceBefore);
//         expect(userAEthBalance).to.be.eq(userAEthBalanceBefore.sub(actualWBchSwapped));
//         expect(userWbchBalance).to.be.eq(userWbchBalanceBefore);
//       });

//       it('should correctly swap tokens and repay the whole stable debt', async () => {
//         const {
//           users,
//           pool,
//           wbch,
//           aWBCH,
//           oracle,
//           flexUsd,
//           uniswapRepayAdapter,
//           helpersContract,
//         } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWBCHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

//         const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);
//         const expectedFlexUsdAmount = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountWBCHtoSwap.toString()).div(flexUsdPrice.toString()).toFixed(0)
//         );

//         // Open user Debt
//         await pool.connect(user).borrow(flexUsd.address, expectedFlexUsdAmount, 1, 0, userAddress);

//         const flexUsdStableDebtTokenAddress = (
//           await helpersContract.getReserveTokensAddresses(flexUsd.address)
//         ).stableDebtTokenAddress;

//         const flexUsdStableDebtContract = await getContract<StableDebtToken>(
//           eContractid.StableDebtToken,
//           flexUsdStableDebtTokenAddress
//         );

//         const userFlexUsdStableDebtAmountBefore = await flexUsdStableDebtContract.balanceOf(userAddress);

//         // Add a % to repay on top of the debt
//         const liquidityToSwap = new BigNumber(amountWBCHtoSwap.toString())
//           .multipliedBy(1.1)
//           .toFixed(0);

//         await aWBCH.connect(user).approve(uniswapRepayAdapter.address, liquidityToSwap);
//         const userAEthBalanceBefore = await aWBCH.balanceOf(userAddress);

//         // Add a % to repay on top of the debt
//         const amountToRepay = new BigNumber(expectedFlexUsdAmount.toString())
//           .multipliedBy(1.1)
//           .toFixed(0);

//         await mockUniswapRouter.connect(user).setAmountToSwap(wbch.address, amountWBCHtoSwap);
//         await mockUniswapRouter.setDefaultMockValue(amountWBCHtoSwap);

//         const params = buildRepayAdapterParams(
//           wbch.address,
//           liquidityToSwap,
//           1,
//           0,
//           0,
//           0,
//           '0x0000000000000000000000000000000000000000000000000000000000000000',
//           '0x0000000000000000000000000000000000000000000000000000000000000000',
//           false
//         );

//         await pool
//           .connect(user)
//           .flashLoan(
//             uniswapRepayAdapter.address,
//             [flexUsd.address],
//             [amountToRepay.toString()],
//             [0],
//             userAddress,
//             params,
//             0
//           );

//         const adapterWbchBalance = await wbch.balanceOf(uniswapRepayAdapter.address);
//         const adapterFlexUsdBalance = await flexUsd.balanceOf(uniswapRepayAdapter.address);
//         const userFlexUsdStableDebtAmount = await flexUsdStableDebtContract.balanceOf(userAddress);
//         const userAEthBalance = await aWBCH.balanceOf(userAddress);
//         const adapterAEthBalance = await aWBCH.balanceOf(uniswapRepayAdapter.address);

//         expect(adapterAEthBalance).to.be.eq(Zero);
//         expect(adapterWbchBalance).to.be.eq(Zero);
//         expect(adapterFlexUsdBalance).to.be.eq(Zero);
//         expect(userFlexUsdStableDebtAmountBefore).to.be.gte(expectedFlexUsdAmount);
//         expect(userFlexUsdStableDebtAmount).to.be.eq(Zero);
//         expect(userAEthBalance).to.be.lt(userAEthBalanceBefore);
//         expect(userAEthBalance).to.be.gte(userAEthBalanceBefore.sub(liquidityToSwap));
//       });

//       it('should correctly swap tokens and repay the whole variable debt', async () => {
//         const {
//           users,
//           pool,
//           wbch,
//           aWBCH,
//           oracle,
//           flexUsd,
//           uniswapRepayAdapter,
//           helpersContract,
//         } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWBCHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

//         const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);
//         const expectedFlexUsdAmount = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountWBCHtoSwap.toString()).div(flexUsdPrice.toString()).toFixed(0)
//         );

//         // Open user Debt
//         await pool.connect(user).borrow(flexUsd.address, expectedFlexUsdAmount, 2, 0, userAddress);

//         const flexUsdStableVariableTokenAddress = (
//           await helpersContract.getReserveTokensAddresses(flexUsd.address)
//         ).variableDebtTokenAddress;

//         const flexUsdVariableDebtContract = await getContract<StableDebtToken>(
//           eContractid.VariableDebtToken,
//           flexUsdStableVariableTokenAddress
//         );

//         const userFlexUsdVariableDebtAmountBefore = await flexUsdVariableDebtContract.balanceOf(
//           userAddress
//         );

//         // Add a % to repay on top of the debt
//         const liquidityToSwap = new BigNumber(amountWBCHtoSwap.toString())
//           .multipliedBy(1.1)
//           .toFixed(0);

//         await aWBCH.connect(user).approve(uniswapRepayAdapter.address, liquidityToSwap);
//         const userAEthBalanceBefore = await aWBCH.balanceOf(userAddress);

//         // Add a % to repay on top of the debt
//         const amountToRepay = new BigNumber(expectedFlexUsdAmount.toString())
//           .multipliedBy(1.1)
//           .toFixed(0);

//         await mockUniswapRouter.connect(user).setAmountToSwap(wbch.address, amountWBCHtoSwap);
//         await mockUniswapRouter.setDefaultMockValue(amountWBCHtoSwap);

//         const params = buildRepayAdapterParams(
//           wbch.address,
//           liquidityToSwap,
//           2,
//           0,
//           0,
//           0,
//           '0x0000000000000000000000000000000000000000000000000000000000000000',
//           '0x0000000000000000000000000000000000000000000000000000000000000000',
//           false
//         );

//         await pool
//           .connect(user)
//           .flashLoan(
//             uniswapRepayAdapter.address,
//             [flexUsd.address],
//             [amountToRepay.toString()],
//             [0],
//             userAddress,
//             params,
//             0
//           );

//         const adapterWbchBalance = await wbch.balanceOf(uniswapRepayAdapter.address);
//         const adapterFlexUsdBalance = await flexUsd.balanceOf(uniswapRepayAdapter.address);
//         const userFlexUsdVariableDebtAmount = await flexUsdVariableDebtContract.balanceOf(userAddress);
//         const userAEthBalance = await aWBCH.balanceOf(userAddress);
//         const adapterAEthBalance = await aWBCH.balanceOf(uniswapRepayAdapter.address);

//         expect(adapterAEthBalance).to.be.eq(Zero);
//         expect(adapterWbchBalance).to.be.eq(Zero);
//         expect(adapterFlexUsdBalance).to.be.eq(Zero);
//         expect(userFlexUsdVariableDebtAmountBefore).to.be.gte(expectedFlexUsdAmount);
//         expect(userFlexUsdVariableDebtAmount).to.be.eq(Zero);
//         expect(userAEthBalance).to.be.lt(userAEthBalanceBefore);
//         expect(userAEthBalance).to.be.gte(userAEthBalanceBefore.sub(liquidityToSwap));
//       });

//       it('should correctly repay debt via flash loan using the same asset as collateral', async () => {
//         const { users, pool, aFlexUsd, flexUsd, uniswapRepayAdapter, helpersContract } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         // Add deposit for user
//         await flexUsd.mint(parseEther('30'));
//         await flexUsd.approve(pool.address, parseEther('30'));
//         await pool.deposit(flexUsd.address, parseEther('30'), userAddress, 0);

//         const amountCollateralToSwap = parseEther('10');
//         const debtAmount = parseEther('10');

//         // Open user Debt
//         await pool.connect(user).borrow(flexUsd.address, debtAmount, 2, 0, userAddress);

//         const flexUsdVariableDebtTokenAddress = (
//           await helpersContract.getReserveTokensAddresses(flexUsd.address)
//         ).variableDebtTokenAddress;

//         const flexUsdVariableDebtContract = await getContract<VariableDebtToken>(
//           eContractid.VariableDebtToken,
//           flexUsdVariableDebtTokenAddress
//         );

//         const userFlexUsdVariableDebtAmountBefore = await flexUsdVariableDebtContract.balanceOf(
//           userAddress
//         );

//         const flashLoanDebt = new BigNumber(amountCollateralToSwap.toString())
//           .multipliedBy(1.0009)
//           .toFixed(0);

//         await aFlexUsd.connect(user).approve(uniswapRepayAdapter.address, flashLoanDebt);
//         const userAFlexUsdBalanceBefore = await aFlexUsd.balanceOf(userAddress);
//         const userFlexUsdBalanceBefore = await flexUsd.balanceOf(userAddress);

//         const params = buildRepayAdapterParams(
//           flexUsd.address,
//           amountCollateralToSwap,
//           2,
//           0,
//           0,
//           0,
//           '0x0000000000000000000000000000000000000000000000000000000000000000',
//           '0x0000000000000000000000000000000000000000000000000000000000000000',
//           false
//         );

//         await pool
//           .connect(user)
//           .flashLoan(
//             uniswapRepayAdapter.address,
//             [flexUsd.address],
//             [amountCollateralToSwap.toString()],
//             [0],
//             userAddress,
//             params,
//             0
//           );

//         const adapterFlexUsdBalance = await flexUsd.balanceOf(uniswapRepayAdapter.address);
//         const userFlexUsdVariableDebtAmount = await flexUsdVariableDebtContract.balanceOf(userAddress);
//         const userAFlexUsdBalance = await aFlexUsd.balanceOf(userAddress);
//         const adapterAFlexUsdBalance = await aFlexUsd.balanceOf(uniswapRepayAdapter.address);
//         const userFlexUsdBalance = await flexUsd.balanceOf(userAddress);

//         expect(adapterAFlexUsdBalance).to.be.eq(Zero, 'adapter aFLEXUSD balance should be zero');
//         expect(adapterFlexUsdBalance).to.be.eq(Zero, 'adapter FLEXUSD balance should be zero');
//         expect(userFlexUsdVariableDebtAmountBefore).to.be.gte(
//           debtAmount,
//           ' user FLEXUSD variable debt before should be gte debtAmount'
//         );
//         expect(userFlexUsdVariableDebtAmount).to.be.lt(
//           debtAmount,
//           'user flexUsd variable debt amount should be lt debt amount'
//         );
//         expect(userAFlexUsdBalance).to.be.lt(
//           userAFlexUsdBalanceBefore,
//           'user aFLEXUSD balance should be lt aFLEXUSD prior balance'
//         );
//         expect(userAFlexUsdBalance).to.be.gte(
//           userAFlexUsdBalanceBefore.sub(flashLoanDebt),
//           'user aFLEXUSD balance should be gte aFLEXUSD prior balance sub flash loan debt'
//         );
//         expect(userFlexUsdBalance).to.be.eq(userFlexUsdBalanceBefore, 'user flexUsd balance eq prior balance');
//       });
//     });

//     describe('swapAndRepay', () => {
//       it('should correctly swap tokens and repay debt', async () => {
//         const {
//           users,
//           pool,
//           wbch,
//           aWBCH,
//           oracle,
//           flexUsd,
//           uniswapRepayAdapter,
//           helpersContract,
//         } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWBCHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

//         const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);
//         const expectedFlexUsdAmount = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountWBCHtoSwap.toString()).div(flexUsdPrice.toString()).toFixed(0)
//         );

//         // Open user Debt
//         await pool.connect(user).borrow(flexUsd.address, expectedFlexUsdAmount, 1, 0, userAddress);

//         const flexUsdStableDebtTokenAddress = (
//           await helpersContract.getReserveTokensAddresses(flexUsd.address)
//         ).stableDebtTokenAddress;

//         const flexUsdStableDebtContract = await getContract<StableDebtToken>(
//           eContractid.StableDebtToken,
//           flexUsdStableDebtTokenAddress
//         );

//         const userFlexUsdStableDebtAmountBefore = await flexUsdStableDebtContract.balanceOf(userAddress);

//         const liquidityToSwap = amountWBCHtoSwap;
//         await aWBCH.connect(user).approve(uniswapRepayAdapter.address, liquidityToSwap);
//         const userAEthBalanceBefore = await aWBCH.balanceOf(userAddress);

//         await mockUniswapRouter.setAmountToSwap(wbch.address, liquidityToSwap);

//         await mockUniswapRouter.setDefaultMockValue(liquidityToSwap);

//         await uniswapRepayAdapter.connect(user).swapAndRepay(
//           wbch.address,
//           flexUsd.address,
//           liquidityToSwap,
//           expectedFlexUsdAmount,
//           1,
//           {
//             amount: 0,
//             deadline: 0,
//             v: 0,
//             r: '0x0000000000000000000000000000000000000000000000000000000000000000',
//             s: '0x0000000000000000000000000000000000000000000000000000000000000000',
//           },
//           false
//         );

//         const adapterWbchBalance = await wbch.balanceOf(uniswapRepayAdapter.address);
//         const adapterFlexUsdBalance = await flexUsd.balanceOf(uniswapRepayAdapter.address);
//         const userFlexUsdStableDebtAmount = await flexUsdStableDebtContract.balanceOf(userAddress);
//         const userAEthBalance = await aWBCH.balanceOf(userAddress);

//         expect(adapterWbchBalance).to.be.eq(Zero);
//         expect(adapterFlexUsdBalance).to.be.eq(Zero);
//         expect(userFlexUsdStableDebtAmountBefore).to.be.gte(expectedFlexUsdAmount);
//         expect(userFlexUsdStableDebtAmount).to.be.lt(expectedFlexUsdAmount);
//         expect(userAEthBalance).to.be.lt(userAEthBalanceBefore);
//         expect(userAEthBalance).to.be.gte(userAEthBalanceBefore.sub(liquidityToSwap));
//       });

//       it('should correctly swap tokens and repay debt with permit', async () => {
//         const {
//           users,
//           pool,
//           wbch,
//           aWBCH,
//           oracle,
//           flexUsd,
//           uniswapRepayAdapter,
//           helpersContract,
//         } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWBCHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

//         const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);
//         const expectedFlexUsdAmount = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountWBCHtoSwap.toString()).div(flexUsdPrice.toString()).toFixed(0)
//         );

//         // Open user Debt
//         await pool.connect(user).borrow(flexUsd.address, expectedFlexUsdAmount, 1, 0, userAddress);

//         const flexUsdStableDebtTokenAddress = (
//           await helpersContract.getReserveTokensAddresses(flexUsd.address)
//         ).stableDebtTokenAddress;

//         const flexUsdStableDebtContract = await getContract<StableDebtToken>(
//           eContractid.StableDebtToken,
//           flexUsdStableDebtTokenAddress
//         );

//         const userFlexUsdStableDebtAmountBefore = await flexUsdStableDebtContract.balanceOf(userAddress);

//         const liquidityToSwap = amountWBCHtoSwap;
//         const userAEthBalanceBefore = await aWBCH.balanceOf(userAddress);

//         await mockUniswapRouter.setAmountToSwap(wbch.address, liquidityToSwap);

//         await mockUniswapRouter.setDefaultMockValue(liquidityToSwap);

//         const chainId = DRE.network.config.chainId || BUIDLEREVM_CHAINID;
//         const deadline = MAX_UINT_AMOUNT;
//         const nonce = (await aWBCH._nonces(userAddress)).toNumber();
//         const msgParams = buildPermitParams(
//           chainId,
//           aWBCH.address,
//           '1',
//           await aWBCH.name(),
//           userAddress,
//           uniswapRepayAdapter.address,
//           nonce,
//           deadline,
//           liquidityToSwap.toString()
//         );

//         const ownerPrivateKey = require('../../test-wallets.js').accounts[1].secretKey;
//         if (!ownerPrivateKey) {
//           throw new Error('INVALID_OWNER_PK');
//         }

//         const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, msgParams);

//         await uniswapRepayAdapter.connect(user).swapAndRepay(
//           wbch.address,
//           flexUsd.address,
//           liquidityToSwap,
//           expectedFlexUsdAmount,
//           1,
//           {
//             amount: liquidityToSwap,
//             deadline,
//             v,
//             r,
//             s,
//           },
//           false
//         );

//         const adapterWbchBalance = await wbch.balanceOf(uniswapRepayAdapter.address);
//         const adapterFlexUsdBalance = await flexUsd.balanceOf(uniswapRepayAdapter.address);
//         const userFlexUsdStableDebtAmount = await flexUsdStableDebtContract.balanceOf(userAddress);
//         const userAEthBalance = await aWBCH.balanceOf(userAddress);

//         expect(adapterWbchBalance).to.be.eq(Zero);
//         expect(adapterFlexUsdBalance).to.be.eq(Zero);
//         expect(userFlexUsdStableDebtAmountBefore).to.be.gte(expectedFlexUsdAmount);
//         expect(userFlexUsdStableDebtAmount).to.be.lt(expectedFlexUsdAmount);
//         expect(userAEthBalance).to.be.lt(userAEthBalanceBefore);
//         expect(userAEthBalance).to.be.gte(userAEthBalanceBefore.sub(liquidityToSwap));
//       });

//       it('should revert if there is not debt to repay', async () => {
//         const { users, wbch, aWBCH, oracle, flexUsd, uniswapRepayAdapter } = testEnv;
//         const user = users[0].signer;

//         const amountWBCHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

//         const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);
//         const expectedFlexUsdAmount = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountWBCHtoSwap.toString()).div(flexUsdPrice.toString()).toFixed(0)
//         );

//         const liquidityToSwap = amountWBCHtoSwap;
//         await aWBCH.connect(user).approve(uniswapRepayAdapter.address, liquidityToSwap);

//         await mockUniswapRouter.setAmountToSwap(wbch.address, liquidityToSwap);

//         await mockUniswapRouter.setDefaultMockValue(liquidityToSwap);

//         await expect(
//           uniswapRepayAdapter.connect(user).swapAndRepay(
//             wbch.address,
//             flexUsd.address,
//             liquidityToSwap,
//             expectedFlexUsdAmount,
//             1,
//             {
//               amount: 0,
//               deadline: 0,
//               v: 0,
//               r: '0x0000000000000000000000000000000000000000000000000000000000000000',
//               s: '0x0000000000000000000000000000000000000000000000000000000000000000',
//             },
//             false
//           )
//         ).to.be.reverted;
//       });

//       it('should revert when max amount allowed to swap is bigger than max slippage', async () => {
//         const { users, pool, wbch, aWBCH, oracle, flexUsd, uniswapRepayAdapter } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWBCHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

//         const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);
//         const expectedFlexUsdAmount = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountWBCHtoSwap.toString()).div(flexUsdPrice.toString()).toFixed(0)
//         );

//         // Open user Debt
//         await pool.connect(user).borrow(flexUsd.address, expectedFlexUsdAmount, 1, 0, userAddress);

//         const bigMaxAmountToSwap = amountWBCHtoSwap.mul(2);
//         await aWBCH.connect(user).approve(uniswapRepayAdapter.address, bigMaxAmountToSwap);

//         await mockUniswapRouter.connect(user).setAmountToSwap(wbch.address, bigMaxAmountToSwap);

//         await mockUniswapRouter.setDefaultMockValue(bigMaxAmountToSwap);

//         await expect(
//           uniswapRepayAdapter.connect(user).swapAndRepay(
//             wbch.address,
//             flexUsd.address,
//             bigMaxAmountToSwap,
//             expectedFlexUsdAmount,
//             1,
//             {
//               amount: 0,
//               deadline: 0,
//               v: 0,
//               r: '0x0000000000000000000000000000000000000000000000000000000000000000',
//               s: '0x0000000000000000000000000000000000000000000000000000000000000000',
//             },
//             false
//           )
//         ).to.be.revertedWith('maxAmountToSwap exceed max slippage');
//       });

//       it('should swap, repay debt and pull the needed ATokens leaving no leftovers', async () => {
//         const {
//           users,
//           pool,
//           wbch,
//           aWBCH,
//           oracle,
//           flexUsd,
//           uniswapRepayAdapter,
//           helpersContract,
//         } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWBCHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

//         const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);
//         const expectedFlexUsdAmount = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountWBCHtoSwap.toString()).div(flexUsdPrice.toString()).toFixed(0)
//         );

//         // Open user Debt
//         await pool.connect(user).borrow(flexUsd.address, expectedFlexUsdAmount, 1, 0, userAddress);

//         const flexUsdStableDebtTokenAddress = (
//           await helpersContract.getReserveTokensAddresses(flexUsd.address)
//         ).stableDebtTokenAddress;

//         const flexUsdStableDebtContract = await getContract<StableDebtToken>(
//           eContractid.StableDebtToken,
//           flexUsdStableDebtTokenAddress
//         );

//         const userFlexUsdStableDebtAmountBefore = await flexUsdStableDebtContract.balanceOf(userAddress);

//         const liquidityToSwap = amountWBCHtoSwap;
//         await aWBCH.connect(user).approve(uniswapRepayAdapter.address, liquidityToSwap);
//         const userAEthBalanceBefore = await aWBCH.balanceOf(userAddress);
//         const userWbchBalanceBefore = await wbch.balanceOf(userAddress);

//         const actualWBchSwapped = new BigNumber(liquidityToSwap.toString())
//           .multipliedBy(0.995)
//           .toFixed(0);

//         await mockUniswapRouter.connect(user).setAmountToSwap(wbch.address, actualWBchSwapped);

//         await mockUniswapRouter.setDefaultMockValue(actualWBchSwapped);

//         await uniswapRepayAdapter.connect(user).swapAndRepay(
//           wbch.address,
//           flexUsd.address,
//           liquidityToSwap,
//           expectedFlexUsdAmount,
//           1,
//           {
//             amount: 0,
//             deadline: 0,
//             v: 0,
//             r: '0x0000000000000000000000000000000000000000000000000000000000000000',
//             s: '0x0000000000000000000000000000000000000000000000000000000000000000',
//           },
//           false
//         );

//         const adapterWbchBalance = await wbch.balanceOf(uniswapRepayAdapter.address);
//         const adapterFlexUsdBalance = await flexUsd.balanceOf(uniswapRepayAdapter.address);
//         const userFlexUsdStableDebtAmount = await flexUsdStableDebtContract.balanceOf(userAddress);
//         const userAEthBalance = await aWBCH.balanceOf(userAddress);
//         const adapterAEthBalance = await aWBCH.balanceOf(uniswapRepayAdapter.address);
//         const userWbchBalance = await wbch.balanceOf(userAddress);

//         expect(adapterAEthBalance).to.be.eq(Zero);
//         expect(adapterWbchBalance).to.be.eq(Zero);
//         expect(adapterFlexUsdBalance).to.be.eq(Zero);
//         expect(userFlexUsdStableDebtAmountBefore).to.be.gte(expectedFlexUsdAmount);
//         expect(userFlexUsdStableDebtAmount).to.be.lt(expectedFlexUsdAmount);
//         expect(userAEthBalance).to.be.lt(userAEthBalanceBefore);
//         expect(userAEthBalance).to.be.eq(userAEthBalanceBefore.sub(actualWBchSwapped));
//         expect(userWbchBalance).to.be.eq(userWbchBalanceBefore);
//       });

//       it('should correctly swap tokens and repay the whole stable debt', async () => {
//         const {
//           users,
//           pool,
//           wbch,
//           aWBCH,
//           oracle,
//           flexUsd,
//           uniswapRepayAdapter,
//           helpersContract,
//         } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWBCHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

//         const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);
//         const expectedFlexUsdAmount = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountWBCHtoSwap.toString()).div(flexUsdPrice.toString()).toFixed(0)
//         );

//         // Open user Debt
//         await pool.connect(user).borrow(flexUsd.address, expectedFlexUsdAmount, 1, 0, userAddress);

//         const flexUsdStableDebtTokenAddress = (
//           await helpersContract.getReserveTokensAddresses(flexUsd.address)
//         ).stableDebtTokenAddress;

//         const flexUsdStableDebtContract = await getContract<StableDebtToken>(
//           eContractid.StableDebtToken,
//           flexUsdStableDebtTokenAddress
//         );

//         const userFlexUsdStableDebtAmountBefore = await flexUsdStableDebtContract.balanceOf(userAddress);

//         // Add a % to repay on top of the debt
//         const liquidityToSwap = new BigNumber(amountWBCHtoSwap.toString())
//           .multipliedBy(1.1)
//           .toFixed(0);

//         await aWBCH.connect(user).approve(uniswapRepayAdapter.address, liquidityToSwap);
//         const userAEthBalanceBefore = await aWBCH.balanceOf(userAddress);

//         // Add a % to repay on top of the debt
//         const amountToRepay = new BigNumber(expectedFlexUsdAmount.toString())
//           .multipliedBy(1.1)
//           .toFixed(0);

//         await mockUniswapRouter.connect(user).setAmountToSwap(wbch.address, amountWBCHtoSwap);
//         await mockUniswapRouter.setDefaultMockValue(amountWBCHtoSwap);

//         await uniswapRepayAdapter.connect(user).swapAndRepay(
//           wbch.address,
//           flexUsd.address,
//           liquidityToSwap,
//           amountToRepay,
//           1,
//           {
//             amount: 0,
//             deadline: 0,
//             v: 0,
//             r: '0x0000000000000000000000000000000000000000000000000000000000000000',
//             s: '0x0000000000000000000000000000000000000000000000000000000000000000',
//           },
//           false
//         );

//         const adapterWbchBalance = await wbch.balanceOf(uniswapRepayAdapter.address);
//         const adapterFlexUsdBalance = await flexUsd.balanceOf(uniswapRepayAdapter.address);
//         const userFlexUsdStableDebtAmount = await flexUsdStableDebtContract.balanceOf(userAddress);
//         const userAEthBalance = await aWBCH.balanceOf(userAddress);
//         const adapterAEthBalance = await aWBCH.balanceOf(uniswapRepayAdapter.address);

//         expect(adapterAEthBalance).to.be.eq(Zero);
//         expect(adapterWbchBalance).to.be.eq(Zero);
//         expect(adapterFlexUsdBalance).to.be.eq(Zero);
//         expect(userFlexUsdStableDebtAmountBefore).to.be.gte(expectedFlexUsdAmount);
//         expect(userFlexUsdStableDebtAmount).to.be.eq(Zero);
//         expect(userAEthBalance).to.be.lt(userAEthBalanceBefore);
//         expect(userAEthBalance).to.be.gte(userAEthBalanceBefore.sub(liquidityToSwap));
//       });

//       it('should correctly swap tokens and repay the whole variable debt', async () => {
//         const {
//           users,
//           pool,
//           wbch,
//           aWBCH,
//           oracle,
//           flexUsd,
//           uniswapRepayAdapter,
//           helpersContract,
//         } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWBCHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

//         const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);
//         const expectedFlexUsdAmount = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountWBCHtoSwap.toString()).div(flexUsdPrice.toString()).toFixed(0)
//         );

//         // Open user Debt
//         await pool.connect(user).borrow(flexUsd.address, expectedFlexUsdAmount, 2, 0, userAddress);

//         const flexUsdStableVariableTokenAddress = (
//           await helpersContract.getReserveTokensAddresses(flexUsd.address)
//         ).variableDebtTokenAddress;

//         const flexUsdVariableDebtContract = await getContract<StableDebtToken>(
//           eContractid.VariableDebtToken,
//           flexUsdStableVariableTokenAddress
//         );

//         const userFlexUsdVariableDebtAmountBefore = await flexUsdVariableDebtContract.balanceOf(
//           userAddress
//         );

//         // Add a % to repay on top of the debt
//         const liquidityToSwap = new BigNumber(amountWBCHtoSwap.toString())
//           .multipliedBy(1.1)
//           .toFixed(0);

//         await aWBCH.connect(user).approve(uniswapRepayAdapter.address, liquidityToSwap);
//         const userAEthBalanceBefore = await aWBCH.balanceOf(userAddress);

//         // Add a % to repay on top of the debt
//         const amountToRepay = new BigNumber(expectedFlexUsdAmount.toString())
//           .multipliedBy(1.1)
//           .toFixed(0);

//         await mockUniswapRouter.connect(user).setAmountToSwap(wbch.address, amountWBCHtoSwap);
//         await mockUniswapRouter.setDefaultMockValue(amountWBCHtoSwap);

//         await uniswapRepayAdapter.connect(user).swapAndRepay(
//           wbch.address,
//           flexUsd.address,
//           liquidityToSwap,
//           amountToRepay,
//           2,
//           {
//             amount: 0,
//             deadline: 0,
//             v: 0,
//             r: '0x0000000000000000000000000000000000000000000000000000000000000000',
//             s: '0x0000000000000000000000000000000000000000000000000000000000000000',
//           },
//           false
//         );

//         const adapterWbchBalance = await wbch.balanceOf(uniswapRepayAdapter.address);
//         const adapterFlexUsdBalance = await flexUsd.balanceOf(uniswapRepayAdapter.address);
//         const userFlexUsdVariableDebtAmount = await flexUsdVariableDebtContract.balanceOf(userAddress);
//         const userAEthBalance = await aWBCH.balanceOf(userAddress);
//         const adapterAEthBalance = await aWBCH.balanceOf(uniswapRepayAdapter.address);

//         expect(adapterAEthBalance).to.be.eq(Zero);
//         expect(adapterWbchBalance).to.be.eq(Zero);
//         expect(adapterFlexUsdBalance).to.be.eq(Zero);
//         expect(userFlexUsdVariableDebtAmountBefore).to.be.gte(expectedFlexUsdAmount);
//         expect(userFlexUsdVariableDebtAmount).to.be.eq(Zero);
//         expect(userAEthBalance).to.be.lt(userAEthBalanceBefore);
//         expect(userAEthBalance).to.be.gte(userAEthBalanceBefore.sub(liquidityToSwap));
//       });

//       it('should correctly repay debt using the same asset as collateral', async () => {
//         const { users, pool, flexUsd, uniswapRepayAdapter, helpersContract, aFlexUsd } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         // Add deposit for user
//         await flexUsd.mint(parseEther('30'));
//         await flexUsd.approve(pool.address, parseEther('30'));
//         await pool.deposit(flexUsd.address, parseEther('30'), userAddress, 0);

//         const amountCollateralToSwap = parseEther('4');

//         const debtAmount = parseEther('3');

//         // Open user Debt
//         await pool.connect(user).borrow(flexUsd.address, debtAmount, 2, 0, userAddress);

//         const flexUsdVariableDebtTokenAddress = (
//           await helpersContract.getReserveTokensAddresses(flexUsd.address)
//         ).variableDebtTokenAddress;

//         const flexUsdVariableDebtContract = await getContract<StableDebtToken>(
//           eContractid.StableDebtToken,
//           flexUsdVariableDebtTokenAddress
//         );

//         const userFlexUsdVariableDebtAmountBefore = await flexUsdVariableDebtContract.balanceOf(
//           userAddress
//         );

//         await aFlexUsd.connect(user).approve(uniswapRepayAdapter.address, amountCollateralToSwap);
//         const userAFlexUsdBalanceBefore = await aFlexUsd.balanceOf(userAddress);
//         const userFlexUsdBalanceBefore = await flexUsd.balanceOf(userAddress);

//         await uniswapRepayAdapter.connect(user).swapAndRepay(
//           flexUsd.address,
//           flexUsd.address,
//           amountCollateralToSwap,
//           amountCollateralToSwap,
//           2,
//           {
//             amount: 0,
//             deadline: 0,
//             v: 0,
//             r: '0x0000000000000000000000000000000000000000000000000000000000000000',
//             s: '0x0000000000000000000000000000000000000000000000000000000000000000',
//           },
//           false
//         );

//         const adapterFlexUsdBalance = await flexUsd.balanceOf(uniswapRepayAdapter.address);
//         const userFlexUsdVariableDebtAmount = await flexUsdVariableDebtContract.balanceOf(userAddress);
//         const userAFlexUsdBalance = await aFlexUsd.balanceOf(userAddress);
//         const adapterAFlexUsdBalance = await aFlexUsd.balanceOf(uniswapRepayAdapter.address);
//         const userFlexUsdBalance = await flexUsd.balanceOf(userAddress);

//         expect(adapterAFlexUsdBalance).to.be.eq(Zero, 'adapter aAFlexUSD should be zero');
//         expect(adapterFlexUsdBalance).to.be.eq(Zero, 'adapter FLEXUSD should be zero');
//         expect(userFlexUsdVariableDebtAmountBefore).to.be.gte(
//           debtAmount,
//           'user flexUsd variable debt before should be gte debtAmount'
//         );
//         expect(userFlexUsdVariableDebtAmount).to.be.lt(
//           debtAmount,
//           'current user flexUsd variable debt amount should be less than debtAmount'
//         );
//         expect(userAFlexUsdBalance).to.be.lt(
//           userAFlexUsdBalanceBefore,
//           'current user aFLEXUSD balance should be less than prior balance'
//         );
//         expect(userAFlexUsdBalance).to.be.gte(
//           userAFlexUsdBalanceBefore.sub(amountCollateralToSwap),
//           'current user aFLEXUSD balance should be gte user balance sub swapped collateral'
//         );
//         expect(userFlexUsdBalance).to.be.eq(
//           userFlexUsdBalanceBefore,
//           'user FLEXUSD balance should remain equal'
//         );
//       });
//     });
//   });
// });
