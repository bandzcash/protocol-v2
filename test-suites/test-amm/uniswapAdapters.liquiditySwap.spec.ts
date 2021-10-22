// import { makeSuite, TestEnv } from './helpers/make-suite';
// import {
//   convertToCurrencyDecimals,
//   getContract,
//   buildPermitParams,
//   getSignatureFromTypedData,
//   buildLiquiditySwapParams,
// } from '../../helpers/contracts-helpers';
// import { getMockUniswapRouter } from '../../helpers/contracts-getters';
// import { deployUniswapLiquiditySwapAdapter } from '../../helpers/contracts-deployments';
// import { MockUniswapV2Router02 } from '../../types/MockUniswapV2Router02';
// import { Zero } from '@ethersproject/constants';
// import BigNumber from 'bignumber.js';
// import { DRE, evmRevert, evmSnapshot } from '../../helpers/misc-utils';
// import { ethers } from 'ethers';
// import { eContractid } from '../../helpers/types';
// import { AToken } from '../../types/AToken';
// import { BUIDLEREVM_CHAINID } from '../../helpers/buidler-constants';
// import { MAX_UINT_AMOUNT } from '../../helpers/constants';
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

//   describe('UniswapLiquiditySwapAdapter', () => {
//     describe('constructor', () => {
//       it('should deploy with correct parameters', async () => {
//         const { addressesProvider, wbch } = testEnv;
//         await deployUniswapLiquiditySwapAdapter([
//           addressesProvider.address,
//           mockUniswapRouter.address,
//           wbch.address,
//         ]);
//       });

//       it('should revert if not valid addresses provider', async () => {
//         const { wbch } = testEnv;
//         expect(
//           deployUniswapLiquiditySwapAdapter([
//             mockUniswapRouter.address,
//             mockUniswapRouter.address,
//             wbch.address,
//           ])
//         ).to.be.reverted;
//       });
//     });

//     describe('executeOperation', () => {
//       beforeEach(async () => {
//         const { users, wbch, flexUsd, usdc, pool, deployer } = testEnv;
//         const userAddress = users[0].address;

//         // Provide liquidity
//         await flexUsd.mint(parseEther('20000'));
//         await flexUsd.approve(pool.address, parseEther('20000'));
//         await pool.deposit(flexUsd.address, parseEther('20000'), deployer.address, 0);

//         const usdcAmount = await convertToCurrencyDecimals(usdc.address, '10');
//         await usdc.mint(usdcAmount);
//         await usdc.approve(pool.address, usdcAmount);
//         await pool.deposit(usdc.address, usdcAmount, deployer.address, 0);

//         // Make a deposit for user
//         await wbch.mint(parseEther('100'));
//         await wbch.approve(pool.address, parseEther('100'));
//         await pool.deposit(wbch.address, parseEther('100'), userAddress, 0);
//       });

//       it('should correctly swap tokens and deposit the out tokens in the pool', async () => {
//         const {
//           users,
//           wbch,
//           oracle,
//           flexUsd,
//           aFlexUsd,
//           aWBCH,
//           pool,
//           uniswapLiquiditySwapAdapter,
//         } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWBCHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

//         const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);
//         const expectedFlexUsdAmount = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountWBCHtoSwap.toString()).div(flexUsdPrice.toString()).toFixed(0)
//         );

//         await mockUniswapRouter.setAmountToReturn(wbch.address, expectedFlexUsdAmount);

//         // User will swap liquidity 10 aEth to aFlexUsd
//         const liquidityToSwap = parseEther('10');
//         await aWBCH.connect(user).approve(uniswapLiquiditySwapAdapter.address, liquidityToSwap);
//         const userAEthBalanceBefore = await aWBCH.balanceOf(userAddress);

//         // Subtract the FL fee from the amount to be swapped 0,09%
//         const flashloanAmount = new BigNumber(liquidityToSwap.toString()).div(1.0009).toFixed(0);

//         const params = buildLiquiditySwapParams(
//           [flexUsd.address],
//           [expectedFlexUsdAmount],
//           [0],
//           [0],
//           [0],
//           [0],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           [false]
//         );

//         await expect(
//           pool
//             .connect(user)
//             .flashLoan(
//               uniswapLiquiditySwapAdapter.address,
//               [wbch.address],
//               [flashloanAmount.toString()],
//               [0],
//               userAddress,
//               params,
//               0
//             )
//         )
//           .to.emit(uniswapLiquiditySwapAdapter, 'Swapped')
//           .withArgs(wbch.address, flexUsd.address, flashloanAmount.toString(), expectedFlexUsdAmount);

//         const adapterWbchBalance = await wbch.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterFlexUsdBalance = await flexUsd.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterFlexUsdAllowance = await flexUsd.allowance(
//           uniswapLiquiditySwapAdapter.address,
//           userAddress
//         );
//         const userAFlexUsdBalance = await aFlexUsd.balanceOf(userAddress);
//         const userAEthBalance = await aWBCH.balanceOf(userAddress);

//         expect(adapterWbchBalance).to.be.eq(Zero);
//         expect(adapterFlexUsdBalance).to.be.eq(Zero);
//         expect(adapterFlexUsdAllowance).to.be.eq(Zero);
//         expect(userAFlexUsdBalance).to.be.eq(expectedFlexUsdAmount);
//         expect(userAEthBalance).to.be.lt(userAEthBalanceBefore);
//         expect(userAEthBalance).to.be.gte(userAEthBalanceBefore.sub(liquidityToSwap));
//       });

//       it('should correctly swap and deposit multiple tokens', async () => {
//         const {
//           users,
//           wbch,
//           oracle,
//           flexUsd,
//           aFlexUsd,
//           aWBCH,
//           usdc,
//           pool,
//           uniswapLiquiditySwapAdapter,
//         } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWBCHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

//         const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);
//         const expectedFlexUsdAmountForEth = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountWBCHtoSwap.toString()).div(flexUsdPrice.toString()).toFixed(0)
//         );

//         const amountUSDCtoSwap = await convertToCurrencyDecimals(usdc.address, '10');
//         const usdcPrice = await oracle.getAssetPrice(usdc.address);

//         const collateralDecimals = (await usdc.decimals()).toString();
//         const principalDecimals = (await flexUsd.decimals()).toString();

//         const expectedFlexUsdAmountForUsdc = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountUSDCtoSwap.toString())
//             .times(
//               new BigNumber(usdcPrice.toString()).times(new BigNumber(10).pow(principalDecimals))
//             )
//             .div(
//               new BigNumber(flexUsdPrice.toString()).times(new BigNumber(10).pow(collateralDecimals))
//             )
//             .toFixed(0)
//         );

//         // Make a deposit for user
//         await usdc.connect(user).mint(amountUSDCtoSwap);
//         await usdc.connect(user).approve(pool.address, amountUSDCtoSwap);
//         await pool.connect(user).deposit(usdc.address, amountUSDCtoSwap, userAddress, 0);

//         const aUsdcData = await pool.getReserveData(usdc.address);
//         const aUsdc = await getContract<AToken>(eContractid.AToken, aUsdcData.aTokenAddress);

//         await mockUniswapRouter.setAmountToReturn(wbch.address, expectedFlexUsdAmountForEth);
//         await mockUniswapRouter.setAmountToReturn(usdc.address, expectedFlexUsdAmountForUsdc);

//         await aWBCH.connect(user).approve(uniswapLiquiditySwapAdapter.address, amountWBCHtoSwap);
//         const userAEthBalanceBefore = await aWBCH.balanceOf(userAddress);
//         await aUsdc.connect(user).approve(uniswapLiquiditySwapAdapter.address, amountUSDCtoSwap);
//         const userAUsdcBalanceBefore = await aUsdc.balanceOf(userAddress);

//         // Subtract the FL fee from the amount to be swapped 0,09%
//         const wbchFlashloanAmount = new BigNumber(amountWBCHtoSwap.toString())
//           .div(1.0009)
//           .toFixed(0);
//         const usdcFlashloanAmount = new BigNumber(amountUSDCtoSwap.toString())
//           .div(1.0009)
//           .toFixed(0);

