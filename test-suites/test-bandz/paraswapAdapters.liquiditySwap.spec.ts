import { makeSuite, TestEnv } from './helpers/make-suite';
import {
  convertToCurrencyDecimals,
  getContract,
  buildPermitParams,
  getSignatureFromTypedData,
  buildParaSwapLiquiditySwapParams,
} from '../../helpers/contracts-helpers';
import {
  getMockParaSwapAugustus,
  getMockParaSwapAugustusRegistry,
} from '../../helpers/contracts-getters';
import { deployParaSwapLiquiditySwapAdapter } from '../../helpers/contracts-deployments';
import { MockParaSwapAugustus } from '../../types/MockParaSwapAugustus';
import { MockParaSwapAugustusRegistry } from '../../types/MockParaSwapAugustusRegistry';
import { Zero } from '@ethersproject/constants';
import BigNumber from 'bignumber.js';
import { DRE, evmRevert, evmSnapshot } from '../../helpers/misc-utils';
import { ethers } from 'ethers';
import { eContractid } from '../../helpers/types';
import { AToken } from '../../types/AToken';
import { BUIDLEREVM_CHAINID } from '../../helpers/buidler-constants';
import { MAX_UINT_AMOUNT } from '../../helpers/constants';
const { parseEther } = ethers.utils;

const { expect } = require('chai');

