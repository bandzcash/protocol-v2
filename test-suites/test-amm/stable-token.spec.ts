import { expect } from 'chai';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { ProtocolErrors } from '../../helpers/types';
import { getStableDebtToken } from '../../helpers/contracts-getters';

makeSuite('Stable debt token tests', (testEnv: TestEnv) => {
  const { CT_CALLER_MUST_BE_LENDING_POOL } = ProtocolErrors;

  it('Tries to invoke mint not being the LendingPool', async () => {
    const { deployer, pool, flexUsd, helpersContract } = testEnv;

    const flexUsdStableDebtTokenAddress = (await helpersContract.getReserveTokensAddresses(flexUsd.address))
      .stableDebtTokenAddress;

    const stableDebtContract = await getStableDebtToken(flexUsdStableDebtTokenAddress);

    await expect(
      stableDebtContract.mint(deployer.address, deployer.address, '1', '1')
    ).to.be.revertedWith(CT_CALLER_MUST_BE_LENDING_POOL);
  });

  it('Tries to invoke burn not being the LendingPool', async () => {
    const { deployer, flexUsd, helpersContract } = testEnv;

    const flexUsdStableDebtTokenAddress = (await helpersContract.getReserveTokensAddresses(flexUsd.address))
      .stableDebtTokenAddress;

    const stableDebtContract = await getStableDebtToken(flexUsdStableDebtTokenAddress);

    const name = await stableDebtContract.name();

    expect(name).to.be.equal('Bandz AMM Market stable debt FLEXUSD');
    await expect(stableDebtContract.burn(deployer.address, '1')).to.be.revertedWith(
      CT_CALLER_MUST_BE_LENDING_POOL
    );
  });
});