//         const params = buildLiquiditySwapParams(
//           [flexUsd.address, flexUsd.address],
//           [expectedFlexUsdAmountForEth, expectedFlexUsdAmountForUsdc],
//           [0, 0],
//           [0, 0],
//           [0, 0],
//           [0, 0],
//           [
//             '0x0000000000000000000000000000000000000000000000000000000000000000',
//             '0x0000000000000000000000000000000000000000000000000000000000000000',
//           ],
//           [
//             '0x0000000000000000000000000000000000000000000000000000000000000000',
//             '0x0000000000000000000000000000000000000000000000000000000000000000',
//           ],
//           [false, false]
//         );

//         await pool
//           .connect(user)
//           .flashLoan(
//             uniswapLiquiditySwapAdapter.address,
//             [wbch.address, usdc.address],
//             [wbchFlashloanAmount.toString(), usdcFlashloanAmount.toString()],
//             [0, 0],
//             userAddress,
//             params,
//             0
//           );

//         const adapterWbchBalance = await wbch.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterFlexUsdBalance = await flexUsd.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterFlexUsdAllowance = await flexUsd.allowance(
//           uniswapLiquiditySwapAdapter.address,
//           userAddress
//         );
//         const userAFlexUsdBalance = await aFlexUsd.balanceOf(userAddress);
//         const userAEthBalance = await aWBCH.balanceOf(userAddress);
//         const userAUsdcBalance = await aUsdc.balanceOf(userAddress);

//         expect(adapterWbchBalance).to.be.eq(Zero);
//         expect(adapterFlexUsdBalance).to.be.eq(Zero);
//         expect(adapterFlexUsdAllowance).to.be.eq(Zero);
//         expect(userAFlexUsdBalance).to.be.eq(expectedFlexUsdAmountForEth.add(expectedFlexUsdAmountForUsdc));
//         expect(userAEthBalance).to.be.lt(userAEthBalanceBefore);
//         expect(userAEthBalance).to.be.gte(userAEthBalanceBefore.sub(amountWBCHtoSwap));
//         expect(userAUsdcBalance).to.be.lt(userAUsdcBalanceBefore);
//         expect(userAUsdcBalance).to.be.gte(userAUsdcBalanceBefore.sub(amountUSDCtoSwap));
//       });

//       it('should correctly swap and deposit multiple tokens using permit', async () => {
//         const {
//           users,
//           wbch,
//           oracle,
//           flexUsd,
//           aFlexUsd,
//           aWBCH,
//           usdc,
//           pool,
//           uniswapLiquiditySwapAdapter,
//         } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;
//         const chainId = DRE.network.config.chainId || BUIDLEREVM_CHAINID;
//         const deadline = MAX_UINT_AMOUNT;

//         const ownerPrivateKey = require('../../test-wallets.js').accounts[1].secretKey;
//         if (!ownerPrivateKey) {
//           throw new Error('INVALID_OWNER_PK');
//         }

//         const amountWBCHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

//         const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);
//         const expectedFlexUsdAmountForEth = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountWBCHtoSwap.toString()).div(flexUsdPrice.toString()).toFixed(0)
//         );

//         const amountUSDCtoSwap = await convertToCurrencyDecimals(usdc.address, '10');
//         const usdcPrice = await oracle.getAssetPrice(usdc.address);

//         const collateralDecimals = (await usdc.decimals()).toString();
//         const principalDecimals = (await flexUsd.decimals()).toString();

//         const expectedFlexUsdAmountForUsdc = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountUSDCtoSwap.toString())
//             .times(
//               new BigNumber(usdcPrice.toString()).times(new BigNumber(10).pow(principalDecimals))
//             )
//             .div(
//               new BigNumber(flexUsdPrice.toString()).times(new BigNumber(10).pow(collateralDecimals))
//             )
//             .toFixed(0)
//         );

//         // Make a deposit for user
//         await usdc.connect(user).mint(amountUSDCtoSwap);
//         await usdc.connect(user).approve(pool.address, amountUSDCtoSwap);
//         await pool.connect(user).deposit(usdc.address, amountUSDCtoSwap, userAddress, 0);

//         const aUsdcData = await pool.getReserveData(usdc.address);
//         const aUsdc = await getContract<AToken>(eContractid.AToken, aUsdcData.aTokenAddress);

//         await mockUniswapRouter.setAmountToReturn(wbch.address, expectedFlexUsdAmountForEth);
//         await mockUniswapRouter.setAmountToReturn(usdc.address, expectedFlexUsdAmountForUsdc);

//         const userAEthBalanceBefore = await aWBCH.balanceOf(userAddress);
//         const userAUsdcBalanceBefore = await aUsdc.balanceOf(userAddress);

//         const wbchFlashloanAmount = new BigNumber(amountWBCHtoSwap.toString())
//           .div(1.0009)
//           .toFixed(0);

//         const usdcFlashloanAmount = new BigNumber(amountUSDCtoSwap.toString())
//           .div(1.0009)
//           .toFixed(0);

//         const aWbchNonce = (await aWBCH._nonces(userAddress)).toNumber();
//         const aWbchMsgParams = buildPermitParams(
//           chainId,
//           aWBCH.address,
//           '1',
//           await aWBCH.name(),
//           userAddress,
//           uniswapLiquiditySwapAdapter.address,
//           aWbchNonce,
//           deadline,
//           amountWBCHtoSwap.toString()
//         );
//         const { v: aWETHv, r: aWETHr, s: aWETHs } = getSignatureFromTypedData(
//           ownerPrivateKey,
//           aWbchMsgParams
//         );

//         const aUsdcNonce = (await aUsdc._nonces(userAddress)).toNumber();
//         const aUsdcMsgParams = buildPermitParams(
//           chainId,
//           aUsdc.address,
//           '1',
//           await aUsdc.name(),
//           userAddress,
//           uniswapLiquiditySwapAdapter.address,
//           aUsdcNonce,
//           deadline,
//           amountUSDCtoSwap.toString()
//         );
//         const { v: aUsdcv, r: aUsdcr, s: aUsdcs } = getSignatureFromTypedData(
//           ownerPrivateKey,
//           aUsdcMsgParams
//         );
//         const params = buildLiquiditySwapParams(
//           [flexUsd.address, flexUsd.address],
//           [expectedFlexUsdAmountForEth, expectedFlexUsdAmountForUsdc],
//           [0, 0],
//           [amountWBCHtoSwap, amountUSDCtoSwap],
//           [deadline, deadline],
//           [aWETHv, aUsdcv],
//           [aWETHr, aUsdcr],
//           [aWETHs, aUsdcs],
//           [false, false]
//         );

//         await pool
//           .connect(user)
//           .flashLoan(
//             uniswapLiquiditySwapAdapter.address,
//             [wbch.address, usdc.address],
//             [wbchFlashloanAmount.toString(), usdcFlashloanAmount.toString()],
//             [0, 0],
//             userAddress,
//             params,
//             0
//           );

//         const adapterWbchBalance = await wbch.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterFlexUsdBalance = await flexUsd.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterFlexUsdAllowance = await flexUsd.allowance(
//           uniswapLiquiditySwapAdapter.address,
//           userAddress
//         );
//         const userAFlexUsdBalance = await aFlexUsd.balanceOf(userAddress);
//         const userAEthBalance = await aWBCH.balanceOf(userAddress);
//         const userAUsdcBalance = await aUsdc.balanceOf(userAddress);

//         expect(adapterWbchBalance).to.be.eq(Zero);
//         expect(adapterFlexUsdBalance).to.be.eq(Zero);
//         expect(adapterFlexUsdAllowance).to.be.eq(Zero);
//         expect(userAFlexUsdBalance).to.be.eq(expectedFlexUsdAmountForEth.add(expectedFlexUsdAmountForUsdc));
//         expect(userAEthBalance).to.be.lt(userAEthBalanceBefore);
//         expect(userAEthBalance).to.be.gte(userAEthBalanceBefore.sub(amountWBCHtoSwap));
//         expect(userAUsdcBalance).to.be.lt(userAUsdcBalanceBefore);
//         expect(userAUsdcBalance).to.be.gte(userAUsdcBalanceBefore.sub(amountUSDCtoSwap));
//       });

