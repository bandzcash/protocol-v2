import { MAX_UINT_AMOUNT } from '../../helpers/constants';
import { convertToCurrencyDecimals } from '../../helpers/contracts-helpers';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { parseEther } from 'ethers/lib/utils';
import { DRE, waitForTx } from '../../helpers/misc-utils';
import { BigNumber } from 'ethers';
import { getStableDebtToken, getVariableDebtToken } from '../../helpers/contracts-getters';
import { deploySelfdestructTransferMock } from '../../helpers/contracts-deployments';

const { expect } = require('chai');

makeSuite('Use native BCH at LendingPool via WETHGateway', (testEnv: TestEnv) => {
  const zero = BigNumber.from('0');
  const depositSize = parseEther('5');
  const flexUsdSize = parseEther('10000');
  it('Deposit WBCH via WbchGateway and FLEXUSD', async () => {
    const { users, wbchGateway, aWBCH, pool } = testEnv;

    const user = users[1];
    const depositor = users[0];

    // Deposit liquidity with native BCH
    await wbchGateway
      .connect(depositor.signer)
      .depositETH(pool.address, depositor.address, '0', { value: depositSize });

    // Deposit with native BCH
    await wbchGateway
      .connect(user.signer)
      .depositETH(pool.address, user.address, '0', { value: depositSize });

    const aTokensBalance = await aWBCH.balanceOf(user.address);

    expect(aTokensBalance).to.be.gt(zero);
    expect(aTokensBalance).to.be.gte(depositSize);
  });

  it('Withdraw WBCH - Partial', async () => {
    const { users, wbchGateway, aWBCH, pool } = testEnv;

    const user = users[1];
    const priorEthersBalance = await user.signer.getBalance();
    const aTokensBalance = await aWBCH.balanceOf(user.address);

    expect(aTokensBalance).to.be.gt(zero, 'User should have aTokens.');

    // Partially withdraw native BCH
    const partialWithdraw = await convertToCurrencyDecimals(aWBCH.address, '2');

    // Approve the aTokens to Gateway so Gateway can withdraw and convert to Ether
    const approveTx = await aWBCH
      .connect(user.signer)
      .approve(wbchGateway.address, MAX_UINT_AMOUNT);
    const { gasUsed: approveGas } = await waitForTx(approveTx);

    // Partial Withdraw and send native Ether to user
    const { gasUsed: withdrawGas } = await waitForTx(
      await wbchGateway
        .connect(user.signer)
        .withdrawETH(pool.address, partialWithdraw, user.address)
    );

    const afterPartialEtherBalance = await user.signer.getBalance();
    const afterPartialATokensBalance = await aWBCH.balanceOf(user.address);
    const gasCosts = approveGas.add(withdrawGas).mul(approveTx.gasPrice);

    expect(afterPartialEtherBalance).to.be.equal(
      priorEthersBalance.add(partialWithdraw).sub(gasCosts),
      'User ETHER balance should contain the partial withdraw'
    );
    expect(afterPartialATokensBalance).to.be.equal(
      aTokensBalance.sub(partialWithdraw),
      'User aWBCH balance should be substracted'
    );
  });

  it('Withdraw WBCH - Full', async () => {
    const { users, aWBCH, wbchGateway, pool } = testEnv;

    const user = users[1];
    const priorEthersBalance = await user.signer.getBalance();
    const aTokensBalance = await aWBCH.balanceOf(user.address);

    expect(aTokensBalance).to.be.gt(zero, 'User should have aTokens.');

    // Approve the aTokens to Gateway so Gateway can withdraw and convert to Ether
    const approveTx = await aWBCH
      .connect(user.signer)
      .approve(wbchGateway.address, MAX_UINT_AMOUNT);
    const { gasUsed: approveGas } = await waitForTx(approveTx);

    // Full withdraw
    const { gasUsed: withdrawGas } = await waitForTx(
      await wbchGateway
        .connect(user.signer)
        .withdrawETH(pool.address, MAX_UINT_AMOUNT, user.address)
    );

    const afterFullEtherBalance = await user.signer.getBalance();
    const afterFullATokensBalance = await aWBCH.balanceOf(user.address);
    const gasCosts = approveGas.add(withdrawGas).mul(approveTx.gasPrice);

    expect(afterFullEtherBalance).to.be.eq(
      priorEthersBalance.add(aTokensBalance).sub(gasCosts),
      'User ETHER balance should contain the full withdraw'
    );
    expect(afterFullATokensBalance).to.be.eq(0, 'User aWBCH balance should be zero');
  });

  it('Borrow stable WBCH and Full Repay with BCH', async () => {
    const { users, wbchGateway, aFlexUsd, wbch, flexUsd, pool, helpersContract } = testEnv;
    const borrowSize = parseEther('1');
    const repaySize = borrowSize.add(borrowSize.mul(5).div(100));
    const user = users[1];
    const depositor = users[0];

    // Deposit with native BCH
    await wbchGateway
      .connect(depositor.signer)
      .depositETH(pool.address, depositor.address, '0', { value: depositSize });

    const { stableDebtTokenAddress } = await helpersContract.getReserveTokensAddresses(
      wbch.address
    );

    const stableDebtToken = await getStableDebtToken(stableDebtTokenAddress);

    // Deposit 10000 FLEXUSD
    await flexUsd.connect(user.signer).mint(flexUsdSize);
    await flexUsd.connect(user.signer).approve(pool.address, flexUsdSize);
    await pool.connect(user.signer).deposit(flexUsd.address, flexUsdSize, user.address, '0');

    const aTokensBalance = await aFlexUsd.balanceOf(user.address);

    expect(aTokensBalance).to.be.gt(zero);
    expect(aTokensBalance).to.be.gte(flexUsdSize);

    // Borrow WBCH with WBCH as collateral
    await waitForTx(
      await pool.connect(user.signer).borrow(wbch.address, borrowSize, '1', '0', user.address)
    );

    const debtBalance = await stableDebtToken.balanceOf(user.address);

    expect(debtBalance).to.be.gt(zero);

    // Full Repay WBCH with native BCH
    await waitForTx(
      await wbchGateway
        .connect(user.signer)
        .repayETH(pool.address, MAX_UINT_AMOUNT, '1', user.address, { value: repaySize })
    );

    const debtBalanceAfterRepay = await stableDebtToken.balanceOf(user.address);
    expect(debtBalanceAfterRepay).to.be.eq(zero);

    // Withdraw FLEXUSD
    await aFlexUsd.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(user.signer).withdraw(flexUsd.address, MAX_UINT_AMOUNT, user.address);
  });

  it('Borrow variable WBCH and Full Repay with BCH', async () => {
    const { users, wbchGateway, aWBCH, wbch, pool, helpersContract } = testEnv;
    const borrowSize = parseEther('1');
    const repaySize = borrowSize.add(borrowSize.mul(5).div(100));
    const user = users[1];

    const { variableDebtTokenAddress } = await helpersContract.getReserveTokensAddresses(
      wbch.address
    );

    const varDebtToken = await getVariableDebtToken(variableDebtTokenAddress);

    // Deposit with native BCH
    await wbchGateway
      .connect(user.signer)
      .depositETH(pool.address, user.address, '0', { value: depositSize });

    const aTokensBalance = await aWBCH.balanceOf(user.address);

    expect(aTokensBalance).to.be.gt(zero);
    expect(aTokensBalance).to.be.gte(depositSize);

    // Borrow WBCH with WBCH as collateral
    await waitForTx(
      await pool.connect(user.signer).borrow(wbch.address, borrowSize, '2', '0', user.address)
    );

    const debtBalance = await varDebtToken.balanceOf(user.address);

    expect(debtBalance).to.be.gt(zero);

    // Partial Repay WBCH loan with native BCH
    const partialPayment = repaySize.div(2);
    await waitForTx(
      await wbchGateway
        .connect(user.signer)
        .repayETH(pool.address, partialPayment, '2', user.address, { value: partialPayment })
    );

    const debtBalanceAfterPartialRepay = await varDebtToken.balanceOf(user.address);
    expect(debtBalanceAfterPartialRepay).to.be.lt(debtBalance);

    // Full Repay WBCH loan with native BCH
    await waitForTx(
      await wbchGateway
        .connect(user.signer)
        .repayETH(pool.address, MAX_UINT_AMOUNT, '2', user.address, { value: repaySize })
    );
    const debtBalanceAfterFullRepay = await varDebtToken.balanceOf(user.address);
    expect(debtBalanceAfterFullRepay).to.be.eq(zero);
  });

  it('Borrow BCH via delegateApprove BCH and repays back', async () => {
    const { users, wbchGateway, aWBCH, wbch, helpersContract, pool } = testEnv;
    const borrowSize = parseEther('1');
    const user = users[2];
    const { variableDebtTokenAddress } = await helpersContract.getReserveTokensAddresses(
      wbch.address
    );
    const varDebtToken = await getVariableDebtToken(variableDebtTokenAddress);

    const priorDebtBalance = await varDebtToken.balanceOf(user.address);
    expect(priorDebtBalance).to.be.eq(zero);

    // Deposit WBCH with native BCH
    await wbchGateway
      .connect(user.signer)
      .depositETH(pool.address, user.address, '0', { value: depositSize });

    const aTokensBalance = await aWBCH.balanceOf(user.address);

    expect(aTokensBalance).to.be.gt(zero);
    expect(aTokensBalance).to.be.gte(depositSize);

    // Delegates borrowing power of WBCH to WETHGateway
    await waitForTx(
      await varDebtToken.connect(user.signer).approveDelegation(wbchGateway.address, borrowSize)
    );

    // Borrows BCH with WBCH as collateral
    await waitForTx(
      await wbchGateway.connect(user.signer).borrowETH(pool.address, borrowSize, '2', '0')
    );

    const debtBalance = await varDebtToken.balanceOf(user.address);

    expect(debtBalance).to.be.gt(zero);

    // Full Repay WBCH loan with native BCH
    await waitForTx(
      await wbchGateway
        .connect(user.signer)
        .repayETH(pool.address, MAX_UINT_AMOUNT, '2', user.address, { value: borrowSize.mul(2) })
    );
    const debtBalanceAfterFullRepay = await varDebtToken.balanceOf(user.address);
    expect(debtBalanceAfterFullRepay).to.be.eq(zero);
  });

  it('Should revert if receiver function receives Ether if not WBCH', async () => {
    const { users, wbchGateway } = testEnv;
    const user = users[0];
    const amount = parseEther('1');

    // Call receiver function (empty data + value)
    await expect(
      user.signer.sendTransaction({
        to: wbchGateway.address,
        value: amount,
        gasLimit: DRE.network.config.gas,
      })
    ).to.be.revertedWith('Receive not allowed');
  });

  it('Should revert if fallback functions is called with Ether', async () => {
    const { users, wbchGateway } = testEnv;
    const user = users[0];
    const amount = parseEther('1');
    const fakeABI = ['function wantToCallFallback()'];
    const abiCoder = new DRE.ethers.utils.Interface(fakeABI);
    const fakeMethodEncoded = abiCoder.encodeFunctionData('wantToCallFallback', []);

    // Call fallback function with value
    await expect(
      user.signer.sendTransaction({
        to: wbchGateway.address,
        data: fakeMethodEncoded,
        value: amount,
        gasLimit: DRE.network.config.gas,
      })
    ).to.be.revertedWith('Fallback not allowed');
  });

  it('Should revert if fallback functions is called', async () => {
    const { users, wbchGateway } = testEnv;
    const user = users[0];

    const fakeABI = ['function wantToCallFallback()'];
    const abiCoder = new DRE.ethers.utils.Interface(fakeABI);
    const fakeMethodEncoded = abiCoder.encodeFunctionData('wantToCallFallback', []);

    // Call fallback function without value
    await expect(
      user.signer.sendTransaction({
        to: wbchGateway.address,
        data: fakeMethodEncoded,
        gasLimit: DRE.network.config.gas,
      })
    ).to.be.revertedWith('Fallback not allowed');
  });

  it('Owner can do emergency token recovery', async () => {
    const { users, flexUsd, wbchGateway, deployer } = testEnv;
    const user = users[0];
    const amount = parseEther('1');

    await flexUsd.connect(user.signer).mint(amount);
    const flexUsdBalanceAfterMint = await flexUsd.balanceOf(user.address);

    await flexUsd.connect(user.signer).transfer(wbchGateway.address, amount);
    const flexUsdBalanceAfterBadTransfer = await flexUsd.balanceOf(user.address);
    expect(flexUsdBalanceAfterBadTransfer).to.be.eq(
      flexUsdBalanceAfterMint.sub(amount),
      'User should have lost the funds here.'
    );

    await wbchGateway
      .connect(deployer.signer)
      .emergencyTokenTransfer(flexUsd.address, user.address, amount);
    const flexUsdBalanceAfterRecovery = await flexUsd.balanceOf(user.address);

    expect(flexUsdBalanceAfterRecovery).to.be.eq(
      flexUsdBalanceAfterMint,
      'User should recover the funds due emergency token transfer'
    );
  });

  it('Owner can do emergency native BCH recovery', async () => {
    const { users, wbchGateway, deployer } = testEnv;
    const user = users[0];
    const amount = parseEther('1');
    const userBalancePriorCall = await user.signer.getBalance();

    // Deploy contract with payable selfdestruct contract
    const selfdestructContract = await deploySelfdestructTransferMock();

    // Selfdestruct the mock, pointing to WETHGateway address
    const callTx = await selfdestructContract
      .connect(user.signer)
      .destroyAndTransfer(wbchGateway.address, { value: amount });
    const { gasUsed } = await waitForTx(callTx);
    const gasFees = gasUsed.mul(callTx.gasPrice);
    const userBalanceAfterCall = await user.signer.getBalance();

    expect(userBalanceAfterCall).to.be.eq(userBalancePriorCall.sub(amount).sub(gasFees), '');
    ('User should have lost the funds');

    // Recover the funds from the contract and sends back to the user
    await wbchGateway.connect(deployer.signer).emergencyEtherTransfer(user.address, amount);

    const userBalanceAfterRecovery = await user.signer.getBalance();
    const wbchGatewayAfterRecovery = await DRE.ethers.provider.getBalance(wbchGateway.address);

    expect(userBalanceAfterRecovery).to.be.eq(
      userBalancePriorCall.sub(gasFees),
      'User should recover the funds due emergency eth transfer.'
    );
    expect(wbchGatewayAfterRecovery).to.be.eq('0', 'WETHGateway ether balance should be zero.');
  });
});
