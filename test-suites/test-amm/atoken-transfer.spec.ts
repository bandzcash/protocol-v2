import { APPROVAL_AMOUNT_LENDING_POOL, MAX_UINT_AMOUNT, ZERO_ADDRESS } from '../../helpers/constants';
import { convertToCurrencyDecimals } from '../../helpers/contracts-helpers';
import { expect } from 'chai';
import { ethers } from 'ethers';
import { RateMode, ProtocolErrors } from '../../helpers/types';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { CommonsConfig } from '../../markets/amm/commons';

const BANDZ_REFERRAL = CommonsConfig.ProtocolGlobalParams.BandzReferral;

makeSuite('AToken: Transfer', (testEnv: TestEnv) => {
  const {
    INVALID_FROM_BALANCE_AFTER_TRANSFER,
    INVALID_TO_BALANCE_AFTER_TRANSFER,
    VL_TRANSFER_NOT_ALLOWED,
  } = ProtocolErrors;

  it('User 0 deposits 1000 FLEXUSD, transfers to user 1', async () => {
    const { users, pool, flexUsd, aFlexUsd } = testEnv;

    await flexUsd.connect(users[0].signer).mint(await convertToCurrencyDecimals(flexUsd.address, '1000'));

    await flexUsd.connect(users[0].signer).approve(pool.address, APPROVAL_AMOUNT_LENDING_POOL);

    //user 1 deposits 1000 FLEXUSD
    const amountFlexUSDtoDeposit = await convertToCurrencyDecimals(flexUsd.address, '1000');

    await pool
      .connect(users[0].signer)
      .deposit(flexUsd.address, amountFlexUSDtoDeposit, users[0].address, '0');

    await aFlexUsd.connect(users[0].signer).transfer(users[1].address, amountFlexUSDtoDeposit);

    const name = await aFlexUsd.name();

    expect(name).to.be.equal('Bandz AMM Market FLEXUSD');

    const fromBalance = await aFlexUsd.balanceOf(users[0].address);
    const toBalance = await aFlexUsd.balanceOf(users[1].address);

    expect(fromBalance.toString()).to.be.equal('0', INVALID_FROM_BALANCE_AFTER_TRANSFER);
    expect(toBalance.toString()).to.be.equal(
      amountFlexUSDtoDeposit.toString(),
      INVALID_TO_BALANCE_AFTER_TRANSFER
    );
  });

  it('User 0 deposits 1 WBCH and user 1 tries to borrow the WBCH variable with the received FLEXUSD as collateral', async () => {
    const { users, pool, wbch, helpersContract } = testEnv;
    const userAddress = await pool.signer.getAddress();

    await wbch.connect(users[0].signer).mint(await convertToCurrencyDecimals(wbch.address, '1'));

    await wbch.connect(users[0].signer).approve(pool.address, APPROVAL_AMOUNT_LENDING_POOL);

    await pool
      .connect(users[0].signer)
      .deposit(wbch.address, ethers.utils.parseEther('1.0'), userAddress, '0');
    await pool
      .connect(users[1].signer)
      .borrow(
        wbch.address,
        ethers.utils.parseEther('0.1'),
        RateMode.Variable,
        BANDZ_REFERRAL,
        users[1].address
      );

    const userReserveData = await helpersContract.getUserReserveData(
      wbch.address,
      users[1].address
    );

    expect(userReserveData.currentVariableDebt.toString()).to.be.eq(ethers.utils.parseEther('0.1'));
  });

  it('User 1 tries to transfer all the FLEXUSD used as collateral back to user 0 (revert expected)', async () => {
    const { users, pool, aFlexUsd, flexUsd, wbch } = testEnv;

    const aFlexUSDtoTransfer = await convertToCurrencyDecimals(flexUsd.address, '1000');

    await expect(
      aFlexUsd.connect(users[1].signer).transfer(users[0].address, aFlexUSDtoTransfer),
      VL_TRANSFER_NOT_ALLOWED
    ).to.be.revertedWith(VL_TRANSFER_NOT_ALLOWED);
  });

  it('User 1 tries to transfer a small amount of FLEXUSD used as collateral back to user 0', async () => {
    const { users, pool, aFlexUsd, flexUsd, wbch } = testEnv;

    const aFlexUSDtoTransfer = await convertToCurrencyDecimals(flexUsd.address, '100');

    await aFlexUsd.connect(users[1].signer).transfer(users[0].address, aFlexUSDtoTransfer);

    const user0Balance = await aFlexUsd.balanceOf(users[0].address);

    expect(user0Balance.toString()).to.be.eq(aFlexUSDtoTransfer.toString());
  });
});