//       it('should correctly swap tokens with permit', async () => {
//         const {
//           users,
//           wbch,
//           oracle,
//           flexUsd,
//           aFlexUsd,
//           aWBCH,
//           pool,
//           uniswapLiquiditySwapAdapter,
//         } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWBCHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

//         const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);
//         const expectedFlexUsdAmount = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountWBCHtoSwap.toString()).div(flexUsdPrice.toString()).toFixed(0)
//         );

//         await mockUniswapRouter.setAmountToReturn(wbch.address, expectedFlexUsdAmount);

//         // User will swap liquidity 10 aEth to aFlexUsd
//         const liquidityToSwap = parseEther('10');
//         const userAEthBalanceBefore = await aWBCH.balanceOf(userAddress);

//         // Subtract the FL fee from the amount to be swapped 0,09%
//         const flashloanAmount = new BigNumber(liquidityToSwap.toString()).div(1.0009).toFixed(0);

//         const chainId = DRE.network.config.chainId || BUIDLEREVM_CHAINID;
//         const deadline = MAX_UINT_AMOUNT;
//         const nonce = (await aWBCH._nonces(userAddress)).toNumber();
//         const msgParams = buildPermitParams(
//           chainId,
//           aWBCH.address,
//           '1',
//           await aWBCH.name(),
//           userAddress,
//           uniswapLiquiditySwapAdapter.address,
//           nonce,
//           deadline,
//           liquidityToSwap.toString()
//         );

//         const ownerPrivateKey = require('../../test-wallets.js').accounts[1].secretKey;
//         if (!ownerPrivateKey) {
//           throw new Error('INVALID_OWNER_PK');
//         }

//         const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, msgParams);

//         const params = buildLiquiditySwapParams(
//           [flexUsd.address],
//           [expectedFlexUsdAmount],
//           [0],
//           [liquidityToSwap],
//           [deadline],
//           [v],
//           [r],
//           [s],
//           [false]
//         );

//         await expect(
//           pool
//             .connect(user)
//             .flashLoan(
//               uniswapLiquiditySwapAdapter.address,
//               [wbch.address],
//               [flashloanAmount.toString()],
//               [0],
//               userAddress,
//               params,
//               0
//             )
//         )
//           .to.emit(uniswapLiquiditySwapAdapter, 'Swapped')
//           .withArgs(wbch.address, flexUsd.address, flashloanAmount.toString(), expectedFlexUsdAmount);

//         const adapterWbchBalance = await wbch.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterFlexUsdBalance = await flexUsd.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterFlexUsdAllowance = await flexUsd.allowance(
//           uniswapLiquiditySwapAdapter.address,
//           userAddress
//         );
//         const userAFlexUsdBalance = await aFlexUsd.balanceOf(userAddress);
//         const userAEthBalance = await aWBCH.balanceOf(userAddress);

//         expect(adapterWbchBalance).to.be.eq(Zero);
//         expect(adapterFlexUsdBalance).to.be.eq(Zero);
//         expect(adapterFlexUsdAllowance).to.be.eq(Zero);
//         expect(userAFlexUsdBalance).to.be.eq(expectedFlexUsdAmount);
//         expect(userAEthBalance).to.be.lt(userAEthBalanceBefore);
//         expect(userAEthBalance).to.be.gte(userAEthBalanceBefore.sub(liquidityToSwap));
//       });

//       it('should revert if inconsistent params', async () => {
//         const { users, wbch, oracle, flexUsd, aWBCH, pool, uniswapLiquiditySwapAdapter } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWBCHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

//         const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);
//         const expectedFlexUsdAmount = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountWBCHtoSwap.toString()).div(flexUsdPrice.toString()).toFixed(0)
//         );

//         await mockUniswapRouter.setAmountToReturn(wbch.address, expectedFlexUsdAmount);

//         // User will swap liquidity 10 aEth to aFlexUsd
//         const liquidityToSwap = parseEther('10');
//         await aWBCH.connect(user).approve(uniswapLiquiditySwapAdapter.address, liquidityToSwap);

//         // Subtract the FL fee from the amount to be swapped 0,09%
//         const flashloanAmount = new BigNumber(liquidityToSwap.toString()).div(1.0009).toFixed(0);

//         const params = buildLiquiditySwapParams(
//           [flexUsd.address, wbch.address],
//           [expectedFlexUsdAmount],
//           [0],
//           [0],
//           [0],
//           [0],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           [false]
//         );

//         await expect(
//           pool
//             .connect(user)
//             .flashLoan(
//               uniswapLiquiditySwapAdapter.address,
//               [wbch.address],
//               [flashloanAmount.toString()],
//               [0],
//               userAddress,
//               params,
//               0
//             )
//         ).to.be.revertedWith('INCONSISTENT_PARAMS');

//         const params2 = buildLiquiditySwapParams(
//           [flexUsd.address, wbch.address],
//           [expectedFlexUsdAmount],
//           [0, 0],
//           [0, 0],
//           [0, 0],
//           [0],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           [false]
//         );

//         await expect(
//           pool
//             .connect(user)
//             .flashLoan(
//               uniswapLiquiditySwapAdapter.address,
//               [wbch.address],
//               [flashloanAmount.toString()],
//               [0],
//               userAddress,
//               params2,
//               0
//             )
//         ).to.be.revertedWith('INCONSISTENT_PARAMS');

//         const params3 = buildLiquiditySwapParams(
//           [flexUsd.address, wbch.address],
//           [expectedFlexUsdAmount],
//           [0, 0],
//           [0],
//           [0, 0],
//           [0, 0],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           [false]
//         );

//         await expect(
//           pool
//             .connect(user)
//             .flashLoan(
//               uniswapLiquiditySwapAdapter.address,
//               [wbch.address],
//               [flashloanAmount.toString()],
//               [0],
//               userAddress,
//               params3,
//               0
//             )
//         ).to.be.revertedWith('INCONSISTENT_PARAMS');

//         const params4 = buildLiquiditySwapParams(
//           [flexUsd.address, wbch.address],
//           [expectedFlexUsdAmount],
//           [0],
//           [0],
//           [0],
//           [0],
//           [
//             '0x0000000000000000000000000000000000000000000000000000000000000000',
//             '0x0000000000000000000000000000000000000000000000000000000000000000',
//           ],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           [false]
//         );

//         await expect(
//           pool
//             .connect(user)
//             .flashLoan(
//               uniswapLiquiditySwapAdapter.address,
//               [wbch.address],
//               [flashloanAmount.toString()],
//               [0],
//               userAddress,
//               params4,
//               0
//             )
//         ).to.be.revertedWith('INCONSISTENT_PARAMS');

//         const params5 = buildLiquiditySwapParams(
//           [flexUsd.address, wbch.address],
//           [expectedFlexUsdAmount],
//           [0],
//           [0],
//           [0],
//           [0],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           [
//             '0x0000000000000000000000000000000000000000000000000000000000000000',
//             '0x0000000000000000000000000000000000000000000000000000000000000000',
//           ],
//           [false]
//         );

//         await expect(
//           pool
//             .connect(user)
//             .flashLoan(
//               uniswapLiquiditySwapAdapter.address,
//               [wbch.address],
//               [flashloanAmount.toString()],
//               [0],
//               userAddress,
//               params5,
//               0
//             )
//         ).to.be.revertedWith('INCONSISTENT_PARAMS');

//         const params6 = buildLiquiditySwapParams(
//           [flexUsd.address, wbch.address],
//           [expectedFlexUsdAmount, expectedFlexUsdAmount],
//           [0],
//           [0],
//           [0],
//           [0],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           [false]
//         );

//         await expect(
//           pool
//             .connect(user)
//             .flashLoan(
//               uniswapLiquiditySwapAdapter.address,
//               [wbch.address],
//               [flashloanAmount.toString()],
//               [0],
//               userAddress,
//               params6,
//               0
//             )
//         ).to.be.revertedWith('INCONSISTENT_PARAMS');

//         const params7 = buildLiquiditySwapParams(
//           [flexUsd.address],
//           [expectedFlexUsdAmount],
//           [0, 0],
//           [0],
//           [0],
//           [0],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           [false]
//         );