makeSuite('ParaSwap adapters', (testEnv: TestEnv) => {
  let mockAugustus: MockParaSwapAugustus;
  let mockAugustusRegistry: MockParaSwapAugustusRegistry;
  let evmSnapshotId: string;

  before(async () => {
    mockAugustus = await getMockParaSwapAugustus();
    mockAugustusRegistry = await getMockParaSwapAugustusRegistry();
  });

  beforeEach(async () => {
    evmSnapshotId = await evmSnapshot();
  });

  afterEach(async () => {
    await evmRevert(evmSnapshotId);
  });

  describe('ParaSwapLiquiditySwapAdapter', () => {
    describe('constructor', () => {
      it('should deploy with correct parameters', async () => {
        const { addressesProvider } = testEnv;
        await deployParaSwapLiquiditySwapAdapter([
          addressesProvider.address,
          mockAugustusRegistry.address,
        ]);
      });

      it('should revert if not valid addresses provider', async () => {
        await expect(
          deployParaSwapLiquiditySwapAdapter([
            mockAugustus.address, // any invalid contract can be used here
            mockAugustusRegistry.address,
          ])
        ).to.be.reverted;
      });

      it('should revert if not valid augustus registry', async () => {
        const { addressesProvider } = testEnv;
        await expect(
          deployParaSwapLiquiditySwapAdapter([
            addressesProvider.address,
            mockAugustus.address, // any invalid contract can be used here
          ])
        ).to.be.reverted;
      });
    });

    describe('executeOperation', () => {
      beforeEach(async () => {
        const { users, wbch, dai, pool, deployer } = testEnv;
        const userAddress = users[0].address;

        // Provide liquidity
        await dai.mint(parseEther('20000'));
        await dai.approve(pool.address, parseEther('20000'));
        await pool.deposit(dai.address, parseEther('20000'), deployer.address, 0);

        await wbch.mint(parseEther('10000'));
        await wbch.approve(pool.address, parseEther('10000'));
        await pool.deposit(wbch.address, parseEther('10000'), deployer.address, 0);

        // Make a deposit for user
        await wbch.mint(parseEther('100'));
        await wbch.approve(pool.address, parseEther('100'));
        await pool.deposit(wbch.address, parseEther('100'), userAddress, 0);
      });

      it('should correctly swap tokens and deposit the out tokens in the pool', async () => {
        const { users, wbch, oracle, dai, aDai, aWBCH, pool, paraswapLiquiditySwapAdapter } =
          testEnv;
        const user = users[0].signer;
        const userAddress = users[0].address;

        const amountWETHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

        const daiPrice = await oracle.getAssetPrice(dai.address);
        const expectedDaiAmount = await convertToCurrencyDecimals(
          dai.address,
          new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
        );

        await mockAugustus.expectSwap(
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          amountWETHtoSwap,
          expectedDaiAmount
        );

        const flashloanPremium = amountWETHtoSwap.mul(9).div(10000);
        const flashloanTotal = amountWETHtoSwap.add(flashloanPremium);

        // User will swap liquidity aEth to aDai
        const userAEthBalanceBefore = await aWBCH.balanceOf(userAddress);
        await aWBCH.connect(user).approve(paraswapLiquiditySwapAdapter.address, flashloanTotal);

        const mockAugustusCalldata = mockAugustus.interface.encodeFunctionData('swap', [
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          expectedDaiAmount,
        ]);

        const params = buildParaSwapLiquiditySwapParams(
          dai.address,
          expectedDaiAmount,
          0,
          mockAugustusCalldata,
          mockAugustus.address,
          0,
          0,
          0,
          '0x0000000000000000000000000000000000000000000000000000000000000000',
          '0x0000000000000000000000000000000000000000000000000000000000000000'
        );

        await expect(
          pool
            .connect(user)
            .flashLoan(
              paraswapLiquiditySwapAdapter.address,
              [wbch.address],
              [amountWETHtoSwap],
              [0],
              userAddress,
              params,
              0
            )
        )
          .to.emit(paraswapLiquiditySwapAdapter, 'Swapped')
          .withArgs(wbch.address, dai.address, amountWETHtoSwap, expectedDaiAmount);

        const adapterWbchBalance = await wbch.balanceOf(paraswapLiquiditySwapAdapter.address);
        const adapterDaiBalance = await dai.balanceOf(paraswapLiquiditySwapAdapter.address);
        const userADaiBalance = await aDai.balanceOf(userAddress);
        const userAEthBalance = await aWBCH.balanceOf(userAddress);

        // N.B. will get some portion of flashloan premium back from the pool
        expect(adapterWbchBalance).to.be.eq(Zero);
        expect(adapterDaiBalance).to.be.eq(Zero);
        expect(userADaiBalance).to.be.eq(expectedDaiAmount);
        expect(userAEthBalance).to.be.gte(userAEthBalanceBefore.sub(flashloanTotal));
        expect(userAEthBalance).to.be.lte(userAEthBalanceBefore.sub(amountWETHtoSwap));
      });

      it('should correctly swap tokens using permit', async () => {
        const { users, wbch, oracle, dai, aDai, aWBCH, pool, paraswapLiquiditySwapAdapter } =
          testEnv;
        const user = users[0].signer;
        const userAddress = users[0].address;

        const amountWETHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

        const daiPrice = await oracle.getAssetPrice(dai.address);
        const expectedDaiAmount = await convertToCurrencyDecimals(
          dai.address,
          new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
        );

        await mockAugustus.expectSwap(
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          amountWETHtoSwap,
          expectedDaiAmount
        );

        const flashloanPremium = amountWETHtoSwap.mul(9).div(10000);
        const flashloanTotal = amountWETHtoSwap.add(flashloanPremium);

        // User will swap liquidity aEth to aDai
        const userAEthBalanceBefore = await aWBCH.balanceOf(userAddress);

        const chainId = DRE.network.config.chainId || BUIDLEREVM_CHAINID;
        const deadline = MAX_UINT_AMOUNT;
        const nonce = (await aWBCH._nonces(userAddress)).toNumber();
        const msgParams = buildPermitParams(
          chainId,
          aWBCH.address,
          '1',
          await aWBCH.name(),
          userAddress,
          paraswapLiquiditySwapAdapter.address,
          nonce,
          deadline,
          flashloanTotal.toString()
        );

        const ownerPrivateKey = require('../../test-wallets.js').accounts[1].secretKey;
        if (!ownerPrivateKey) {
          throw new Error('INVALID_OWNER_PK');
        }

        const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, msgParams);

        const mockAugustusCalldata = mockAugustus.interface.encodeFunctionData('swap', [
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          expectedDaiAmount,
        ]);

        const params = buildParaSwapLiquiditySwapParams(
          dai.address,
          expectedDaiAmount,
          0,
          mockAugustusCalldata,
          mockAugustus.address,
          flashloanTotal,
          deadline,
          v,
          r,
          s
        );

        await expect(
          pool
            .connect(user)
            .flashLoan(
              paraswapLiquiditySwapAdapter.address,
              [wbch.address],
              [amountWETHtoSwap],
              [0],
              userAddress,
              params,
              0
            )
        )
          .to.emit(paraswapLiquiditySwapAdapter, 'Swapped')
          .withArgs(wbch.address, dai.address, amountWETHtoSwap, expectedDaiAmount);

        const adapterWbchBalance = await wbch.balanceOf(paraswapLiquiditySwapAdapter.address);
        const adapterDaiBalance = await dai.balanceOf(paraswapLiquiditySwapAdapter.address);
        const userADaiBalance = await aDai.balanceOf(userAddress);
        const userAEthBalance = await aWBCH.balanceOf(userAddress);

        // N.B. will get some portion of flashloan premium back from the pool
        expect(adapterWbchBalance).to.be.eq(Zero);
        expect(adapterDaiBalance).to.be.eq(Zero);
        expect(userADaiBalance).to.be.eq(expectedDaiAmount);
        expect(userAEthBalance).to.be.gte(userAEthBalanceBefore.sub(flashloanTotal));
        expect(userAEthBalance).to.be.lte(userAEthBalanceBefore.sub(amountWETHtoSwap));
      });

      it('should revert if caller not lending pool', async () => {
        const { users, wbch, oracle, dai, aWBCH, paraswapLiquiditySwapAdapter } = testEnv;
        const user = users[0].signer;
        const userAddress = users[0].address;

        const amountWETHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

        const daiPrice = await oracle.getAssetPrice(dai.address);
        const expectedDaiAmount = await convertToCurrencyDecimals(
          dai.address,
          new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
        );

        await mockAugustus.expectSwap(
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          amountWETHtoSwap,
          expectedDaiAmount
        );

        const flashloanPremium = amountWETHtoSwap.mul(9).div(10000);
        const flashloanTotal = amountWETHtoSwap.add(flashloanPremium);

        // User will swap liquidity aEth to aDai
        await aWBCH.connect(user).approve(paraswapLiquiditySwapAdapter.address, flashloanTotal);

        const mockAugustusCalldata = mockAugustus.interface.encodeFunctionData('swap', [
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          expectedDaiAmount,
        ]);

        const params = buildParaSwapLiquiditySwapParams(
          dai.address,
          expectedDaiAmount,
          0,
          mockAugustusCalldata,
          mockAugustus.address,
          0,
          0,
          0,
          '0x0000000000000000000000000000000000000000000000000000000000000000',
          '0x0000000000000000000000000000000000000000000000000000000000000000'
        );

        await expect(
          paraswapLiquiditySwapAdapter
            .connect(user)
            .executeOperation([wbch.address], [amountWETHtoSwap], [0], userAddress, params)
        ).to.be.revertedWith('CALLER_MUST_BE_LENDING_POOL');
      });

      // TODO - FIXME - USDC before
      // it('should work correctly with tokens of different decimals', async () => {
      //   const { users, dai, oracle, aDai, paraswapLiquiditySwapAdapter, pool, deployer } =
      //     testEnv;
      //   const user = users[0].signer;
      //   const userAddress = users[0].address;

      //   const amountDAItoSwap = await convertToCurrencyDecimals(dai.address, '10');
      //   const liquidity = await convertToCurrencyDecimals(dai.address, '20000');

      //   const flashloanPremium = amountDAItoSwap.mul(9).div(10000);
      //   const flashloanTotal = amountDAItoSwap.add(flashloanPremium);

      //   // Provider liquidity
      //   await dai.mint(liquidity);
      //   await dai.approve(pool.address, liquidity);
      //   await pool.deposit(dai.address, liquidity, deployer.address, 0);

      //   // Make a deposit for user
      //   await dai.connect(user).mint(flashloanTotal);
      //   await dai.connect(user).approve(pool.address, flashloanTotal);
      //   await pool.connect(user).deposit(dai.address, flashloanTotal, userAddress, 0);

      //   const daiPrice = await oracle.getAssetPrice(dai.address);

      //   const collateralDecimals = (await dai.decimals()).toString();
      //   const principalDecimals = (await dai.decimals()).toString();

      //   const expectedDaiAmount = await convertToCurrencyDecimals(
      //     dai.address,
      //     new BigNumber(amountDAItoSwap.toString())
      //       .times(
      //         new BigNumber(daiPrice.toString()).times(new BigNumber(10).pow(principalDecimals))
      //       )
      //       .div(
      //         new BigNumber(daiPrice.toString()).times(new BigNumber(10).pow(collateralDecimals))
      //       )
      //       .div(new BigNumber(10).pow(principalDecimals))
      //       .toFixed(0)
      //   );

      //   await mockAugustus.expectSwap(
      //     dai.address,
      //     dai.address,
      //     amountDAItoSwap,
      //     amountDAItoSwap,
      //     expectedDaiAmount
      //   );

      //   const aDaiData = await pool.getReserveData(dai.address);
      //   const aDai = await getContract<AToken>(eContractid.AToken, aDaiData.aTokenAddress);

      //   // User will swap liquidity aDai to aDai
      //   const userADaiBalanceBefore = await aDai.balanceOf(userAddress);
      //   await aDai.connect(user).approve(paraswapLiquiditySwapAdapter.address, flashloanTotal);

      //   const mockAugustusCalldata = mockAugustus.interface.encodeFunctionData('swap', [
      //     dai.address,
      //     dai.address,
      //     amountDAItoSwap,
      //     expectedDaiAmount,
      //   ]);

      //   const params = buildParaSwapLiquiditySwapParams(
      //     dai.address,
      //     expectedDaiAmount,
      //     0,
      //     mockAugustusCalldata,
      //     mockAugustus.address,
      //     0,
      //     0,
      //     0,
      //     '0x0000000000000000000000000000000000000000000000000000000000000000',
      //     '0x0000000000000000000000000000000000000000000000000000000000000000'
      //   );

      //   await expect(
      //     pool
      //       .connect(user)
      //       .flashLoan(
      //         paraswapLiquiditySwapAdapter.address,
      //         [dai.address],
      //         [amountDAItoSwap],
      //         [0],
      //         userAddress,
      //         params,
      //         0
      //       )
      //   )
      //     .to.emit(paraswapLiquiditySwapAdapter, 'Swapped')
      //     .withArgs(dai.address, dai.address, amountDAItoSwap, expectedDaiAmount);

      //   const adapterDaiBalance = await dai.balanceOf(paraswapLiquiditySwapAdapter.address);
      //   const adapterDaiBalance = await dai.balanceOf(paraswapLiquiditySwapAdapter.address);
      //   const userADaiBalance = await aDai.balanceOf(userAddress);
      //   const userADaiBalance = await aDai.balanceOf(userAddress);

      //   // N.B. will get some portion of flashloan premium back from the pool
      //   expect(adapterDaiBalance).to.be.eq(Zero);
      //   expect(adapterDaiBalance).to.be.eq(Zero);
      //   expect(userADaiBalance).to.be.eq(expectedDaiAmount);
      //   expect(userADaiBalance).to.be.gte(userADaiBalanceBefore.sub(flashloanTotal));
      //   expect(userADaiBalance).to.be.lte(userADaiBalanceBefore.sub(amountDAItoSwap));
      // });

      it('should revert when min amount to receive exceeds the max slippage amount', async () => {
        const { users, wbch, oracle, dai, aWBCH, pool, paraswapLiquiditySwapAdapter } = testEnv;
        const user = users[0].signer;
        const userAddress = users[0].address;

        const amountWETHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

        const daiPrice = await oracle.getAssetPrice(dai.address);
        const expectedDaiAmount = await convertToCurrencyDecimals(
          dai.address,
          new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
        );

        await mockAugustus.expectSwap(
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          amountWETHtoSwap,
          expectedDaiAmount
        );

        const smallExpectedDaiAmount = expectedDaiAmount.div(2);

        const flashloanPremium = amountWETHtoSwap.mul(9).div(10000);
        const flashloanTotal = amountWETHtoSwap.add(flashloanPremium);

        // User will swap liquidity aEth to aDai
        await aWBCH.connect(user).approve(paraswapLiquiditySwapAdapter.address, flashloanTotal);

        const mockAugustusCalldata = mockAugustus.interface.encodeFunctionData('swap', [
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          expectedDaiAmount,
        ]);

        const params = buildParaSwapLiquiditySwapParams(
          dai.address,
          smallExpectedDaiAmount,
          0,
          mockAugustusCalldata,
          mockAugustus.address,
          0,
          0,
          0,
          '0x0000000000000000000000000000000000000000000000000000000000000000',
          '0x0000000000000000000000000000000000000000000000000000000000000000'
        );

        await expect(
          pool
            .connect(user)
            .flashLoan(
              paraswapLiquiditySwapAdapter.address,
              [wbch.address],
              [amountWETHtoSwap],
              [0],
              userAddress,
              params,
              0
            )
        ).to.be.revertedWith('MIN_AMOUNT_EXCEEDS_MAX_SLIPPAGE');
      });

      // USDC before
      it('should revert when min amount to receive exceeds the max slippage amount (with tokens of different decimals)', async () => {
        const { users, dai, oracle, paraswapLiquiditySwapAdapter, pool, deployer } = testEnv;
        const user = users[0].signer;
        const userAddress = users[0].address;

        const amountDAItoSwap = await convertToCurrencyDecimals(dai.address, '10');
        const liquidity = await convertToCurrencyDecimals(dai.address, '20000');

        const flashloanPremium = amountDAItoSwap.mul(9).div(10000);
        const flashloanTotal = amountDAItoSwap.add(flashloanPremium);

        // Provider liquidity
        await dai.mint(liquidity);
        await dai.approve(pool.address, liquidity);
        await pool.deposit(dai.address, liquidity, deployer.address, 0);

        // Make a deposit for user
        await dai.connect(user).mint(flashloanTotal);
        await dai.connect(user).approve(pool.address, flashloanTotal);
        await pool.connect(user).deposit(dai.address, flashloanTotal, userAddress, 0);

        const daiPrice = await oracle.getAssetPrice(dai.address);

        const collateralDecimals = (await dai.decimals()).toString();
        const principalDecimals = (await dai.decimals()).toString();

        const expectedDaiAmount = await convertToCurrencyDecimals(
          dai.address,
          new BigNumber(amountDAItoSwap.toString())
            .times(
              new BigNumber(daiPrice.toString()).times(new BigNumber(10).pow(principalDecimals))
            )
            .div(
              new BigNumber(daiPrice.toString()).times(new BigNumber(10).pow(collateralDecimals))
            )
            .div(new BigNumber(10).pow(principalDecimals))
            .toFixed(0)
        );

        await mockAugustus.expectSwap(
          dai.address,
          dai.address,
          amountDAItoSwap,
          amountDAItoSwap,
          expectedDaiAmount
        );

        const smallExpectedDaiAmount = expectedDaiAmount.div(2);

        const aDaiData = await pool.getReserveData(dai.address);
        const aDai = await getContract<AToken>(eContractid.AToken, aDaiData.aTokenAddress);

        // User will swap liquidity aDai to aDai
        await aDai.connect(user).approve(paraswapLiquiditySwapAdapter.address, flashloanTotal);

        const mockAugustusCalldata = mockAugustus.interface.encodeFunctionData('swap', [
          dai.address,
          dai.address,
          amountDAItoSwap,
          expectedDaiAmount,
        ]);

        const params = buildParaSwapLiquiditySwapParams(
          dai.address,
          smallExpectedDaiAmount,
          0,
          mockAugustusCalldata,
          mockAugustus.address,
          0,
          0,
          0,
          '0x0000000000000000000000000000000000000000000000000000000000000000',
          '0x0000000000000000000000000000000000000000000000000000000000000000'
        );

        await expect(
          pool
            .connect(user)
            .flashLoan(
              paraswapLiquiditySwapAdapter.address,
              [dai.address],
              [amountDAItoSwap],
              [0],
              userAddress,
              params,
              0
            )
        ).to.be.revertedWith('MIN_AMOUNT_EXCEEDS_MAX_SLIPPAGE');
      });

      it('should correctly swap tokens all the balance', async () => {
        const { users, wbch, oracle, dai, aDai, aWBCH, pool, paraswapLiquiditySwapAdapter } =
          testEnv;
        const user = users[0].signer;
        const userAddress = users[0].address;

        const amountWETHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

        const daiPrice = await oracle.getAssetPrice(dai.address);
        const expectedDaiAmount = await convertToCurrencyDecimals(
          dai.address,
          new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
        );

        await mockAugustus.expectSwap(
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          amountWETHtoSwap,
          expectedDaiAmount
        );

        const bigAmountToSwap = parseEther('11');
        const flashloanPremium = bigAmountToSwap.mul(9).div(10000);
        const flashloanTotal = bigAmountToSwap.add(flashloanPremium);

        // Remove other balance
        await aWBCH
          .connect(user)
          .transfer(users[1].address, parseEther('90').sub(flashloanPremium));

        // User will swap liquidity aEth to aDai
        const userAEthBalanceBefore = await aWBCH.balanceOf(userAddress);
        expect(userAEthBalanceBefore).to.be.eq(amountWETHtoSwap.add(flashloanPremium));

        await aWBCH.connect(user).approve(paraswapLiquiditySwapAdapter.address, flashloanTotal);

        const mockAugustusCalldata = mockAugustus.interface.encodeFunctionData('swap', [
          wbch.address,
          dai.address,
          bigAmountToSwap,
          expectedDaiAmount,
        ]);

        const params = buildParaSwapLiquiditySwapParams(
          dai.address,
          expectedDaiAmount,
          4 + 2 * 32,
          mockAugustusCalldata,
          mockAugustus.address,
          0,
          0,
          0,
          '0x0000000000000000000000000000000000000000000000000000000000000000',
          '0x0000000000000000000000000000000000000000000000000000000000000000'
        );

        await expect(
          pool
            .connect(user)
            .flashLoan(
              paraswapLiquiditySwapAdapter.address,
              [wbch.address],
              [bigAmountToSwap],
              [0],
              userAddress,
              params,
              0
            )
        )
          .to.emit(paraswapLiquiditySwapAdapter, 'Swapped')
          .withArgs(wbch.address, dai.address, amountWETHtoSwap, expectedDaiAmount);

        const adapterWbchBalance = await wbch.balanceOf(paraswapLiquiditySwapAdapter.address);
        const adapterDaiBalance = await dai.balanceOf(paraswapLiquiditySwapAdapter.address);
        const userADaiBalance = await aDai.balanceOf(userAddress);
        const userAEthBalance = await aWBCH.balanceOf(userAddress);

        expect(adapterWbchBalance).to.be.eq(Zero);
        expect(adapterDaiBalance).to.be.eq(Zero);
        expect(userADaiBalance).to.be.eq(expectedDaiAmount);
        expect(userAEthBalance).to.be.eq(Zero);
      });

      it('should correctly swap tokens all the balance using permit', async () => {
        const { users, wbch, oracle, dai, aDai, aWBCH, pool, paraswapLiquiditySwapAdapter } =
          testEnv;
        const user = users[0].signer;
        const userAddress = users[0].address;

        const amountWETHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

        const daiPrice = await oracle.getAssetPrice(dai.address);
        const expectedDaiAmount = await convertToCurrencyDecimals(
          dai.address,
          new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
        );

        await mockAugustus.expectSwap(
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          amountWETHtoSwap,
          expectedDaiAmount
        );

        const bigAmountToSwap = parseEther('11');
        const flashloanPremium = bigAmountToSwap.mul(9).div(10000);
        const flashloanTotal = bigAmountToSwap.add(flashloanPremium);

        // Remove other balance
        await aWBCH
          .connect(user)
          .transfer(users[1].address, parseEther('90').sub(flashloanPremium));

        // User will swap liquidity aEth to aDai
        const userAEthBalanceBefore = await aWBCH.balanceOf(userAddress);
        expect(userAEthBalanceBefore).to.be.eq(amountWETHtoSwap.add(flashloanPremium));

        const chainId = DRE.network.config.chainId || BUIDLEREVM_CHAINID;
        const deadline = MAX_UINT_AMOUNT;
        const nonce = (await aWBCH._nonces(userAddress)).toNumber();
        const msgParams = buildPermitParams(
          chainId,
          aWBCH.address,
          '1',
          await aWBCH.name(),
          userAddress,
          paraswapLiquiditySwapAdapter.address,
          nonce,
          deadline,
          flashloanTotal.toString()
        );

        const ownerPrivateKey = require('../../test-wallets.js').accounts[1].secretKey;
        if (!ownerPrivateKey) {
          throw new Error('INVALID_OWNER_PK');
        }

        const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, msgParams);

        const mockAugustusCalldata = mockAugustus.interface.encodeFunctionData('swap', [
          wbch.address,
          dai.address,
          bigAmountToSwap,
          expectedDaiAmount,
        ]);

        const params = buildParaSwapLiquiditySwapParams(
          dai.address,
          expectedDaiAmount,
          4 + 2 * 32,
          mockAugustusCalldata,
          mockAugustus.address,
          flashloanTotal,
          deadline,
          v,
          r,
          s
        );

        await expect(
          pool
            .connect(user)
            .flashLoan(
              paraswapLiquiditySwapAdapter.address,
              [wbch.address],
              [bigAmountToSwap],
              [0],
              userAddress,
              params,
              0
            )
        )
          .to.emit(paraswapLiquiditySwapAdapter, 'Swapped')
          .withArgs(wbch.address, dai.address, amountWETHtoSwap, expectedDaiAmount);

        const adapterWbchBalance = await wbch.balanceOf(paraswapLiquiditySwapAdapter.address);
        const adapterDaiBalance = await dai.balanceOf(paraswapLiquiditySwapAdapter.address);
        const userADaiBalance = await aDai.balanceOf(userAddress);
        const userAEthBalance = await aWBCH.balanceOf(userAddress);

        expect(adapterWbchBalance).to.be.eq(Zero);
        expect(adapterDaiBalance).to.be.eq(Zero);
        expect(userADaiBalance).to.be.eq(expectedDaiAmount);
        expect(userAEthBalance).to.be.eq(Zero);
      });

      it('should revert trying to swap all the balance with insufficient amount', async () => {
        const { users, wbch, oracle, dai, aWBCH, pool, paraswapLiquiditySwapAdapter } = testEnv;
        const user = users[0].signer;
        const userAddress = users[0].address;

        const amountWETHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

        const daiPrice = await oracle.getAssetPrice(dai.address);
        const expectedDaiAmount = await convertToCurrencyDecimals(
          dai.address,
          new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
        );

        await mockAugustus.expectSwap(
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          amountWETHtoSwap,
          expectedDaiAmount
        );

        const smallAmountToSwap = parseEther('9');
        const flashloanPremium = smallAmountToSwap.mul(9).div(10000);
        const flashloanTotal = smallAmountToSwap.add(flashloanPremium);

        // Remove other balance
        await aWBCH
          .connect(user)
          .transfer(users[1].address, parseEther('90').sub(flashloanPremium));

        // User will swap liquidity aEth to aDai
        const userAEthBalanceBefore = await aWBCH.balanceOf(userAddress);
        expect(userAEthBalanceBefore).to.be.eq(amountWETHtoSwap.add(flashloanPremium));

        await aWBCH.connect(user).approve(paraswapLiquiditySwapAdapter.address, flashloanTotal);

        const mockAugustusCalldata = mockAugustus.interface.encodeFunctionData('swap', [
          wbch.address,
          dai.address,
          smallAmountToSwap,
          expectedDaiAmount,
        ]);

        const params = buildParaSwapLiquiditySwapParams(
          dai.address,
          expectedDaiAmount,
          4 + 2 * 32,
          mockAugustusCalldata,
          mockAugustus.address,
          0,
          0,
          0,
          '0x0000000000000000000000000000000000000000000000000000000000000000',
          '0x0000000000000000000000000000000000000000000000000000000000000000'
        );

        await expect(
          pool
            .connect(user)
            .flashLoan(
              paraswapLiquiditySwapAdapter.address,
              [wbch.address],
              [smallAmountToSwap],
              [0],
              userAddress,
              params,
              0
            )
        ).to.be.revertedWith('INSUFFICIENT_AMOUNT_TO_SWAP');
      });

      it('should revert trying to swap more than balance', async () => {
        const { users, wbch, oracle, dai, aWBCH, pool, paraswapLiquiditySwapAdapter } = testEnv;
        const user = users[0].signer;
        const userAddress = users[0].address;

        const amountWETHtoSwap = await convertToCurrencyDecimals(wbch.address, '101');

        const daiPrice = await oracle.getAssetPrice(dai.address);
        const expectedDaiAmount = await convertToCurrencyDecimals(
          dai.address,
          new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
        );

        await mockAugustus.expectSwap(
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          amountWETHtoSwap,
          expectedDaiAmount
        );

        const flashloanPremium = amountWETHtoSwap.mul(9).div(10000);
        const flashloanTotal = amountWETHtoSwap.add(flashloanPremium);

        // User will swap liquidity aEth to aDai
        await aWBCH.connect(user).approve(paraswapLiquiditySwapAdapter.address, flashloanTotal);

        const mockAugustusCalldata = mockAugustus.interface.encodeFunctionData('swap', [
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          expectedDaiAmount,
        ]);

        const params = buildParaSwapLiquiditySwapParams(
          dai.address,
          expectedDaiAmount,
          0,
          mockAugustusCalldata,
          mockAugustus.address,
          0,
          0,
          0,
          '0x0000000000000000000000000000000000000000000000000000000000000000',
          '0x0000000000000000000000000000000000000000000000000000000000000000'
        );

        await expect(
          pool
            .connect(user)
            .flashLoan(
              paraswapLiquiditySwapAdapter.address,
              [wbch.address],
              [amountWETHtoSwap],
              [0],
              userAddress,
              params,
              0
            )
        ).to.be.revertedWith('INSUFFICIENT_ATOKEN_BALANCE');
      });

      it('should not touch any token balance already in the adapter', async () => {
        const { users, wbch, oracle, dai, aDai, aWBCH, pool, paraswapLiquiditySwapAdapter } =
          testEnv;
        const user = users[0].signer;
        const userAddress = users[0].address;

        // Put token balances in the adapter
        const adapterWbchBalanceBefore = parseEther('123');
        await wbch.mint(adapterWbchBalanceBefore);
        await wbch.transfer(paraswapLiquiditySwapAdapter.address, adapterWbchBalanceBefore);
        const adapterDaiBalanceBefore = parseEther('234');
        await dai.mint(adapterDaiBalanceBefore);
        await dai.transfer(paraswapLiquiditySwapAdapter.address, adapterDaiBalanceBefore);

        const amountWETHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

        const daiPrice = await oracle.getAssetPrice(dai.address);
        const expectedDaiAmount = await convertToCurrencyDecimals(
          dai.address,
          new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
        );

        await mockAugustus.expectSwap(
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          amountWETHtoSwap,
          expectedDaiAmount
        );

        const flashloanPremium = amountWETHtoSwap.mul(9).div(10000);
        const flashloanTotal = amountWETHtoSwap.add(flashloanPremium);

        // User will swap liquidity aEth to aDai
        const userAEthBalanceBefore = await aWBCH.balanceOf(userAddress);
        await aWBCH.connect(user).approve(paraswapLiquiditySwapAdapter.address, flashloanTotal);

        const mockAugustusCalldata = mockAugustus.interface.encodeFunctionData('swap', [
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          expectedDaiAmount,
        ]);

        const params = buildParaSwapLiquiditySwapParams(
          dai.address,
          expectedDaiAmount,
          0,
          mockAugustusCalldata,
          mockAugustus.address,
          0,
          0,
          0,
          '0x0000000000000000000000000000000000000000000000000000000000000000',
          '0x0000000000000000000000000000000000000000000000000000000000000000'
        );

        await expect(
          pool
            .connect(user)
            .flashLoan(
              paraswapLiquiditySwapAdapter.address,
              [wbch.address],
              [amountWETHtoSwap],
              [0],
              userAddress,
              params,
              0
            )
        )
          .to.emit(paraswapLiquiditySwapAdapter, 'Swapped')
          .withArgs(wbch.address, dai.address, amountWETHtoSwap, expectedDaiAmount);

        const adapterWbchBalance = await wbch.balanceOf(paraswapLiquiditySwapAdapter.address);
        const adapterDaiBalance = await dai.balanceOf(paraswapLiquiditySwapAdapter.address);
        const userADaiBalance = await aDai.balanceOf(userAddress);
        const userAEthBalance = await aWBCH.balanceOf(userAddress);

        // N.B. will get some portion of flashloan premium back from the pool
        expect(adapterWbchBalance).to.be.eq(adapterWbchBalanceBefore);
        expect(adapterDaiBalance).to.be.eq(adapterDaiBalanceBefore);
        expect(userADaiBalance).to.be.eq(expectedDaiAmount);
        expect(userAEthBalance).to.be.gte(userAEthBalanceBefore.sub(flashloanTotal));
        expect(userAEthBalance).to.be.lte(userAEthBalanceBefore.sub(amountWETHtoSwap));
      });
    });

    describe('executeOperation with borrowing', () => {
      beforeEach(async () => {
        const { users, wbch, dai, pool, deployer } = testEnv;
        const userAddress = users[0].address;
        const borrower = users[1].signer;
        const borrowerAddress = users[1].address;

        // Provide liquidity
        await dai.mint(parseEther('20000'));
        await dai.approve(pool.address, parseEther('20000'));
        await pool.deposit(dai.address, parseEther('20000'), deployer.address, 0);

        await wbch.mint(parseEther('10000'));
        await wbch.approve(pool.address, parseEther('10000'));
        await pool.deposit(wbch.address, parseEther('10000'), deployer.address, 0);

        // Make a deposit for user
        await wbch.mint(parseEther('100'));
        await wbch.approve(pool.address, parseEther('100'));
        await pool.deposit(wbch.address, parseEther('100'), userAddress, 0);

        // Add borrowing
        const collateralAmount = parseEther('10000000');
        await dai.mint(collateralAmount);
        await dai.approve(pool.address, collateralAmount);
        await pool.deposit(dai.address, collateralAmount, borrowerAddress, 0);
        await pool
          .connect(borrower)
          .borrow(wbch.address, parseEther('5000'), 2, 0, borrowerAddress);
      });

      it('should correctly swap tokens and deposit the out tokens in the pool', async () => {
        const { users, wbch, oracle, dai, aDai, aWBCH, pool, paraswapLiquiditySwapAdapter } =
          testEnv;
        const user = users[0].signer;
        const userAddress = users[0].address;

        const amountWETHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

        const daiPrice = await oracle.getAssetPrice(dai.address);
        const expectedDaiAmount = await convertToCurrencyDecimals(
          dai.address,
          new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
        );

        await mockAugustus.expectSwap(
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          amountWETHtoSwap,
          expectedDaiAmount
        );

        const flashloanPremium = amountWETHtoSwap.mul(9).div(10000);
        const flashloanTotal = amountWETHtoSwap.add(flashloanPremium);

        // User will swap liquidity aEth to aDai
        const userAEthBalanceBefore = await aWBCH.balanceOf(userAddress);
        await aWBCH.connect(user).approve(paraswapLiquiditySwapAdapter.address, flashloanTotal);

        const mockAugustusCalldata = mockAugustus.interface.encodeFunctionData('swap', [
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          expectedDaiAmount,
        ]);

        const params = buildParaSwapLiquiditySwapParams(
          dai.address,
          expectedDaiAmount,
          0,
          mockAugustusCalldata,
          mockAugustus.address,
          0,
          0,
          0,
          '0x0000000000000000000000000000000000000000000000000000000000000000',
          '0x0000000000000000000000000000000000000000000000000000000000000000'
        );

        await expect(
          pool
            .connect(user)
            .flashLoan(
              paraswapLiquiditySwapAdapter.address,
              [wbch.address],
              [amountWETHtoSwap],
              [0],
              userAddress,
              params,
              0
            )
        )
          .to.emit(paraswapLiquiditySwapAdapter, 'Swapped')
          .withArgs(wbch.address, dai.address, amountWETHtoSwap, expectedDaiAmount);

        const adapterWbchBalance = await wbch.balanceOf(paraswapLiquiditySwapAdapter.address);
        const adapterDaiBalance = await dai.balanceOf(paraswapLiquiditySwapAdapter.address);
        const userADaiBalance = await aDai.balanceOf(userAddress);
        const userAEthBalance = await aWBCH.balanceOf(userAddress);

        // N.B. will get some portion of flashloan premium back from the pool
        expect(adapterWbchBalance).to.be.eq(Zero);
        expect(adapterDaiBalance).to.be.eq(Zero);
        expect(userADaiBalance).to.be.eq(expectedDaiAmount);
        expect(userAEthBalance).to.be.gt(userAEthBalanceBefore.sub(flashloanTotal));
        expect(userAEthBalance).to.be.lt(
          userAEthBalanceBefore.mul(10001).div(10000).sub(amountWETHtoSwap)
        );
      });

      it('should correctly swap tokens using permit', async () => {
        const { users, wbch, oracle, dai, aDai, aWBCH, pool, paraswapLiquiditySwapAdapter } =
          testEnv;
        const user = users[0].signer;
        const userAddress = users[0].address;

        const amountWETHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

        const daiPrice = await oracle.getAssetPrice(dai.address);
        const expectedDaiAmount = await convertToCurrencyDecimals(
          dai.address,
          new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
        );

        await mockAugustus.expectSwap(
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          amountWETHtoSwap,
          expectedDaiAmount
        );

        const flashloanPremium = amountWETHtoSwap.mul(9).div(10000);
        const flashloanTotal = amountWETHtoSwap.add(flashloanPremium);

        // User will swap liquidity aEth to aDai
        const userAEthBalanceBefore = await aWBCH.balanceOf(userAddress);

        const chainId = DRE.network.config.chainId || BUIDLEREVM_CHAINID;
        const deadline = MAX_UINT_AMOUNT;
        const nonce = (await aWBCH._nonces(userAddress)).toNumber();
        const msgParams = buildPermitParams(
          chainId,
          aWBCH.address,
          '1',
          await aWBCH.name(),
          userAddress,
          paraswapLiquiditySwapAdapter.address,
          nonce,
          deadline,
          flashloanTotal.toString()
        );

        const ownerPrivateKey = require('../../test-wallets.js').accounts[1].secretKey;
        if (!ownerPrivateKey) {
          throw new Error('INVALID_OWNER_PK');
        }

        const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, msgParams);

        const mockAugustusCalldata = mockAugustus.interface.encodeFunctionData('swap', [
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          expectedDaiAmount,
        ]);

        const params = buildParaSwapLiquiditySwapParams(
          dai.address,
          expectedDaiAmount,
          0,
          mockAugustusCalldata,
          mockAugustus.address,
          flashloanTotal,
          deadline,
          v,
          r,
          s
        );

        await expect(
          pool
            .connect(user)
            .flashLoan(
              paraswapLiquiditySwapAdapter.address,
              [wbch.address],
              [amountWETHtoSwap],
              [0],
              userAddress,
              params,
              0
            )
        )
          .to.emit(paraswapLiquiditySwapAdapter, 'Swapped')
          .withArgs(wbch.address, dai.address, amountWETHtoSwap, expectedDaiAmount);

        const adapterWbchBalance = await wbch.balanceOf(paraswapLiquiditySwapAdapter.address);
        const adapterDaiBalance = await dai.balanceOf(paraswapLiquiditySwapAdapter.address);
        const userADaiBalance = await aDai.balanceOf(userAddress);
        const userAEthBalance = await aWBCH.balanceOf(userAddress);

        // N.B. will get some portion of flashloan premium back from the pool
        expect(adapterWbchBalance).to.be.eq(Zero);
        expect(adapterDaiBalance).to.be.eq(Zero);
        expect(userADaiBalance).to.be.eq(expectedDaiAmount);
        expect(userAEthBalance).to.be.gt(userAEthBalanceBefore.sub(flashloanTotal));
        expect(userAEthBalance).to.be.lt(
          userAEthBalanceBefore.mul(10001).div(10000).sub(amountWETHtoSwap)
        );
      });

      it('should correctly swap tokens all the balance', async () => {
        const { users, wbch, oracle, dai, aDai, aWBCH, pool, paraswapLiquiditySwapAdapter } =
          testEnv;
        const user = users[0].signer;
        const userAddress = users[0].address;

        const amountWETHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

        const daiPrice = await oracle.getAssetPrice(dai.address);
        const expectedDaiAmount = await convertToCurrencyDecimals(
          dai.address,
          new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
        );

        await mockAugustus.expectSwap(
          wbch.address,
          dai.address,
          amountWETHtoSwap.add(1),
          amountWETHtoSwap.mul(10001).div(10000),
          expectedDaiAmount
        );

        const bigAmountToSwap = parseEther('11');
        const flashloanPremium = bigAmountToSwap.mul(9).div(10000);
        const flashloanTotal = bigAmountToSwap.add(flashloanPremium);

        // Remove other balance
        await aWBCH
          .connect(user)
          .transfer(users[1].address, parseEther('90').sub(flashloanPremium));

        // User will swap liquidity aEth to aDai
        await aWBCH.connect(user).approve(paraswapLiquiditySwapAdapter.address, flashloanTotal);

        const mockAugustusCalldata = mockAugustus.interface.encodeFunctionData('swap', [
          wbch.address,
          dai.address,
          bigAmountToSwap,
          expectedDaiAmount,
        ]);

        const params = buildParaSwapLiquiditySwapParams(
          dai.address,
          expectedDaiAmount,
          4 + 2 * 32,
          mockAugustusCalldata,
          mockAugustus.address,
          0,
          0,
          0,
          '0x0000000000000000000000000000000000000000000000000000000000000000',
          '0x0000000000000000000000000000000000000000000000000000000000000000'
        );

        await expect(
          pool
            .connect(user)
            .flashLoan(
              paraswapLiquiditySwapAdapter.address,
              [wbch.address],
              [bigAmountToSwap],
              [0],
              userAddress,
              params,
              0
            )
        ).to.emit(paraswapLiquiditySwapAdapter, 'Swapped');

        const adapterWbchBalance = await wbch.balanceOf(paraswapLiquiditySwapAdapter.address);
        const adapterDaiBalance = await dai.balanceOf(paraswapLiquiditySwapAdapter.address);
        const userADaiBalance = await aDai.balanceOf(userAddress);
        const userAEthBalance = await aWBCH.balanceOf(userAddress);

        expect(adapterWbchBalance).to.be.eq(Zero);
        expect(adapterDaiBalance).to.be.eq(Zero);
        expect(userADaiBalance).to.be.eq(expectedDaiAmount);
        expect(userAEthBalance).to.be.eq(Zero);
      });

      it('should correctly swap tokens all the balance using permit', async () => {
        const { users, wbch, oracle, dai, aDai, aWBCH, pool, paraswapLiquiditySwapAdapter } =
          testEnv;
        const user = users[0].signer;
        const userAddress = users[0].address;

        const amountWETHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

        const daiPrice = await oracle.getAssetPrice(dai.address);
        const expectedDaiAmount = await convertToCurrencyDecimals(
          dai.address,
          new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
        );

        await mockAugustus.expectSwap(
          wbch.address,
          dai.address,
          amountWETHtoSwap.add(1),
          amountWETHtoSwap.mul(10001).div(10000),
          expectedDaiAmount
        );

        const bigAmountToSwap = parseEther('11');
        const flashloanPremium = bigAmountToSwap.mul(9).div(10000);
        const flashloanTotal = bigAmountToSwap.add(flashloanPremium);

        // Remove other balance
        await aWBCH
          .connect(user)
          .transfer(users[1].address, parseEther('90').sub(flashloanPremium));

        // User will swap liquidity aEth to aDai
        const chainId = DRE.network.config.chainId || BUIDLEREVM_CHAINID;
        const deadline = MAX_UINT_AMOUNT;
        const nonce = (await aWBCH._nonces(userAddress)).toNumber();
        const msgParams = buildPermitParams(
          chainId,
          aWBCH.address,
          '1',
          await aWBCH.name(),
          userAddress,
          paraswapLiquiditySwapAdapter.address,
          nonce,
          deadline,
          flashloanTotal.toString()
        );

        const ownerPrivateKey = require('../../test-wallets.js').accounts[1].secretKey;
        if (!ownerPrivateKey) {
          throw new Error('INVALID_OWNER_PK');
        }

        const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, msgParams);

        const mockAugustusCalldata = mockAugustus.interface.encodeFunctionData('swap', [
          wbch.address,
          dai.address,
          bigAmountToSwap,
          expectedDaiAmount,
        ]);

        const params = buildParaSwapLiquiditySwapParams(
          dai.address,
          expectedDaiAmount,
          4 + 2 * 32,
          mockAugustusCalldata,
          mockAugustus.address,
          flashloanTotal,
          deadline,
          v,
          r,
          s
        );

        await expect(
          pool
            .connect(user)
            .flashLoan(
              paraswapLiquiditySwapAdapter.address,
              [wbch.address],
              [bigAmountToSwap],
              [0],
              userAddress,
              params,
              0
            )
        ).to.emit(paraswapLiquiditySwapAdapter, 'Swapped');

        const adapterWbchBalance = await wbch.balanceOf(paraswapLiquiditySwapAdapter.address);
        const adapterDaiBalance = await dai.balanceOf(paraswapLiquiditySwapAdapter.address);
        const userADaiBalance = await aDai.balanceOf(userAddress);
        const userAEthBalance = await aWBCH.balanceOf(userAddress);

        expect(adapterWbchBalance).to.be.eq(Zero);
        expect(adapterDaiBalance).to.be.eq(Zero);
        expect(userADaiBalance).to.be.eq(expectedDaiAmount);
        expect(userAEthBalance).to.be.eq(Zero);
      });
    });

    describe('swapAndDeposit', () => {
      beforeEach(async () => {
        const { users, wbch, dai, pool, deployer } = testEnv;
        const userAddress = users[0].address;

        // Provide liquidity
        await dai.mint(parseEther('20000'));
        await dai.approve(pool.address, parseEther('20000'));
        await pool.deposit(dai.address, parseEther('20000'), deployer.address, 0);

        await wbch.mint(parseEther('10000'));
        await wbch.approve(pool.address, parseEther('10000'));
        await pool.deposit(wbch.address, parseEther('10000'), deployer.address, 0);

        // Make a deposit for user
        await wbch.mint(parseEther('100'));
        await wbch.approve(pool.address, parseEther('100'));
        await pool.deposit(wbch.address, parseEther('100'), userAddress, 0);
      });

      it('should correctly swap tokens and deposit the out tokens in the pool', async () => {
        const { users, wbch, oracle, dai, aDai, aWBCH, paraswapLiquiditySwapAdapter } = testEnv;
        const user = users[0].signer;
        const userAddress = users[0].address;

        const amountWETHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

        const daiPrice = await oracle.getAssetPrice(dai.address);
        const expectedDaiAmount = await convertToCurrencyDecimals(
          dai.address,
          new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
        );

        await mockAugustus.expectSwap(
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          amountWETHtoSwap,
          expectedDaiAmount
        );

        // User will swap liquidity aEth to aDai
        const userAEthBalanceBefore = await aWBCH.balanceOf(userAddress);
        await aWBCH.connect(user).approve(paraswapLiquiditySwapAdapter.address, amountWETHtoSwap);

        const mockAugustusCalldata = mockAugustus.interface.encodeFunctionData('swap', [
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          expectedDaiAmount,
        ]);

        await expect(
          paraswapLiquiditySwapAdapter
            .connect(user)
            .swapAndDeposit(
              wbch.address,
              dai.address,
              amountWETHtoSwap,
              expectedDaiAmount,
              0,
              mockAugustusCalldata,
              mockAugustus.address,
              {
                amount: 0,
                deadline: 0,
                v: 0,
                r: '0x0000000000000000000000000000000000000000000000000000000000000000',
                s: '0x0000000000000000000000000000000000000000000000000000000000000000',
              }
            )
        )
          .to.emit(paraswapLiquiditySwapAdapter, 'Swapped')
          .withArgs(wbch.address, dai.address, amountWETHtoSwap, expectedDaiAmount);

        const adapterWbchBalance = await wbch.balanceOf(paraswapLiquiditySwapAdapter.address);
        const adapterDaiBalance = await dai.balanceOf(paraswapLiquiditySwapAdapter.address);
        const userADaiBalance = await aDai.balanceOf(userAddress);
        const userAEthBalance = await aWBCH.balanceOf(userAddress);

        expect(adapterWbchBalance).to.be.eq(Zero);
        expect(adapterDaiBalance).to.be.eq(Zero);
        expect(userADaiBalance).to.be.eq(expectedDaiAmount);
        expect(userAEthBalance).to.be.eq(userAEthBalanceBefore.sub(amountWETHtoSwap));
      });

      it('should correctly swap tokens using permit', async () => {
        const { users, wbch, oracle, dai, aDai, aWBCH, paraswapLiquiditySwapAdapter } = testEnv;
        const user = users[0].signer;
        const userAddress = users[0].address;

        const amountWETHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

        const daiPrice = await oracle.getAssetPrice(dai.address);
        const expectedDaiAmount = await convertToCurrencyDecimals(
          dai.address,
          new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
        );

        await mockAugustus.expectSwap(
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          amountWETHtoSwap,
          expectedDaiAmount
        );

        // User will swap liquidity aEth to aDai
        const userAEthBalanceBefore = await aWBCH.balanceOf(userAddress);

        const chainId = DRE.network.config.chainId || BUIDLEREVM_CHAINID;
        const deadline = MAX_UINT_AMOUNT;
        const nonce = (await aWBCH._nonces(userAddress)).toNumber();
        const msgParams = buildPermitParams(
          chainId,
          aWBCH.address,
          '1',
          await aWBCH.name(),
          userAddress,
          paraswapLiquiditySwapAdapter.address,
          nonce,
          deadline,
          amountWETHtoSwap.toString()
        );

        const ownerPrivateKey = require('../../test-wallets.js').accounts[1].secretKey;
        if (!ownerPrivateKey) {
          throw new Error('INVALID_OWNER_PK');
        }

        const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, msgParams);

        const mockAugustusCalldata = mockAugustus.interface.encodeFunctionData('swap', [
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          expectedDaiAmount,
        ]);

        await expect(
          paraswapLiquiditySwapAdapter
            .connect(user)
            .swapAndDeposit(
              wbch.address,
              dai.address,
              amountWETHtoSwap,
              expectedDaiAmount,
              0,
              mockAugustusCalldata,
              mockAugustus.address,
              {
                amount: amountWETHtoSwap,
                deadline,
                v,
                r,
                s,
              }
            )
        )
          .to.emit(paraswapLiquiditySwapAdapter, 'Swapped')
          .withArgs(wbch.address, dai.address, amountWETHtoSwap, expectedDaiAmount);

        const adapterWbchBalance = await wbch.balanceOf(paraswapLiquiditySwapAdapter.address);
        const adapterDaiBalance = await dai.balanceOf(paraswapLiquiditySwapAdapter.address);
        const userADaiBalance = await aDai.balanceOf(userAddress);
        const userAEthBalance = await aWBCH.balanceOf(userAddress);

        expect(adapterWbchBalance).to.be.eq(Zero);
        expect(adapterDaiBalance).to.be.eq(Zero);
        expect(userADaiBalance).to.be.eq(expectedDaiAmount);
        expect(userAEthBalance).to.be.eq(userAEthBalanceBefore.sub(amountWETHtoSwap));
      });

      it('should revert when trying to swap more than balance', async () => {
        const { users, wbch, oracle, dai, aWBCH, paraswapLiquiditySwapAdapter } = testEnv;
        const user = users[0].signer;
        const userAddress = users[0].address;

        const amountWETHtoSwap = (await convertToCurrencyDecimals(wbch.address, '100')).add(1);

        const daiPrice = await oracle.getAssetPrice(dai.address);
        const expectedDaiAmount = await convertToCurrencyDecimals(
          dai.address,
          new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
        );

        await mockAugustus.expectSwap(
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          amountWETHtoSwap,
          expectedDaiAmount
        );

        // User will swap liquidity aEth to aDai
        await aWBCH.connect(user).approve(paraswapLiquiditySwapAdapter.address, amountWETHtoSwap);

        const mockAugustusCalldata = mockAugustus.interface.encodeFunctionData('swap', [
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          expectedDaiAmount,
        ]);

        await expect(
          paraswapLiquiditySwapAdapter
            .connect(user)
            .swapAndDeposit(
              wbch.address,
              dai.address,
              amountWETHtoSwap,
              expectedDaiAmount,
              0,
              mockAugustusCalldata,
              mockAugustus.address,
              {
                amount: 0,
                deadline: 0,
                v: 0,
                r: '0x0000000000000000000000000000000000000000000000000000000000000000',
                s: '0x0000000000000000000000000000000000000000000000000000000000000000',
              }
            )
        ).to.be.revertedWith('SafeERC20: low-level call failed');
      });

      it('should revert when trying to swap more than allowance', async () => {
        const { users, wbch, oracle, dai, aWBCH, paraswapLiquiditySwapAdapter } = testEnv;
        const user = users[0].signer;
        const userAddress = users[0].address;

        const amountWETHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

        const daiPrice = await oracle.getAssetPrice(dai.address);
        const expectedDaiAmount = await convertToCurrencyDecimals(
          dai.address,
          new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
        );

        await mockAugustus.expectSwap(
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          amountWETHtoSwap,
          expectedDaiAmount
        );

        // User will swap liquidity aEth to aDai
        await aWBCH
          .connect(user)
          .approve(paraswapLiquiditySwapAdapter.address, amountWETHtoSwap.sub(1));

        const mockAugustusCalldata = mockAugustus.interface.encodeFunctionData('swap', [
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          expectedDaiAmount,
        ]);

        await expect(
          paraswapLiquiditySwapAdapter
            .connect(user)
            .swapAndDeposit(
              wbch.address,
              dai.address,
              amountWETHtoSwap,
              expectedDaiAmount,
              0,
              mockAugustusCalldata,
              mockAugustus.address,
              {
                amount: 0,
                deadline: 0,
                v: 0,
                r: '0x0000000000000000000000000000000000000000000000000000000000000000',
                s: '0x0000000000000000000000000000000000000000000000000000000000000000',
              }
            )
        ).to.be.revertedWith('SafeERC20: low-level call failed');
      });

      it('should revert when min amount to receive exceeds the max slippage amount', async () => {
        const { users, wbch, oracle, dai, aWBCH, paraswapLiquiditySwapAdapter } = testEnv;
        const user = users[0].signer;

        const amountWETHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

        const daiPrice = await oracle.getAssetPrice(dai.address);
        const expectedDaiAmount = await convertToCurrencyDecimals(
          dai.address,
          new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
        );

        await mockAugustus.expectSwap(
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          amountWETHtoSwap,
          expectedDaiAmount
        );

        const smallExpectedDaiAmount = expectedDaiAmount.div(2);

        // User will swap liquidity aEth to aDai
        await aWBCH.connect(user).approve(paraswapLiquiditySwapAdapter.address, amountWETHtoSwap);

        const mockAugustusCalldata = mockAugustus.interface.encodeFunctionData('swap', [
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          expectedDaiAmount,
        ]);

        await expect(
          paraswapLiquiditySwapAdapter
            .connect(user)
            .swapAndDeposit(
              wbch.address,
              dai.address,
              amountWETHtoSwap,
              smallExpectedDaiAmount,
              0,
              mockAugustusCalldata,
              mockAugustus.address,
              {
                amount: 0,
                deadline: 0,
                v: 0,
                r: '0x0000000000000000000000000000000000000000000000000000000000000000',
                s: '0x0000000000000000000000000000000000000000000000000000000000000000',
              }
            )
        ).to.be.revertedWith('MIN_AMOUNT_EXCEEDS_MAX_SLIPPAGE');
      });

      it('should revert if wrong address used for Augustus', async () => {
        const { users, wbch, oracle, dai, aWBCH, paraswapLiquiditySwapAdapter } = testEnv;
        const user = users[0].signer;
        const userAddress = users[0].address;

        const amountWETHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

        const daiPrice = await oracle.getAssetPrice(dai.address);
        const expectedDaiAmount = await convertToCurrencyDecimals(
          dai.address,
          new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
        );

        await mockAugustus.expectSwap(
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          amountWETHtoSwap,
          expectedDaiAmount
        );

        // User will swap liquidity aEth to aDai
        await aWBCH.connect(user).approve(paraswapLiquiditySwapAdapter.address, amountWETHtoSwap);

        const mockAugustusCalldata = mockAugustus.interface.encodeFunctionData('swap', [
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          expectedDaiAmount,
        ]);

        await expect(
          paraswapLiquiditySwapAdapter.connect(user).swapAndDeposit(
            wbch.address,
            dai.address,
            amountWETHtoSwap,
            expectedDaiAmount,
            0,
            mockAugustusCalldata,
            oracle.address, // using arbitrary contract instead of mock Augustus
            {
              amount: 0,
              deadline: 0,
              v: 0,
              r: '0x0000000000000000000000000000000000000000000000000000000000000000',
              s: '0x0000000000000000000000000000000000000000000000000000000000000000',
            }
          )
        ).to.be.revertedWith('INVALID_AUGUSTUS');
      });

      it('should bubble up errors from Augustus', async () => {
        const { users, wbch, oracle, dai, aWBCH, paraswapLiquiditySwapAdapter } = testEnv;
        const user = users[0].signer;

        const amountWETHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

        const daiPrice = await oracle.getAssetPrice(dai.address);
        const expectedDaiAmount = await convertToCurrencyDecimals(
          dai.address,
          new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
        );

        await mockAugustus.expectSwap(
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          amountWETHtoSwap,
          expectedDaiAmount
        );

        // User will swap liquidity aEth to aDai
        await aWBCH.connect(user).approve(paraswapLiquiditySwapAdapter.address, amountWETHtoSwap);

        // Add 1 to expected amount so it will fail
        const mockAugustusCalldata = mockAugustus.interface.encodeFunctionData('swap', [
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          expectedDaiAmount.add(1),
        ]);

        await expect(
          paraswapLiquiditySwapAdapter
            .connect(user)
            .swapAndDeposit(
              wbch.address,
              dai.address,
              amountWETHtoSwap,
              expectedDaiAmount,
              0,
              mockAugustusCalldata,
              mockAugustus.address,
              {
                amount: 0,
                deadline: 0,
                v: 0,
                r: '0x0000000000000000000000000000000000000000000000000000000000000000',
                s: '0x0000000000000000000000000000000000000000000000000000000000000000',
              }
            )
        ).to.be.revertedWith('Received amount of tokens are less than expected');
      });

      it('should revert if Augustus swaps for less than minimum to receive', async () => {
        const { users, wbch, oracle, dai, aWBCH, paraswapLiquiditySwapAdapter } = testEnv;
        const user = users[0].signer;
        const userAddress = users[0].address;

        const amountWETHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

        const daiPrice = await oracle.getAssetPrice(dai.address);
        const expectedDaiAmount = await convertToCurrencyDecimals(
          dai.address,
          new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
        );
        const actualDaiAmount = expectedDaiAmount.sub(1);

        await mockAugustus.expectSwap(
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          amountWETHtoSwap,
          actualDaiAmount
        );

        // User will swap liquidity aEth to aDai
        await aWBCH.connect(user).approve(paraswapLiquiditySwapAdapter.address, amountWETHtoSwap);

        const mockAugustusCalldata = mockAugustus.interface.encodeFunctionData('swap', [
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          actualDaiAmount,
        ]);

        await expect(
          paraswapLiquiditySwapAdapter
            .connect(user)
            .swapAndDeposit(
              wbch.address,
              dai.address,
              amountWETHtoSwap,
              expectedDaiAmount,
              0,
              mockAugustusCalldata,
              mockAugustus.address,
              {
                amount: 0,
                deadline: 0,
                v: 0,
                r: '0x0000000000000000000000000000000000000000000000000000000000000000',
                s: '0x0000000000000000000000000000000000000000000000000000000000000000',
              }
            )
        ).to.be.revertedWith('INSUFFICIENT_AMOUNT_RECEIVED');
      });

      it("should revert if Augustus doesn't swap correct amount", async () => {
        const { users, wbch, oracle, dai, aWBCH, paraswapLiquiditySwapAdapter } = testEnv;
        const user = users[0].signer;
        const userAddress = users[0].address;

        const amountWETHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

        const daiPrice = await oracle.getAssetPrice(dai.address);
        const expectedDaiAmount = await convertToCurrencyDecimals(
          dai.address,
          new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
        );

        const augustusSwapAmount = amountWETHtoSwap.sub(1);

        await mockAugustus.expectSwap(
          wbch.address,
          dai.address,
          augustusSwapAmount,
          augustusSwapAmount,
          expectedDaiAmount
        );

        // User will swap liquidity aEth to aDai
        await aWBCH.connect(user).approve(paraswapLiquiditySwapAdapter.address, amountWETHtoSwap);

        const mockAugustusCalldata = mockAugustus.interface.encodeFunctionData('swap', [
          wbch.address,
          dai.address,
          augustusSwapAmount,
          expectedDaiAmount,
        ]);

        await expect(
          paraswapLiquiditySwapAdapter
            .connect(user)
            .swapAndDeposit(
              wbch.address,
              dai.address,
              amountWETHtoSwap,
              expectedDaiAmount,
              0,
              mockAugustusCalldata,
              mockAugustus.address,
              {
                amount: 0,
                deadline: 0,
                v: 0,
                r: '0x0000000000000000000000000000000000000000000000000000000000000000',
                s: '0x0000000000000000000000000000000000000000000000000000000000000000',
              }
            )
        ).to.be.revertedWith('WRONG_BALANCE_AFTER_SWAP');
      });

      it('should correctly swap all the balance when using a bigger amount', async () => {
        const { users, wbch, oracle, dai, aDai, aWBCH, paraswapLiquiditySwapAdapter } = testEnv;
        const user = users[0].signer;
        const userAddress = users[0].address;

        const amountWETHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

        const daiPrice = await oracle.getAssetPrice(dai.address);
        const expectedDaiAmount = await convertToCurrencyDecimals(
          dai.address,
          new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
        );

        await mockAugustus.expectSwap(
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          amountWETHtoSwap,
          expectedDaiAmount
        );

        // Remove other balance
        await aWBCH.connect(user).transfer(users[1].address, parseEther('90'));

        // User will swap liquidity aEth to aDai
        const userAEthBalanceBefore = await aWBCH.balanceOf(userAddress);
        expect(userAEthBalanceBefore).to.be.eq(amountWETHtoSwap);

        const bigAmountToSwap = parseEther('11');
        await aWBCH.connect(user).approve(paraswapLiquiditySwapAdapter.address, bigAmountToSwap);

        const mockAugustusCalldata = mockAugustus.interface.encodeFunctionData('swap', [
          wbch.address,
          dai.address,
          bigAmountToSwap,
          expectedDaiAmount,
        ]);

        await expect(
          paraswapLiquiditySwapAdapter
            .connect(user)
            .swapAndDeposit(
              wbch.address,
              dai.address,
              bigAmountToSwap,
              expectedDaiAmount,
              4 + 2 * 32,
              mockAugustusCalldata,
              mockAugustus.address,
              {
                amount: 0,
                deadline: 0,
                v: 0,
                r: '0x0000000000000000000000000000000000000000000000000000000000000000',
                s: '0x0000000000000000000000000000000000000000000000000000000000000000',
              }
            )
        )
          .to.emit(paraswapLiquiditySwapAdapter, 'Swapped')
          .withArgs(wbch.address, dai.address, amountWETHtoSwap, expectedDaiAmount);

        const adapterWbchBalance = await wbch.balanceOf(paraswapLiquiditySwapAdapter.address);
        const adapterDaiBalance = await dai.balanceOf(paraswapLiquiditySwapAdapter.address);
        const userADaiBalance = await aDai.balanceOf(userAddress);
        const userAEthBalance = await aWBCH.balanceOf(userAddress);

        expect(adapterWbchBalance).to.be.eq(Zero);
        expect(adapterDaiBalance).to.be.eq(Zero);
        expect(userADaiBalance).to.be.eq(expectedDaiAmount);
        expect(userAEthBalance).to.be.eq(Zero);
      });

      it('should correctly swap all the balance when using permit', async () => {
        const { users, wbch, oracle, dai, aDai, aWBCH, paraswapLiquiditySwapAdapter } = testEnv;
        const user = users[0].signer;
        const userAddress = users[0].address;

        const amountWETHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

        const daiPrice = await oracle.getAssetPrice(dai.address);
        const expectedDaiAmount = await convertToCurrencyDecimals(
          dai.address,
          new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
        );

        await mockAugustus.expectSwap(
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          amountWETHtoSwap,
          expectedDaiAmount
        );

        // Remove other balance
        await aWBCH.connect(user).transfer(users[1].address, parseEther('90'));

        // User will swap liquidity aEth to aDai
        const userAEthBalanceBefore = await aWBCH.balanceOf(userAddress);
        expect(userAEthBalanceBefore).to.be.eq(amountWETHtoSwap);

        const bigAmountToSwap = parseEther('11');

        const chainId = DRE.network.config.chainId || BUIDLEREVM_CHAINID;
        const deadline = MAX_UINT_AMOUNT;
        const nonce = (await aWBCH._nonces(userAddress)).toNumber();
        const msgParams = buildPermitParams(
          chainId,
          aWBCH.address,
          '1',
          await aWBCH.name(),
          userAddress,
          paraswapLiquiditySwapAdapter.address,
          nonce,
          deadline,
          bigAmountToSwap.toString()
        );

        const ownerPrivateKey = require('../../test-wallets.js').accounts[1].secretKey;
        if (!ownerPrivateKey) {
          throw new Error('INVALID_OWNER_PK');
        }

        const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, msgParams);

        const mockAugustusCalldata = mockAugustus.interface.encodeFunctionData('swap', [
          wbch.address,
          dai.address,
          bigAmountToSwap,
          expectedDaiAmount,
        ]);

        await expect(
          paraswapLiquiditySwapAdapter
            .connect(user)
            .swapAndDeposit(
              wbch.address,
              dai.address,
              bigAmountToSwap,
              expectedDaiAmount,
              4 + 2 * 32,
              mockAugustusCalldata,
              mockAugustus.address,
              {
                amount: bigAmountToSwap,
                deadline,
                v,
                r,
                s,
              }
            )
        )
          .to.emit(paraswapLiquiditySwapAdapter, 'Swapped')
          .withArgs(wbch.address, dai.address, amountWETHtoSwap, expectedDaiAmount);

        const adapterWbchBalance = await wbch.balanceOf(paraswapLiquiditySwapAdapter.address);
        const adapterDaiBalance = await dai.balanceOf(paraswapLiquiditySwapAdapter.address);
        const userADaiBalance = await aDai.balanceOf(userAddress);
        const userAEthBalance = await aWBCH.balanceOf(userAddress);

        expect(adapterWbchBalance).to.be.eq(Zero);
        expect(adapterDaiBalance).to.be.eq(Zero);
        expect(userADaiBalance).to.be.eq(expectedDaiAmount);
        expect(userAEthBalance).to.be.eq(Zero);
      });

      it('should revert trying to swap all the balance when using a smaller amount', async () => {
        const { users, wbch, oracle, dai, aWBCH, paraswapLiquiditySwapAdapter } = testEnv;
        const user = users[0].signer;
        const userAddress = users[0].address;

        const amountWETHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

        const daiPrice = await oracle.getAssetPrice(dai.address);
        const expectedDaiAmount = await convertToCurrencyDecimals(
          dai.address,
          new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
        );

        await mockAugustus.expectSwap(
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          amountWETHtoSwap,
          expectedDaiAmount
        );

        // Remove other balance
        await aWBCH.connect(user).transfer(users[1].address, parseEther('90'));

        // User will swap liquidity aEth to aDai
        const userAEthBalanceBefore = await aWBCH.balanceOf(userAddress);
        expect(userAEthBalanceBefore).to.be.eq(amountWETHtoSwap);

        const smallAmountToSwap = parseEther('10').sub(1);
        await aWBCH.connect(user).approve(paraswapLiquiditySwapAdapter.address, smallAmountToSwap);

        const mockAugustusCalldata = mockAugustus.interface.encodeFunctionData('swap', [
          wbch.address,
          dai.address,
          smallAmountToSwap,
          expectedDaiAmount,
        ]);

        await expect(
          paraswapLiquiditySwapAdapter
            .connect(user)
            .swapAndDeposit(
              wbch.address,
              dai.address,
              smallAmountToSwap,
              expectedDaiAmount,
              4 + 2 * 32,
              mockAugustusCalldata,
              mockAugustus.address,
              {
                amount: 0,
                deadline: 0,
                v: 0,
                r: '0x0000000000000000000000000000000000000000000000000000000000000000',
                s: '0x0000000000000000000000000000000000000000000000000000000000000000',
              }
            )
        ).to.be.revertedWith('INSUFFICIENT_AMOUNT_TO_SWAP');
      });

      it('should not touch any token balance already in the adapter', async () => {
        const { users, wbch, oracle, dai, aDai, aWBCH, paraswapLiquiditySwapAdapter } = testEnv;
        const user = users[0].signer;
        const userAddress = users[0].address;

        // Put token balances in the adapter
        const adapterWbchBalanceBefore = parseEther('123');
        await wbch.mint(adapterWbchBalanceBefore);
        await wbch.transfer(paraswapLiquiditySwapAdapter.address, adapterWbchBalanceBefore);
        const adapterDaiBalanceBefore = parseEther('234');
        await dai.mint(adapterDaiBalanceBefore);
        await dai.transfer(paraswapLiquiditySwapAdapter.address, adapterDaiBalanceBefore);

        const amountWETHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

        const daiPrice = await oracle.getAssetPrice(dai.address);
        const expectedDaiAmount = await convertToCurrencyDecimals(
          dai.address,
          new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
        );

        await mockAugustus.expectSwap(
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          amountWETHtoSwap,
          expectedDaiAmount
        );

        // User will swap liquidity aEth to aDai
        const userAEthBalanceBefore = await aWBCH.balanceOf(userAddress);
        await aWBCH.connect(user).approve(paraswapLiquiditySwapAdapter.address, amountWETHtoSwap);

        const mockAugustusCalldata = mockAugustus.interface.encodeFunctionData('swap', [
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          expectedDaiAmount,
        ]);

        await expect(
          paraswapLiquiditySwapAdapter
            .connect(user)
            .swapAndDeposit(
              wbch.address,
              dai.address,
              amountWETHtoSwap,
              expectedDaiAmount,
              0,
              mockAugustusCalldata,
              mockAugustus.address,
              {
                amount: 0,
                deadline: 0,
                v: 0,
                r: '0x0000000000000000000000000000000000000000000000000000000000000000',
                s: '0x0000000000000000000000000000000000000000000000000000000000000000',
              }
            )
        )
          .to.emit(paraswapLiquiditySwapAdapter, 'Swapped')
          .withArgs(wbch.address, dai.address, amountWETHtoSwap, expectedDaiAmount);

        const adapterWbchBalance = await wbch.balanceOf(paraswapLiquiditySwapAdapter.address);
        const adapterDaiBalance = await dai.balanceOf(paraswapLiquiditySwapAdapter.address);
        const userADaiBalance = await aDai.balanceOf(userAddress);
        const userAEthBalance = await aWBCH.balanceOf(userAddress);

        expect(adapterWbchBalance).to.be.eq(adapterWbchBalanceBefore);
        expect(adapterDaiBalance).to.be.eq(adapterDaiBalanceBefore);
        expect(userADaiBalance).to.be.eq(expectedDaiAmount);
        expect(userAEthBalance).to.be.eq(userAEthBalanceBefore.sub(amountWETHtoSwap));
      });
    });

    describe('swapAndDeposit with borrowing', () => {
      beforeEach(async () => {
        const { users, wbch, dai, pool, deployer } = testEnv;
        const userAddress = users[0].address;
        const borrower = users[1].signer;
        const borrowerAddress = users[1].address;

        // Provide liquidity
        await dai.mint(parseEther('20000'));
        await dai.approve(pool.address, parseEther('20000'));
        await pool.deposit(dai.address, parseEther('20000'), deployer.address, 0);

        await wbch.mint(parseEther('10000'));
        await wbch.approve(pool.address, parseEther('10000'));
        await pool.deposit(wbch.address, parseEther('10000'), deployer.address, 0);

        // Make a deposit for user
        await wbch.mint(parseEther('100'));
        await wbch.approve(pool.address, parseEther('100'));
        await pool.deposit(wbch.address, parseEther('100'), userAddress, 0);

        // Add borrowing
        const collateralAmount = parseEther('10000000');
        await dai.mint(collateralAmount);
        await dai.approve(pool.address, collateralAmount);
        await pool.deposit(dai.address, collateralAmount, borrowerAddress, 0);
        await pool
          .connect(borrower)
          .borrow(wbch.address, parseEther('5000'), 2, 0, borrowerAddress);
      });

      it('should correctly swap tokens and deposit the out tokens in the pool', async () => {
        const { users, wbch, oracle, dai, aDai, aWBCH, paraswapLiquiditySwapAdapter } = testEnv;
        const user = users[0].signer;
        const userAddress = users[0].address;

        const amountWETHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

        const daiPrice = await oracle.getAssetPrice(dai.address);
        const expectedDaiAmount = await convertToCurrencyDecimals(
          dai.address,
          new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
        );

        await mockAugustus.expectSwap(
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          amountWETHtoSwap,
          expectedDaiAmount
        );

        // User will swap liquidity aEth to aDai
        const userAEthBalanceBefore = await aWBCH.balanceOf(userAddress);
        await aWBCH.connect(user).approve(paraswapLiquiditySwapAdapter.address, amountWETHtoSwap);

        const mockAugustusCalldata = mockAugustus.interface.encodeFunctionData('swap', [
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          expectedDaiAmount,
        ]);

        await expect(
          paraswapLiquiditySwapAdapter
            .connect(user)
            .swapAndDeposit(
              wbch.address,
              dai.address,
              amountWETHtoSwap,
              expectedDaiAmount,
              0,
              mockAugustusCalldata,
              mockAugustus.address,
              {
                amount: 0,
                deadline: 0,
                v: 0,
                r: '0x0000000000000000000000000000000000000000000000000000000000000000',
                s: '0x0000000000000000000000000000000000000000000000000000000000000000',
              }
            )
        )
          .to.emit(paraswapLiquiditySwapAdapter, 'Swapped')
          .withArgs(wbch.address, dai.address, amountWETHtoSwap, expectedDaiAmount);

        const adapterWbchBalance = await wbch.balanceOf(paraswapLiquiditySwapAdapter.address);
        const adapterDaiBalance = await dai.balanceOf(paraswapLiquiditySwapAdapter.address);
        const userADaiBalance = await aDai.balanceOf(userAddress);
        const userAEthBalance = await aWBCH.balanceOf(userAddress);

        expect(adapterWbchBalance).to.be.eq(Zero);
        expect(adapterDaiBalance).to.be.eq(Zero);
        expect(userADaiBalance).to.be.eq(expectedDaiAmount);
        expect(userAEthBalance).to.be.gt(userAEthBalanceBefore.sub(amountWETHtoSwap));
        expect(userAEthBalance).to.be.lt(
          userAEthBalanceBefore.mul(10001).div(10000).sub(amountWETHtoSwap)
        );
      });

      it('should correctly swap tokens using permit', async () => {
        const { users, wbch, oracle, dai, aDai, aWBCH, paraswapLiquiditySwapAdapter } = testEnv;
        const user = users[0].signer;
        const userAddress = users[0].address;

        const amountWETHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

        const daiPrice = await oracle.getAssetPrice(dai.address);
        const expectedDaiAmount = await convertToCurrencyDecimals(
          dai.address,
          new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
        );

        await mockAugustus.expectSwap(
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          amountWETHtoSwap,
          expectedDaiAmount
        );

        // User will swap liquidity aEth to aDai
        const userAEthBalanceBefore = await aWBCH.balanceOf(userAddress);

        const chainId = DRE.network.config.chainId || BUIDLEREVM_CHAINID;
        const deadline = MAX_UINT_AMOUNT;
        const nonce = (await aWBCH._nonces(userAddress)).toNumber();
        const msgParams = buildPermitParams(
          chainId,
          aWBCH.address,
          '1',
          await aWBCH.name(),
          userAddress,
          paraswapLiquiditySwapAdapter.address,
          nonce,
          deadline,
          amountWETHtoSwap.toString()
        );

        const ownerPrivateKey = require('../../test-wallets.js').accounts[1].secretKey;
        if (!ownerPrivateKey) {
          throw new Error('INVALID_OWNER_PK');
        }

        const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, msgParams);

        const mockAugustusCalldata = mockAugustus.interface.encodeFunctionData('swap', [
          wbch.address,
          dai.address,
          amountWETHtoSwap,
          expectedDaiAmount,
        ]);

        await expect(
          paraswapLiquiditySwapAdapter
            .connect(user)
            .swapAndDeposit(
              wbch.address,
              dai.address,
              amountWETHtoSwap,
              expectedDaiAmount,
              0,
              mockAugustusCalldata,
              mockAugustus.address,
              {
                amount: amountWETHtoSwap,
                deadline,
                v,
                r,
                s,
              }
            )
        )
          .to.emit(paraswapLiquiditySwapAdapter, 'Swapped')
          .withArgs(wbch.address, dai.address, amountWETHtoSwap, expectedDaiAmount);

        const adapterWbchBalance = await wbch.balanceOf(paraswapLiquiditySwapAdapter.address);
        const adapterDaiBalance = await dai.balanceOf(paraswapLiquiditySwapAdapter.address);
        const userADaiBalance = await aDai.balanceOf(userAddress);
        const userAEthBalance = await aWBCH.balanceOf(userAddress);

        expect(adapterWbchBalance).to.be.eq(Zero);
        expect(adapterDaiBalance).to.be.eq(Zero);
        expect(userADaiBalance).to.be.eq(expectedDaiAmount);
        expect(userAEthBalance).to.be.gt(userAEthBalanceBefore.sub(amountWETHtoSwap));
        expect(userAEthBalance).to.be.lt(
          userAEthBalanceBefore.mul(10001).div(10000).sub(amountWETHtoSwap)
        );
      });

      it('should correctly swap all the balance when using a bigger amount', async () => {
        const { users, wbch, oracle, dai, aDai, aWBCH, paraswapLiquiditySwapAdapter } = testEnv;
        const user = users[0].signer;
        const userAddress = users[0].address;

        const amountWETHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

        const daiPrice = await oracle.getAssetPrice(dai.address);
        const expectedDaiAmount = await convertToCurrencyDecimals(
          dai.address,
          new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
        );

        await mockAugustus.expectSwap(
          wbch.address,
          dai.address,
          amountWETHtoSwap.add(1),
          amountWETHtoSwap.mul(10001).div(10000),
          expectedDaiAmount
        );

        // Remove other balance
        await aWBCH.connect(user).transfer(users[1].address, parseEther('90'));

        // User will swap liquidity aEth to aDai
        const bigAmountToSwap = parseEther('11');
        await aWBCH.connect(user).approve(paraswapLiquiditySwapAdapter.address, bigAmountToSwap);

        const mockAugustusCalldata = mockAugustus.interface.encodeFunctionData('swap', [
          wbch.address,
          dai.address,
          bigAmountToSwap,
          expectedDaiAmount,
        ]);

        await expect(
          paraswapLiquiditySwapAdapter
            .connect(user)
            .swapAndDeposit(
              wbch.address,
              dai.address,
              bigAmountToSwap,
              expectedDaiAmount,
              4 + 2 * 32,
              mockAugustusCalldata,
              mockAugustus.address,
              {
                amount: 0,
                deadline: 0,
                v: 0,
                r: '0x0000000000000000000000000000000000000000000000000000000000000000',
                s: '0x0000000000000000000000000000000000000000000000000000000000000000',
              }
            )
        ).to.emit(paraswapLiquiditySwapAdapter, 'Swapped');

        const adapterWbchBalance = await wbch.balanceOf(paraswapLiquiditySwapAdapter.address);
        const adapterDaiBalance = await dai.balanceOf(paraswapLiquiditySwapAdapter.address);
        const userADaiBalance = await aDai.balanceOf(userAddress);
        const userAEthBalance = await aWBCH.balanceOf(userAddress);

        expect(adapterWbchBalance).to.be.eq(Zero);
        expect(adapterDaiBalance).to.be.eq(Zero);
        expect(userADaiBalance).to.be.eq(expectedDaiAmount);
        expect(userAEthBalance).to.be.eq(Zero);
      });

      it('should correctly swap all the balance when using permit', async () => {
        const { users, wbch, oracle, dai, aDai, aWBCH, paraswapLiquiditySwapAdapter } = testEnv;
        const user = users[0].signer;
        const userAddress = users[0].address;

        const amountWETHtoSwap = await convertToCurrencyDecimals(wbch.address, '10');

        const daiPrice = await oracle.getAssetPrice(dai.address);
        const expectedDaiAmount = await convertToCurrencyDecimals(
          dai.address,
          new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
        );

        await mockAugustus.expectSwap(
          wbch.address,
          dai.address,
          amountWETHtoSwap.add(1),
          amountWETHtoSwap.mul(10001).div(10000),
          expectedDaiAmount
        );

        // Remove other balance
        await aWBCH.connect(user).transfer(users[1].address, parseEther('90'));

        // User will swap liquidity aEth to aDai
        const bigAmountToSwap = parseEther('11');

        const chainId = DRE.network.config.chainId || BUIDLEREVM_CHAINID;
        const deadline = MAX_UINT_AMOUNT;
        const nonce = (await aWBCH._nonces(userAddress)).toNumber();
        const msgParams = buildPermitParams(
          chainId,
          aWBCH.address,
          '1',
          await aWBCH.name(),
          userAddress,
          paraswapLiquiditySwapAdapter.address,
          nonce,
          deadline,
          bigAmountToSwap.toString()
        );

        const ownerPrivateKey = require('../../test-wallets.js').accounts[1].secretKey;
        if (!ownerPrivateKey) {
          throw new Error('INVALID_OWNER_PK');
        }

        const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, msgParams);

        const mockAugustusCalldata = mockAugustus.interface.encodeFunctionData('swap', [
          wbch.address,
          dai.address,
          bigAmountToSwap,
          expectedDaiAmount,
        ]);

        await expect(
          paraswapLiquiditySwapAdapter
            .connect(user)
            .swapAndDeposit(
              wbch.address,
              dai.address,
              bigAmountToSwap,
              expectedDaiAmount,
              4 + 2 * 32,
              mockAugustusCalldata,
              mockAugustus.address,
              {
                amount: bigAmountToSwap,
                deadline,
                v,
                r,
                s,
              }
            )
        ).to.emit(paraswapLiquiditySwapAdapter, 'Swapped');

        const adapterWbchBalance = await wbch.balanceOf(paraswapLiquiditySwapAdapter.address);
        const adapterDaiBalance = await dai.balanceOf(paraswapLiquiditySwapAdapter.address);
        const userADaiBalance = await aDai.balanceOf(userAddress);
        const userAEthBalance = await aWBCH.balanceOf(userAddress);

        expect(adapterWbchBalance).to.be.eq(Zero);
        expect(adapterDaiBalance).to.be.eq(Zero);
        expect(userADaiBalance).to.be.eq(expectedDaiAmount);
        expect(userAEthBalance).to.be.eq(Zero);
      });
    });
  });
});
