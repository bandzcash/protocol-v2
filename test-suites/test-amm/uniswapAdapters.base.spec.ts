// import { makeSuite, TestEnv } from './helpers/make-suite';
// import { convertToCurrencyDecimals } from '../../helpers/contracts-helpers';
// import { getMockUniswapRouter } from '../../helpers/contracts-getters';
// import { MockUniswapV2Router02 } from '../../types/MockUniswapV2Router02';
// import BigNumber from 'bignumber.js';
// import { evmRevert, evmSnapshot } from '../../helpers/misc-utils';
// import { ethers } from 'ethers';
// import { USD_ADDRESS } from '../../helpers/constants';
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

//   describe('BaseUniswapAdapter', () => {
//     describe('getAmountsOut', () => {
//       it('should return the estimated amountOut and prices for the asset swap', async () => {
//         const { wbch, flexUsd, uniswapLiquiditySwapAdapter, oracle } = testEnv;

//         const amountIn = parseEther('1');
//         const flashloanPremium = amountIn.mul(9).div(10000);
//         const amountToSwap = amountIn.sub(flashloanPremium);

//         const wbchPrice = await oracle.getAssetPrice(wbch.address);
//         const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);
//         const usdPrice = await oracle.getAssetPrice(USD_ADDRESS);

//         const expectedFlexUsdAmount = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountToSwap.toString()).div(flexUsdPrice.toString()).toFixed(0)
//         );

//         const outPerInPrice = amountToSwap
//           .mul(parseEther('1'))
//           .mul(parseEther('1'))
//           .div(expectedFlexUsdAmount.mul(parseEther('1')));
//         const ethUsdValue = amountIn
//           .mul(wbchPrice)
//           .div(parseEther('1'))
//           .mul(usdPrice)
//           .div(parseEther('1'));
//         const flexUsdUsdValue = expectedFlexUsdAmount
//           .mul(flexUsdPrice)
//           .div(parseEther('1'))
//           .mul(usdPrice)
//           .div(parseEther('1'));

//         await mockUniswapRouter.setAmountOut(
//           amountToSwap,
//           wbch.address,
//           flexUsd.address,
//           expectedFlexUsdAmount
//         );

//         const result = await uniswapLiquiditySwapAdapter.getAmountsOut(
//           amountIn,
//           wbch.address,
//           flexUsd.address
//         );

//         expect(result['0']).to.be.eq(expectedFlexUsdAmount);
//         expect(result['1']).to.be.eq(outPerInPrice);
//         expect(result['2']).to.be.eq(ethUsdValue);
//         expect(result['3']).to.be.eq(flexUsdUsdValue);
//       });
//       it('should work correctly with different decimals', async () => {
//         const { bandz, usdc, uniswapLiquiditySwapAdapter, oracle } = testEnv;

//         const amountIn = parseEther('10');
//         const flashloanPremium = amountIn.mul(9).div(10000);
//         const amountToSwap = amountIn.sub(flashloanPremium);

//         const bandzPrice = await oracle.getAssetPrice(bandz.address);
//         const usdcPrice = await oracle.getAssetPrice(usdc.address);
//         const usdPrice = await oracle.getAssetPrice(USD_ADDRESS);

//         const expectedUSDCAmount = await convertToCurrencyDecimals(
//           usdc.address,
//           new BigNumber(amountToSwap.toString()).div(usdcPrice.toString()).toFixed(0)
//         );

//         const outPerInPrice = amountToSwap
//           .mul(parseEther('1'))
//           .mul('1000000') // usdc 6 decimals
//           .div(expectedUSDCAmount.mul(parseEther('1')));

//         const bandzUsdValue = amountIn
//           .mul(bandzPrice)
//           .div(parseEther('1'))
//           .mul(usdPrice)
//           .div(parseEther('1'));

//         const usdcUsdValue = expectedUSDCAmount
//           .mul(usdcPrice)
//           .div('1000000') // usdc 6 decimals
//           .mul(usdPrice)
//           .div(parseEther('1'));

//         await mockUniswapRouter.setAmountOut(
//           amountToSwap,
//           bandz.address,
//           usdc.address,
//           expectedUSDCAmount
//         );