//         await expect(
//           pool
//             .connect(user)
//             .flashLoan(
//               uniswapLiquiditySwapAdapter.address,
//               [wbch.address],
//               [flashloanAmount.toString()],
//               [0],
//               userAddress,
//               params7,
//               0
//             )
//         ).to.be.revertedWith('INCONSISTENT_PARAMS');

//         const params8 = buildLiquiditySwapParams(
//           [flexUsd.address],
//           [expectedFlexUsdAmount],
//           [0],
//           [0, 0],
//           [0],
//           [0],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           [false]
//         );

//         await expect(
//           pool
//             .connect(user)
//             .flashLoan(
//               uniswapLiquiditySwapAdapter.address,
//               [wbch.address],
//               [flashloanAmount.toString()],
//               [0],
//               userAddress,
//               params8,
//               0
//             )
//         ).to.be.revertedWith('INCONSISTENT_PARAMS');

//         const params9 = buildLiquiditySwapParams(
//           [flexUsd.address],
//           [expectedFlexUsdAmount],
//           [0],
//           [0],
//           [0],
//           [0],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           [false, false]
//         );

//         await expect(
//           pool
//             .connect(user)
//             .flashLoan(
//               uniswapLiquiditySwapAdapter.address,
//               [wbch.address],
//               [flashloanAmount.toString()],
//               [0],
//               userAddress,
//               params9,
//               0
//             )
//         ).to.be.revertedWith('INCONSISTENT_PARAMS');
//       });

//       it('should revert if caller not lending pool', async () => {
//         const { users, wbch, oracle, flexUsd, aWBCH, uniswapLiquiditySwapAdapter } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWBCHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

//         const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);
//         const expectedFlexUsdAmount = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountWBCHtoSwap.toString()).div(flexUsdPrice.toString()).toFixed(0)
//         );

//         await mockUniswapRouter.setAmountToReturn(wbch.address, expectedFlexUsdAmount);

//         // User will swap liquidity 10 aEth to aFlexUsd
//         const liquidityToSwap = parseEther('10');
//         await aWBCH.connect(user).approve(uniswapLiquiditySwapAdapter.address, liquidityToSwap);

//         // Subtract the FL fee from the amount to be swapped 0,09%
//         const flashloanAmount = new BigNumber(liquidityToSwap.toString()).div(1.0009).toFixed(0);

//         const params = buildLiquiditySwapParams(
//           [flexUsd.address],
//           [expectedFlexUsdAmount],
//           [0],
//           [0],
//           [0],
//           [0],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           [false]
//         );

//         await expect(
//           uniswapLiquiditySwapAdapter
//             .connect(user)
//             .executeOperation(
//               [wbch.address],
//               [flashloanAmount.toString()],
//               [0],
//               userAddress,
//               params
//             )
//         ).to.be.revertedWith('CALLER_MUST_BE_LENDING_POOL');
//       });

//       it('should work correctly with tokens of different decimals', async () => {
//         const {
//           users,
//           usdc,
//           oracle,
//           flexUsd,
//           aFlexUsd,
//           uniswapLiquiditySwapAdapter,
//           pool,
//           deployer,
//         } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountUSDCtoSwap = await convertToCurrencyDecimals(usdc.address, '10');
//         const liquidity = await convertToCurrencyDecimals(usdc.address, '20000');

//         // Provide liquidity
//         await usdc.mint(liquidity);
//         await usdc.approve(pool.address, liquidity);
//         await pool.deposit(usdc.address, liquidity, deployer.address, 0);

//         // Make a deposit for user
//         await usdc.connect(user).mint(amountUSDCtoSwap);
//         await usdc.connect(user).approve(pool.address, amountUSDCtoSwap);
//         await pool.connect(user).deposit(usdc.address, amountUSDCtoSwap, userAddress, 0);

//         const usdcPrice = await oracle.getAssetPrice(usdc.address);
//         const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);

//         // usdc 6
//         const collateralDecimals = (await usdc.decimals()).toString();
//         const principalDecimals = (await flexUsd.decimals()).toString();

//         const expectedFlexUsdAmount = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountUSDCtoSwap.toString())
//             .times(
//               new BigNumber(usdcPrice.toString()).times(new BigNumber(10).pow(principalDecimals))
//             )
//             .div(
//               new BigNumber(flexUsdPrice.toString()).times(new BigNumber(10).pow(collateralDecimals))
//             )
//             .toFixed(0)
//         );

//         await mockUniswapRouter.connect(user).setAmountToReturn(usdc.address, expectedFlexUsdAmount);

//         const aUsdcData = await pool.getReserveData(usdc.address);
//         const aUsdc = await getContract<AToken>(eContractid.AToken, aUsdcData.aTokenAddress);
//         const aUsdcBalance = await aUsdc.balanceOf(userAddress);
//         await aUsdc.connect(user).approve(uniswapLiquiditySwapAdapter.address, aUsdcBalance);
//         // Subtract the FL fee from the amount to be swapped 0,09%
//         const flashloanAmount = new BigNumber(amountUSDCtoSwap.toString()).div(1.0009).toFixed(0);

//         const params = buildLiquiditySwapParams(
//           [flexUsd.address],
//           [expectedFlexUsdAmount],
//           [0],
//           [0],
//           [0],
//           [0],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           [false]
//         );

//         await expect(
//           pool
//             .connect(user)
//             .flashLoan(
//               uniswapLiquiditySwapAdapter.address,
//               [usdc.address],
//               [flashloanAmount.toString()],
//               [0],
//               userAddress,
//               params,
//               0
//             )
//         )
//           .to.emit(uniswapLiquiditySwapAdapter, 'Swapped')
//           .withArgs(usdc.address, flexUsd.address, flashloanAmount.toString(), expectedFlexUsdAmount);

//         const adapterUsdcBalance = await usdc.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterFlexUsdBalance = await flexUsd.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterFlexUsdAllowance = await flexUsd.allowance(
//           uniswapLiquiditySwapAdapter.address,
//           userAddress
//         );
//         const aFlexUsdBalance = await aFlexUsd.balanceOf(userAddress);

//         expect(adapterUsdcBalance).to.be.eq(Zero);
//         expect(adapterFlexUsdBalance).to.be.eq(Zero);
//         expect(adapterFlexUsdAllowance).to.be.eq(Zero);
//         expect(aFlexUsdBalance).to.be.eq(expectedFlexUsdAmount);
//       });

//       it('should revert when min amount to receive exceeds the max slippage amount', async () => {
//         const { users, wbch, oracle, flexUsd, aWBCH, pool, uniswapLiquiditySwapAdapter } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWBCHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

//         const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);
//         const expectedFlexUsdAmount = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountWBCHtoSwap.toString()).div(flexUsdPrice.toString()).toFixed(0)
//         );

//         await mockUniswapRouter.setAmountToReturn(wbch.address, expectedFlexUsdAmount);
//         const smallexpectedFlexUsdAmount = expectedFlexUsdAmount.div(2);

//         // User will swap liquidity 10 aEth to aFlexUsd
//         const liquidityToSwap = parseEther('10');
//         await aWBCH.connect(user).approve(uniswapLiquiditySwapAdapter.address, liquidityToSwap);

//         // Subtract the FL fee from the amount to be swapped 0,09%
//         const flashloanAmount = new BigNumber(liquidityToSwap.toString()).div(1.0009).toFixed(0);

//         const params = buildLiquiditySwapParams(
//           [flexUsd.address],
//           [smallexpectedFlexUsdAmount],
//           [0],
//           [0],
//           [0],
//           [0],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           [false]
//         );

//         await expect(
//           pool
//             .connect(user)
//             .flashLoan(
//               uniswapLiquiditySwapAdapter.address,
//               [wbch.address],
//               [flashloanAmount.toString()],
//               [0],
//               userAddress,
//               params,
//               0
//             )
//         ).to.be.revertedWith('minAmountOut exceed max slippage');
//       });

//       it('should correctly swap tokens all the balance', async () => {
//         const {
//           users,
//           wbch,
//           oracle,
//           flexUsd,
//           aFlexUsd,
//           aWBCH,
//           pool,
//           uniswapLiquiditySwapAdapter,
//         } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWBCHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

//         const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);
//         const expectedFlexUsdAmount = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountWBCHtoSwap.toString()).div(flexUsdPrice.toString()).toFixed(0)
//         );

//         await mockUniswapRouter.setAmountToReturn(wbch.address, expectedFlexUsdAmount);

//         // Remove other balance
//         await aWBCH.connect(user).transfer(users[1].address, parseEther('90'));
//         const userAEthBalanceBefore = await aWBCH.balanceOf(userAddress);

//         // User will swap liquidity 10 aEth to aFlexUsd
//         const liquidityToSwap = parseEther('10');
//         expect(userAEthBalanceBefore).to.be.eq(liquidityToSwap);
//         await aWBCH.connect(user).approve(uniswapLiquiditySwapAdapter.address, liquidityToSwap);

//         const params = buildLiquiditySwapParams(
//           [flexUsd.address],
//           [expectedFlexUsdAmount],
//           [1],
//           [0],
//           [0],
//           [0],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           [false]
//         );

//         // Flashloan + premium > aToken balance. Then it will only swap the balance - premium
//         const flashloanFee = liquidityToSwap.mul(9).div(10000);
//         const swappedAmount = liquidityToSwap.sub(flashloanFee);

//         await expect(
//           pool
//             .connect(user)
//             .flashLoan(
//               uniswapLiquiditySwapAdapter.address,
//               [wbch.address],
//               [liquidityToSwap.toString()],
//               [0],
//               userAddress,
//               params,
//               0
//             )
//         )
//           .to.emit(uniswapLiquiditySwapAdapter, 'Swapped')
//           .withArgs(wbch.address, flexUsd.address, swappedAmount.toString(), expectedFlexUsdAmount);

//         const adapterWbchBalance = await wbch.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterFlexUsdBalance = await flexUsd.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterFlexUsdAllowance = await flexUsd.allowance(
//           uniswapLiquiditySwapAdapter.address,
//           userAddress
//         );
//         const userAFlexUsdBalance = await aFlexUsd.balanceOf(userAddress);
//         const userAEthBalance = await aWBCH.balanceOf(userAddress);
//         const adapterAEthBalance = await aWBCH.balanceOf(uniswapLiquiditySwapAdapter.address);

//         expect(adapterWbchBalance).to.be.eq(Zero);
//         expect(adapterFlexUsdBalance).to.be.eq(Zero);
//         expect(adapterFlexUsdAllowance).to.be.eq(Zero);
//         expect(userAFlexUsdBalance).to.be.eq(expectedFlexUsdAmount);
//         expect(userAEthBalance).to.be.eq(Zero);
//         expect(adapterAEthBalance).to.be.eq(Zero);
//       });

//       it('should correctly swap tokens all the balance using permit', async () => {
//         const {
//           users,
//           wbch,
//           oracle,
//           flexUsd,
//           aFlexUsd,
//           aWBCH,
//           pool,
//           uniswapLiquiditySwapAdapter,
//         } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWBCHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

//         const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);
//         const expectedFlexUsdAmount = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountWBCHtoSwap.toString()).div(flexUsdPrice.toString()).toFixed(0)
//         );

//         await mockUniswapRouter.setAmountToReturn(wbch.address, expectedFlexUsdAmount);

//         // Remove other balance
//         await aWBCH.connect(user).transfer(users[1].address, parseEther('90'));
//         const userAEthBalanceBefore = await aWBCH.balanceOf(userAddress);

//         const liquidityToSwap = parseEther('10');
//         expect(userAEthBalanceBefore).to.be.eq(liquidityToSwap);

//         const chainId = DRE.network.config.chainId || BUIDLEREVM_CHAINID;
//         const deadline = MAX_UINT_AMOUNT;
//         const nonce = (await aWBCH._nonces(userAddress)).toNumber();
//         const msgParams = buildPermitParams(
//           chainId,
//           aWBCH.address,
//           '1',
//           await aWBCH.name(),
//           userAddress,
//           uniswapLiquiditySwapAdapter.address,
//           nonce,
//           deadline,
//           liquidityToSwap.toString()
//         );

//         const ownerPrivateKey = require('../../test-wallets.js').accounts[1].secretKey;
//         if (!ownerPrivateKey) {
//           throw new Error('INVALID_OWNER_PK');
//         }

//         const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, msgParams);

//         const params = buildLiquiditySwapParams(
//           [flexUsd.address],
//           [expectedFlexUsdAmount],
//           [1],
//           [liquidityToSwap],
//           [deadline],
//           [v],
//           [r],
//           [s],
//           [false]
//         );

//         // Flashloan + premium > aToken balance. Then it will only swap the balance - premium
//         const flashloanFee = liquidityToSwap.mul(9).div(10000);
//         const swappedAmount = liquidityToSwap.sub(flashloanFee);

//         await expect(
//           pool
//             .connect(user)
//             .flashLoan(
//               uniswapLiquiditySwapAdapter.address,
//               [wbch.address],
//               [liquidityToSwap.toString()],
//               [0],
//               userAddress,
//               params,
//               0
//             )
//         )
//           .to.emit(uniswapLiquiditySwapAdapter, 'Swapped')
//           .withArgs(wbch.address, flexUsd.address, swappedAmount.toString(), expectedFlexUsdAmount);

//         const adapterWbchBalance = await wbch.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterFlexUsdBalance = await flexUsd.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterFlexUsdAllowance = await flexUsd.allowance(
//           uniswapLiquiditySwapAdapter.address,
//           userAddress
//         );
//         const userAFlexUsdBalance = await aFlexUsd.balanceOf(userAddress);
//         const userAEthBalance = await aWBCH.balanceOf(userAddress);
//         const adapterAEthBalance = await aWBCH.balanceOf(uniswapLiquiditySwapAdapter.address);

//         expect(adapterWbchBalance).to.be.eq(Zero);
//         expect(adapterFlexUsdBalance).to.be.eq(Zero);
//         expect(adapterFlexUsdAllowance).to.be.eq(Zero);
//         expect(userAFlexUsdBalance).to.be.eq(expectedFlexUsdAmount);
//         expect(userAEthBalance).to.be.eq(Zero);
//         expect(adapterAEthBalance).to.be.eq(Zero);
//       });
//     });

//     describe('swapAndDeposit', () => {
//       beforeEach(async () => {
//         const { users, wbch, flexUsd, pool, deployer } = testEnv;
//         const userAddress = users[0].address;

//         // Provide liquidity
//         await flexUsd.mint(parseEther('20000'));
//         await flexUsd.approve(pool.address, parseEther('20000'));
//         await pool.deposit(flexUsd.address, parseEther('20000'), deployer.address, 0);

//         // Make a deposit for user
//         await wbch.mint(parseEther('100'));
//         await wbch.approve(pool.address, parseEther('100'));
//         await pool.deposit(wbch.address, parseEther('100'), userAddress, 0);
//       });

//       it('should correctly swap tokens and deposit the out tokens in the pool', async () => {
//         const { users, wbch, oracle, flexUsd, aFlexUsd, aWBCH, uniswapLiquiditySwapAdapter } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWBCHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

//         const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);
//         const expectedFlexUsdAmount = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountWBCHtoSwap.toString()).div(flexUsdPrice.toString()).toFixed(0)
//         );

//         await mockUniswapRouter.setAmountToReturn(wbch.address, expectedFlexUsdAmount);

//         // User will swap liquidity 10 aEth to aFlexUsd
//         const liquidityToSwap = parseEther('10');
//         await aWBCH.connect(user).approve(uniswapLiquiditySwapAdapter.address, liquidityToSwap);
//         const userAEthBalanceBefore = await aWBCH.balanceOf(userAddress);

//         await expect(
//           uniswapLiquiditySwapAdapter.connect(user).swapAndDeposit(
//             [wbch.address],
//             [flexUsd.address],
//             [amountWBCHtoSwap],
//             [expectedFlexUsdAmount],
//             [
//               {
//                 amount: 0,
//                 deadline: 0,
//                 v: 0,
//                 r: '0x0000000000000000000000000000000000000000000000000000000000000000',
//                 s: '0x0000000000000000000000000000000000000000000000000000000000000000',
//               },
//             ],
//             [false]
//           )
//         )
//           .to.emit(uniswapLiquiditySwapAdapter, 'Swapped')
//           .withArgs(wbch.address, flexUsd.address, amountWBCHtoSwap.toString(), expectedFlexUsdAmount);