//         const result = await uniswapLiquiditySwapAdapter.getAmountsOut(
//           amountIn,
//           bandz.address,
//           usdc.address
//         );

//         expect(result['0']).to.be.eq(expectedUSDCAmount);
//         expect(result['1']).to.be.eq(outPerInPrice);
//         expect(result['2']).to.be.eq(bandzUsdValue);
//         expect(result['3']).to.be.eq(usdcUsdValue);
//       });
//     });

//     describe('getAmountsIn', () => {
//       it('should return the estimated required amountIn for the asset swap', async () => {
//         const { wbch, flexUsd, uniswapLiquiditySwapAdapter, oracle } = testEnv;

//         const amountIn = parseEther('1');
//         const flashloanPremium = amountIn.mul(9).div(10000);
//         const amountToSwap = amountIn.add(flashloanPremium);

//         const wbchPrice = await oracle.getAssetPrice(wbch.address);
//         const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);
//         const usdPrice = await oracle.getAssetPrice(USD_ADDRESS);

//         const amountOut = await convertToCurrencyDecimals(
//           flexUsd.address,
//           new BigNumber(amountIn.toString()).div(flexUsdPrice.toString()).toFixed(0)
//         );

//         const inPerOutPrice = amountOut
//           .mul(parseEther('1'))
//           .mul(parseEther('1'))
//           .div(amountToSwap.mul(parseEther('1')));

//         const ethUsdValue = amountToSwap
//           .mul(wbchPrice)
//           .div(parseEther('1'))
//           .mul(usdPrice)
//           .div(parseEther('1'));
//         const flexUsdUsdValue = amountOut
//           .mul(flexUsdPrice)
//           .div(parseEther('1'))
//           .mul(usdPrice)
//           .div(parseEther('1'));

//         await mockUniswapRouter.setAmountIn(amountOut, wbch.address, flexUsd.address, amountIn);

//         const result = await uniswapLiquiditySwapAdapter.getAmountsIn(
//           amountOut,
//           wbch.address,
//           flexUsd.address
//         );

//         expect(result['0']).to.be.eq(amountToSwap);
//         expect(result['1']).to.be.eq(inPerOutPrice);
//         expect(result['2']).to.be.eq(ethUsdValue);
//         expect(result['3']).to.be.eq(flexUsdUsdValue);
//       });
//       it('should work correctly with different decimals', async () => {
//         const { bandz, usdc, uniswapLiquiditySwapAdapter, oracle } = testEnv;

//         const amountIn = parseEther('10');
//         const flashloanPremium = amountIn.mul(9).div(10000);
//         const amountToSwap = amountIn.add(flashloanPremium);

//         const bandzPrice = await oracle.getAssetPrice(bandz.address);
//         const usdcPrice = await oracle.getAssetPrice(usdc.address);
//         const usdPrice = await oracle.getAssetPrice(USD_ADDRESS);

//         const amountOut = await convertToCurrencyDecimals(
//           usdc.address,
//           new BigNumber(amountToSwap.toString()).div(usdcPrice.toString()).toFixed(0)
//         );

//         const inPerOutPrice = amountOut
//           .mul(parseEther('1'))
//           .mul(parseEther('1'))
//           .div(amountToSwap.mul('1000000')); // usdc 6 decimals

//         const bandzUsdValue = amountToSwap
//           .mul(bandzPrice)
//           .div(parseEther('1'))
//           .mul(usdPrice)
//           .div(parseEther('1'));

//         const usdcUsdValue = amountOut
//           .mul(usdcPrice)
//           .div('1000000') // usdc 6 decimals
//           .mul(usdPrice)
//           .div(parseEther('1'));

//         await mockUniswapRouter.setAmountIn(amountOut, bandz.address, usdc.address, amountIn);

//         const result = await uniswapLiquiditySwapAdapter.getAmountsIn(
//           amountOut,
//           bandz.address,
//           usdc.address
//         );

//         expect(result['0']).to.be.eq(amountToSwap);
//         expect(result['1']).to.be.eq(inPerOutPrice);
//         expect(result['2']).to.be.eq(bandzUsdValue);
//         expect(result['3']).to.be.eq(usdcUsdValue);
//       });
//     });
//   });
// });