//         const adapterWbchBalance = await wbch.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterFlexUsdBalance = await flexUsd.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterFlexUsdAllowance = await flexUsd.allowance(
//           uniswapLiquiditySwapAdapter.address,
//           userAddress
//         );
//         const userAFlexUsdBalance = await aFlexUsd.balanceOf(userAddress);
//         const userAEthBalance = await aWBCH.balanceOf(userAddress);

//         expect(adapterWbchBalance).to.be.eq(Zero);
//         expect(adapterFlexUsdBalance).to.be.eq(Zero);
//         expect(adapterFlexUsdAllowance).to.be.eq(Zero);
//         expect(userAFlexUsdBalance).to.be.eq(expectedFlexUsdAmount);
//         expect(userAEthBalance).to.be.lt(userAEthBalanceBefore);
//         expect(userAEthBalance).to.be.gte(userAEthBalanceBefore.sub(liquidityToSwap));
//       });

//       it('should correctly swap tokens using permit', async () => {
//         const { users, wbch, oracle, flexUsd, aFlexUsd, aWBCH, uniswapLiquiditySwapAdapter } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWBCHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

//         const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);
//         const expectedFlexUsdAmount = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountWBCHtoSwap.toString()).div(flexUsdPrice.toString()).toFixed(0)
//         );

//         await mockUniswapRouter.setAmountToReturn(wbch.address, expectedFlexUsdAmount);

//         // User will swap liquidity 10 aEth to aFlexUsd
//         const liquidityToSwap = parseEther('10');
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
//           uniswapLiquiditySwapAdapter.address,
//           nonce,
//           deadline,
//           liquidityToSwap.toString()
//         );

//         const ownerPrivateKey = require('../../test-wallets.js').accounts[1].secretKey;
//         if (!ownerPrivateKey) {
//           throw new Error('INVALID_OWNER_PK');
//         }

//         const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, msgParams);

//         await expect(
//           uniswapLiquiditySwapAdapter.connect(user).swapAndDeposit(
//             [wbch.address],
//             [flexUsd.address],
//             [amountWBCHtoSwap],
//             [expectedFlexUsdAmount],
//             [
//               {
//                 amount: liquidityToSwap,
//                 deadline,
//                 v,
//                 r,
//                 s,
//               },
//             ],
//             [false]
//           )
//         )
//           .to.emit(uniswapLiquiditySwapAdapter, 'Swapped')
//           .withArgs(wbch.address, flexUsd.address, amountWBCHtoSwap.toString(), expectedFlexUsdAmount);

//         const adapterWbchBalance = await wbch.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterFlexUsdBalance = await flexUsd.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterFlexUsdAllowance = await flexUsd.allowance(
//           uniswapLiquiditySwapAdapter.address,
//           userAddress
//         );
//         const userAFlexUsdBalance = await aFlexUsd.balanceOf(userAddress);
//         const userAEthBalance = await aWBCH.balanceOf(userAddress);

//         expect(adapterWbchBalance).to.be.eq(Zero);
//         expect(adapterFlexUsdBalance).to.be.eq(Zero);
//         expect(adapterFlexUsdAllowance).to.be.eq(Zero);
//         expect(userAFlexUsdBalance).to.be.eq(expectedFlexUsdAmount);
//         expect(userAEthBalance).to.be.lt(userAEthBalanceBefore);
//         expect(userAEthBalance).to.be.gte(userAEthBalanceBefore.sub(liquidityToSwap));
//       });

//       it('should revert if inconsistent params', async () => {
//         const { users, wbch, flexUsd, uniswapLiquiditySwapAdapter, oracle } = testEnv;
//         const user = users[0].signer;

//         const amountWBCHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');
//         const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);
//         const expectedFlexUsdAmount = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountWBCHtoSwap.toString()).div(flexUsdPrice.toString()).toFixed(0)
//         );

//         await expect(
//           uniswapLiquiditySwapAdapter.connect(user).swapAndDeposit(
//             [wbch.address, flexUsd.address],
//             [flexUsd.address],
//             [amountWBCHtoSwap],
//             [expectedFlexUsdAmount],
//             [
//               {
//                 amount: 0,
//                 deadline: 0,
//                 v: 0,
//                 r: '0x0000000000000000000000000000000000000000000000000000000000000000',
//                 s: '0x0000000000000000000000000000000000000000000000000000000000000000',
//               },
//             ],
//             [false]
//           )
//         ).to.be.revertedWith('INCONSISTENT_PARAMS');

//         await expect(
//           uniswapLiquiditySwapAdapter.connect(user).swapAndDeposit(
//             [wbch.address],
//             [flexUsd.address, wbch.address],
//             [amountWBCHtoSwap],
//             [expectedFlexUsdAmount],
//             [
//               {
//                 amount: 0,
//                 deadline: 0,
//                 v: 0,
//                 r: '0x0000000000000000000000000000000000000000000000000000000000000000',
//                 s: '0x0000000000000000000000000000000000000000000000000000000000000000',
//               },
//             ],
//             [false]
//           )
//         ).to.be.revertedWith('INCONSISTENT_PARAMS');

//         await expect(
//           uniswapLiquiditySwapAdapter.connect(user).swapAndDeposit(
//             [wbch.address],
//             [flexUsd.address],
//             [amountWBCHtoSwap, amountWBCHtoSwap],
//             [expectedFlexUsdAmount],
//             [
//               {
//                 amount: 0,
//                 deadline: 0,
//                 v: 0,
//                 r: '0x0000000000000000000000000000000000000000000000000000000000000000',
//                 s: '0x0000000000000000000000000000000000000000000000000000000000000000',
//               },
//             ],
//             [false]
//           )
//         ).to.be.revertedWith('INCONSISTENT_PARAMS');

//         await expect(
//           uniswapLiquiditySwapAdapter
//             .connect(user)
//             .swapAndDeposit(
//               [wbch.address],
//               [flexUsd.address],
//               [amountWBCHtoSwap],
//               [expectedFlexUsdAmount],
//               [],
//               [false]
//             )
//         ).to.be.revertedWith('INCONSISTENT_PARAMS');

//         await expect(
//           uniswapLiquiditySwapAdapter.connect(user).swapAndDeposit(
//             [wbch.address],
//             [flexUsd.address],
//             [amountWBCHtoSwap],
//             [expectedFlexUsdAmount, expectedFlexUsdAmount],
//             [
//               {
//                 amount: 0,
//                 deadline: 0,
//                 v: 0,
//                 r: '0x0000000000000000000000000000000000000000000000000000000000000000',
//                 s: '0x0000000000000000000000000000000000000000000000000000000000000000',
//               },
//             ],
//             [false]
//           )
//         ).to.be.revertedWith('INCONSISTENT_PARAMS');
//       });

//       it('should revert when min amount to receive exceeds the max slippage amount', async () => {
//         const { users, wbch, oracle, flexUsd, aWBCH, uniswapLiquiditySwapAdapter } = testEnv;
//         const user = users[0].signer;

//         const amountWBCHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

//         const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);
//         const expectedFlexUsdAmount = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountWBCHtoSwap.toString()).div(flexUsdPrice.toString()).toFixed(0)
//         );

//         await mockUniswapRouter.setAmountToReturn(wbch.address, expectedFlexUsdAmount);
//         const smallexpectedFlexUsdAmount = expectedFlexUsdAmount.div(2);

//         // User will swap liquidity 10 aEth to aFlexUsd
//         const liquidityToSwap = parseEther('10');
//         await aWBCH.connect(user).approve(uniswapLiquiditySwapAdapter.address, liquidityToSwap);

//         await expect(
//           uniswapLiquiditySwapAdapter.connect(user).swapAndDeposit(
//             [wbch.address],
//             [flexUsd.address],
//             [amountWBCHtoSwap],
//             [smallexpectedFlexUsdAmount],
//             [
//               {
//                 amount: 0,
//                 deadline: 0,
//                 v: 0,
//                 r: '0x0000000000000000000000000000000000000000000000000000000000000000',
//                 s: '0x0000000000000000000000000000000000000000000000000000000000000000',
//               },
//             ],
//             [false]
//           )
//         ).to.be.revertedWith('minAmountOut exceed max slippage');
//       });

//       it('should correctly swap tokens and deposit multiple tokens', async () => {
//         const {
//           users,
//           wbch,
//           usdc,
//           oracle,
//           flexUsd,
//           aFlexUsd,
//           aWBCH,
//           uniswapLiquiditySwapAdapter,
//           pool,
//         } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWBCHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

//         const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);
//         const expectedFlexUsdAmountForEth = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountWBCHtoSwap.toString()).div(flexUsdPrice.toString()).toFixed(0)
//         );

//         const amountUSDCtoSwap = await convertToCurrencyDecimals(usdc.address, '10');
//         const usdcPrice = await oracle.getAssetPrice(usdc.address);

//         const collateralDecimals = (await usdc.decimals()).toString();
//         const principalDecimals = (await flexUsd.decimals()).toString();

//         const expectedFlexUsdAmountForUsdc = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountUSDCtoSwap.toString())
//             .times(
//               new BigNumber(usdcPrice.toString()).times(new BigNumber(10).pow(principalDecimals))
//             )
//             .div(
//               new BigNumber(flexUsdPrice.toString()).times(new BigNumber(10).pow(collateralDecimals))
//             )
//             .toFixed(0)
//         );

//         // Make a deposit for user
//         await usdc.connect(user).mint(amountUSDCtoSwap);
//         await usdc.connect(user).approve(pool.address, amountUSDCtoSwap);
//         await pool.connect(user).deposit(usdc.address, amountUSDCtoSwap, userAddress, 0);

//         const aUsdcData = await pool.getReserveData(usdc.address);
//         const aUsdc = await getContract<AToken>(eContractid.AToken, aUsdcData.aTokenAddress);

//         await mockUniswapRouter.setAmountToReturn(wbch.address, expectedFlexUsdAmountForEth);
//         await mockUniswapRouter.setAmountToReturn(usdc.address, expectedFlexUsdAmountForUsdc);

//         await aWBCH.connect(user).approve(uniswapLiquiditySwapAdapter.address, amountWBCHtoSwap);
//         const userAEthBalanceBefore = await aWBCH.balanceOf(userAddress);
//         await aUsdc.connect(user).approve(uniswapLiquiditySwapAdapter.address, amountUSDCtoSwap);
//         const userAUsdcBalanceBefore = await aUsdc.balanceOf(userAddress);

//         await uniswapLiquiditySwapAdapter.connect(user).swapAndDeposit(
//           [wbch.address, usdc.address],
//           [flexUsd.address, flexUsd.address],
//           [amountWBCHtoSwap, amountUSDCtoSwap],
//           [expectedFlexUsdAmountForEth, expectedFlexUsdAmountForUsdc],
//           [
//             {
//               amount: 0,
//               deadline: 0,
//               v: 0,
//               r: '0x0000000000000000000000000000000000000000000000000000000000000000',
//               s: '0x0000000000000000000000000000000000000000000000000000000000000000',
//             },
//             {
//               amount: 0,
//               deadline: 0,
//               v: 0,
//               r: '0x0000000000000000000000000000000000000000000000000000000000000000',
//               s: '0x0000000000000000000000000000000000000000000000000000000000000000',
//             },
//           ],
//           [false, false]
//         );

//         const adapterWbchBalance = await wbch.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterFlexUsdBalance = await flexUsd.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterFlexUsdAllowance = await flexUsd.allowance(
//           uniswapLiquiditySwapAdapter.address,
//           userAddress
//         );
//         const userAFlexUsdBalance = await aFlexUsd.balanceOf(userAddress);
//         const userAEthBalance = await aWBCH.balanceOf(userAddress);
//         const userAUsdcBalance = await aUsdc.balanceOf(userAddress);

//         expect(adapterWbchBalance).to.be.eq(Zero);
//         expect(adapterFlexUsdBalance).to.be.eq(Zero);
//         expect(adapterFlexUsdAllowance).to.be.eq(Zero);
//         expect(userAFlexUsdBalance).to.be.eq(expectedFlexUsdAmountForEth.add(expectedFlexUsdAmountForUsdc));
//         expect(userAEthBalance).to.be.lt(userAEthBalanceBefore);
//         expect(userAEthBalance).to.be.gte(userAEthBalanceBefore.sub(amountWBCHtoSwap));
//         expect(userAUsdcBalance).to.be.lt(userAUsdcBalanceBefore);
//         expect(userAUsdcBalance).to.be.gte(userAUsdcBalanceBefore.sub(amountUSDCtoSwap));
//       });

//       it('should correctly swap tokens and deposit multiple tokens using permit', async () => {
//         const {
//           users,
//           wbch,
//           usdc,
//           oracle,
//           flexUsd,
//           aFlexUsd,
//           aWBCH,
//           uniswapLiquiditySwapAdapter,
//           pool,
//         } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;
//         const chainId = DRE.network.config.chainId || BUIDLEREVM_CHAINID;
//         const deadline = MAX_UINT_AMOUNT;

//         const ownerPrivateKey = require('../../test-wallets.js').accounts[1].secretKey;
//         if (!ownerPrivateKey) {
//           throw new Error('INVALID_OWNER_PK');
//         }

//         const amountWBCHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

//         const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);
//         const expectedFlexUsdAmountForEth = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountWBCHtoSwap.toString()).div(flexUsdPrice.toString()).toFixed(0)
//         );

//         const amountUSDCtoSwap = await convertToCurrencyDecimals(usdc.address, '10');
//         const usdcPrice = await oracle.getAssetPrice(usdc.address);

//         const collateralDecimals = (await usdc.decimals()).toString();
//         const principalDecimals = (await flexUsd.decimals()).toString();

//         const expectedFlexUsdAmountForUsdc = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountUSDCtoSwap.toString())
//             .times(
//               new BigNumber(usdcPrice.toString()).times(new BigNumber(10).pow(principalDecimals))
//             )
//             .div(
//               new BigNumber(flexUsdPrice.toString()).times(new BigNumber(10).pow(collateralDecimals))
//             )
//             .toFixed(0)
//         );

//         // Make a deposit for user
//         await usdc.connect(user).mint(amountUSDCtoSwap);
//         await usdc.connect(user).approve(pool.address, amountUSDCtoSwap);
//         await pool.connect(user).deposit(usdc.address, amountUSDCtoSwap, userAddress, 0);

//         const aUsdcData = await pool.getReserveData(usdc.address);
//         const aUsdc = await getContract<AToken>(eContractid.AToken, aUsdcData.aTokenAddress);

//         await mockUniswapRouter.setAmountToReturn(wbch.address, expectedFlexUsdAmountForEth);
//         await mockUniswapRouter.setAmountToReturn(usdc.address, expectedFlexUsdAmountForUsdc);

//         const userAEthBalanceBefore = await aWBCH.balanceOf(userAddress);
//         const userAUsdcBalanceBefore = await aUsdc.balanceOf(userAddress);

//         const aWbchNonce = (await aWBCH._nonces(userAddress)).toNumber();
//         const aWbchMsgParams = buildPermitParams(
//           chainId,
//           aWBCH.address,
//           '1',
//           await aWBCH.name(),
//           userAddress,
//           uniswapLiquiditySwapAdapter.address,
//           aWbchNonce,
//           deadline,
//           amountWBCHtoSwap.toString()
//         );
//         const { v: aWETHv, r: aWETHr, s: aWETHs } = getSignatureFromTypedData(
//           ownerPrivateKey,
//           aWbchMsgParams
//         );

//         const aUsdcNonce = (await aUsdc._nonces(userAddress)).toNumber();
//         const aUsdcMsgParams = buildPermitParams(
//           chainId,
//           aUsdc.address,
//           '1',
//           await aUsdc.name(),
//           userAddress,
//           uniswapLiquiditySwapAdapter.address,
//           aUsdcNonce,
//           deadline,
//           amountUSDCtoSwap.toString()
//         );
//         const { v: aUsdcv, r: aUsdcr, s: aUsdcs } = getSignatureFromTypedData(
//           ownerPrivateKey,
//           aUsdcMsgParams
//         );

//         await uniswapLiquiditySwapAdapter.connect(user).swapAndDeposit(
//           [wbch.address, usdc.address],
//           [flexUsd.address, flexUsd.address],
//           [amountWBCHtoSwap, amountUSDCtoSwap],
//           [expectedFlexUsdAmountForEth, expectedFlexUsdAmountForUsdc],
//           [
//             {
//               amount: amountWBCHtoSwap,
//               deadline,
//               v: aWETHv,
//               r: aWETHr,
//               s: aWETHs,
//             },
//             {
//               amount: amountUSDCtoSwap,
//               deadline,
//               v: aUsdcv,
//               r: aUsdcr,
//               s: aUsdcs,
//             },
//           ],
//           [false, false]
//         );

//         const adapterWbchBalance = await wbch.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterFlexUsdBalance = await flexUsd.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterFlexUsdAllowance = await flexUsd.allowance(
//           uniswapLiquiditySwapAdapter.address,
//           userAddress
//         );
//         const userAFlexUsdBalance = await aFlexUsd.balanceOf(userAddress);
//         const userAEthBalance = await aWBCH.balanceOf(userAddress);
//         const userAUsdcBalance = await aUsdc.balanceOf(userAddress);

//         expect(adapterWbchBalance).to.be.eq(Zero);
//         expect(adapterFlexUsdBalance).to.be.eq(Zero);
//         expect(adapterFlexUsdAllowance).to.be.eq(Zero);
//         expect(userAFlexUsdBalance).to.be.eq(expectedFlexUsdAmountForEth.add(expectedFlexUsdAmountForUsdc));
//         expect(userAEthBalance).to.be.lt(userAEthBalanceBefore);
//         expect(userAEthBalance).to.be.gte(userAEthBalanceBefore.sub(amountWBCHtoSwap));
//         expect(userAUsdcBalance).to.be.lt(userAUsdcBalanceBefore);
//         expect(userAUsdcBalance).to.be.gte(userAUsdcBalanceBefore.sub(amountUSDCtoSwap));
//       });

//       it('should correctly swap all the balance when using a bigger amount', async () => {
//         const { users, wbch, oracle, flexUsd, aFlexUsd, aWBCH, uniswapLiquiditySwapAdapter } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWBCHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

//         const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);
//         const expectedFlexUsdAmount = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountWBCHtoSwap.toString()).div(flexUsdPrice.toString()).toFixed(0)
//         );

//         await mockUniswapRouter.setAmountToReturn(wbch.address, expectedFlexUsdAmount);

//         // Remove other balance
//         await aWBCH.connect(user).transfer(users[1].address, parseEther('90'));
//         const userAEthBalanceBefore = await aWBCH.balanceOf(userAddress);

//         // User will swap liquidity 10 aEth to aFlexUsd
//         const liquidityToSwap = parseEther('10');
//         expect(userAEthBalanceBefore).to.be.eq(liquidityToSwap);

//         // User will swap liquidity 10 aEth to aFlexUsd
//         await aWBCH.connect(user).approve(uniswapLiquiditySwapAdapter.address, liquidityToSwap);

//         // Only has 10 atokens, so all the balance will be swapped
//         const bigAmountToSwap = parseEther('100');

//         await expect(
//           uniswapLiquiditySwapAdapter.connect(user).swapAndDeposit(
//             [wbch.address],
//             [flexUsd.address],
//             [bigAmountToSwap],
//             [expectedFlexUsdAmount],
//             [
//               {
//                 amount: 0,
//                 deadline: 0,
//                 v: 0,
//                 r: '0x0000000000000000000000000000000000000000000000000000000000000000',
//                 s: '0x0000000000000000000000000000000000000000000000000000000000000000',
//               },
//             ],
//             [false]
//           )
//         )
//           .to.emit(uniswapLiquiditySwapAdapter, 'Swapped')
//           .withArgs(wbch.address, flexUsd.address, amountWBCHtoSwap.toString(), expectedFlexUsdAmount);

//         const adapterWbchBalance = await wbch.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterFlexUsdBalance = await flexUsd.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterFlexUsdAllowance = await flexUsd.allowance(
//           uniswapLiquiditySwapAdapter.address,
//           userAddress
//         );
//         const userAFlexUsdBalance = await aFlexUsd.balanceOf(userAddress);
//         const userAEthBalance = await aWBCH.balanceOf(userAddress);
//         const adapterAEthBalance = await aWBCH.balanceOf(uniswapLiquiditySwapAdapter.address);

//         expect(adapterWbchBalance).to.be.eq(Zero);
//         expect(adapterFlexUsdBalance).to.be.eq(Zero);
//         expect(adapterFlexUsdAllowance).to.be.eq(Zero);
//         expect(userAFlexUsdBalance).to.be.eq(expectedFlexUsdAmount);
//         expect(userAEthBalance).to.be.eq(Zero);
//         expect(adapterAEthBalance).to.be.eq(Zero);
//       });

//       it('should correctly swap all the balance when using permit', async () => {
//         const { users, wbch, oracle, flexUsd, aFlexUsd, aWBCH, uniswapLiquiditySwapAdapter } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWBCHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

//         const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);
//         const expectedFlexUsdAmount = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountWBCHtoSwap.toString()).div(flexUsdPrice.toString()).toFixed(0)
//         );

//         await mockUniswapRouter.setAmountToReturn(wbch.address, expectedFlexUsdAmount);

//         // Remove other balance
//         await aWBCH.connect(user).transfer(users[1].address, parseEther('90'));
//         const userAEthBalanceBefore = await aWBCH.balanceOf(userAddress);

//         // User will swap liquidity 10 aEth to aFlexUsd
//         const liquidityToSwap = parseEther('10');
//         expect(userAEthBalanceBefore).to.be.eq(liquidityToSwap);

//         // Only has 10 atokens, so all the balance will be swapped
//         const bigAmountToSwap = parseEther('100');

//         const chainId = DRE.network.config.chainId || BUIDLEREVM_CHAINID;
//         const deadline = MAX_UINT_AMOUNT;

//         const ownerPrivateKey = require('../../test-wallets.js').accounts[1].secretKey;
//         if (!ownerPrivateKey) {
//           throw new Error('INVALID_OWNER_PK');
//         }
//         const aWbchNonce = (await aWBCH._nonces(userAddress)).toNumber();
//         const aWbchMsgParams = buildPermitParams(
//           chainId,
//           aWBCH.address,
//           '1',
//           await aWBCH.name(),
//           userAddress,
//           uniswapLiquiditySwapAdapter.address,
//           aWbchNonce,
//           deadline,
//           bigAmountToSwap.toString()
//         );
//         const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, aWbchMsgParams);

//         await expect(
//           uniswapLiquiditySwapAdapter.connect(user).swapAndDeposit(
//             [wbch.address],
//             [flexUsd.address],
//             [bigAmountToSwap],
//             [expectedFlexUsdAmount],
//             [
//               {
//                 amount: bigAmountToSwap,
//                 deadline,
//                 v,
//                 r,
//                 s,
//               },
//             ],
//             [false]
//           )
//         )
//           .to.emit(uniswapLiquiditySwapAdapter, 'Swapped')
//           .withArgs(wbch.address, flexUsd.address, amountWBCHtoSwap.toString(), expectedFlexUsdAmount);

//         const adapterWbchBalance = await wbch.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterFlexUsdBalance = await flexUsd.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterFlexUsdAllowance = await flexUsd.allowance(
//           uniswapLiquiditySwapAdapter.address,
//           userAddress
//         );
//         const userAFlexUsdBalance = await aFlexUsd.balanceOf(userAddress);
//         const userAEthBalance = await aWBCH.balanceOf(userAddress);
//         const adapterAEthBalance = await aWBCH.balanceOf(uniswapLiquiditySwapAdapter.address);

//         expect(adapterWbchBalance).to.be.eq(Zero);
//         expect(adapterFlexUsdBalance).to.be.eq(Zero);
//         expect(adapterFlexUsdAllowance).to.be.eq(Zero);
//         expect(userAFlexUsdBalance).to.be.eq(expectedFlexUsdAmount);
//         expect(userAEthBalance).to.be.eq(Zero);
//         expect(adapterAEthBalance).to.be.eq(Zero);
//       });
//     });
//   });
// });
